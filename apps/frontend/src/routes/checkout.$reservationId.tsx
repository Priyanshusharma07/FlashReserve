import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Timer,
  AlertCircle,
  Lock,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readReservation, api, pageHead } from "@/lib/flashreserve";

export const Route = createFileRoute("/checkout/$reservationId")({
  head: () =>
    pageHead(
      "Mock checkout",
      "Complete eligible reservations through the verified mock payment adapter. No real card details.",
    ),
  component: Checkout,
});

function Checkout() {
  const { reservationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentToken, setPaymentToken] = useState("tok_visa_4242");
  const [payError, setPayError] = useState("");

  const query = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => readReservation(reservationId),
  });

  const payMutation = useMutation({
    mutationFn: () => api.checkout(reservationId, paymentToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation", reservationId] });
      navigate({
        to: "/reservations/$reservationId",
        params: { reservationId },
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Payment processing failed";
      setPayError(msg);
    },
  });

  const res = query.data;

  return (
    <PublicShell>
      <main className="page-width min-h-[620px] py-12">
        <Button variant="ghost" asChild className="mb-8 pl-0">
          <Link to="/reservations/$reservationId" params={{ reservationId }}>
            <ArrowLeft className="mr-2 size-4" />
            Back to reservation
          </Link>
        </Button>

        <p className="eyebrow text-muted-foreground">FLASHRESERVE SECURE CHECKOUT</p>
        <h1 className="section-heading mt-2">Complete Your Drop Payment</h1>

        {query.isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground">Verifying reservation eligibility...</p>
          </div>
        ) : query.isError || !res ? (
          <div className="mt-8 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
            <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
            <h2 className="text-sm font-semibold text-destructive">Reservation Not Found</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Could not load reservation <code>{reservationId}</code>.
            </p>
          </div>
        ) : res.status === "PAID" ? (
          <div className="mt-8 max-w-lg mx-auto rounded-lg border border-emerald-500/20 bg-card p-8 text-center space-y-4">
            <div className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-xl font-bold">Payment Completed!</h2>
            <p className="text-xs text-muted-foreground">
              This reservation has already been settled and confirmed.
            </p>
            <Button asChild className="mt-4">
              <Link to="/sales">Return to Storefront</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 md:grid-cols-[1.6fr_1fr]">
            {/* Payment Method Section */}
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" /> Mock Payment Adapter
                  </h3>
                  <span className="text-[10px] bg-secondary px-2 py-0.5 rounded font-mono text-muted-foreground">
                    Simulation Mode
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  FlashReserve uses a sandbox simulation adapter for stress testing atomic write operations.
                  No real credit card numbers or banking credentials are collected.
                </p>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-medium text-foreground block">
                    Payment Simulation Token
                  </label>
                  <Input
                    value={paymentToken}
                    onChange={(e) => setPaymentToken(e.target.value)}
                    placeholder="tok_visa_4242"
                    className="font-mono text-xs"
                    required
                  />
                  <div className="flex gap-2">
                    {["tok_visa_4242", "tok_mastercard_5555", "tok_amex_3782"].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 font-mono"
                        onClick={() => setPaymentToken(preset)}
                      >
                        {preset.split("_")[1]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="size-3.5 text-emerald-500" />
                  <span>Atomic Dual-Store Consistency</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Upon payment confirmation, your reservation state is updated atomically to <code>PAID</code> in PostgreSQL,
                  releasing the hold without restocking to Redis.
                </p>
              </div>
            </div>

            {/* Sidebar Summary */}
            <aside className="rounded-lg border border-border bg-card p-6 h-fit space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" /> Order Summary
              </div>

              <dl className="space-y-3 text-xs border-y border-border py-4">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Reservation ID</dt>
                  <dd className="font-mono truncate max-w-[120px]">{res.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Units</dt>
                  <dd className="font-semibold">{res.quantity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-bold text-amber-500">{res.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Checkout Window</dt>
                  <dd className="flex items-center gap-1 text-primary font-semibold">
                    <Timer className="size-3" /> Active
                  </dd>
                </div>
              </dl>

              {payError && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive" role="alert">
                  {payError}
                </div>
              )}

              <Button
                size="lg"
                className="w-full gap-2 font-bold text-sm h-12"
                disabled={payMutation.isPending || !paymentToken.trim()}
                onClick={() => payMutation.mutate()}
              >
                {payMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" /> Confirm & Pay Now
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                By clicking Confirm, you simulate mock payment confirmation for reservation {res.id}.
              </p>
            </aside>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
