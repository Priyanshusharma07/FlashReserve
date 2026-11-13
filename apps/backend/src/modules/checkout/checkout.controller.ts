import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/user-payload.interface.js';
import { CheckoutService } from './checkout.service.js';
import { CheckoutDto, CheckoutResponseDto } from './dto/checkout.dto.js';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post(':resId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete checkout and confirm reservation payment',
    description: 'Validates payment token, transitions reservation to PAID state, and confirms inventory atomically.',
  })
  @ApiResponse({ status: 200, type: CheckoutResponseDto, description: 'Reservation confirmed as PAID' })
  @ApiResponse({ status: 400, description: 'Invalid token or reservation in invalid state' })
  @ApiResponse({ status: 403, description: 'Forbidden: not owner of reservation' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @ApiResponse({ status: 410, description: 'Reservation expired' })
  async checkout(
    @Param('resId') reservationId: string,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutResponseDto> {
    return this.checkoutService.checkout(reservationId, dto, user);
  }
}
