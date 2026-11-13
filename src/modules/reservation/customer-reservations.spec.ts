import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { ReservationRepository } from './reservation.repository.js';
import { ReservationService } from './reservation.service.js';

describe('CustomerReservationHistory', () => {
  let service: ReservationService;
  let repoMock: any;
  let redisMock: any;
  let configMock: any;
  let loggerMock: any;

  beforeEach(() => {
    repoMock = {
      findUserReservations: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'res_cust_1',
            campaign_id: 'camp_1',
            campaign_title: 'Flash iPhone',
            user_id: 'user_cust_10',
            quantity: 1,
            status: 'RESERVED',
            expires_at: new Date('2026-11-12T12:00:00Z'),
            created_at: new Date('2026-11-12T11:50:00Z'),
          },
        ],
        total: 1,
      }),
      findById: vi.fn(),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue({
        hgetall: vi.fn().mockResolvedValue(null),
        keys: vi.fn().mockResolvedValue([]),
      }),
    };

    configMock = {};
    loggerMock = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new ReservationService(
      repoMock as ReservationRepository,
      redisMock,
      configMock,
      loggerMock,
    );
  });

  it('should return paginated reservations for authenticated customer', async () => {
    const user: AuthenticatedUser = { userId: 'user_cust_10', role: 'user' };
    const result = await service.getUserReservations(user, { page: 1, limit: 10 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].reservationId).toBe('res_cust_1');
    expect(result.data[0].userId).toBe('user_cust_10');
    expect(repoMock.findUserReservations).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_cust_10', limit: 10, offset: 0 }),
    );
  });

  it('should forbid customer from reading another user reservation by ID', async () => {
    const userA: AuthenticatedUser = { userId: 'user_A', role: 'user' };
    repoMock.findById.mockResolvedValueOnce({
      id: 'res_other',
      user_id: 'user_B', // Different user
      campaign_id: 'camp_1',
      quantity: 1,
      status: 'RESERVED',
      expires_at: new Date(),
      created_at: new Date(),
      db_synced_at: new Date(),
      db_tx_version: 1,
    });

    await expect(service.getReservation('res_other', userA)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow admin to view any customer reservation by ID', async () => {
    const adminUser: AuthenticatedUser = { userId: 'admin_1', role: 'admin' };
    repoMock.findById.mockResolvedValueOnce({
      id: 'res_cust',
      user_id: 'user_B',
      campaign_id: 'camp_1',
      quantity: 1,
      status: 'RESERVED',
      expires_at: new Date(),
      created_at: new Date(),
      db_synced_at: new Date(),
      db_tx_version: 1,
    });

    const res = await service.getReservation('res_cust', adminUser);
    expect(res.reservationId).toBe('res_cust');
  });
});
