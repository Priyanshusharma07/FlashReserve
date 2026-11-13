import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../common/config/app-config.service.js';
import { AppLoggerService } from '../common/logging/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private reserveScriptSha?: string;
  private reserveScriptContent?: string;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.redisUrl;
    this.client = new Redis(url, {
      password: this.configService.redisPassword,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack, 'RedisService');
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis', 'RedisService');
    });

    try {
      await this.loadLuaScripts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not load Lua scripts on boot (will retry upon connection): ${msg}`, 'RedisService');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected gracefully', 'RedisService');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async loadLuaScripts(): Promise<void> {
    const scriptPath = join(
      __dirname,
      '../modules/reservation/lua/reserve_stock.lua',
    );
    this.reserveScriptContent = await readFile(scriptPath, 'utf-8');
    this.reserveScriptSha = await this.client.script(
      'LOAD',
      this.reserveScriptContent,
    ) as string;
    this.logger.log(
      `Loaded reserve_stock.lua with SHA: ${this.reserveScriptSha}`,
      'RedisService',
    );
  }

  /**
   * Executes the atomic reservation Lua script via EVALSHA,
   * falling back to SCRIPT LOAD + retry if NOSCRIPT is encountered.
   */
  async executeReserveScript(
    keys: string[],
    args: (string | number)[],
  ): Promise<[string, string, string?]> {
    if (!this.reserveScriptSha) {
      await this.loadLuaScripts();
    }

    try {
      const result = await this.client.evalsha(
        this.reserveScriptSha!,
        keys.length,
        ...keys,
        ...args,
      ) as [string, string, string?];
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NOSCRIPT')) {
        this.logger.warn('Redis script cache flushed (NOSCRIPT). Reloading Lua scripts...', 'RedisService');
        await this.loadLuaScripts();
        const result = await this.client.evalsha(
          this.reserveScriptSha!,
          keys.length,
          ...keys,
          ...args,
        ) as [string, string, string?];
        return result;
      }
      throw err;
    }
  }

  /**
   * Ensures consumer group exists for Redis Streams.
   */
  async ensureConsumerGroup(streamName: string, groupName: string): Promise<void> {
    try {
      // MKSTREAM creates the stream if it does not already exist
      await this.client.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');
      this.logger.log(`Created consumer group '${groupName}' for stream '${streamName}'`, 'RedisService');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('BUSYGROUP')) {
        // Group already exists, which is normal on restart
        return;
      }
      this.logger.error(`Error ensuring consumer group: ${msg}`, undefined, 'RedisService');
      throw err;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
