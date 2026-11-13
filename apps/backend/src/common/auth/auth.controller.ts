import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { GetTokenDto, TokenResponseDto } from './dto/get-token.dto.js';
import {
  AuthUserDto,
  LoginDto,
  LoginResponseDto,
  LogoutResponseDto,
} from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './public.decorator.js';
import type { AuthenticatedUser } from './user-payload.interface.js';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account',
    description: 'Creates a new customer user, securely hashes password with scrypt, and issues an immediate session Bearer token.',
  })
  @ApiResponse({ status: 201, type: LoginResponseDto, description: 'Customer registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid input' })
  @ApiResponse({ status: 409, description: 'A user with this email address already exists' })
  async register(@Body() dto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with email and password',
    description: 'Validates credentials against users table and issues a valid PASETO Bearer token.',
  })
  @ApiResponse({ status: 200, type: LoginResponseDto, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description: 'Returns profile details and roles of the currently authenticated user.',
  })
  @ApiResponse({ status: 200, type: AuthUserDto, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserDto> {
    return this.authService.getMe(user);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out current session',
    description: 'Signals frontend to invalidate local session and tokens.',
  })
  @ApiResponse({ status: 200, type: LogoutResponseDto, description: 'Logged out successfully' })
  async logout(): Promise<LogoutResponseDto> {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate an Authorization Bearer token (Dev / Testing)',
    description:
      'Generates a valid Bearer token for testing in Swagger UI or API clients without password lookup. Role: "admin" or "user".',
  })
  @ApiResponse({ status: 200, type: TokenResponseDto, description: 'Token generated successfully' })
  async getToken(@Body() dto: GetTokenDto): Promise<TokenResponseDto> {
    const role = dto.role || 'user';
    const userId = dto.userId || 'user_1001';
    const accessToken = await this.authService.generateToken({ userId, role });

    return {
      accessToken,
      tokenType: 'Bearer',
      userId,
      role,
    };
  }
}
