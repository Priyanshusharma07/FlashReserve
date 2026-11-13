import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/metrics")({
  head: () =>
    pageHead("System health", "Authorized system health, readiness and performance monitoring."),
  component: Metrics,
});
function Metrics() {
  return <AdminContent view="metrics" />;
}
