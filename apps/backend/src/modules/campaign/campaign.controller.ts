import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { Public } from '../../common/auth/public.decorator.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { CampaignService } from './campaign.service.js';
import { CampaignResponseDto } from './dto/campaign-response.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { ListCampaignsQueryDto } from './dto/list-campaigns.dto.js';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new flash sale campaign (Admin only)' })
  @ApiResponse({ status: 201, type: CampaignResponseDto, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  async createCampaign(@Body() dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaignService.createCampaign(dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List campaigns with status filtering, search, and pagination',
    description: 'Returns available campaigns with authoritative live Redis inventory.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto, description: 'Paginated campaign list' })
  async listCampaigns(
    @Query() query: ListCampaignsQueryDto,
  ): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    return this.campaignService.listCampaigns(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get campaign details by ID with authoritative Redis stock' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.getCampaign(id);
  }

  @Post(':id/activate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a campaign and sync stock to Redis (Admin only)' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async activateCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.activateCampaign(id);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a campaign in Redis (Admin only)' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deactivateCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignService.deactivateCampaign(id);
  }
}
