import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ulid } from 'ulidx';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { AppLoggerService } from '../../common/logging/logger.service.js';
import { RedisKeys } from '../../redis/redis-keys.js';
import { RedisService } from '../../redis/redis.service.js';
import { CampaignRepository, FlashCampaignEntity } from './campaign.repository.js';
import { CampaignResponseDto } from './dto/campaign-response.dto.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { ListCampaignsQueryDto } from './dto/list-campaigns.dto.js';

@Injectable()
export class CampaignService {
  constructor(
    private readonly repo: CampaignRepository,
    private readonly redis: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  async createCampaign(dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('endsAt must be chronologically after startsAt');
    }

    const campaignId = `camp_${ulid()}`;

    const entity = await this.repo.create({
      id: campaignId,
      title: dto.title,
      price_cents: dto.priceCents,
      total_inventory: dto.totalInventory,
      starts_at: startsAt,
      ends_at: endsAt,
    });

    // Auto-initialize into Redis
    await this.syncToRedis(entity, true);

    this.logger.log(`Created and synced campaign: ${campaignId}`, 'CampaignService');
    return this.mapToDto(entity, dto.totalInventory, true);
  }

  async getCampaign(id: string): Promise<CampaignResponseDto> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException(`Campaign with ID '${id}' not found`);
    }

    const client = this.redis.getClient();
    const stockStr = await client.get(RedisKeys.stockKey(id));
    const meta = await client.hgetall(RedisKeys.metaKey(id));

    const availableInventory = stockStr !== null
      ? parseInt(stockStr, 10)
      : entity.total_inventory - entity.reserved_count;

    const isActive = meta?.isActive === 'true';

    return this.mapToDto(entity, availableInventory, isActive);
  }

  async listCampaigns(query?: ListCampaignsQueryDto): Promise<PaginatedResponseDto<CampaignResponseDto>> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const [entities, total] = await Promise.all([
      this.repo.findWithFilters({
        status: query?.status,
        search: query?.search,
        limit,
        offset,
        sort: query?.sort,
      }),
      this.repo.countWithFilters({
        status: query?.status,
        search: query?.search,
      }),
    ]);

    const data = await Promise.all(
      entities.map(async (entity) => {
        const client = this.redis.getClient();
        const stockStr = await client.get(RedisKeys.stockKey(entity.id));
        const meta = await client.hgetall(RedisKeys.metaKey(entity.id));
        const availableInventory = stockStr !== null
          ? parseInt(stockStr, 10)
          : entity.total_inventory - entity.reserved_count;
        return this.mapToDto(entity, availableInventory, meta?.isActive === 'true');
      }),
    );

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

  async activateCampaign(id: string): Promise<CampaignResponseDto> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException(`Campaign with ID '${id}' not found`);
    }

    await this.syncToRedis(entity, true);
    return this.getCampaign(id);
  }

  async deactivateCampaign(id: string): Promise<CampaignResponseDto> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException(`Campaign with ID '${id}' not found`);
    }

    const client = this.redis.getClient();
    await client.hset(RedisKeys.metaKey(id), 'isActive', 'false');
    return this.getCampaign(id);
  }

  private async syncToRedis(entity: FlashCampaignEntity, isActive: boolean): Promise<void> {
    const client = this.redis.getClient();
    const stockKey = RedisKeys.stockKey(entity.id);
    const metaKey = RedisKeys.metaKey(entity.id);

    // Initial atomic stock setting
    await client.set(stockKey, entity.total_inventory.toString());

    // Campaign metadata
    await client.hmset(metaKey, {
      id: entity.id,
      title: entity.title,
      priceCents: entity.price_cents.toString(),
      totalInventory: entity.total_inventory.toString(),
      startsAt: entity.starts_at.toISOString(),
      endsAt: entity.ends_at.toISOString(),
      isActive: isActive ? 'true' : 'false',
    });
  }

  private mapToDto(
    entity: FlashCampaignEntity,
    availableInventory: number,
    isActive: boolean,
  ): CampaignResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      priceCents: entity.price_cents,
      totalInventory: entity.total_inventory,
      reservedCount: entity.reserved_count,
      availableInventory: Math.max(0, availableInventory),
      isActive,
      version: entity.version,
      startsAt: entity.starts_at.toISOString(),
      endsAt: entity.ends_at.toISOString(),
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    };
  }
}
