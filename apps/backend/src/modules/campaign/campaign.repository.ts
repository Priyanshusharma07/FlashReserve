import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CampaignSortBy, CampaignStatusFilter } from './dto/list-campaigns.dto.js';

export interface FlashCampaignEntity {
  id: string;
  title: string;
  price_cents: number;
  total_inventory: number;
  reserved_count: number;
  version: number;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CampaignRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(campaign: Omit<FlashCampaignEntity, 'created_at' | 'updated_at' | 'reserved_count' | 'version'>): Promise<FlashCampaignEntity> {
    const query = `
      INSERT INTO flash_campaigns (
        id, title, price_cents, total_inventory, reserved_count, version, starts_at, ends_at
      ) VALUES ($1, $2, $3, $4, 0, 1, $5, $6)
      RETURNING *;
    `;
    const params = [
      campaign.id,
      campaign.title,
      campaign.price_cents,
      campaign.total_inventory,
      campaign.starts_at,
      campaign.ends_at,
    ];

    const result = await this.db.query<FlashCampaignEntity>(query, params);
    return result.rows[0];
  }

  async findById(id: string): Promise<FlashCampaignEntity | null> {
    const query = `SELECT * FROM flash_campaigns WHERE id = $1;`;
    const result = await this.db.query<FlashCampaignEntity>(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<FlashCampaignEntity[]> {
    const query = `SELECT * FROM flash_campaigns ORDER BY starts_at ASC;`;
    const result = await this.db.query<FlashCampaignEntity>(query);
    return result.rows;
  }

  async findWithFilters(options: {
    status?: CampaignStatusFilter;
    search?: string;
    limit: number;
    offset: number;
    sort?: CampaignSortBy;
  }): Promise<FlashCampaignEntity[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.status === CampaignStatusFilter.ACTIVE) {
      conditions.push(`starts_at <= NOW() AND ends_at > NOW()`);
    } else if (options.status === CampaignStatusFilter.UPCOMING) {
      conditions.push(`starts_at > NOW()`);
    } else if (options.status === CampaignStatusFilter.ENDED) {
      conditions.push(`ends_at <= NOW()`);
    }

    if (options.search && options.search.trim().length > 0) {
      conditions.push(`(title ILIKE $${paramIdx} OR id ILIKE $${paramIdx})`);
      params.push(`%${options.search.trim()}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'starts_at ASC';
    if (options.sort === CampaignSortBy.STARTS_AT_DESC) {
      orderBy = 'starts_at DESC';
    } else if (options.sort === CampaignSortBy.CREATED_AT_DESC) {
      orderBy = 'created_at DESC';
    } else if (options.sort === CampaignSortBy.PRICE_ASC) {
      orderBy = 'price_cents ASC';
    } else if (options.sort === CampaignSortBy.PRICE_DESC) {
      orderBy = 'price_cents DESC';
    }

    params.push(options.limit, options.offset);
    const query = `
      SELECT * FROM flash_campaigns
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;

    const result = await this.db.query<FlashCampaignEntity>(query, params);
    return result.rows;
  }

  async countWithFilters(options: {
    status?: CampaignStatusFilter;
    search?: string;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.status === CampaignStatusFilter.ACTIVE) {
      conditions.push(`starts_at <= NOW() AND ends_at > NOW()`);
    } else if (options.status === CampaignStatusFilter.UPCOMING) {
      conditions.push(`starts_at > NOW()`);
    } else if (options.status === CampaignStatusFilter.ENDED) {
      conditions.push(`ends_at <= NOW()`);
    }

    if (options.search && options.search.trim().length > 0) {
      conditions.push(`(title ILIKE $${paramIdx} OR id ILIKE $${paramIdx})`);
      params.push(`%${options.search.trim()}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT COUNT(*)::text as count FROM flash_campaigns ${whereClause};`;

    const result = await this.db.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}
