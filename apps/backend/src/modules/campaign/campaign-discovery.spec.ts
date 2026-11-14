import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignRepository } from './campaign.repository.js';
import { CampaignService } from './campaign.service.js';
import { CampaignSortBy, CampaignStatusFilter } from './dto/list-campaigns.dto.js';

describe('CampaignDiscovery', () => {
  let service: CampaignService;
  let repoMock: Partial<CampaignRepository>;
  let redisMock: any;
  let loggerMock: any;

  beforeEach(() => {
    repoMock = {
      findWithFilters: vi.fn().mockResolvedValue([
        {
          id: 'camp_live_1',
          title: 'iPhone 16 Pro Flash Sale',
          price_cents: 99900,
          total_inventory: 1000,
          reserved_count: 200,
          version: 1,
          starts_at: new Date('2026-11-12T10:00:00Z'),
          ends_at: new Date('2026-11-12T22:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
      countWithFilters: vi.fn().mockResolvedValue(1),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue('800'),
        hgetall: vi.fn().mockResolvedValue({ isActive: 'true' }),
      }),
    };

    loggerMock = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new CampaignService(
      repoMock as CampaignRepository,
      redisMock,
      loggerMock,
    );
  });

  it('should list campaigns with authoritative Redis stock and pagination envelope', async () => {
    const result = await service.listCampaigns({
      page: 1,
      limit: 10,
      status: CampaignStatusFilter.ACTIVE,
      sort: CampaignSortBy.STARTS_AT_ASC,
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('camp_live_1');
    expect(result.data[0].availableInventory).toBe(800);
    expect(result.data[0].isActive).toBe(true);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);

    expect(repoMock.findWithFilters).toHaveBeenCalledWith({
      status: CampaignStatusFilter.ACTIVE,
      search: undefined,
      limit: 10,
      offset: 0,
      sort: CampaignSortBy.STARTS_AT_ASC,
    });
  });

  it('should search campaigns by keyword and filter by status', async () => {
    await service.listCampaigns({
      page: 2,
      limit: 5,
      search: 'iPhone',
      status: CampaignStatusFilter.UPCOMING,
    });

    expect(repoMock.findWithFilters).toHaveBeenCalledWith({
      status: CampaignStatusFilter.UPCOMING,
      search: 'iPhone',
      limit: 5,
      offset: 5,
      sort: undefined,
    });
  });
});

