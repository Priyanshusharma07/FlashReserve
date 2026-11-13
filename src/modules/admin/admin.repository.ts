import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CampaignSummaryDto, ReservationSummaryDto } from './dto/admin-summary.dto.js';

@Injectable()
export class AdminRepository {
  constructor(private readonly db: DatabaseService) {}

  async getCampaignSummary(): Promise<CampaignSummaryDto> {
    const query = `
      SELECT
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE starts_at <= NOW() AND ends_at > NOW())::text as active,
        COUNT(*) FILTER (WHERE starts_at > NOW())::text as upcoming,
        COUNT(*) FILTER (WHERE ends_at <= NOW())::text as ended,
        COALESCE(SUM(total_inventory), 0)::text as total_inventory,
        COALESCE(SUM(reserved_count), 0)::text as total_reserved_units
      FROM flash_campaigns;
    `;
    const res = await this.db.query<{
      total: string;
      active: string;
      upcoming: string;
      ended: string;
      total_inventory: string;
      total_reserved_units: string;
    }>(query);

    const row = res.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      active: parseInt(row?.active || '0', 10),
      upcoming: parseInt(row?.upcoming || '0', 10),
      ended: parseInt(row?.ended || '0', 10),
      totalInventory: parseInt(row?.total_inventory || '0', 10),
      totalReservedUnits: parseInt(row?.total_reserved_units || '0', 10),
    };
  }

  async getReservationSummary(): Promise<ReservationSummaryDto> {
    const query = `
      SELECT
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE r.status = 'RESERVED')::text as reserved,
        COUNT(*) FILTER (WHERE r.status = 'PAID')::text as paid,
        COUNT(*) FILTER (WHERE r.status = 'EXPIRED')::text as expired,
        COUNT(*) FILTER (WHERE r.status = 'CANCELLED')::text as cancelled,
        COALESCE(SUM(r.quantity * c.price_cents) FILTER (WHERE r.status = 'PAID'), 0)::text as total_revenue_cents
      FROM reservations r
      LEFT JOIN flash_campaigns c ON r.campaign_id = c.id;
    `;
    const res = await this.db.query<{
      total: string;
      reserved: string;
      paid: string;
      expired: string;
      cancelled: string;
      total_revenue_cents: string;
    }>(query);

    const row = res.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      reserved: parseInt(row?.reserved || '0', 10),
      paid: parseInt(row?.paid || '0', 10),
      expired: parseInt(row?.expired || '0', 10),
      cancelled: parseInt(row?.cancelled || '0', 10),
      totalRevenueCents: parseInt(row?.total_revenue_cents || '0', 10),
    };
  }

  async getCampaignReservationCounts(campaignId: string): Promise<{
    activeReserved: number;
    paid: number;
    expired: number;
    cancelled: number;
  }> {
    const query = `
      SELECT
        status,
        COALESCE(SUM(quantity), 0)::text as total_units
      FROM reservations
      WHERE campaign_id = $1
      GROUP BY status;
    `;
    const res = await this.db.query<{ status: string; total_units: string }>(query, [campaignId]);

    let activeReserved = 0;
    let paid = 0;
    let expired = 0;
    let cancelled = 0;

    for (const row of res.rows) {
      const count = parseInt(row.total_units, 10);
      if (row.status === 'RESERVED') activeReserved = count;
      else if (row.status === 'PAID') paid = count;
      else if (row.status === 'EXPIRED') expired = count;
      else if (row.status === 'CANCELLED') cancelled = count;
    }

    return { activeReserved, paid, expired, cancelled };
  }
}

