import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ulid } from 'ulidx';
import { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { AppConfigService } from '../../common/config/app-config.service.js';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { AppLoggerService } from '../../common/logging/logger.service.js';
import { RedisKeys } from '../../redis/redis-keys.js';
import { RedisService } from '../../redis/redis.service.js';
import { ReservationResponseDto } from './dto/reservation-response.dto.js';
import { ReserveDto } from './dto/reserve.dto.js';
import {
  UserReservationItemDto,
  UserReservationsQueryDto,
} from './dto/user-reservations-query.dto.js';
import { ReservationRepository } from './reservation.repository.js';

@Injectable()
export class ReservationService {
  constructor(
    private readonly repo: ReservationRepository,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async reserve(
    campaignId: string,
    dto: ReserveDto,
    user: AuthenticatedUser,
    idempotencyKey: string,
  ): Promise<ReservationResponseDto> {
    if (dto.quantity > this.config.maxReservationQuantity) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds maximum allowed (${this.config.maxReservationQuantity})`,
      );
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const reservationId = ulid();
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ quantity: dto.quantity }))
      .digest('hex');

    const nowMs = Date.now();
    const ttlSeconds = this.config.reservationTtlSeconds;

    const keys = [
      RedisKeys.stockKey(campaignId),
      RedisKeys.metaKey(campaignId),
      RedisKeys.userReservationKey(campaignId, user.userId),
      RedisKeys.idempotencyKey(campaignId, idempotencyKey),
      RedisKeys.reservationKey(campaignId, reservationId),
      RedisKeys.streamKey(this.config.redisStreamName),
    ];

    const args = [
      campaignId,
      user.userId,
      reservationId,
      dto.quantity,
      payloadHash,
      nowMs,
      ttlSeconds,
    ];

    const [status, responsePayload, remainingStock] = await this.redis.executeReserveScript(keys, args);

    if (status === 'SUCCESS' || status === 'IDEMPOTENT_REPLAY') {
      const parsed = JSON.parse(responsePayload) as Record<string, unknown>;
      return {
        reservationId: parsed.reservationId as string,
        campaignId: parsed.campaignId as string,
        userId: parsed.userId as string,
        quantity: parsed.quantity as number,
        status: (parsed.status as string) || 'RESERVED',
        remainingStock: typeof remainingStock !== 'undefined'
          ? parseInt(remainingStock, 10)
          : (parsed.remainingStock as number) || 0,
        expiresAt: new Date(parsed.expiresAt as number).toISOString(),
        createdAt: new Date(parsed.createdAt as number).toISOString(),
        dbSyncedAt: null,
        dbTxVersion: null,
      };
    }

    if (status === 'PAYLOAD_MISMATCH') {
      throw new BadRequestException(responsePayload);
    }

    if (status === 'NOT_FOUND') {
      throw new NotFoundException(responsePayload);
    }

    if (status === 'INACTIVE' || status === 'NOT_STARTED') {
      throw new BadRequestException(responsePayload);
    }

    if (status === 'ENDED') {
      throw new GoneException(responsePayload);
    }

    if (status === 'ALREADY_RESERVED') {
      throw new ConflictException(
        `User already has an active reservation (${responsePayload}) for this campaign`,
      );
    }

    if (status === 'SOLD_OUT') {
      throw new ConflictException(
        `Campaign inventory is sold out. Remaining stock: ${responsePayload}`,
      );
    }

    throw new BadRequestException(`Reservation failed with status: ${status}`);
  }

  async getReservation(
    reservationId: string,
    user: AuthenticatedUser,
  ): Promise<ReservationResponseDto> {
    // 1. Check PostgreSQL for durable record
    const dbRecord = await this.repo.findById(reservationId);

    if (dbRecord) {
      if (user.role !== 'admin' && dbRecord.user_id !== user.userId) {
        throw new ForbiddenException('You are not authorized to view this reservation');
      }

      // Check if Redis has a newer status (e.g. status transition in-flight)
      const redisClient = this.redis.getClient();
      const resHash = await redisClient.hgetall(
        RedisKeys.reservationKey(dbRecord.campaign_id, reservationId),
      );

      const status = resHash?.status || dbRecord.status;

      return {
        reservationId: dbRecord.id,
        campaignId: dbRecord.campaign_id,
        userId: dbRecord.user_id,
        quantity: dbRecord.quantity,
        status,
        remainingStock: 0,
        expiresAt: dbRecord.expires_at.toISOString(),
        createdAt: dbRecord.created_at.toISOString(),
        dbSyncedAt: dbRecord.db_synced_at.toISOString(),
        dbTxVersion: dbRecord.db_tx_version,
      };
    }

    // 2. If not yet in PostgreSQL, check if present in Redis (accepted in stream buffer)
    const redisClient = this.redis.getClient();
    // Scan matching keys if campaignId unknown
    const pattern = `flash:res:{*}:${reservationId}`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      const resHash = await redisClient.hgetall(keys[0]);
      if (resHash && resHash.id) {
        if (user.role !== 'admin' && resHash.userId !== user.userId) {
          throw new ForbiddenException('You are not authorized to view this reservation');
        }

        return {
          reservationId: resHash.id,
          campaignId: resHash.campaignId,
          userId: resHash.userId,
          quantity: parseInt(resHash.quantity, 10),
          status: resHash.status || 'ACCEPTED',
          remainingStock: 0,
          expiresAt: new Date(parseInt(resHash.expiresAt, 10)).toISOString(),
          createdAt: new Date(parseInt(resHash.createdAt, 10)).toISOString(),
          dbSyncedAt: null,
          dbTxVersion: null,
        };
      }
    }

    throw new NotFoundException(`Reservation '${reservationId}' not found`);
  }

  async getUserReservations(
    user: AuthenticatedUser,
    query: UserReservationsQueryDto,
  ): Promise<PaginatedResponseDto<UserReservationItemDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.repo.findUserReservations({
      userId: user.userId,
      status: query.status,
      campaignId: query.campaignId,
      limit,
      offset,
    });

    const data: UserReservationItemDto[] = rows.map((r) => ({
      reservationId: r.id,
      campaignId: r.campaign_id,
      campaignTitle: r.campaign_title || r.campaign_id,
      userId: r.user_id,
      quantity: r.quantity,
      status: r.status,
      expiresAt: r.expires_at.toISOString(),
      createdAt: r.created_at.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
