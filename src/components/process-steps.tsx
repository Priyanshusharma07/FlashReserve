import { Search, Timer, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
export function ProcessSteps({ full = false }: { full?: boolean }) {
  return (
    <section className="border-t border-border bg-secondary/50">
      <div className="page-width py-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-3 text-muted-foreground">LESS FRICTION. MORE FAIRNESS.</p>
            <h2 className="section-heading">Your next drop, in three steps.</h2>
          </div>
          {!full && (
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/how-it-works">
                How it works <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
        <div className="mt-6 grid gap-7 md:grid-cols-3">
          {[
            {
              number: "01",
              icon: Search,
              title: "Find your flash sale",
              copy: "Explore limited releases and find the campaign you’ve been waiting for.",
            },
            {
              number: "02",
              icon: Timer,
              title: "Reserve your spot",
              copy: "Request your reservation. Inventory is allocated atomically, so every unit has one owner.",
            },
            {
              number: "03",
              icon: ShieldCheck,
              title: "Make it yours",
              copy: "Complete checkout before your reservation expires. Your status is confirmed by the sale service.",
            },
          ].map((step) => (
            <div key={step.number} className="process-step border-t border-border">
              <div className="flex items-center justify-between">
                <span className="step-number">{step.number} /</span>
                <step.icon className="size-5" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
