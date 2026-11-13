import { ApiProperty } from '@nestjs/swagger';

export class CampaignSummaryDto {
  @ApiProperty({ example: 10 })
  total!: number;

  @ApiProperty({ example: 3 })
  active!: number;

  @ApiProperty({ example: 5 })
  upcoming!: number;

  @ApiProperty({ example: 2 })
  ended!: number;

  @ApiProperty({ example: 50000 })
  totalInventory!: number;

  @ApiProperty({ example: 12500 })
  totalReservedUnits!: number;
}

export class ReservationSummaryDto {
  @ApiProperty({ example: 8500 })
  total!: number;

  @ApiProperty({ example: 2500 })
  reserved!: number;

  @ApiProperty({ example: 5000 })
  paid!: number;

  @ApiProperty({ example: 950 })
  expired!: number;

  @ApiProperty({ example: 50 })
  cancelled!: number;

  @ApiProperty({ example: 49950000, description: 'Total revenue in cents from PAID reservations' })
  totalRevenueCents!: number;
}

export class AdminDashboardSummaryDto {
  @ApiProperty({ type: CampaignSummaryDto })
  campaigns!: CampaignSummaryDto;

  @ApiProperty({ type: ReservationSummaryDto })
  reservations!: ReservationSummaryDto;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  generatedAt!: string;
}

