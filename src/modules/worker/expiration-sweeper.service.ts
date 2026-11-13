import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service.js';
import { AppLoggerService } from '../../common/logging/logger.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { RedisKeys } from '../../redis/redis-keys.js';
import { RedisService } from '../../redis/redis.service.js';
import { ReservationRepository } from '../reservation/reservation.repository.js';

@Injectable()
export class ExpirationSweeperService implements OnModuleInit, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly config: AppConfigService,
    private readonly db: DatabaseService,
    private readonly repo: ReservationRepository,
    private readonly redis: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  onModuleInit(): void {
    if (!this.config.isWorker) {
      return;
    }

    this.isRunning = true;
    this.startSweeperLoop();
    this.logger.log('Expiration sweeper initialized', 'ExpirationSweeper');
  }

  onApplicationShutdown(): void {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.logger.log('Expiration sweeper stopped', 'ExpirationSweeper');
  }

  private startSweeperLoop(): void {
    const interval = this.config.expirationSweeperIntervalMs;
    this.timer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.sweepExpiredReservations();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error during expiration sweep: ${msg}`, undefined, 'ExpirationSweeper');
      }
    }, interval);
  }

  async sweepExpiredReservations(): Promise<number> {
    const expiredList = await this.repo.findExpiredReservations(100);
    if (expiredList.length === 0) {
      return 0;
    }

    let recoveredCount = 0;

    for (const res of expiredList) {
      const recovered = await this.recoverReservation(res.id, res.campaign_id, res.user_id, res.quantity);
      if (recovered) {
        recoveredCount++;
      }
    }

    if (recoveredCount > 0) {
      this.logger.log(`Sweeper successfully recovered ${recoveredCount} expired reservations`, 'ExpirationSweeper');
    }

    return recoveredCount;
  }

  /**
   * Atomically transitions the reservation from RESERVED to EXPIRED in PostgreSQL.
   * If and only if the transition succeeds, releases inventory in Postgres and Redis.
   */
  async recoverReservation(
    reservationId: string,
    campaignId: string,
    userId: string,
    quantity: number,
  ): Promise<boolean> {
    const transitioned = await this.db.withTransaction(async (client) => {
      // Conditional transition: only transitions if current status is RESERVED
      const updateRes = await client.query(
        `
        UPDATE reservations
        SET status = 'EXPIRED',
            db_tx_version = db_tx_version + 1,
            db_synced_at = NOW()
        WHERE id = $1 AND status = 'RESERVED';
        `,
        [reservationId],
      );

      if ((updateRes.rowCount ?? 0) === 0) {
        return false;
      }

      // Reclaim reserved_count in campaign table
      await client.query(
        `
        UPDATE flash_campaigns
        SET reserved_count = GREATEST(0, reserved_count - $1),
            version = version + 1,
            updated_at = NOW()
        WHERE id = $2;
        `,
        [quantity, campaignId],
      );

      return true;
    });

    if (!transitioned) {
      return false;
    }

    // Recover inventory in Redis and emit stream event
    try {
      const redisClient = this.redis.getClient();
      const stockKey = RedisKeys.stockKey(campaignId);
      const userKey = RedisKeys.userReservationKey(campaignId, userId);
      const resKey = RedisKeys.reservationKey(campaignId, reservationId);

      await redisClient.incrby(stockKey, quantity);
      await redisClient.del(userKey);
      await redisClient.hset(resKey, 'status', 'EXPIRED');

      // Append audit event to Redis Streams
      await redisClient.xadd(
        this.config.redisStreamName,
        '*',
        'eventId', reservationId,
        'eventType', 'RESERVATION_EXPIRED',
        'reservationId', reservationId,
        'campaignId', campaignId,
        'userId', userId,
        'quantity', quantity.toString(),
        'timestamp', Date.now().toString(),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Notice: Redis update after Postgres expiration failed: ${msg}`, 'ExpirationSweeper');
    }

    return true;
  }
}
