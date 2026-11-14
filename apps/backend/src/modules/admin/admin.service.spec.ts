import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepoMock: Partial<AdminRepository>;
  let campaignRepoMock: any;
  let campaignServiceMock: any;
  let reservationRepoMock: any;
  let redisMock: any;
  let dbMock: any;
  let configMock: any;

  beforeEach(() => {
    adminRepoMock = {
      getCampaignSummary: vi.fn().mockResolvedValue({
        total: 10,
        active: 2,
        upcoming: 5,
        ended: 3,
        totalInventory: 10000,
        totalReservedUnits: 2500,
      }),
      getReservationSummary: vi.fn().mockResolvedValue({
        total: 2500,
        reserved: 500,
        paid: 1800,
        expired: 180,
        cancelled: 20,
        totalRevenueCents: 179820000,
      }),
      getCampaignReservationCounts: vi.fn().mockResolvedValue({
        activeReserved: 100,
        paid: 400,
        expired: 50,
        cancelled: 10,
      }),
    };

    campaignRepoMock = {
      findById: vi.fn().mockResolvedValue({
        id: 'camp_test_1',
        title: 'Test Campaign',
        total_inventory: 1000,
        reserved_count: 500,
      }),
    };

    campaignServiceMock = {
      listCampaigns: vi.fn().mockResolvedValue({
        success: true,
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }),
      getCampaign: vi.fn(),
    };

    reservationRepoMock = {
      findAllReservationsWithFilters: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'res_test_1',
            campaign_id: 'camp_test_1',
            campaign_title: 'Test Campaign',
            user_id: 'user_1',
            quantity: 1,
            status: 'RESERVED',
            expires_at: new Date(),
            created_at: new Date(),
            db_synced_at: new Date(),
            db_tx_version: 1,
          },
        ],
        total: 1,
      }),
      findById: vi.fn(),
    };

    const redisClientMock = {
      get: vi.fn().mockResolvedValue('500'),
      xlen: vi.fn().mockResolvedValue(15),
      xpending: vi.fn().mockResolvedValue([0, '0-0', '0-0', []]),
      keys: vi.fn().mockResolvedValue([]),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue(redisClientMock),
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    dbMock = {
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    configMock = {
      redisStreamName: 'stream:reservations',
      redisConsumerGroup: 'flash_workers_group',
    };

    service = new AdminService(
      adminRepoMock as AdminRepository,
      campaignRepoMock,
      campaignServiceMock,
      reservationRepoMock,
      redisMock,
      dbMock,
      configMock,
    );
  });

  it('should return aggregated dashboard KPIs', async () => {
    const summary = await service.getDashboardSummary();

    expect(summary.campaigns.total).toBe(10);
    expect(summary.campaigns.active).toBe(2);
    expect(summary.reservations.paid).toBe(1800);
    expect(summary.reservations.totalRevenueCents).toBe(179820000);
    expect(adminRepoMock.getCampaignSummary).toHaveBeenCalled();
    expect(adminRepoMock.getReservationSummary).toHaveBeenCalled();
  });

  it('should audit campaign inventory between Redis counter and database breakdown', async () => {
    const audit = await service.getCampaignInventory('camp_test_1');

    expect(audit.campaignId).toBe('camp_test_1');
    expect(audit.initialStock).toBe(1000);
    expect(audit.availableStockRedis).toBe(500);
    expect(audit.activeReservedUnits).toBe(100);
    expect(audit.paidUnits).toBe(400);
    // 1000 - (100 + 400) = 500 === availableStockRedis
    expect(audit.driftDetected).toBe(false);
  });

  it('should detect drift when Redis stock counter does not equal expected remaining stock', async () => {
    redisMock.getClient().get.mockResolvedValueOnce('450'); // 50 units discrepancy

    const audit = await service.getCampaignInventory('camp_test_1');

    expect(audit.driftDetected).toBe(true);
    expect(audit.reconciliationStatus).toContain('Notice: Redis stock');
  });

  it('should throw NotFoundException when auditing non-existent campaign', async () => {
    campaignRepoMock.findById.mockResolvedValueOnce(null);

    await expect(service.getCampaignInventory('camp_nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return paginated admin reservation records with filters', async () => {
    const result = await service.getReservations({
      page: 1,
      limit: 20,
      status: 'RESERVED',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].reservationId).toBe('res_test_1');
    expect(result.meta.total).toBe(1);
  });

  it('should return structured operational metrics summary', async () => {
    const metrics = await service.getMetricsSummary();

    expect(metrics.infrastructure.database).toBe('healthy');
    expect(metrics.worker.streamLength).toBe(15);
    expect(metrics.worker.consumerGroup).toBe('flash_workers_group');
  });
});
