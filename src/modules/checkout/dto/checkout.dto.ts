import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({
    example: 'tok_visa_4242',
    description: 'Payment token or reference provided by payment processor',
  })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;
}

export class CheckoutResponseDto {
  @ApiProperty({ example: '01HNG58J2A9ZX7', description: 'Reservation ID' })
  reservationId: string;

  @ApiProperty({ example: 'PAID', description: 'Confirmed reservation status' })
  status: string;

  @ApiProperty({ example: 'ch_simulated_987654', description: 'Payment transaction reference' })
  transactionReference: string;

  @ApiProperty({ example: '2026-10-24T17:35:00.000Z' })
  confirmedAt: string;
}
