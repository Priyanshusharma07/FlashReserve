import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Package,
  RefreshCw,
  Search,
  Ticket,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/components/admin-shell";
import { integration } from "@/lib/flashreserve";

type View = "overview" | "campaigns" | "reservations" | "metrics" | "settings";
const titles: Record<View, string> = {
  overview: "Overview",
  campaigns: "Campaigns",
  reservations: "Reservations",
  metrics: "System health",
  settings: "Settings",
};
export function AdminContent({ view, id }: { view: View; id?: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = id ? `${view === "campaigns" ? "Campaign" : "Reservation"} details` : titles[view];
  return (
    <AdminShell title={title}>
      {view === "overview" && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              "Total campaigns",
              "Active campaigns",
              "Total reservations",
              "Successful payments",
              "Expired reservations",
              "Available inventory",
            ].map((label) => (
              <div key={label} className="rounded-md border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="my-5 text-3xl text-muted-foreground">—</p>
                <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <LockKeyhole className="size-3" />
                  Not available
                </span>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold">Reservation activity</h2>
              <Blocked checked={checked} onRetry={() => setChecked(true)} />
            </div>
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold">Operations</h2>
              <div className="mt-6 space-y-3">
                {[
                  { to: "/admin/campaigns", label: "Campaign directory", icon: Package },
                  { to: "/admin/reservations", label: "Reservation directory", icon: Ticket },
                  { to: "/admin/metrics", label: "Health and metrics", icon: Activity },
                ].map((item) => (
                  <Button
                    key={item.to}
                    variant="outline"
                    asChild
                    className="w-full justify-between"
                  >
                    <Link to={item.to}>
                      <span className="flex items-center gap-3">
                        <item.icon className="size-4" />
                        {item.label}
                      </span>
                      <ArrowUpRight />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      {(view === "campaigns" || view === "reservations") && (
        <>
          {id ? (
            <div className="mt-8 border-b border-border pb-5">
              <p className="text-xs text-muted-foreground">
                {view === "campaigns" ? "Campaign" : "Reservation"} ID
              </p>
              <code className="mt-3 block break-all text-sm">{id}</code>
            </div>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    aria-label={`Search ${view}`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${view}`}
                    className="h-10 pl-10"
                  />
                </div>
                <select
                  aria-label="Filter status"
                  className="rounded-md border border-border bg-card px-3 py-2.5 text-xs"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  {(view === "campaigns"
                    ? ["Active", "Upcoming", "Ended"]
                    : ["ACCEPTED", "RESERVED", "PAID", "EXPIRED"]
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="border-y border-border bg-secondary/50">
                    <tr>
                      {(view === "campaigns"
                        ? ["Campaign", "Status", "Inventory", "Start time", "End time"]
                        : ["Reservation ID", "Campaign", "Status", "Quantity", "Created at"]
                      ).map((c) => (
                        <th key={c} className="p-4 font-medium text-muted-foreground">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody />
                </table>
              </div>
              <Blocked checked={checked} onRetry={() => setChecked(true)} />
            </>
          )}
          {id && <Blocked checked={checked} onRetry={() => setChecked(true)} />}
        </>
      )}
      {view === "metrics" && (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {["API liveness", "Database readiness", "Redis connectivity"].map((label) => (
              <div key={label} className="rounded-md border border-border bg-card p-5">
                <Activity className="mb-4 size-5 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{label}</h2>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-warning" />
                  Unverified
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-6">
            <h2 className="text-sm font-semibold">Performance metrics</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              No verified measurements are available for throughput, latency, worker activity, or
              error rates.
            </p>
            <Blocked checked={checked} onRetry={() => setChecked(true)} />
          </div>
        </>
      )}
      {view === "settings" && (
        <section className="mt-9 max-w-2xl">
          <h2 className="text-sm font-semibold">Connection information</h2>
          <dl className="mt-5 divide-y divide-border border-y border-border text-xs">
            <div className="flex flex-wrap justify-between gap-4 py-5">
              <dt className="text-muted-foreground">Reported service address</dt>
              <dd className="break-all font-mono">{integration.backendUrl}</dd>
            </div>
            <div className="flex justify-between gap-4 py-5">
              <dt className="text-muted-foreground">Connection</dt>
              <dd>Not connected</dd>
            </div>
            <div className="flex justify-between gap-4 py-5">
              <dt className="text-muted-foreground">Production authentication</dt>
              <dd>Unverified</dd>
            </div>
            <div className="flex justify-between gap-4 py-5">
              <dt className="text-muted-foreground">Payment mode</dt>
              <dd>Mock adapter only</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            Localhost points to your own computer. An accessible HTTPS service and verified sign-in
            are required before operations can be enabled.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(integration.backendUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check /> : <ArrowUpRight />}
            {copied ? "Address copied" : "Copy service address"}
          </Button>
        </section>
      )}
    </AdminShell>
  );
}
function Blocked({ checked, onRetry }: { checked: boolean; onRetry: () => void }) {
  return (
    <div className="sales-empty min-h-64">
      <div className="empty-symbol">
        <WifiOff className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">Protected information is unavailable</h3>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        Connect the sale service and verify authorized access to view these records.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        <RefreshCw />
        Check availability
      </Button>
      {checked && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Access is still unavailable. No private information was requested.
        </p>
      )}
    </div>
  );
}
