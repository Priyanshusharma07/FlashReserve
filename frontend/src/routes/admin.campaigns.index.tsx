import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/campaigns/")({
  head: () =>
    pageHead("Campaign operations", "Authorized campaign directory and inventory monitoring."),
  component: Campaigns,
});
function Campaigns() {
  return <AdminContent view="campaigns" />;
}
