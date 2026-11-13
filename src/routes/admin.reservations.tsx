import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/reservations")({ component: ReservationsLayout });
function ReservationsLayout() {
  return <Outlet />;
}
