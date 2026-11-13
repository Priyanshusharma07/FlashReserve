import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller.js';
import { ReservationRepository } from './reservation.repository.js';
import { ReservationService } from './reservation.service.js';

@Module({
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
  exports: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
