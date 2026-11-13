import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export enum CampaignStatusFilter {
  ALL = 'all',
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  ENDED = 'ended',
}

export enum CampaignSortBy {
  STARTS_AT_ASC = 'starts_at_asc',
  STARTS_AT_DESC = 'starts_at_desc',
  CREATED_AT_DESC = 'created_at_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class ListCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CampaignStatusFilter,
    default: CampaignStatusFilter.ALL,
    description: 'Filter by campaign state: active (currently running), upcoming, ended, or all',
  })
  @IsOptional()
  @IsEnum(CampaignStatusFilter)
  status?: CampaignStatusFilter = CampaignStatusFilter.ALL;

  @ApiPropertyOptional({ description: 'Search query matching title or ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CampaignSortBy,
    default: CampaignSortBy.STARTS_AT_ASC,
    description: 'Sorting criteria',
  })
  @IsOptional()
  @IsEnum(CampaignSortBy)
  sort?: CampaignSortBy = CampaignSortBy.STARTS_AT_ASC;
}
