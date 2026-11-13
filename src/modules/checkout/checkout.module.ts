import { Module } from '@nestjs/common';
import { ReservationRepository } from '../reservation/reservation.repository.js';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';
import { MockDevelopmentPaymentAdapter } from './payment.adapter.js';

@Module({
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    MockDevelopmentPaymentAdapter,
    ReservationRepository,
  ],
  exports: [CheckoutService],
})
export class CheckoutModule {}
