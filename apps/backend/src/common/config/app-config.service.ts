import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppMode, AuthMode, Environment, EnvironmentVariables } from './env.validation.js';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  get nodeEnv(): Environment {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get appMode(): AppMode {
    return this.configService.get('APP_MODE', { infer: true });
  }

  get isWorker(): boolean {
    return this.appMode === AppMode.Worker;
  }

  get isApi(): boolean {
    return this.appMode === AppMode.Api;
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get databaseCaCertPath(): string | undefined {
    return this.configService.get('DATABASE_CA_CERT_PATH', { infer: true });
  }

  get databaseCaCert(): string | undefined {
    return this.configService.get('DATABASE_CA_CERT', { infer: true });
  }

  get pgPoolMax(): number {
    return this.configService.get('PG_POOL_MAX', { infer: true });
  }

  get redisUrl(): string {
    return this.configService.get('REDIS_URL', { infer: true });
  }

  get redisPassword(): string | undefined {
    return this.configService.get('REDIS_PASSWORD', { infer: true });
  }

  get reservationTtlSeconds(): number {
    return this.configService.get('RESERVATION_TTL_SECONDS', { infer: true });
  }

  get maxReservationQuantity(): number {
    return this.configService.get('MAX_RESERVATION_QUANTITY', { infer: true });
  }

  get redisStreamName(): string {
    return this.configService.get('REDIS_STREAM_NAME', { infer: true });
  }

  get redisConsumerGroup(): string {
    return this.configService.get('REDIS_CONSUMER_GROUP', { infer: true });
  }

  get workerConsumerName(): string {
    return this.configService.get('WORKER_CONSUMER_NAME', { infer: true });
  }

  get persistenceBatchSize(): number {
    return this.configService.get('PERSISTENCE_BATCH_SIZE', { infer: true });
  }

  get persistenceBatchIntervalMs(): number {
    return this.configService.get('PERSISTENCE_BATCH_INTERVAL_MS', { infer: true });
  }

  get expirationSweeperIntervalMs(): number {
    return this.configService.get('EXPIRATION_SWEEPER_INTERVAL_MS', { infer: true });
  }

  get authMode(): AuthMode {
    return this.configService.get('AUTH_MODE', { infer: true });
  }

  get pasetoSecretKey(): string | undefined {
    return this.configService.get('PASETO_SECRET_KEY', { infer: true });
  }

  get logLevel(): string {
    return this.configService.get('LOG_LEVEL', { infer: true });
  }
}
