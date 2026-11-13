import { ApiProperty } from '@nestjs/swagger';

export class AdminCampaignInventoryDto {
  @ApiProperty({ example: 'camp_01HNG58J2A9ZX7' })
  campaignId!: string;

  @ApiProperty({ example: 'FlashReserve iPhone 16 Pro Flagship Sale' })
  title!: string;

  @ApiProperty({ example: 10000, description: 'Initial total stock configured in DB' })
  initialStock!: number;

  @ApiProperty({ example: 7450, description: 'Authoritative live available stock remaining in Redis' })
  availableStockRedis!: number;

  @ApiProperty({ example: 2550, description: 'Reserved units recorded in flash_campaigns table' })
  persistedReservedCount!: number;

  @ApiProperty({ example: 550, description: 'Active reservations with status RESERVED in DB' })
  activeReservedUnits!: number;

  @ApiProperty({ example: 2000, description: 'Confirmed paid reservations in DB' })
  paidUnits!: number;

  @ApiProperty({ example: 150, description: 'Expired reservations in DB' })
  expiredUnits!: number;

  @ApiProperty({ example: 0, description: 'Cancelled reservations in DB' })
  cancelledUnits!: number;

  @ApiProperty({ example: false, description: 'Whether a count drift exists between Redis and DB' })
  driftDetected!: boolean;

  @ApiProperty({
    example: 'Authoritative Redis inventory counter matches expected allocated quota.',
    description: 'Reconciliation notes',
  })
  reconciliationStatus!: string;
}

