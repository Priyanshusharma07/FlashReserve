import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { SalesBrowser } from "@/components/sales-browser";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/sales/")({
  head: () => pageHead("Flash sales", "Browse limited releases and live sale availability."),
  component: Sales,
});
function Sales() {
  return (
    <PublicShell>
      <main className="min-h-[610px]">
        <SalesBrowser />
      </main>
    </PublicShell>
  );
}
