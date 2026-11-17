import fs from 'node:fs';
import path from 'node:path';
import { Injectable, LoggerService as INestLoggerService } from '@nestjs/common';
import { pino, Logger as PinoLogger, Level } from 'pino';
import pretty from 'pino-pretty';

@Injectable()
export class AppLoggerService implements INestLoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';
    const logLevel = (process.env.LOG_LEVEL || 'info') as Level;

    // Resolve persistent log directory (e.g. apps/backend/logs or configured LOG_DIR)
    const baseDir = process.env.LOG_DIR
      ? path.resolve(process.env.LOG_DIR)
      : fs.existsSync(path.resolve(process.cwd(), 'apps/backend'))
        ? path.resolve(process.cwd(), 'apps/backend/logs')
        : path.resolve(process.cwd(), 'logs');

    try {
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
    } catch {
      // Ignore if directory creation fails in restricted environments
    }

    const appLogPath = path.join(baseDir, 'app.log');
    const errorLogPath = path.join(baseDir, 'error.log');

    const appFileStream = pretty({
      colorize: false,
      singleLine: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      destination: fs.createWriteStream(appLogPath, { flags: 'a' }),
    });

    const errorFileStream = pretty({
      colorize: false,
      singleLine: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      destination: fs.createWriteStream(errorLogPath, { flags: 'a' }),
    });

    const consoleStream = isDev
      ? pretty({
          colorize: true,
          singleLine: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        })
      : process.stdout;

    const streams: { stream: NodeJS.WritableStream; level?: Level }[] = [
      { stream: consoleStream, level: logLevel },
      { stream: appFileStream, level: logLevel },
      { stream: errorFileStream, level: 'error' },
    ];

    this.logger = pino(
      {
        level: logLevel,
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.multistream(streams),
    );
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
