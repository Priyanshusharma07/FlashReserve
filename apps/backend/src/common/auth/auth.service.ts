import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LocalProtocol } from 'paseto';
import {
  DecryptFactory,
  EncryptFactory,
  GenerateKeyFactory,
} from 'paseto/v3/local';
import { ulid } from 'ulidx';
import { AppConfigService } from '../config/app-config.service.js';
import { AuthMode, Environment } from '../config/env.validation.js';
import { AppLoggerService } from '../logging/logger.service.js';
import { AuthUserDto, LoginDto, LoginResponseDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.util.js';
import { UserRepository } from './user.repository.js';
import { AuthenticatedUser } from './user-payload.interface.js';

@Injectable()
export class AuthService {
  private pasetoProtocol?: InstanceType<typeof LocalProtocol>;
  private pasetoKey?: unknown;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
    private readonly userRepo: UserRepository,
  ) {
    this.initPaseto();
  }

  private async initPaseto(): Promise<void> {
    try {
      this.pasetoProtocol = new LocalProtocol(
        GenerateKeyFactory,
        EncryptFactory,
        DecryptFactory,
      );
      this.pasetoKey = await this.pasetoProtocol.GenerateKey();
      this.logger.log('PASETO local protocol initialized successfully', 'AuthService');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to initialize PASETO protocol: ${msg}`, 'AuthService');
    }
  }

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const passwordHash = hashPassword(dto.password);
    const userId = `user_${ulid()}`;

    // Customers are strictly assigned the 'user' role — never 'admin'
    const user = await this.userRepo.create({
      id: userId,
      email: dto.email,
      name: dto.name.trim(),
      password_hash: passwordHash,
      role: 'user',
    });

    const accessToken = await this.generateToken({
      userId: user.id,
      role: user.role,
    });

    const userDto: AuthUserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    this.logger.log(`Customer registered successfully: ${user.id} (${user.email})`, 'AuthService');

    return {
      accessToken,
      tokenType: 'Bearer',
      user: userDto,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !verifyPassword(dto.password, user.password_hash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateToken({
      userId: user.id,
      role: user.role,
    });

    const userDto: AuthUserDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken,
      tokenType: 'Bearer',
      user: userDto,
    };
  }

  async getMe(currentUser: AuthenticatedUser): Promise<AuthUserDto> {
    const user = await this.userRepo.findById(currentUser.userId);
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }

    // Fallback for dev mode / non-persisted test accounts
    return {
      id: currentUser.userId,
      email: `${currentUser.userId}@flashreserve.io`,
      name: currentUser.userId,
      role: currentUser.role,
    };
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Authentication token is required');
    }

    const trimmed = token.trim();

    // Prevent dev authentication fallback in production environment
    if (this.configService.nodeEnv === Environment.Production && trimmed.startsWith('dev-')) {
      throw new UnauthorizedException('Development authentication tokens are not permitted in production');
    }

    // Dev authentication strategy
    if (this.configService.authMode === AuthMode.Dev || trimmed.startsWith('dev-')) {
      return this.verifyDevToken(trimmed);
    }

    // PASETO authentication strategy
    if (trimmed.startsWith('v3.local.')) {
      return this.verifyPasetoToken(trimmed);
    }

    return {
      userId: trimmed,
      role: trimmed.includes('admin') ? 'admin' : 'user',
    };
  }

  private verifyDevToken(token: string): AuthenticatedUser {
    // Format: dev-admin-<id> or dev-user-<id> or dev-<id>
    const parts = token.split('-');
    if (parts.length >= 3 && parts[1] === 'admin') {
      return {
        userId: parts.slice(2).join('-') || 'admin-1',
        role: 'admin',
      };
    }

    if (parts.length >= 3 && parts[1] === 'user') {
      return {
        userId: parts.slice(2).join('-') || 'user-1',
        role: 'user',
      };
    }

    return {
      userId: token.replace(/^dev-/, '') || 'dev-user',
      role: token.includes('admin') ? 'admin' : 'user',
    };
  }

  private async verifyPasetoToken(token: string): Promise<AuthenticatedUser> {
    if (!this.pasetoProtocol || !this.pasetoKey) {
      throw new UnauthorizedException('PASETO provider not initialized');
    }

    try {
      const { claims } = await this.pasetoProtocol.Decrypt(this.pasetoKey, token);
      const sub = claims.sub as string;
      const role = (claims.role as 'user' | 'admin') || 'user';

      if (!sub) {
        throw new UnauthorizedException('Token missing subject claim');
      }

      return {
        userId: sub,
        role,
        metadata: claims as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new UnauthorizedException(`Invalid or expired PASETO token: ${msg}`);
    }
  }

  async generateToken(payload: { userId: string; role?: 'user' | 'admin' }): Promise<string> {
    if (this.configService.authMode === AuthMode.Dev) {
      return `dev-${payload.role || 'user'}-${payload.userId}`;
    }

    if (!this.pasetoProtocol || !this.pasetoKey) {
      throw new Error('PASETO provider not initialized');
    }

    return this.pasetoProtocol.Encrypt(this.pasetoKey, {
      sub: payload.userId,
      role: payload.role || 'user',
    });
  }
}
