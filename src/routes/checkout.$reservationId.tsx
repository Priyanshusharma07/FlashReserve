import { createFileRoute } from "@tanstack/react-router";
import { UnavailableDetail } from "@/components/unavailable-detail";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/checkout/$reservationId")({
  head: () =>
    pageHead(
      "Mock checkout",
      "Complete eligible reservations through the verified mock payment adapter. No real card details.",
    ),
  component: Checkout,
});
function Checkout() {
  const { reservationId } = Route.useParams();
  return <UnavailableDetail kind="checkout" id={reservationId} />;
}
