import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: Partial<AuthService>;

  beforeEach(() => {
    authServiceMock = {
      generateToken: vi.fn().mockResolvedValue('dev-user-usr_123'),
    };
    controller = new AuthController(authServiceMock as AuthService);
  });

  it('should generate a token for user', async () => {
    const res = await controller.getToken({ userId: 'usr_123', role: 'user' });

    expect(res.accessToken).toBe('dev-user-usr_123');
    expect(res.tokenType).toBe('Bearer');
    expect(res.userId).toBe('usr_123');
    expect(res.role).toBe('user');
    expect(authServiceMock.generateToken).toHaveBeenCalledWith({
      userId: 'usr_123',
      role: 'user',
    });
  });
});
