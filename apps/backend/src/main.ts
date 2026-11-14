import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AppConfigService } from './common/config/app-config.service.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AppLoggerService } from './common/logging/logger.service.js';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    logger: false, // We use custom Pino logger
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { bufferLogs: true },
  );

  const configService = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Enable CORS for frontend integration (Next.js storefront & admin dashboard)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'idempotency-key',
      'Idempotency-Key',
      'X-Requested-With',
    ],
  });

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (configService.isApi) {
    // Configure Swagger Documentation for API Mode
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FlashReserve Engine API')
      .setDescription(
        'High-Concurrency Flash-Sale & Inventory Reservation Engine OpenAPI Documentation.\n\n' +
        '### How to Authenticate in Swagger UI:\n' +
        '1. **Quick Test**: Click the green **Authorize** button (top right) and enter `dev-user-1001` (for reservations/checkout) or `dev-admin-1` (for campaign admin).\n' +
        '2. **Generate Token**: Or call `POST /api/v1/auth/token` below to generate a token and paste it into Authorize.\n' +
        '3. **Payment Token**: On checkout (`/pay`), any placeholder token like `tok_visa_4242` works for simulated payment.',
      )
      .setVersion('1.0.0')
      .addTag('Authentication', 'Generate Bearer tokens for Swagger UI testing')
      .addTag('Reservations', 'Atomic inventory reservations and read endpoints')
      .addTag('Campaigns', 'Flash-sale campaign lifecycle and management')
      .addTag('Checkout', 'Transactional checkout and payment confirmation')
      .addTag('Admin', 'Operations and dashboard APIs for administrators')
      .addTag('Health', 'Kubernetes liveness and readiness probes')
      .addTag('Metrics', 'Prometheus monitoring metrics')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'PASETO / dev token',
          description: 'Bearer token. In dev mode enter `dev-user-<id>` or `dev-admin-<id>`.',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    const port = configService.port;
    await app.listen(port, '0.0.0.0');
    logger.log(`API Engine running on: http://localhost:${port}`, 'Bootstrap');
    logger.log(`Swagger documentation: http://localhost:${port}/api`, 'Bootstrap');
    logger.log(`Prometheus metrics: http://localhost:${port}/metrics`, 'Bootstrap');
  } else {
    // Worker Mode
    const port = configService.port;
    await app.listen(port, '0.0.0.0');
    logger.log(`Worker Engine running on port: ${port}`, 'Bootstrap');
    logger.log('Persistence stream consumer and expiration sweeper active', 'Bootstrap');
  }
}

await bootstrap();
