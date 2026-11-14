import type {
  CampaignResponse,
  PaginatedResponse,
  ReservationResponse,
  ReservationStatus,
} from "@flashreserve/shared-types";
import { api } from "./api-client";

export const integration = {
  state: "connected" as const,
  backendUrl: "http://localhost:3000/api/v1",
  reason: "FlashReserve High-Concurrency Engine connected.",
};

export type { ReservationStatus, CampaignResponse };

export const statusLabels: Record<ReservationStatus, string> = {
  ACCEPTED: "Processing",
  RESERVED: "Reserved",
  PAID: "Paid",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function canCheckout(status: ReservationStatus): boolean {
  return status === "RESERVED";
}

export function shouldPoll(status: ReservationStatus): boolean {
  return status === "ACCEPTED" || status === "RESERVED";
}

export class IntegrationUnavailableError extends Error {
  constructor() {
    super(integration.reason);
    this.name = "IntegrationUnavailableError";
  }
}

/**
 * Authoritative campaign discovery: calls backend GET /api/v1/campaigns
 */
export async function readCampaigns(query?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<CampaignResponse>> {
  return api.listCampaigns(query);
}

/**
 * Authoritative campaign detail: calls backend GET /api/v1/campaigns/:id
 */
export async function readCampaign(id: string): Promise<CampaignResponse> {
  return api.getCampaign(id);
}

/**
 * Atomically reserve inventory via Redis Lua script: calls POST /api/v1/sales/:id/reserve
 */
export async function createReservation(
  campaignId: string,
  quantity = 1,
  idempotencyKey?: string,
): Promise<ReservationResponse> {
  return api.reserve(campaignId, quantity, idempotencyKey);
}

/**
 * Dual-store reservation status polling: calls GET /api/v1/reservations/:id
 */
export async function readReservation(id: string): Promise<ReservationResponse> {
  return api.getReservation(id);
}

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | FlashReserve` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | FlashReserve` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}

export { api };
