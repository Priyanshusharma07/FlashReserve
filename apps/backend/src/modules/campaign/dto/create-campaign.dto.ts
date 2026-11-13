import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'iPhone 16 Pro Flash Sale', description: 'Campaign title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @ApiProperty({ example: 99900, description: 'Price in cents (e.g. $999.00 = 99900)' })
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiProperty({ example: 1000, description: 'Total units available for sale' })
  @IsInt()
  @IsPositive()
  totalInventory: number;

  @ApiProperty({
    example: '2026-10-25T10:00:00.000Z',
    description: 'ISO 8601 start timestamp',
  })
  @IsDateString()
  startsAt: string;

  @ApiProperty({
    example: '2026-10-25T12:00:00.000Z',
    description: 'ISO 8601 end timestamp (must be after startsAt)',
  })
  @IsDateString()
  endsAt: string;
}
