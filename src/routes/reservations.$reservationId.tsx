import { createFileRoute } from "@tanstack/react-router";
import { UnavailableDetail } from "@/components/unavailable-detail";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/reservations/$reservationId")({
  head: () =>
    pageHead(
      "Reservation status",
      "Check the verified status and expiry of your FlashReserve reservation.",
    ),
  component: Reservation,
});
function Reservation() {
  const { reservationId } = Route.useParams();
  return <UnavailableDetail kind="reservation" id={reservationId} />;
}
