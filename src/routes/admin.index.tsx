import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/")({
  head: () =>
    pageHead("Operations overview", "Authorized FlashReserve campaign and reservation operations."),
  component: Overview,
});
function Overview() {
  return <AdminContent view="overview" />;
}
