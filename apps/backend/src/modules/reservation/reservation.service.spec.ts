import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { ReservationService } from './reservation.service.js';

describe('ReservationService', () => {
  let service: ReservationService;
  let repoMock: any;
  let redisMock: any;
  let configMock: any;
  let loggerMock: any;

  const testUser: AuthenticatedUser = {
    userId: 'usr_101',
    role: 'user',
  };

  beforeEach(() => {
    repoMock = {
      findById: vi.fn(),
      findByCampaignAndUser: vi.fn(),
      persistBatchInTx: vi.fn(),
      updateStatus: vi.fn(),
    };

    redisMock = {
      executeReserveScript: vi.fn(),
      getClient: vi.fn().mockReturnValue({
        hgetall: vi.fn(),
        keys: vi.fn().mockResolvedValue([]),
      }),
    };

    configMock = {
      maxReservationQuantity: 5,
      reservationTtlSeconds: 600,
      redisStreamName: 'stream:reservations',
    };

    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new ReservationService(
      repoMock,
      redisMock,
      configMock,
      loggerMock,
    );
  });

  it('should reject reservation request when quantity exceeds maxReservationQuantity', async () => {
    const dto = { quantity: 10 };

    await expect(
      service.reserve('camp_1', dto, testUser, 'key_1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject reservation request when Idempotency-Key is missing', async () => {
    const dto = { quantity: 2 };

    await expect(
      service.reserve('camp_1', dto, testUser, ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return successful ReservationResponseDto on Lua SUCCESS', async () => {
    const dto = { quantity: 1 };
    const fakeResponse = {
      reservationId: '01HNG58J2A9ZX7',
      campaignId: 'camp_1',
      userId: 'usr_101',
      quantity: 1,
      status: 'RESERVED',
      expiresAt: Date.now() + 600000,
      createdAt: Date.now(),
    };

    redisMock.executeReserveScript.mockResolvedValue([
      'SUCCESS',
      JSON.stringify(fakeResponse),
      '99',
    ]);

    const result = await service.reserve('camp_1', dto, testUser, 'idem_1');

    expect(result.reservationId).toBe('01HNG58J2A9ZX7');
    expect(result.status).toBe('RESERVED');
    expect(result.remainingStock).toBe(99);
  });

  it('should return deterministic response on Lua IDEMPOTENT_REPLAY', async () => {
    const dto = { quantity: 1 };
    const cachedResponse = {
      reservationId: '01HNG58J2A9ZX7',
      campaignId: 'camp_1',
      userId: 'usr_101',
      quantity: 1,
      status: 'RESERVED',
      expiresAt: Date.now() + 600000,
      createdAt: Date.now(),
    };

    redisMock.executeReserveScript.mockResolvedValue([
      'IDEMPOTENT_REPLAY',
      JSON.stringify(cachedResponse),
      '99',
    ]);

    const result = await service.reserve('camp_1', dto, testUser, 'idem_1');

    expect(result.reservationId).toBe('01HNG58J2A9ZX7');
  });

  it('should throw ConflictException on Lua SOLD_OUT', async () => {
    const dto = { quantity: 1 };
    redisMock.executeReserveScript.mockResolvedValue(['SOLD_OUT', '0']);

    await expect(
      service.reserve('camp_1', dto, testUser, 'idem_2'),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException on Lua ALREADY_RESERVED', async () => {
    const dto = { quantity: 1 };
    redisMock.executeReserveScript.mockResolvedValue(['ALREADY_RESERVED', 'res_existing_1']);

    await expect(
      service.reserve('camp_1', dto, testUser, 'idem_3'),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw GoneException on Lua ENDED', async () => {
    const dto = { quantity: 1 };
    redisMock.executeReserveScript.mockResolvedValue(['ENDED', 'Campaign has already ended']);

    await expect(
      service.reserve('camp_1', dto, testUser, 'idem_4'),
    ).rejects.toThrow(GoneException);
  });

  it('should throw ForbiddenException if user tries to view another user reservation', async () => {
    repoMock.findById.mockResolvedValue({
      id: 'res_other',
      campaign_id: 'camp_1',
      user_id: 'usr_other',
      quantity: 1,
      status: 'RESERVED',
      expires_at: new Date(),
      created_at: new Date(),
      db_synced_at: new Date(),
      db_tx_version: 1,
    });

    await expect(
      service.getReservation('res_other', testUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
