import {
  Controller,
  Get,
  Param,
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
import { Roles } from '../../common/auth/roles.decorator.js';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { CampaignResponseDto } from '../campaign/dto/campaign-response.dto.js';
import { ListCampaignsQueryDto } from '../campaign/dto/list-campaigns.dto.js';
import { AdminService } from './admin.service.js';
import { AdminCampaignInventoryDto } from './dto/admin-inventory.dto.js';
import { AdminMetricsSummaryDto } from './dto/admin-metrics.dto.js';
import {
  AdminReservationDetailDto,
  AdminReservationsQueryDto,
} from './dto/admin-reservation.dto.js';
import { AdminDashboardSummaryDto } from './dto/admin-summary.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/summary')
  @ApiOperation({
    summary: 'Retrieve aggregate dashboard summary KPIs (Admin only)',
    description: 'Executes efficient SQL aggregation queries for campaign lifecycle counts, reservation statuses, and revenue.',
  })
  @ApiResponse({ status: 200, type: AdminDashboardSummaryDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  async getDashboardSummary(): Promise<AdminDashboardSummaryDto> {
    return this.adminService.getDashboardSummary();
  }

  @Get('campaigns')
  @ApiOperation({
    summary: 'Administrative campaign listing with filters and pagination (Admin only)',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  async getCampaigns(
    @Query() query: ListCampaignsQueryDto,
  ): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    return this.adminService.getCampaigns(query);
  }

  @Get('campaigns/:id')
  @ApiOperation({
    summary: 'Get complete campaign operational detail (Admin only)',
  })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.adminService.getCampaign(id);
  }

  @Get('campaigns/:id/inventory')
  @ApiOperation({
    summary: 'Campaign inventory reconciliation and audit (Admin only)',
    description: 'Audits authoritative Redis counter against PostgreSQL reservations to detect allocation drift or stream lag.',
  })
  @ApiResponse({ status: 200, type: AdminCampaignInventoryDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignInventory(@Param('id') id: string): Promise<AdminCampaignInventoryDto> {
    return this.adminService.getCampaignInventory(id);
  }

  @Get('reservations')
  @ApiOperation({
    summary: 'Searchable and filterable reservations table (Admin only)',
    description: 'Returns paginated reservation records with status, campaign, customer, and date range filters.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  async getReservations(
    @Query() query: AdminReservationsQueryDto,
  ): Promise<PaginatedResponseDto<AdminReservationDetailDto>> {
    return this.adminService.getReservations(query);
  }

  @Get('reservations/:id')
  @ApiOperation({
    summary: 'Get operational reservation details (Admin only)',
  })
  @ApiResponse({ status: 200, type: AdminReservationDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async getReservation(@Param('id') id: string): Promise<AdminReservationDetailDto> {
    return this.adminService.getReservation(id);
  }

  @Get('metrics/summary')
  @ApiOperation({
    summary: 'UI-friendly operational metrics and worker health summary (Admin only)',
    description: 'Returns structured metrics on stream pending lag, queue sizes, and infrastructure health without parsing raw Prometheus text.',
  })
  @ApiResponse({ status: 200, type: AdminMetricsSummaryDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires admin role' })
  async getMetricsSummary(): Promise<AdminMetricsSummaryDto> {
    return this.adminService.getMetricsSummary();
  }
}

