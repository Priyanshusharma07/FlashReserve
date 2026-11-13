import { Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigService } from '../../common/config/app-config.service.js';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { DatabaseService } from '../../database/database.service.js';
import { RedisKeys } from '../../redis/redis-keys.js';
import { RedisService } from '../../redis/redis.service.js';
import { CampaignRepository } from '../campaign/campaign.repository.js';
import { CampaignService } from '../campaign/campaign.service.js';
import { CampaignResponseDto } from '../campaign/dto/campaign-response.dto.js';
import { ListCampaignsQueryDto } from '../campaign/dto/list-campaigns.dto.js';
import { ReservationRepository } from '../reservation/reservation.repository.js';
import { AdminRepository } from './admin.repository.js';
import { AdminCampaignInventoryDto } from './dto/admin-inventory.dto.js';
import { AdminMetricsSummaryDto } from './dto/admin-metrics.dto.js';
import {
  AdminReservationDetailDto,
  AdminReservationsQueryDto,
} from './dto/admin-reservation.dto.js';
import { AdminDashboardSummaryDto } from './dto/admin-summary.dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository,
    private readonly campaignRepo: CampaignRepository,
    private readonly campaignService: CampaignService,
    private readonly reservationRepo: ReservationRepository,
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
    private readonly config: AppConfigService,
  ) {}

  async getDashboardSummary(): Promise<AdminDashboardSummaryDto> {
    const [campaigns, reservations] = await Promise.all([
      this.adminRepo.getCampaignSummary(),
      this.adminRepo.getReservationSummary(),
    ]);

    return {
      campaigns,
      reservations,
      generatedAt: new Date().toISOString(),
    };
  }

  async getCampaigns(query: ListCampaignsQueryDto): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    return this.campaignService.listCampaigns(query);
  }

  async getCampaign(id: string): Promise<CampaignResponseDto> {
    return this.campaignService.getCampaign(id);
  }

  async getCampaignInventory(campaignId: string): Promise<AdminCampaignInventoryDto> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign '${campaignId}' not found`);
    }

    const redisClient = this.redis.getClient();
    const stockStr = await redisClient.get(RedisKeys.stockKey(campaignId));
    const availableStockRedis = stockStr !== null
      ? parseInt(stockStr, 10)
      : campaign.total_inventory - campaign.reserved_count;

    const counts = await this.adminRepo.getCampaignReservationCounts(campaignId);

    // Expected available inventory: total_inventory - (active reserved + paid units)
    const expectedAvailable = campaign.total_inventory - (counts.activeReserved + counts.paid);
    const driftDetected = availableStockRedis !== expectedAvailable;

    let reconciliationStatus = 'Authoritative Redis inventory counter matches database state.';
    if (driftDetected) {
      const delta = availableStockRedis - expectedAvailable;
      reconciliationStatus = `Notice: Redis stock (${availableStockRedis}) differs from DB records by ${delta} unit(s). This is normal during in-flight stream persistence batches.`;
    }

    return {
      campaignId: campaign.id,
      title: campaign.title,
      initialStock: campaign.total_inventory,
      availableStockRedis: Math.max(0, availableStockRedis),
      persistedReservedCount: campaign.reserved_count,
      activeReservedUnits: counts.activeReserved,
      paidUnits: counts.paid,
      expiredUnits: counts.expired,
      cancelledUnits: counts.cancelled,
      driftDetected,
      reconciliationStatus,
    };
  }

  async getReservations(query: AdminReservationsQueryDto): Promise<PaginatedResponseDto<AdminReservationDetailDto>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.reservationRepo.findAllReservationsWithFilters({
      search: query.search,
      campaignId: query.campaignId,
      status: query.status,
      userId: query.userId,
      from: query.from,
      to: query.to,
      limit,
      offset,
    });

    const data: AdminReservationDetailDto[] = rows.map((r) => ({
      reservationId: r.id,
      campaignId: r.campaign_id,
      campaignTitle: r.campaign_title || r.campaign_id,
      userId: r.user_id,
      quantity: r.quantity,
      status: r.status,
      expiresAt: r.expires_at.toISOString(),
      createdAt: r.created_at.toISOString(),
      dbSyncedAt: r.db_synced_at ? r.db_synced_at.toISOString() : null,
      dbTxVersion: r.db_tx_version,
      isLiveInBuffer: false,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getReservation(reservationId: string): Promise<AdminReservationDetailDto> {
    // 1. Check PostgreSQL
    const dbRecord = await this.reservationRepo.findById(reservationId);
    if (dbRecord) {
      const campaign = await this.campaignRepo.findById(dbRecord.campaign_id);
      return {
        reservationId: dbRecord.id,
        campaignId: dbRecord.campaign_id,
        campaignTitle: campaign?.title || dbRecord.campaign_id,
        userId: dbRecord.user_id,
        quantity: dbRecord.quantity,
        status: dbRecord.status,
        expiresAt: dbRecord.expires_at.toISOString(),
        createdAt: dbRecord.created_at.toISOString(),
        dbSyncedAt: dbRecord.db_synced_at ? dbRecord.db_synced_at.toISOString() : null,
        dbTxVersion: dbRecord.db_tx_version,
        isLiveInBuffer: false,
      };
    }

    // 2. Check Redis buffer
    const redisClient = this.redis.getClient();
    const pattern = `flash:res:{*}:${reservationId}`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      const resHash = await redisClient.hgetall(keys[0]);
      if (resHash && resHash.id) {
        const campaign = await this.campaignRepo.findById(resHash.campaignId);
        return {
          reservationId: resHash.id,
          campaignId: resHash.campaignId,
          campaignTitle: campaign?.title || resHash.campaignId,
          userId: resHash.userId,
          quantity: parseInt(resHash.quantity, 10),
          status: resHash.status || 'ACCEPTED',
          expiresAt: new Date(parseInt(resHash.expiresAt, 10)).toISOString(),
          createdAt: new Date(parseInt(resHash.createdAt, 10)).toISOString(),
          dbSyncedAt: null,
          dbTxVersion: null,
          isLiveInBuffer: true,
        };
      }
    }

    throw new NotFoundException(`Reservation '${reservationId}' not found`);
  }

  async getMetricsSummary(): Promise<AdminMetricsSummaryDto> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.db.isHealthy(),
      this.redis.isHealthy(),
    ]);

    const redisClient = this.redis.getClient();
    let streamLength = 0;
    let streamPendingCount = 0;

    try {
      streamLength = await redisClient.xlen(this.config.redisStreamName);
      const pendingInfo = await redisClient.xpending(
        this.config.redisStreamName,
        this.config.redisConsumerGroup,
      ) as unknown as [number, string, string, Array<[string, string]>];
      if (Array.isArray(pendingInfo) && typeof pendingInfo[0] === 'number') {
        streamPendingCount = pendingInfo[0];
      }
    } catch {
      // Stream or consumer group may be uninitialized if no events queued yet
    }

    return {
      infrastructure: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      worker: {
        streamPendingCount,
        streamLength,
        consumerGroup: this.config.redisConsumerGroup,
        status: streamPendingCount > 100 ? 'active' : 'idle',
      },
      reservations: {
        successful: 0,
        rejected: 0,
        expiredReclaimed: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

