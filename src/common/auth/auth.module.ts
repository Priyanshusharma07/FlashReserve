import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { UserRepository } from './user.repository.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, UserRepository],
  exports: [AuthService, AuthGuard, UserRepository],
})
export class AuthModule {}
