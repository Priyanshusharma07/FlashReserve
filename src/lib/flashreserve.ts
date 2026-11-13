export const integration = {
  state: "unverified" as const,
  backendUrl: "http://localhost:3000/api",
  reason: "The sale service is not connected. Live campaign information is unavailable.",
};

import type { ReservationStatus } from "@flashreserve/shared-types";
export type { ReservationStatus };
export const statusLabels: Record<ReservationStatus, string> = {
  ACCEPTED: "Processing",
  RESERVED: "Reserved",
  PAID: "Paid",
  EXPIRED: "Expired",
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
// No guessed endpoints or silent demo fallback: enable adapters only after inspecting contracts.
export async function readCampaigns(): Promise<never> {
  throw new IntegrationUnavailableError();
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
