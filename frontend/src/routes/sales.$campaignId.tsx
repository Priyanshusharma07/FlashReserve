import { createFileRoute } from "@tanstack/react-router";
import { UnavailableDetail } from "@/components/unavailable-detail";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/sales/$campaignId")({
  head: () =>
    pageHead(
      "Campaign details",
      "View verified availability and reservation eligibility for a FlashReserve campaign.",
    ),
  component: Campaign,
});
function Campaign() {
  const { campaignId } = Route.useParams();
  return <UnavailableDetail kind="campaign" id={campaignId} />;
}
