import { Injectable } from '@nestjs/common';
import pg from 'pg';
import { DatabaseService } from '../../database/database.service.js';

export interface ReservationEntity {
  id: string;
  campaign_id: string;
  user_id: string;
  quantity: number;
  status: 'RESERVED' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expires_at: Date;
  created_at: Date;
  db_synced_at: Date;
  db_tx_version: number;
}

export interface ReservationBatchItem {
  id: string;
  campaignId: string;
  userId: string;
  quantity: number;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class ReservationRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<ReservationEntity | null> {
    const query = `SELECT * FROM reservations WHERE id = $1;`;
    const res = await this.db.query<ReservationEntity>(query, [id]);
    return res.rows[0] || null;
  }

  async findByCampaignAndUser(campaignId: string, userId: string): Promise<ReservationEntity | null> {
    const query = `SELECT * FROM reservations WHERE campaign_id = $1 AND user_id = $2;`;
    const res = await this.db.query<ReservationEntity>(query, [campaignId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Bulk persists reservations inside an active transaction using UNNEST.
   * ON CONFLICT (id) DO NOTHING ensures duplicate stream events are idempotent.
   * Returns the count of newly inserted rows and updates the campaign reserved_count.
   */
  async persistBatchInTx(
    client: pg.PoolClient,
    items: ReservationBatchItem[],
  ): Promise<{ insertedCount: number; campaignDeltas: Map<string, number> }> {
    if (items.length === 0) {
      return { insertedCount: 0, campaignDeltas: new Map() };
    }

    const ids = items.map((i) => i.id);
    const campaignIds = items.map((i) => i.campaignId);
    const userIds = items.map((i) => i.userId);
    const quantities = items.map((i) => i.quantity);
    const statuses = items.map((i) => i.status);
    const expiresAts = items.map((i) => i.expiresAt.toISOString());
    const createdAts = items.map((i) => i.createdAt.toISOString());

    const bulkInsertSql = `
      INSERT INTO reservations (
        id, campaign_id, user_id, quantity, status, expires_at, created_at, db_synced_at, db_tx_version
      )
      SELECT
        u.id, u.campaign_id, u.user_id, u.quantity, u.status, u.expires_at, u.created_at, NOW(), 1
      FROM UNNEST(
        $1::VARCHAR[],
        $2::VARCHAR[],
        $3::VARCHAR[],
        $4::SMALLINT[],
        $5::VARCHAR[],
        $6::TIMESTAMPTZ[],
        $7::TIMESTAMPTZ[]
      ) AS u(id, campaign_id, user_id, quantity, status, expires_at, created_at)
      ON CONFLICT (campaign_id, user_id) DO NOTHING
      RETURNING id, campaign_id, quantity;
    `;

    const result = await client.query<{ id: string; campaign_id: string; quantity: number }>(
      bulkInsertSql,
      [ids, campaignIds, userIds, quantities, statuses, expiresAts, createdAts],
    );

    const insertedRows = result.rows;
    const campaignDeltas = new Map<string, number>();

    for (const row of insertedRows) {
      const current = campaignDeltas.get(row.campaign_id) || 0;
      campaignDeltas.set(row.campaign_id, current + row.quantity);
    }

    // Atomically increment reserved_count on flash_campaigns for actually inserted reservations
    for (const [campId, delta] of campaignDeltas.entries()) {
      await client.query(
        `
        UPDATE flash_campaigns
        SET reserved_count = reserved_count + $1,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $2;
        `,
        [delta, campId],
      );
    }

    return {
      insertedCount: insertedRows.length,
      campaignDeltas,
    };
  }

  async updateStatus(
    id: string,
    fromStatus: string,
    toStatus: string,
  ): Promise<boolean> {
    const query = `
      UPDATE reservations
      SET status = $1,
          db_tx_version = db_tx_version + 1,
          db_synced_at = NOW()
      WHERE id = $2 AND status = $3;
    `;
    const res = await this.db.query(query, [toStatus, id, fromStatus]);
    return (res.rowCount ?? 0) > 0;
  }

  async findExpiredReservations(limit: number): Promise<ReservationEntity[]> {
    const query = `
      SELECT * FROM reservations
      WHERE status = 'RESERVED' AND expires_at < NOW()
      ORDER BY expires_at ASC
      LIMIT $1;
    `;
    const res = await this.db.query<ReservationEntity>(query, [limit]);
    return res.rows;
  }

  async findUserReservations(options: {
    userId: string;
    status?: string;
    campaignId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: (ReservationEntity & { campaign_title?: string })[]; total: number }> {
    const conditions: string[] = ['r.user_id = $1'];
    const params: unknown[] = [options.userId];
    let paramIdx = 2;

    if (options.status) {
      conditions.push(`r.status = $${paramIdx++}`);
      params.push(options.status);
    }

    if (options.campaignId) {
      conditions.push(`r.campaign_id = $${paramIdx++}`);
      params.push(options.campaignId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `SELECT COUNT(*)::text as count FROM reservations r ${whereClause};`;
    const countRes = await this.db.query<{ count: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataParams = [...params, options.limit, options.offset];
    const dataSql = `
      SELECT
        r.*,
        c.title as campaign_title
      FROM reservations r
      LEFT JOIN flash_campaigns c ON r.campaign_id = c.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    const dataRes = await this.db.query<ReservationEntity & { campaign_title?: string }>(dataSql, dataParams);

    return { rows: dataRes.rows, total };
  }

  async findAllReservationsWithFilters(options: {
    search?: string;
    campaignId?: string;
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: (ReservationEntity & { campaign_title?: string })[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (options.search && options.search.trim().length > 0) {
      conditions.push(`(r.id ILIKE $${paramIdx} OR r.user_id ILIKE $${paramIdx})`);
      params.push(`%${options.search.trim()}%`);
      paramIdx++;
    }

    if (options.campaignId) {
      conditions.push(`r.campaign_id = $${paramIdx++}`);
      params.push(options.campaignId);
    }

    if (options.status) {
      conditions.push(`r.status = $${paramIdx++}`);
      params.push(options.status);
    }

    if (options.userId) {
      conditions.push(`r.user_id = $${paramIdx++}`);
      params.push(options.userId);
    }

    if (options.from) {
      conditions.push(`r.created_at >= $${paramIdx++}`);
      params.push(new Date(options.from));
    }

    if (options.to) {
      conditions.push(`r.created_at <= $${paramIdx++}`);
      params.push(new Date(options.to));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::text as count FROM reservations r ${whereClause};`;
    const countRes = await this.db.query<{ count: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataParams = [...params, options.limit, options.offset];
    const dataSql = `
      SELECT
        r.*,
        c.title as campaign_title
      FROM reservations r
      LEFT JOIN flash_campaigns c ON r.campaign_id = c.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    const dataRes = await this.db.query<ReservationEntity & { campaign_title?: string }>(dataSql, dataParams);

    return { rows: dataRes.rows, total };
  }
}
