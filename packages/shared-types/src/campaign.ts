export type CampaignStatusFilter = 'all' | 'active' | 'upcoming' | 'ended';

export type CampaignSortBy =
  | 'starts_at_asc'
  | 'starts_at_desc'
  | 'created_at_desc'
  | 'price_asc'
  | 'price_desc';

export interface CampaignResponse {
  id: string;
  title: string;
  priceCents: number;
  totalInventory: number;
  reservedCount: number;
  availableInventory: number;
  isActive: boolean;
  version: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  title: string;
  priceCents: number;
  totalInventory: number;
  startsAt: string;
  endsAt: string;
}

export interface ListCampaignsQuery {
  status?: CampaignStatusFilter;
  search?: string;
  sort?: CampaignSortBy;
  page?: number;
  limit?: number;
}

