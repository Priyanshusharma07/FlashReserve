import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { AppConfigService } from '../common/config/app-config.service.js';
import { AppLoggerService } from '../common/logging/logger.service.js';
import { runMigrations } from './migrations/migration-runner.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: pg.Pool;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    let ssl: pg.ConnectionConfig['ssl'] = undefined;
    let ca = this.configService.databaseCaCert;

    if (!ca && this.configService.databaseCaCertPath) {
      try {
        const fullPath = path.isAbsolute(this.configService.databaseCaCertPath)
          ? this.configService.databaseCaCertPath
          : path.join(process.cwd(), this.configService.databaseCaCertPath);
        if (fs.existsSync(fullPath)) {
          ca = fs.readFileSync(fullPath, 'utf-8');
        }
      } catch (err) {
        this.logger.warn(`Could not read CA certificate from ${this.configService.databaseCaCertPath}: ${err}`, 'DatabaseService');
      }
    }

    let connectionUrl = this.configService.databaseUrl;
    if (ca) {
      ssl = {
        rejectUnauthorized: true,
        ca,
      };
      try {
        const parsed = new URL(connectionUrl);
        parsed.searchParams.delete('sslmode');
        connectionUrl = parsed.toString();
      } catch {
        // Leave as is if not a full parseable URL
      }
    } else {
      const isCloudDb =
        this.configService.databaseUrl.includes('sslmode') ||
        this.configService.databaseUrl.includes('neon.tech') ||
        this.configService.databaseUrl.includes('aivencloud.com');
      if (isCloudDb) {
        ssl = { rejectUnauthorized: false };
      }
    }

    this.pool = new pg.Pool({
      connectionString: connectionUrl,
      max: this.configService.pgPoolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected error on idle pg client: ${err.message}`, err.stack, 'DatabaseService');
    });

    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log('PostgreSQL connection pool initialized successfully', 'DatabaseService');

      // Automatically run pending migrations
      await runMigrations(this.pool);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PostgreSQL initialization notice (will retry on demand): ${msg}`, 'DatabaseService');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('PostgreSQL connection pool closed', 'DatabaseService');
    }
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (duration > 100) {
        this.logger.warn(`Slow query (${duration}ms): ${text.slice(0, 100)}`, 'DatabaseService');
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database query failed: ${msg} | SQL: ${text}`, undefined, 'DatabaseService');
      throw err;
    }
  }

  async withTransaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  getPool(): pg.Pool {
    return this.pool;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
