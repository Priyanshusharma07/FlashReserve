import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it.each([
    "/sales",
    "/sales/camp_seed_flash_sale",
    "/how-it-works",
    "/reservations/res_test",
    "/checkout/res_test",
    "/admin",
    "/admin/campaigns",
    "/admin/campaigns/camp_seed_flash_sale",
    "/admin/reservations",
    "/admin/reservations/res_test",
    "/admin/metrics",
    "/admin/settings",
  ])("matches required FlashReserve page %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
    expect(router.matchRoutes(path).at(-1)?.pathname.replace(/\/$/, "")).toBe(path);
  });
});
