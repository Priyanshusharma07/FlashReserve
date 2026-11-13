import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/reservations/")({
  head: () =>
    pageHead("Reservation operations", "Authorized reservation status and expiry monitoring."),
  component: Reservations,
});
function Reservations() {
  return <AdminContent view="reservations" />;
}
