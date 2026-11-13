import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";

export function UnavailableDetail({
  kind,
  id,
}: {
  kind: "campaign" | "reservation" | "checkout";
  id: string;
}) {
  const [checked, setChecked] = useState(false);
  const title =
    kind === "campaign"
      ? "Campaign details"
      : kind === "checkout"
        ? "Mock checkout"
        : "Your reservation";
  return (
    <PublicShell>
      <main className="page-width min-h-[620px] py-12">
        <Button variant="ghost" asChild className="mb-8 pl-0">
          <Link to="/sales">
            <ArrowLeft />
            Back to flash sales
          </Link>
        </Button>
        <p className="eyebrow text-muted-foreground">
          {kind === "checkout" ? "MOCK PAYMENT ONLY" : "FLASHRESERVE"}
        </p>
        <h1 className="section-heading mt-4">{title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{kind === "campaign" ? "Campaign ID" : "Reservation ID"}</span>
          <code className="break-all rounded bg-secondary px-3 py-2 text-foreground">{id}</code>
        </div>
        <div className="mt-10 grid gap-10 border-t border-border pt-10 md:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="empty-symbol">
              <WifiOff className="size-5" />
            </div>
            <h2 className="text-lg font-semibold">
              {kind === "checkout"
                ? "Checkout is not available"
                : "We can’t load these details right now"}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
              {kind === "checkout"
                ? "The reservation and payment service isn’t connected. Eligibility, expiry, and payment status cannot be verified. No payment has been submitted."
                : "The sale service isn’t connected. We can’t verify the status, inventory, or expiry of this record."}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setChecked(true)}>
              <RefreshCw />
              Check again
            </Button>
            {checked && (
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                The service is still unavailable. Nothing has been submitted.
              </p>
            )}
          </div>
          <aside className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" />
              {kind === "checkout" ? "Payment summary" : "Reservation assurance"}
            </div>
            <dl className="mt-6 space-y-4 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>Not verified</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {kind === "campaign" ? "Available inventory" : "Expires at"}
                </dt>
                <dd>Unavailable</dd>
              </div>
              {kind === "checkout" && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd>Unavailable</dd>
                </div>
              )}
            </dl>
            <Button className="mt-7 w-full" variant="dark" disabled>
              {kind === "campaign"
                ? "Reserve now"
                : kind === "checkout"
                  ? "Complete mock payment"
                  : "Continue to checkout"}
            </Button>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              {kind === "checkout"
                ? "No real card information is collected."
                : "An action becomes available only after the sale service confirms eligibility."}
            </p>
            {kind === "checkout" && (
              <Button variant="link" className="mt-3 text-foreground" asChild>
                <Link to="/reservations/$reservationId" params={{ reservationId: id }}>
                  View reservation <ArrowLeft />
                </Link>
              </Button>
            )}
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
