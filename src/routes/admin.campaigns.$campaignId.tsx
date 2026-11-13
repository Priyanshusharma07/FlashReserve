import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/campaigns/$campaignId")({
  head: () =>
    pageHead("Campaign operations detail", "Protected campaign details and verified inventory."),
  component: Campaign,
});
function Campaign() {
  const { campaignId } = Route.useParams();
  return <AdminContent view="campaigns" id={campaignId} />;
}
