import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "@/components/admin-content";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/admin/settings")({
  head: () =>
    pageHead(
      "Operations settings",
      "FlashReserve connection and mock checkout configuration status.",
    ),
  component: Settings,
});
function Settings() {
  return <AdminContent view="settings" />;
}
