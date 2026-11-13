import { Injectable, LoggerService as INestLoggerService } from '@nestjs/common';
import { pino, Logger as PinoLogger } from 'pino';

@Injectable()
export class AppLoggerService implements INestLoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            },
          }
        : undefined,
    });
  }

  log(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.info({ context, meta: meta.length ? meta : undefined }, message);
  }

  error(message: string, trace?: string, context?: string, ...meta: unknown[]): void {
    this.logger.error({ context, trace, meta: meta.length ? meta : undefined }, message);
  }

  warn(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.warn({ context, meta: meta.length ? meta : undefined }, message);
  }

  debug(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.debug({ context, meta: meta.length ? meta : undefined }, message);
  }

  verbose(message: string, context?: string, ...meta: unknown[]): void {
    this.logger.trace({ context, meta: meta.length ? meta : undefined }, message);
  }

  child(bindings: Record<string, unknown>): PinoLogger {
    return this.logger.child(bindings);
  }
}
