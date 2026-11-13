import { GoneException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { CheckoutService } from './checkout.service.js';
import { MockDevelopmentPaymentAdapter } from './payment.adapter.js';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let repoMock: any;
  let redisMock: any;
  let dbMock: any;
  let configMock: any;
  let paymentAdapter: MockDevelopmentPaymentAdapter;
  let loggerMock: any;

  const testUser: AuthenticatedUser = {
    userId: 'usr_test_1',
    role: 'user',
  };

  beforeEach(() => {
    repoMock = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
      persistBatchInTx: vi.fn(),
    };

    redisMock = {
      getClient: vi.fn().mockReturnValue({
        hset: vi.fn().mockResolvedValue(1),
        xadd: vi.fn().mockResolvedValue('1234-0'),
        keys: vi.fn().mockResolvedValue([]),
      }),
    };

    dbMock = {
      withTransaction: vi.fn().mockImplementation((cb) => cb({})),
    };

    configMock = {
      redisStreamName: 'stream:reservations',
    };

    paymentAdapter = new MockDevelopmentPaymentAdapter();

    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new CheckoutService(
      repoMock,
      redisMock,
      dbMock,
      configMock,
      paymentAdapter,
      loggerMock,
    );
  });

  it('should reject checkout if reservation has expired', async () => {
    repoMock.findById.mockResolvedValue({
      id: 'res_exp_1',
      campaign_id: 'camp_1',
      user_id: 'usr_test_1',
      quantity: 1,
      status: 'EXPIRED',
      expires_at: new Date(Date.now() - 10000),
      created_at: new Date(Date.now() - 60000),
      db_synced_at: new Date(),
      db_tx_version: 1,
    });

    await expect(
      service.checkout('res_exp_1', { paymentToken: 'tok_visa' }, testUser),
    ).rejects.toThrow(GoneException);
  });

  it('should be idempotent and return success immediately if reservation is already PAID', async () => {
    repoMock.findById.mockResolvedValue({
      id: 'res_paid_1',
      campaign_id: 'camp_1',
      user_id: 'usr_test_1',
      quantity: 1,
      status: 'PAID',
      expires_at: new Date(Date.now() + 100000),
      created_at: new Date(Date.now() - 60000),
      db_synced_at: new Date(),
      db_tx_version: 2,
    });

    const result = await service.checkout('res_paid_1', { paymentToken: 'tok_visa' }, testUser);

    expect(result.status).toBe('PAID');
    expect(repoMock.updateStatus).not.toHaveBeenCalled();
  });

  it('should complete payment and transition reservation to PAID', async () => {
    repoMock.findById.mockResolvedValue({
      id: 'res_active_1',
      campaign_id: 'camp_1',
      user_id: 'usr_test_1',
      quantity: 1,
      status: 'RESERVED',
      expires_at: new Date(Date.now() + 500000),
      created_at: new Date(),
      db_synced_at: new Date(),
      db_tx_version: 1,
    });

    repoMock.updateStatus.mockResolvedValue(true);

    const result = await service.checkout('res_active_1', { paymentToken: 'tok_visa' }, testUser);

    expect(result.status).toBe('PAID');
    expect(repoMock.updateStatus).toHaveBeenCalledWith('res_active_1', 'RESERVED', 'PAID');
  });
});
