import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../config/app-config.service.js';
import { AuthMode, Environment } from '../config/env.validation.js';
import { AuthService } from './auth.service.js';
import { hashPassword } from './password.util.js';
import { UserRepository } from './user.repository.js';

describe('AuthService', () => {
  let service: AuthService;
  let userRepoMock: Partial<UserRepository>;
  let configMock: Partial<AppConfigService>;
  let loggerMock: any;

  beforeEach(() => {
    userRepoMock = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };

    configMock = {
      nodeEnv: Environment.Development,
      authMode: AuthMode.Dev,
    };

    loggerMock = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new AuthService(
      configMock as AppConfigService,
      loggerMock,
      userRepoMock as UserRepository,
    );
  });

  it('should authenticate user and return token when valid credentials provided', async () => {
    const rawPassword = 'Password123!';
    const passwordHash = hashPassword(rawPassword);

    (userRepoMock.findByEmail as any).mockResolvedValue({
      id: 'user_cust_1',
      email: 'customer@test.com',
      password_hash: passwordHash,
      name: 'Test Customer',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.login({
      email: 'customer@test.com',
      password: rawPassword,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.email).toBe('customer@test.com');
    expect(result.user.role).toBe('user');
  });

  it('should throw UnauthorizedException when password does not match', async () => {
    const passwordHash = hashPassword('CorrectPassword123');

    (userRepoMock.findByEmail as any).mockResolvedValue({
      id: 'user_cust_1',
      email: 'customer@test.com',
      password_hash: passwordHash,
      name: 'Test Customer',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(
      service.login({
        email: 'customer@test.com',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when email does not exist', async () => {
    (userRepoMock.findByEmail as any).mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@test.com',
        password: 'Password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return user profile from getMe when user exists in DB', async () => {
    (userRepoMock.findById as any).mockResolvedValue({
      id: 'user_admin_1',
      email: 'admin@test.com',
      name: 'Admin Test',
      role: 'admin',
    });

    const result = await service.getMe({ userId: 'user_admin_1', role: 'admin' });
    expect(result.id).toBe('user_admin_1');
    expect(result.role).toBe('admin');
  });

  it('should reject dev tokens when NODE_ENV is production', async () => {
    (configMock as any).nodeEnv = Environment.Production;

    await expect(service.verifyToken('dev-admin-1')).rejects.toThrow(
      'Development authentication tokens are not permitted in production',
    );
  });

  it('should verify dev tokens in development environment', async () => {
    (configMock as any).nodeEnv = Environment.Development;
    (configMock as any).authMode = AuthMode.Dev;

    const user = await service.verifyToken('dev-admin-admin-123');
    expect(user.role).toBe('admin');
    expect(user.userId).toBe('admin-123');
  });

  it('should register a new customer with hashed password and role user', async () => {
    (userRepoMock.findByEmail as any).mockResolvedValue(null);
    (userRepoMock.create as any).mockImplementation((userData: any) => Promise.resolve({
      ...userData,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const result = await service.register({
      name: 'Jane Customer',
      email: 'jane@example.com',
      password: 'StrongPassword123',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.name).toBe('Jane Customer');
    expect(result.user.email).toBe('jane@example.com');
    expect(result.user.role).toBe('user');
    expect(userRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        name: 'Jane Customer',
        role: 'user', // Strictly 'user'
      }),
    );
  });

  it('should reject registration when email is already in use', async () => {
    (userRepoMock.findByEmail as any).mockResolvedValue({
      id: 'existing_user_1',
      email: 'existing@example.com',
    });

    await expect(
      service.register({
        name: 'Another User',
        email: 'existing@example.com',
        password: 'Password123',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

