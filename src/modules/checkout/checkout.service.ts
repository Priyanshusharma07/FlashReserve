import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { AppConfigService } from '../../common/config/app-config.service.js';
import { AppLoggerService } from '../../common/logging/logger.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { RedisKeys } from '../../redis/redis-keys.js';
import { RedisService } from '../../redis/redis.service.js';
import { ReservationRepository } from '../reservation/reservation.repository.js';
import { CheckoutDto, CheckoutResponseDto } from './dto/checkout.dto.js';
import { MockDevelopmentPaymentAdapter } from './payment.adapter.js';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly repo: ReservationRepository,
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
    private readonly config: AppConfigService,
    private readonly paymentAdapter: MockDevelopmentPaymentAdapter,
    private readonly logger: AppLoggerService,
  ) {}

  async checkout(
    reservationId: string,
    dto: CheckoutDto,
    user: AuthenticatedUser,
  ): Promise<CheckoutResponseDto> {
    // 1. Fetch reservation from PostgreSQL
    let record = await this.repo.findById(reservationId);

    // If not yet persisted by worker, check Redis
    if (!record) {
      const redisClient = this.redis.getClient();
      const keys = await redisClient.keys(`flash:res:{*}:${reservationId}`);
      if (keys.length === 0) {
        throw new NotFoundException(`Reservation '${reservationId}' not found`);
      }
      const hash = await redisClient.hgetall(keys[0]);
      if (!hash || !hash.id) {
        throw new NotFoundException(`Reservation '${reservationId}' not found`);
      }

      // Check ownership
      if (user.role !== 'admin' && hash.userId !== user.userId) {
        throw new ForbiddenException('You are not authorized to check out this reservation');
      }

      // Check expiry in Redis
      if (Date.now() > parseInt(hash.expiresAt, 10)) {
        throw new GoneException('Reservation has expired and can no longer be paid');
      }

      // Force synchronous insert into PostgreSQL to finalize checkout immediately
      await this.db.withTransaction(async (client) => {
        await this.repo.persistBatchInTx(client, [
          {
            id: hash.id,
            campaignId: hash.campaignId,
            userId: hash.userId,
            quantity: parseInt(hash.quantity, 10),
            status: hash.status || 'RESERVED',
            expiresAt: new Date(parseInt(hash.expiresAt, 10)),
            createdAt: new Date(parseInt(hash.createdAt, 10)),
          },
        ]);
      });

      record = await this.repo.findById(reservationId);
      if (!record) {
        throw new BadRequestException('Could not materialize reservation for checkout');
      }
    }

    // 2. Validate Ownership
    if (user.role !== 'admin' && record.user_id !== user.userId) {
      throw new ForbiddenException('You are not authorized to check out this reservation');
    }

    // 3. Idempotency Check: If already PAID, return success deterministically
    if (record.status === 'PAID') {
      return {
        reservationId: record.id,
        status: 'PAID',
        transactionReference: 'ch_already_confirmed',
        confirmedAt: record.db_synced_at.toISOString(),
      };
    }

    // 4. Expiration Check
    if (record.status === 'EXPIRED' || record.expires_at.getTime() < Date.now()) {
      throw new GoneException('Reservation has expired and can no longer be checked out');
    }

    if (record.status !== 'RESERVED') {
      throw new BadRequestException(`Cannot checkout reservation with status '${record.status}'`);
    }

    // 5. Process Payment via Adapter
    const paymentResult = await this.paymentAdapter.processPayment(dto.paymentToken, 1000);
    if (!paymentResult.success) {
      throw new BadRequestException(`Payment processing failed: ${paymentResult.errorMessage}`);
    }

    // 6. Transactional State Transition in PostgreSQL
    const updated = await this.repo.updateStatus(reservationId, 'RESERVED', 'PAID');
    if (!updated) {
      // Status was changed concurrently (e.g. swept by expiration)
      const freshRecord = await this.repo.findById(reservationId);
      if (freshRecord?.status === 'EXPIRED') {
        throw new GoneException('Reservation expired while processing payment');
      }
      if (freshRecord?.status === 'PAID') {
        return {
          reservationId,
          status: 'PAID',
          transactionReference: paymentResult.transactionReference,
          confirmedAt: freshRecord.db_synced_at.toISOString(),
        };
      }
      throw new BadRequestException('Reservation state could not be updated to PAID');
    }

    // 7. Update Redis state and emit confirmation event
    try {
      const redisClient = this.redis.getClient();
      const resKey = RedisKeys.reservationKey(record.campaign_id, reservationId);
      await redisClient.hset(resKey, 'status', 'PAID');

      await redisClient.xadd(
        this.config.redisStreamName,
        '*',
        'eventId', reservationId,
        'eventType', 'RESERVATION_CONFIRMED',
        'reservationId', reservationId,
        'campaignId', record.campaign_id,
        'userId', record.user_id,
        'timestamp', Date.now().toString(),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Notice: Redis update after checkout: ${msg}`, 'CheckoutService');
    }

    this.logger.log(`Reservation ${reservationId} confirmed as PAID`, 'CheckoutService');

    return {
      reservationId,
      status: 'PAID',
      transactionReference: paymentResult.transactionReference,
      confirmedAt: new Date().toISOString(),
    };
  }
}
