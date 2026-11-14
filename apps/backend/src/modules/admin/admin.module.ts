import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { CampaignModule } from '../campaign/campaign.module.js';
import { ReservationModule } from '../reservation/reservation.module.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [DatabaseModule, RedisModule, CampaignModule, ReservationModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}

