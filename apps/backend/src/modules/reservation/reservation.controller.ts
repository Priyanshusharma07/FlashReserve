import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto.js';
import { ReservationResponseDto } from './dto/reservation-response.dto.js';
import { ReserveDto } from './dto/reserve.dto.js';
import {
  UserReservationItemDto,
  UserReservationsQueryDto,
} from './dto/user-reservations-query.dto.js';
import { ReservationService } from './reservation.service.js';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('sales/:id/reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Atomically reserve inventory for a flash-sale campaign',
    description: 'Executes atomic Redis Lua script, validates idempotency, and queues persistence stream event.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'Unique client-supplied idempotency key (e.g. UUID, ULID, or any string like key-1)',
    schema: { default: 'key-1' },
  })
  @ApiResponse({ status: 201, type: ReservationResponseDto, description: 'Inventory successfully reserved' })
  @ApiResponse({ status: 400, description: 'Invalid quantity, inactive campaign, or idempotency mismatch' })
  @ApiResponse({ status: 409, description: 'Campaign sold out or user already has an active reservation' })
  @ApiResponse({ status: 410, description: 'Campaign has ended' })
  async reserve(
    @Param('id') campaignId: string,
    @Body() dto: ReserveDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<ReservationResponseDto> {
    return this.reservationService.reserve(campaignId, dto, user, idempotencyKey);
  }

  @Get('users/me/reservations')
  @ApiOperation({
    summary: 'Get customer reservation history',
    description: 'Returns paginated reservations belonging exclusively to the authenticated customer, sorted newest first.',
  })
  @ApiResponse({ status: 200, type: PaginatedResponseDto, description: 'Customer reservations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyReservations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserReservationsQueryDto,
  ): Promise<PaginatedResponseDto<UserReservationItemDto>> {
    return this.reservationService.getUserReservations(user, query);
  }

  @Get('reservations/:resId')
  @ApiOperation({
    summary: 'Retrieve reservation details by ID',
    description: 'Reconciles current Redis buffer state with durable PostgreSQL record.',
  })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorized to view another user reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async getReservation(
    @Param('resId') reservationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReservationResponseDto> {
    return this.reservationService.getReservation(reservationId, user);
  }
}
