export type CampaignStatus = "active" | "upcoming" | "ended";
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  totalStock: number;
  remainingStock?: number;
  priceCents?: number;
}
export interface CreateCampaignRequest {
  name: string;
  startsAt: string;
  endsAt: string;
  totalStock: number;
  priceCents?: number;
}
export interface InventoryAudit {
  campaignId: string;
  redisRemaining: number;
  activeReservedUnits: number;
  paidUnits: number;
  expiredUnits: number;
}
