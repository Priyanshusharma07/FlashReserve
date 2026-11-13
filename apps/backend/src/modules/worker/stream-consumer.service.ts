import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service.js';
import { AppLoggerService } from '../../common/logging/logger.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  ReservationBatchItem,
  ReservationRepository,
} from '../reservation/reservation.repository.js';

interface StreamParsedMessage {
  messageId: string;
  item: ReservationBatchItem;
}

@Injectable()
export class StreamConsumerService implements OnModuleInit, OnApplicationShutdown {
  private isRunning = false;
  private loopTimer?: NodeJS.Timeout;
  private pendingClaimTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
    private readonly reservationRepo: ReservationRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.isWorker) {
      this.logger.log('APP_MODE is not worker; StreamConsumer will remain dormant', 'StreamConsumer');
      return;
    }

    try {
      await this.redis.ensureConsumerGroup(
        this.config.redisStreamName,
        this.config.redisConsumerGroup,
      );
      this.isRunning = true;
      this.startConsumerLoop();
      this.startPendingRecoveryLoop();
      this.logger.log(`Persistence worker started as consumer '${this.config.workerConsumerName}'`, 'StreamConsumer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to start stream consumer: ${msg}`, undefined, 'StreamConsumer');
    }
  }

  onApplicationShutdown(): void {
    this.isRunning = false;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    if (this.pendingClaimTimer) clearInterval(this.pendingClaimTimer);
    this.logger.log('Stream consumer shut down gracefully', 'StreamConsumer');
  }

  private startConsumerLoop(): void {
    const processLoop = async () => {
      if (!this.isRunning) return;

      try {
        await this.readAndProcessBatch('>');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error in consumer loop: ${msg}`, undefined, 'StreamConsumer');
      }

      if (this.isRunning) {
        this.loopTimer = setTimeout(processLoop, this.config.persistenceBatchIntervalMs);
      }
    };

    this.loopTimer = setTimeout(processLoop, this.config.persistenceBatchIntervalMs);
  }

  /**
   * Periodically claims pending messages using XAUTOCLAIM that may have timed out
   * (e.g. from crashed consumer workers).
   */
  private startPendingRecoveryLoop(): void {
    const intervalMs = 10000;
    this.pendingClaimTimer = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.claimAndProcessPending();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Error during pending auto-claim: ${msg}`, 'StreamConsumer');
      }
    }, intervalMs);
  }

  private async readAndProcessBatch(idPosition: string): Promise<number> {
    const redisClient = this.redis.getClient();
    const batchSize = this.config.persistenceBatchSize;

    // XREADGROUP GROUP <group> <consumer> COUNT <batchSize> BLOCK 50 STREAMS <stream> <idPosition>
    const streamResults = await redisClient.xreadgroup(
      'GROUP',
      this.config.redisConsumerGroup,
      this.config.workerConsumerName,
      'COUNT',
      batchSize,
      'BLOCK',
      50,
      'STREAMS',
      this.config.redisStreamName,
      idPosition,
    ) as [string, [string, string[]][]][] | null;

    if (!streamResults || streamResults.length === 0) {
      return 0;
    }

    const messages = streamResults[0][1];
    if (!messages || messages.length === 0) {
      return 0;
    }

    const parsedMessages: StreamParsedMessage[] = [];

    for (const [messageId, fieldArray] of messages) {
      const fields: Record<string, string> = {};
      for (let i = 0; i < fieldArray.length; i += 2) {
        fields[fieldArray[i]] = fieldArray[i + 1];
      }

      if (fields.eventType === 'RESERVATION_CREATED' && fields.reservationId) {
        parsedMessages.push({
          messageId,
          item: {
            id: fields.reservationId,
            campaignId: fields.campaignId,
            userId: fields.userId,
            quantity: parseInt(fields.quantity || '1', 10),
            status: fields.status || 'RESERVED',
            expiresAt: new Date(parseInt(fields.expiresAt || '0', 10)),
            createdAt: new Date(parseInt(fields.timestamp || '0', 10)),
          },
        });
      }
    }

    if (parsedMessages.length === 0) {
      // Acknowledge non-actionable messages
      const ackIds = messages.map((m) => m[0]);
      await redisClient.xack(this.config.redisStreamName, this.config.redisConsumerGroup, ...ackIds);
      return 0;
    }

    // Persist batch inside a single PostgreSQL transaction
    await this.db.withTransaction(async (client) => {
      const items = parsedMessages.map((p) => p.item);
      const result = await this.reservationRepo.persistBatchInTx(client, items);
      this.logger.debug(
        `Batch processed: ${parsedMessages.length} events, ${result.insertedCount} inserted into Postgres`,
        'StreamConsumer',
      );
    });

    // Acknowledge ONLY AFTER transaction commit succeeds
    const messageIdsToAck = parsedMessages.map((p) => p.messageId);
    await redisClient.xack(
      this.config.redisStreamName,
      this.config.redisConsumerGroup,
      ...messageIdsToAck,
    );

    return parsedMessages.length;
  }

  private async claimAndProcessPending(): Promise<void> {
    const redisClient = this.redis.getClient();
    const minIdleTimeMs = 5000;
    const count = 100;

    // XAUTOCLAIM <stream> <group> <consumer> <min-idle-time> <start-id> [COUNT <count>]
    const claimResult = await redisClient.xautoclaim(
      this.config.redisStreamName,
      this.config.redisConsumerGroup,
      this.config.workerConsumerName,
      minIdleTimeMs,
      '0-0',
      'COUNT',
      count,
    ) as [string, [string, string[]][]];

    const messages = claimResult[1];
    if (!messages || messages.length === 0) {
      return;
    }

    this.logger.log(`Recovered and claimed ${messages.length} pending stream messages`, 'StreamConsumer');

    const parsedMessages: StreamParsedMessage[] = [];
    for (const [messageId, fieldArray] of messages) {
      const fields: Record<string, string> = {};
      for (let i = 0; i < fieldArray.length; i += 2) {
        fields[fieldArray[i]] = fieldArray[i + 1];
      }

      if (fields.eventType === 'RESERVATION_CREATED' && fields.reservationId) {
        parsedMessages.push({
          messageId,
          item: {
            id: fields.reservationId,
            campaignId: fields.campaignId,
            userId: fields.userId,
            quantity: parseInt(fields.quantity || '1', 10),
            status: fields.status || 'RESERVED',
            expiresAt: new Date(parseInt(fields.expiresAt || '0', 10)),
            createdAt: new Date(parseInt(fields.timestamp || '0', 10)),
          },
        });
      }
    }

    if (parsedMessages.length > 0) {
      await this.db.withTransaction(async (client) => {
        const items = parsedMessages.map((p) => p.item);
        await this.reservationRepo.persistBatchInTx(client, items);
      });

      const ackIds = parsedMessages.map((p) => p.messageId);
      await redisClient.xack(
        this.config.redisStreamName,
        this.config.redisConsumerGroup,
        ...ackIds,
      );
    }
  }
}
