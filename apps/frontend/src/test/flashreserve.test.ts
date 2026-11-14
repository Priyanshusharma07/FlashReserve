import { describe, expect, it } from "vitest";
import {
  canCheckout,
  shouldPoll,
  readCampaigns,
  IntegrationUnavailableError,
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
  it("never returns invented campaigns", async () => {
    await expect(readCampaigns()).rejects.toBeInstanceOf(IntegrationUnavailableError);
  });
});
