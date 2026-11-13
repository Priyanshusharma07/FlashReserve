import { Module } from '@nestjs/common';
import { ReservationRepository } from '../reservation/reservation.repository.js';
import { ExpirationSweeperService } from './expiration-sweeper.service.js';
import { StreamConsumerService } from './stream-consumer.service.js';

@Module({
  providers: [
    StreamConsumerService,
    ExpirationSweeperService,
    ReservationRepository,
  ],
  exports: [StreamConsumerService, ExpirationSweeperService],
})
export class WorkerModule {}
