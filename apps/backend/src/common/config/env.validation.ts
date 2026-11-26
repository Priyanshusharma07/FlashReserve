import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum AppMode {
  Api = 'api',
  Worker = 'worker',
  All = 'all',
}

export enum AuthMode {
  Dev = 'dev',
  Paseto = 'paseto',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1024)
  @IsOptional()
  PORT: number = 3000;

  @IsEnum(AppMode)
  @IsOptional()
  APP_MODE: AppMode = AppMode.Api;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string = 'postgresql://flashuser:flashpassword@localhost:5432/flashreserve';

  @IsString()
  @IsOptional()
  DATABASE_CA_CERT_PATH?: string;

  @IsString()
  @IsOptional()
  DATABASE_CA_CERT?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  PG_POOL_MAX: number = 20;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  RESERVATION_TTL_SECONDS: number = 600;

  @IsInt()
  @IsPositive()
  @IsOptional()
  MAX_RESERVATION_QUANTITY: number = 5;

  @IsString()
  @IsOptional()
  REDIS_STREAM_NAME: string = 'stream:reservations';

  @IsString()
  @IsOptional()
  REDIS_CONSUMER_GROUP: string = 'flash_workers_group';

  @IsString()
  @IsOptional()
  WORKER_CONSUMER_NAME: string = 'worker-node-1';

  @IsInt()
  @IsPositive()
  @IsOptional()
  PERSISTENCE_BATCH_SIZE: number = 500;

  @IsInt()
  @IsPositive()
  @IsOptional()
  PERSISTENCE_BATCH_INTERVAL_MS: number = 50;

  @IsInt()
  @IsPositive()
  @IsOptional()
  EXPIRATION_SWEEPER_INTERVAL_MS: number = 15000;

  @IsEnum(AuthMode)
  @IsOptional()
  AUTH_MODE: AuthMode = AuthMode.Dev;

  @IsString()
  @IsOptional()
  PASETO_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

export function validateConfig(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const errorDetails = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Config validation error: ${errorDetails}`);
  }

  return validatedConfig;
}
