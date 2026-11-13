import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
  @ApiProperty({ example: '01HNG58J2A9ZX7', description: 'ULID reservation identifier' })
  reservationId: string;

  @ApiProperty({ example: 'camp_01HNG58J2A9ZX7', description: 'Associated campaign ID' })
  campaignId: string;

  @ApiProperty({ example: 'usr_1001', description: 'User identifier' })
  userId: string;

  @ApiProperty({ example: 1, description: 'Reserved item quantity' })
  quantity: number;

  @ApiProperty({
    example: 'RESERVED',
    enum: ['ACCEPTED', 'RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'],
    description: 'Current reservation lifecycle status',
  })
  status: string;

  @ApiProperty({ example: 954, description: 'Remaining available campaign inventory' })
  remainingStock: number;

  @ApiProperty({
    example: '2026-10-24T17:40:00.000Z',
    description: 'ISO 8601 expiration timestamp',
  })
  expiresAt: string;

  @ApiProperty({
    example: '2026-10-24T17:30:00.000Z',
    description: 'ISO 8601 creation timestamp',
  })
  createdAt: string;

  @ApiProperty({
    example: '2026-10-24T17:30:00.050Z',
    required: false,
    description: 'Timestamp when persisted to PostgreSQL (null if still in stream)',
  })
  dbSyncedAt?: string | null;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Database transaction version',
  })
  dbTxVersion?: number | null;
}
