import { Module } from '@nestjs/common';
import { AuthModule } from './common/auth/auth.module.js';
import { AppConfigModule } from './common/config/config.module.js';
import { LoggingModule } from './common/logging/logging.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { CampaignModule } from './modules/campaign/campaign.module.js';
import { CheckoutModule } from './modules/checkout/checkout.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { ReservationModule } from './modules/reservation/reservation.module.js';
import { WorkerModule } from './modules/worker/worker.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    AuthModule,
    DatabaseModule,
    RedisModule,
    MetricsModule,
    HealthModule,
    CampaignModule,
    ReservationModule,
    CheckoutModule,
    AdminModule,
    WorkerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
