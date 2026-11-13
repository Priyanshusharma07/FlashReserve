import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/reservations/$reservationId")({
  head: () =>
    pageHead(
      "Reservation operations detail",
      "Protected individual reservation details and state.",
    ),
  component: Reservation,
});
function Reservation() {
  const { reservationId } = Route.useParams();
  return <AdminContent view="reservations" id={reservationId} />;
}
