import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Flame,
  Package,
  ShieldCheck,
  Timer,
  Zap,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { readCampaign, createReservation, pageHead } from "@/lib/flashreserve";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";

export const Route = createFileRoute("/sales/$campaignId")({
  head: () =>
    pageHead(
      "Campaign details",
      "View verified availability and reservation eligibility for a FlashReserve campaign.",
    ),
  component: Campaign,
});

function Campaign() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reserveError, setReserveError] = useState("");

  const campaignQuery = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => readCampaign(campaignId),
    refetchInterval: 3000,
  });

  const reserveMutation = useMutation({
    mutationFn: () => createReservation(campaignId, 1),
    onSuccess: (data) => {
      navigate({
        to: "/reservations/$reservationId",
        params: { reservationId: data.id },
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to place reservation";
      setReserveError(msg);
    },
  });

  const handleReserveClick = () => {
    setReserveError("");
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    reserveMutation.mutate();
  };

  const campaign = campaignQuery.data;

  const formatCurrency = (cents?: number) => {
    if (cents === undefined) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      cents / 100,
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      return new Date(isoString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <PublicShell>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      <main className="page-width min-h-[620px] py-12">
        <Button variant="ghost" asChild className="mb-8 pl-0">
          <Link to="/sales">
            <ArrowLeft className="mr-2 size-4" />
            Back to flash sales
          </Link>
        </Button>

        {campaignQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-4" />
            <p className="text-sm">Fetching campaign availability...</p>
          </div>
        ) : campaignQuery.isError || !campaign ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
            <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
            <h2 className="text-base font-semibold text-destructive">Campaign not found</h2>
            <p className="text-xs text-muted-foreground mt-1">
              The campaign ID <code>{campaignId}</code> could not be found or has expired.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-4">
              <Link to="/sales">View other sales</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-[1.8fr_1fr]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    campaign.isActive
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Flame className="size-3.5" />
                  {campaign.isActive ? "Live Drop Active" : "Sale Ended"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">ID: {campaign.id}</span>
              </div>

              <h1 className="section-heading text-3xl font-extrabold text-foreground">
                {campaign.title}
              </h1>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-foreground">
                  {formatCurrency(campaign.priceCents)}
                </span>
                <span className="text-xs text-muted-foreground">USD / unit</span>
              </div>

              <div className="mt-8 rounded-lg border border-border bg-card p-6 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="size-4 text-primary" /> Live Inventory Status
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-secondary/50 p-4">
                    <p className="text-xs text-muted-foreground">Available to Reserve</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">
                      {(campaign.availableInventory ?? campaign.totalInventory).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Atomic Redis counter</p>
                  </div>

                  <div className="rounded-md bg-secondary/50 p-4">
                    <p className="text-xs text-muted-foreground">Total Allocation</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {campaign.totalInventory.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Fixed drop quantity</p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5" /> Drop starts: {formatDate(campaign.startsAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5" /> Drop closes: {formatDate(campaign.endsAt)}
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <h3 className="text-sm font-semibold mb-2">How Flash Allocation Works</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When you click Reserve, our Redis Lua script performs an atomic decrement on inventory.
                  Once accepted, a 15-minute checkout window is reserved exclusively for you. If unpaid after 15 minutes,
                  the reservation automatically expires and returns to the pool.
                </p>
              </div>
            </div>

            {/* Sidebar CTA */}
            <aside className="rounded-lg border border-border bg-card p-6 h-fit space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" /> Guaranteed Reservation
              </div>

              <dl className="space-y-3 text-xs border-y border-border py-4">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd className="font-semibold">1 unit</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Hold Window</dt>
                  <dd className="font-semibold flex items-center gap-1">
                    <Timer className="size-3 text-primary" /> 15 minutes
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total due on checkout</dt>
                  <dd className="font-bold text-foreground">{formatCurrency(campaign.priceCents)}</dd>
                </div>
              </dl>

              {reserveError && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive" role="alert">
                  {reserveError}
                </div>
              )}

              <Button
                size="lg"
                className="w-full gap-2 font-bold text-sm h-12"
                disabled={reserveMutation.isPending || !campaign.isActive}
                onClick={handleReserveClick}
              >
                {reserveMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Reserving in Redis...
                  </>
                ) : (
                  <>
                    <Zap className="size-4 fill-current" /> Reserve 1 Unit Now
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                {!isAuthenticated
                  ? "You will be prompted to sign in before confirming your reservation."
                  : "One reservation per client. Instant atomic verification."}
              </p>
            </aside>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
