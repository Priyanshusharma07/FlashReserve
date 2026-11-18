import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Timer,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { readReservation, shouldPoll, canCheckout, pageHead } from "@/lib/flashreserve";

export const Route = createFileRoute("/reservations/$reservationId")({
  head: () =>
    pageHead(
      "Reservation status",
      "Check the verified status and expiry of your FlashReserve reservation.",
    ),
  component: Reservation,
});

function Reservation() {
  const { reservationId } = Route.useParams();

  const query = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => readReservation(reservationId),
    refetchInterval: (queryResult) => {
      const data = queryResult.state.data;
      if (!data) return 2000;
      return shouldPoll(data.status) ? 1500 : false;
    },
  });

  const res = query.data;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case "ACCEPTED":
        return {
          title: "Reservation Queued",
          desc: "Your atomic stock claim was accepted in Redis and is persisting to PostgreSQL.",
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          icon: <Loader2 className="size-5 animate-spin text-blue-500" />,
        };
      case "RESERVED":
        return {
          title: "Inventory Reserved",
          desc: "Your unit is locked. Please complete checkout before the window expires.",
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
        };
      case "PAID":
        return {
          title: "Order Completed & Paid",
          desc: "Your reservation was successfully settled. Thank you for participating in the drop!",
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          icon: <CheckCircle2 className="size-5 text-emerald-500" />,
        };
      case "EXPIRED":
        return {
          title: "Reservation Expired",
          desc: "The 15-minute checkout window has elapsed. The unit has been returned to stock.",
          color: "text-muted-foreground bg-muted border-border",
          icon: <Clock className="size-5 text-muted-foreground" />,
        };
      case "CANCELLED":
        return {
          title: "Reservation Cancelled",
          desc: "This reservation was cancelled.",
          color: "text-destructive bg-destructive/10 border-destructive/20",
          icon: <XCircle className="size-5 text-destructive" />,
        };
      default:
        return {
          title: "Verifying Status...",
          desc: "Connecting to dual-store synchronization engine.",
          color: "text-muted-foreground bg-muted",
          icon: <Loader2 className="size-5 animate-spin" />,
        };
    }
  };

  const statusInfo = getStatusDisplay(res?.status);

  return (
    <PublicShell>
      <main className="page-width min-h-[620px] py-12">
        <Button variant="ghost" asChild className="mb-8 pl-0">
          <Link to="/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to flash sales
          </Link>
        </Button>

        <p className="eyebrow text-muted-foreground">FLASHRESERVE DUAL-STORE TRACKER</p>
        <h1 className="section-heading mt-2">Reservation Status</h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Reservation ID:</span>
          <code className="break-all rounded bg-secondary px-3 py-1.5 font-mono text-foreground">
            {reservationId}
          </code>
        </div>

        {query.isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground">Checking reservation record...</p>
          </div>
        ) : query.isError || !res ? (
          <div className="mt-8 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
            <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
            <h2 className="text-sm font-semibold text-destructive">Reservation Not Found</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Could not locate reservation <code>{reservationId}</code>.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <div className={`rounded-lg border p-6 flex items-start gap-4 ${statusInfo.color}`}>
                <div className="mt-0.5">{statusInfo.icon}</div>
                <div>
                  <h3 className="font-bold text-base">{statusInfo.title}</h3>
                  <p className="text-xs mt-1 leading-relaxed">{statusInfo.desc}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> Lifecycle Verification
                </h3>

                <dl className="divide-y divide-border text-xs">
                  <div className="flex justify-between py-3">
                    <dt className="text-muted-foreground">Current State</dt>
                    <dd className="font-mono font-bold">{res.status}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-muted-foreground">Campaign ID</dt>
                    <dd className="font-mono">{res.campaignId}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-muted-foreground">Quantity Reserved</dt>
                    <dd className="font-semibold">{res.quantity} unit</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-muted-foreground">Reservation Placed</dt>
                    <dd>{formatDate(res.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-muted-foreground">Expires At</dt>
                    <dd className="font-semibold flex items-center gap-1.5 text-amber-500">
                      <Timer className="size-3.5" />
                      {formatDate(res.expiresAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-card p-6 h-fit space-y-5">
              <h3 className="text-sm font-semibold">Next Step</h3>

              {canCheckout(res.status) ? (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your stock is held in Redis. Proceed to complete checkout before the timer expires.
                  </p>
                  <Button size="lg" className="w-full gap-2 font-bold" asChild>
                    <Link to="/checkout/$reservationId" params={{ reservationId: res.id }}>
                      Proceed to Checkout <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </>
              ) : res.status === "PAID" ? (
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <p className="text-xs text-muted-foreground">This reservation is fully paid.</p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/sales">Explore More Drops</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {res.status === "ACCEPTED"
                      ? "Awaiting final Redis stream worker confirmation..."
                      : "This reservation is no longer eligible for checkout."}
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to="/sales">Return to Storefront</Link>
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
