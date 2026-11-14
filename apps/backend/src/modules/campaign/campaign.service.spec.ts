import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignRepository } from './campaign.repository.js';
import { CampaignService } from './campaign.service.js';

describe('CampaignService', () => {
  let service: CampaignService;
  let repoMock: Partial<CampaignRepository>;
  let redisMock: any;
  let loggerMock: any;

  beforeEach(() => {
    repoMock = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };

    const redisClientMock = {
      get: vi.fn().mockResolvedValue('100'),
      set: vi.fn().mockResolvedValue('OK'),
      hmset: vi.fn().mockResolvedValue('OK'),
      hset: vi.fn().mockResolvedValue(1),
      hgetall: vi.fn().mockResolvedValue({ isActive: 'true' }),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue(redisClientMock),
    };

    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new CampaignService(
      repoMock as CampaignRepository,
      redisMock,
      loggerMock,
    );
  });

  it('should reject campaign creation when endsAt <= startsAt', async () => {
    const invalidDto = {
      title: 'Invalid Flash Sale',
      priceCents: 5000,
      totalInventory: 100,
      startsAt: '2026-10-25T12:00:00.000Z',
      endsAt: '2026-10-25T11:00:00.000Z',
    };

    await expect(service.createCampaign(invalidDto)).rejects.toThrow(BadRequestException);
  });

  it('should create a campaign and synchronize metadata and inventory to Redis', async () => {
    const dto = {
      title: 'iPhone 16 Flash Sale',
      priceCents: 99900,
      totalInventory: 500,
      startsAt: '2026-10-25T10:00:00.000Z',
      endsAt: '2026-10-25T12:00:00.000Z',
    };

    (repoMock.create as any).mockResolvedValue({
      id: 'camp_test_1',
      title: dto.title,
      price_cents: dto.priceCents,
      total_inventory: dto.totalInventory,
      reserved_count: 0,
      version: 1,
      starts_at: new Date(dto.startsAt),
      ends_at: new Date(dto.endsAt),
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.createCampaign(dto);

    expect(result.id).toBe('camp_test_1');
    expect(result.totalInventory).toBe(500);
    expect(result.isActive).toBe(true);
    expect(redisMock.getClient().hmset).toHaveBeenCalled();
  });

  it('should throw NotFoundException when retrieving non-existent campaign', async () => {
    (repoMock.findById as any).mockResolvedValue(null);

    await expect(service.getCampaign('camp_unknown')).rejects.toThrow(NotFoundException);
  });
});
