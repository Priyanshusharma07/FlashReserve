import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller.js';
import { CampaignRepository } from './campaign.repository.js';
import { CampaignService } from './campaign.service.js';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService, CampaignRepository],
  exports: [CampaignService, CampaignRepository],
})
export class CampaignModule {}
