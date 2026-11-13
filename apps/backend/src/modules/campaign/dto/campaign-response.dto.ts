import { ApiProperty } from '@nestjs/swagger';

export class CampaignResponseDto {
  @ApiProperty({ example: 'camp_01HNG58J2A9ZX7', description: 'Unique campaign ID' })
  id: string;

  @ApiProperty({ example: 'iPhone 16 Pro Flash Sale', description: 'Campaign title' })
  title: string;

  @ApiProperty({ example: 99900, description: 'Price in cents' })
  priceCents: number;

  @ApiProperty({ example: 1000, description: 'Total inventory' })
  totalInventory: number;

  @ApiProperty({ example: 45, description: 'Persisted reserved inventory count' })
  reservedCount: number;

  @ApiProperty({ example: 955, description: 'Available inventory remaining (from Redis/DB)' })
  availableInventory: number;

  @ApiProperty({ example: true, description: 'Whether the campaign is active in Redis cache' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Optimistic lock version' })
  version: number;

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ example: '2026-10-25T12:00:00.000Z' })
  endsAt: string;

  @ApiProperty({ example: '2026-10-24T17:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-10-24T17:00:00.000Z' })
  updatedAt: string;
}
