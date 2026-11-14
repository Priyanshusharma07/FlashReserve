import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { ProcessSteps } from "@/components/process-steps";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/flashreserve";
export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead(
      "How reservations work",
      "Discover, reserve, and complete mock checkout with backend-confirmed allocation.",
    ),
  component: HowItWorks,
});
function HowItWorks() {
  return (
    <PublicShell>
      <main>
        <section className="page-width py-16">
          <p className="eyebrow text-muted-foreground">A FAIR SHOT, BY DESIGN</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">
            The drop moves fast.
            <br />
            Your reservation stays clear.
          </h1>
          <p className="section-subtitle max-w-lg mt-5">
            FlashReserve separates the rush to reserve from the time to check out. Every
            confirmation comes from the sale service, not a guess about available stock.
          </p>
        </section>
        <ProcessSteps full />
        <section className="page-width grid gap-12 py-14 md:grid-cols-2">
          <div>
            <ShieldCheck className="mb-5 size-7" />
            <h2 className="section-heading">One unit. One owner.</h2>
            <p className="section-subtitle mt-4">
              Inventory is allocated atomically by the sale engine. Displayed availability can
              change while you reserve; your place is secured only when the service confirms it.
            </p>
          </div>
          <div className="space-y-5">
            {[
              {
                title: "A request isn’t a confirmation",
                text: "Processing means your request is still being resolved. Check the reservation page for its actual state.",
              },
              {
                title: "Your checkout window matters",
                text: "A reserved item is held until its expiry. An expired reservation is no longer eligible for checkout.",
              },
              {
                title: "Mock checkout, no real card details",
                text: "This platform uses a mock payment adapter. A paid status appears only after the sale service verifies it.",
              },
            ].map((item) => (
              <div className="border-t border-border pt-5" key={item.title}>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="section-subtitle text-xs">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="page-width pb-14">
          <Button variant="dark" asChild>
            <Link to="/sales">
              Explore flash sales <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </main>
    </PublicShell>
  );
}
