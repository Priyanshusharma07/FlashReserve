import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpirationSweeperService } from './expiration-sweeper.service.js';

describe('ExpirationSweeperService', () => {
  let sweeper: ExpirationSweeperService;
  let repoMock: any;
  let redisMock: any;
  let dbMock: any;
  let configMock: any;
  let loggerMock: any;

  beforeEach(() => {
    repoMock = {
      findExpiredReservations: vi.fn(),
      updateStatus: vi.fn(),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue({
        incrby: vi.fn().mockResolvedValue(10),
        del: vi.fn().mockResolvedValue(1),
        hset: vi.fn().mockResolvedValue(1),
        xadd: vi.fn().mockResolvedValue('1234-0'),
      }),
    };

    dbMock = {
      withTransaction: vi.fn(),
    };

    configMock = {
      isWorker: true,
      expirationSweeperIntervalMs: 15000,
      redisStreamName: 'stream:reservations',
    };

    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    sweeper = new ExpirationSweeperService(
      configMock,
      dbMock,
      repoMock,
      redisMock,
      loggerMock,
    );
  });

  it('should find expired reservations and reclaim inventory', async () => {
    repoMock.findExpiredReservations.mockResolvedValue([
      {
        id: 'res_exp_1',
        campaign_id: 'camp_1',
        user_id: 'usr_1',
        quantity: 2,
        status: 'RESERVED',
        expires_at: new Date(Date.now() - 5000),
      },
    ]);

    dbMock.withTransaction.mockResolvedValue(true);

    const count = await sweeper.sweepExpiredReservations();

    expect(count).toBe(1);
    expect(redisMock.getClient().incrby).toHaveBeenCalledWith('flash:stock:{camp_1}', 2);
    expect(redisMock.getClient().del).toHaveBeenCalledWith('flash:user:{camp_1}:usr_1');
  });

  it('should not release inventory if DB status transition returns false (e.g. concurrent payment)', async () => {
    repoMock.findExpiredReservations.mockResolvedValue([
      {
        id: 'res_exp_2',
        campaign_id: 'camp_1',
        user_id: 'usr_2',
        quantity: 1,
        status: 'RESERVED',
        expires_at: new Date(Date.now() - 5000),
      },
    ]);

    // Transaction returns false because reservation was already paid
    dbMock.withTransaction.mockResolvedValue(false);

    const count = await sweeper.sweepExpiredReservations();

    expect(count).toBe(0);
    expect(redisMock.getClient().incrby).not.toHaveBeenCalled();
  });
});
