import { describe, expect, it, vi } from "vitest";
import {
  canCheckout,
  shouldPoll,
  readCampaigns,
} from "@/lib/flashreserve";

describe("Reservation safety rules", () => {
  it("permits checkout only for RESERVED", () => {
    expect(canCheckout("RESERVED")).toBe(true);
    expect(canCheckout("ACCEPTED")).toBe(false);
    expect(canCheckout("PAID")).toBe(false);
    expect(canCheckout("EXPIRED")).toBe(false);
  });

  it("stops polling on PAID and EXPIRED", () => {
    expect(shouldPoll("PAID")).toBe(false);
    expect(shouldPoll("EXPIRED")).toBe(false);
    expect(shouldPoll("ACCEPTED")).toBe(true);
    expect(shouldPoll("RESERVED")).toBe(true);
  });

  it("calls authoritative backend API for campaign discovery", async () => {
    const mockCampaigns = {
      data: [
        {
          id: "camp-1",
          title: "Test Drop",
          priceCents: 1000,
          totalInventory: 10,
          isActive: true,
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCampaigns,
    });

    const result = await readCampaigns();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("camp-1");
  });
});
