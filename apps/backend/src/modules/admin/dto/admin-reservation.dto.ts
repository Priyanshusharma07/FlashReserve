import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class AdminReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search term for reservation ID or user ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Filter by reservation status',
    enum: ['RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'])
  status?: 'RESERVED' | 'PAID' | 'EXPIRED' | 'CANCELLED';

  @ApiPropertyOptional({ description: 'Filter by customer user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter from creation timestamp (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter up to creation timestamp (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminReservationDetailDto {
  @ApiProperty({ example: 'res_01HNG6Z' })
  reservationId!: string;

  @ApiProperty({ example: 'camp_01HNG58J2A9ZX7' })
  campaignId!: string;

  @ApiPropertyOptional({ example: 'FlashReserve iPhone 16 Pro Flagship Sale' })
  campaignTitle?: string;

  @ApiProperty({ example: 'user_1001' })
  userId!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 'RESERVED', enum: ['ACCEPTED', 'RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'] })
  status!: string;

  @ApiProperty({ example: '2026-10-25T10:10:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ example: '2026-10-25T10:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2026-10-25T10:00:00.050Z' })
  dbSyncedAt?: string | null;

  @ApiPropertyOptional({ example: 1 })
  dbTxVersion?: number | null;

  @ApiProperty({ example: false, description: 'True if record was served exclusively from active Redis buffer' })
  isLiveInBuffer!: boolean;
}

