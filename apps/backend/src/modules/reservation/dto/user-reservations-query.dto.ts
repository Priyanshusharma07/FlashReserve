import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class UserReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by reservation status',
    enum: ['RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'])
  status?: 'RESERVED' | 'PAID' | 'EXPIRED' | 'CANCELLED';

  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;
}

export class UserReservationItemDto {
  @ApiPropertyOptional({ example: 'res_01HNG6Z' })
  reservationId!: string;

  @ApiPropertyOptional({ example: 'camp_01HNG58J2A9ZX7' })
  campaignId!: string;

  @ApiPropertyOptional({ example: 'iPhone 16 Pro Flash Sale' })
  campaignTitle!: string;

  @ApiPropertyOptional({ example: 'user_1001' })
  userId!: string;

  @ApiPropertyOptional({ example: 1 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'RESERVED', enum: ['ACCEPTED', 'RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'] })
  status!: string;

  @ApiPropertyOptional({ example: '2026-10-25T10:10:00.000Z' })
  expiresAt!: string;

  @ApiPropertyOptional({ example: '2026-10-25T10:00:00.000Z' })
  createdAt!: string;
}

