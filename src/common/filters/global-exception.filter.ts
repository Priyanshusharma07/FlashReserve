import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ulid } from 'ulidx';
import { AppLoggerService } from '../logging/logger.service.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      ulid();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorTitle = 'Internal Server Error';
    let message: string | string[] = 'An unexpected internal error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorTitle = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) || exception.message;
        errorTitle = (resObj.error as string) || exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
        'GlobalExceptionFilter',
        { correlationId, path: request.url, method: request.method },
      );
    }

    if (status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(
        `Client error [${status}] on ${request.method} ${request.url}: ${JSON.stringify(message)}`,
        'GlobalExceptionFilter',
        { correlationId, status, path: request.url },
      );
    }

    const errorPayload = {
      statusCode: status,
      error: errorTitle,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).header('x-correlation-id', correlationId).send(errorPayload);
  }
}
