import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight, ShieldCheck, Zap, Timer, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public-shell";
import { SalesBrowser } from "@/components/sales-browser";
import { ProcessSteps } from "@/components/process-steps";
import { pageHead } from "@/lib/flashreserve";
import cover from "@/assets/flashreserve-cover.jpg";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Flash sales, fairly reserved",
      "Discover limited releases with real-time reservations and atomic inventory allocation.",
    ),
  component: Index,
});
function Index() {
  return (
    <PublicShell>
      <main>
        <section className="hero">
          <img
            src={cover}
            className="hero-image"
            alt="Sculptural silver lightning bolt, the FlashReserve emblem"
            width={1536}
            height={1024}
            fetchPriority="high"
          />
          <div className="page-width hero-content fade-in">
            <div className="eyebrow flex items-center gap-2">
              <span className="h-px w-5 bg-primary" />
              READY FOR YOUR NEXT DROP
            </div>
            <h1>
              FlashReserve.
              <br />
              Great finds.
              <br />
              <span className="text-primary">Fair chances.</span>
            </h1>
            <p className="hero-copy">
              Limited inventory. Real-time reservations.
              <br />
              Be there for the drop. We’ll handle the rest.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild className="h-11 px-5 text-xs font-bold">
                <Link to="/sales">
                  Explore flash sales <ArrowUpRight />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild className="h-11 px-5 text-xs">
                <Link to="/how-it-works">
                  How it works <ArrowRight />
                </Link>
              </Button>
            </div>
            <p className="hero-footnote">
              <ShieldCheck className="size-3.5" />
              Atomic allocation. No overselling. No guesswork.
            </p>
          </div>
        </section>
        <section className="principles">
          <div className="page-width grid grid-cols-1 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Built for the rush",
                copy: "Real-time inventory, even at peak demand.",
              },
              {
                icon: LockKeyhole,
                title: "One unit. One reservation.",
                copy: "Atomic allocation keeps every drop fair.",
              },
              {
                icon: Timer,
                title: "Your time, protected",
                copy: "A clear checkout window for every reservation.",
              },
            ].map((item) => (
              <div key={item.title} className="principle">
                <item.icon />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <SalesBrowser compact />
        <ProcessSteps />
        <section className="bg-ink text-ink-foreground">
          <div className="page-width flex flex-wrap items-center justify-between gap-6 py-10">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 size-7 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">
                  The opportunity is limited. The experience shouldn’t be.
                </h2>
                <p className="mt-2 text-xs leading-6 text-ink-muted">
                  Consistent inventory. Clear confirmations. A fair shot for everyone.
                </p>
              </div>
            </div>
            <Button variant="heroOutline" asChild>
              <Link to="/how-it-works">
                Our approach <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
