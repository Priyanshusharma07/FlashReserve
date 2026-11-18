import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowDownWideNarrow,
  Search,
  RefreshCw,
  Radio,
  WifiOff,
  Package,
  Zap,
  Clock,
  Flame,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readCampaigns } from "@/lib/flashreserve";

const filters = ["All sales", "Active", "Upcoming", "Ended"];

export function SalesBrowser({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState("All sales");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("soonest");

  const query = useQuery({
    queryKey: ["campaigns", filter, search],
    queryFn: () =>
      readCampaigns({
        status: filter === "All sales" ? undefined : filter.toLowerCase(),
        search: search.trim() || undefined,
      }),
    refetchInterval: 5000,
  });

  const campaigns = query.data?.data ?? [];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      cents / 100,
    );
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
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
    <section className={compact ? "page-width py-12" : "page-width py-14"}>
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">THE NEXT GREAT FIND</p>
          <h2 className="section-heading">{compact ? "Catch the next drop." : "Flash sales"}</h2>
          <p className="section-subtitle">
            Exceptional products. Limited quantities. Real-time atomic reservations.
          </p>
        </div>
        {compact && (
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/sales">
              Explore all sales <ArrowUpRight />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 border-b border-border">
        <div className="flex" role="tablist" aria-label="Sale status">
          {filters.map((value) => (
            <Button
              key={value}
              variant="ghost"
              className="filter-tab"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
            >
              {value}
              {value === "Active" && <Radio className="size-3 text-emerald-500" />}
            </Button>
          ))}
        </div>

        <div className="flex w-full items-center gap-4 pb-3 sm:w-auto sm:pb-0">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              aria-label="Search campaigns"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sales"
              className="h-8 border-0 pl-8 shadow-none"
            />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <ArrowDownWideNarrow className="size-3.5" />
            <select
              aria-label="Sort campaigns"
              className="max-w-32 bg-transparent py-2 text-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="soonest">Ending soonest</option>
              <option value="newest">Newest first</option>
              <option value="title">Name A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {/* CAMPAIGNS CONTENT */}
      {query.isLoading ? (
        <div className="sales-empty py-16">
          <RefreshCw className="size-6 animate-spin text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold">Loading live sales...</h3>
          <p className="mt-1 text-xs text-muted-foreground">Checking Redis inventory allocation</p>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      camp.isActive
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {camp.isActive ? (
                      <>
                        <Flame className="size-3" /> Live Drop
                      </>
                    ) : (
                      "Ended"
                    )}
                  </span>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {formatCurrency(camp.priceCents)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {camp.title}
                </h3>

                <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="size-3.5" /> Stock Remaining
                    </span>
                    <span className="font-semibold text-foreground">
                      {(camp.availableInventory ?? camp.totalInventory).toLocaleString()} /{" "}
                      {camp.totalInventory.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" /> Ends
                    </span>
                    <span>{formatDate(camp.endsAt)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Button className="w-full gap-2 font-semibold" asChild>
                  <Link to="/sales/$campaignId" params={{ campaignId: camp.id }}>
                    <Zap className="size-3.5 fill-current" />
                    View & Reserve Drop
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sales-empty" role="tabpanel" aria-live="polite">
          <div className="empty-symbol">
            <WifiOff className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">
            {search ? `No sales matching “${search}”` : "No active flash sales right now"}
          </h3>
          <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
            Check back soon or explore our past drop archives. New drops are announced regularly.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 mt-8 text-[11px] text-muted-foreground">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        Live inventory synced with Redis in-memory atomic reservation engine.
        <span className="ml-auto hidden sm:inline">
          No stock is held until your reservation is placed.
        </span>
      </div>
    </section>
  );
}
