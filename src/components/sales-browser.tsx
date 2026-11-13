import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownWideNarrow, Search, RefreshCw, Radio, WifiOff } from "lucide-react";
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
    queryKey: ["campaigns"],
    queryFn: readCampaigns,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return (
    <section className={compact ? "page-width py-12" : "page-width py-14"}>
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">THE NEXT GREAT FIND</p>
          <h2 className="section-heading">{compact ? "Catch the next drop." : "Flash sales"}</h2>
          <p className="section-subtitle">
            Exceptional products. Limited quantities. One fair chance.
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
              {value === "Active" && <Radio className="size-3" />}
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
      <div className="sales-empty" role="tabpanel" aria-live="polite">
        <div className="empty-symbol">
          {query.isFetching ? (
            <RefreshCw className="size-5 animate-spin" />
          ) : (
            <WifiOff className="size-5" />
          )}
        </div>
        <h3 className="text-sm font-semibold">
          {query.isFetching
            ? "Checking sale availability…"
            : "Live sales are temporarily unavailable"}
        </h3>
        <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
          {search
            ? `We can’t search for “${search}” until the sale service is connected.`
            : "The sale service isn’t connected yet. Check back soon for available campaigns."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
        {query.isFetchedAfterMount && !query.isFetching && (
          <p role="status" className="mt-3 text-[11px] text-muted-foreground">
            Sale information is still unavailable. No reservations have been placed.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-warning" />
        Live inventory will appear when the sale service is available.
        <span className="ml-auto hidden sm:inline">
          No stock is held until your reservation is confirmed.
        </span>
      </div>
    </section>
  );
}
