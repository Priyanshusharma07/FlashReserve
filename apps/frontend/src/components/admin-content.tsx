import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Check,
  Package,
  RefreshCw,
  Search,
  Ticket,
  WifiOff,
  ShieldCheck,
  Play,
  Square,
  Loader2,
  Clock,
  Database,
  Cpu,
  Layers,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/components/admin-shell";
import { api, integration } from "@/lib/flashreserve";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { CreateCampaignModal } from "@/components/create-campaign-modal";

type View = "overview" | "campaigns" | "reservations" | "metrics" | "settings";
const titles: Record<View, string> = {
  overview: "Overview",
  campaigns: "Campaigns",
  reservations: "Reservations",
  metrics: "System health",
  settings: "Settings",
};

export function AdminContent({ view, id }: { view: View; id?: string }) {
  const { isAdmin } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const title = id ? `${view === "campaigns" ? "Campaign" : "Reservation"} details` : titles[view];

  // 1. Dashboard Overview Query
  const summaryQuery = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
    enabled: isAdmin && view === "overview",
    refetchInterval: 5000,
  });

  // 2. Admin Campaigns Query
  const campaignsQuery = useQuery({
    queryKey: ["admin-campaigns", search, status],
    queryFn: () =>
      api.getAdminCampaigns({
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      }),
    enabled: isAdmin && view === "campaigns",
    refetchInterval: 5000,
  });

  // 3. Admin Reservations Query
  const reservationsQuery = useQuery({
    queryKey: ["admin-reservations", search, status],
    queryFn: () =>
      api.getAdminReservations({
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
      }),
    enabled: isAdmin && view === "reservations",
    refetchInterval: 5000,
  });

  // 4. Metrics & Health Query
  const metricsQuery = useQuery({
    queryKey: ["admin-metrics-summary"],
    queryFn: () => api.getAdminMetricsSummary(),
    enabled: isAdmin && view === "metrics",
    refetchInterval: 3000,
  });

  const healthQuery = useQuery({
    queryKey: ["admin-health-ready"],
    queryFn: () => api.getHealthReady(),
    enabled: isAdmin && view === "metrics",
    refetchInterval: 3000,
  });

  // Mutations for campaign lifecycle
  const activateMutation = useMutation({
    mutationFn: (campId: string) => api.activateCampaign(campId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-summary"] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (campId: string) => api.deactivateCampaign(campId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-summary"] });
    },
  });

  const formatCurrency = (cents: number) => {
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
    <AdminShell title={title}>
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultRole="admin"
      />
      <CreateCampaignModal
        open={createCampaignOpen}
        onOpenChange={setCreateCampaignOpen}
      />

      {/* OVERVIEW VIEW */}
      {view === "overview" && (
        <>
          {!isAdmin ? (
            <Blocked onSignIn={() => setAuthModalOpen(true)} />
          ) : (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    label: "Total campaigns",
                    value: summaryQuery.data?.campaigns.total ?? "—",
                    sub: `${summaryQuery.data?.campaigns.active ?? 0} currently active`,
                  },
                  {
                    label: "Active campaigns",
                    value: summaryQuery.data?.campaigns.active ?? "—",
                    sub: "Accepting live reservations",
                  },
                  {
                    label: "Total reservations",
                    value: summaryQuery.data?.reservations.total ?? "—",
                    sub: `${summaryQuery.data?.reservations.reserved ?? 0} holding inventory`,
                  },
                  {
                    label: "Successful payments",
                    value: summaryQuery.data?.reservations.paid ?? "—",
                    sub: formatCurrency(summaryQuery.data?.reservations.totalRevenueCents ?? 0),
                  },
                  {
                    label: "Expired reservations",
                    value: summaryQuery.data?.reservations.expired ?? "—",
                    sub: "Reclaimed back to Redis stock",
                  },
                  {
                    label: "Total inventory",
                    value: summaryQuery.data?.campaigns.totalInventory.toLocaleString() ?? "—",
                    sub: `${summaryQuery.data?.campaigns.totalReservedUnits ?? 0} reserved`,
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-md border border-border bg-card p-5">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="my-3 text-3xl font-bold tracking-tight text-foreground">
                      {summaryQuery.isLoading ? (
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      ) : (
                        card.value
                      )}
                    </p>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <ShieldCheck className="size-3 text-emerald-500" />
                      {card.sub}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-10 lg:grid-cols-2">
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">Campaign Operations</h2>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs font-semibold h-8"
                      onClick={() => setCreateCampaignOpen(true)}
                    >
                      <Plus className="size-3.5" />
                      Create Flash Campaign
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      { to: "/admin/campaigns", label: "Manage campaigns & inventory", icon: Package },
                      { to: "/admin/reservations", label: "Inspect reservation logs", icon: Ticket },
                      { to: "/admin/metrics", label: "Redis stream lag & health", icon: Activity },
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
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h2 className="text-sm font-semibold">Engine Status</h2>
                  <div className="mt-6 rounded-md border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Redis Stream Engine:</span>
                      <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active (Atomic Lua)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">PostgreSQL Write-Behind:</span>
                      <span className="font-semibold text-emerald-500">Connected</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Authentication Protocol:</span>
                      <span className="font-mono text-[11px] bg-secondary px-2 py-0.5 rounded">
                        PASETO Local
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* CAMPAIGNS VIEW */}
      {view === "campaigns" && (
        <>
          {!isAdmin ? (
            <Blocked onSignIn={() => setAuthModalOpen(true)} />
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    aria-label="Search campaigns"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search campaigns..."
                    className="h-10 pl-10"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Filter status"
                    className="rounded-md border border-border bg-card px-3 py-2 text-xs"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ended">Ended</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => campaignsQuery.refetch()}
                    disabled={campaignsQuery.isFetching}
                    title="Refresh campaigns"
                  >
                    <RefreshCw
                      className={`size-3.5 ${campaignsQuery.isFetching ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCreateCampaignOpen(true)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="size-4" />
                    New Campaign
                  </Button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="p-4 font-medium text-muted-foreground">Campaign</th>
                      <th className="p-4 font-medium text-muted-foreground">Status</th>
                      <th className="p-4 font-medium text-muted-foreground">Price</th>
                      <th className="p-4 font-medium text-muted-foreground">Stock Available</th>
                      <th className="p-4 font-medium text-muted-foreground">Schedule</th>
                      <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campaignsQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                          Loading campaigns...
                        </td>
                      </tr>
                    ) : campaignsQuery.data?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No campaigns found.
                        </td>
                      </tr>
                    ) : (
                      campaignsQuery.data?.data?.map((camp) => (
                        <tr key={camp.id} className="hover:bg-muted/30">
                          <td className="p-4">
                            <div className="font-semibold text-foreground">{camp.title}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{camp.id}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                camp.isActive
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {camp.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-4 font-medium">{formatCurrency(camp.priceCents)}</td>
                          <td className="p-4">
                            <div className="font-semibold">
                              {camp.availableInventory?.toLocaleString() ?? 0} /{" "}
                              {camp.totalInventory.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {camp.reservedCount ?? 0} reserved
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-[11px]">
                            <div>Start: {formatDate(camp.startsAt)}</div>
                            <div>End: {formatDate(camp.endsAt)}</div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                                asChild
                              >
                                <Link to="/sales/$campaignId" params={{ campaignId: camp.id }}>
                                  <ExternalLink className="size-3" />
                                  View
                                </Link>
                              </Button>
                              {camp.isActive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-amber-500 hover:text-amber-600 gap-1"
                                  disabled={deactivateMutation.isPending}
                                  onClick={() => deactivateMutation.mutate(camp.id)}
                                >
                                  <Square className="size-3 fill-current" />
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-emerald-500 hover:text-emerald-600 gap-1"
                                  disabled={activateMutation.isPending}
                                  onClick={() => activateMutation.mutate(camp.id)}
                                >
                                  <Play className="size-3 fill-current" />
                                  Activate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* RESERVATIONS VIEW */}
      {view === "reservations" && (
        <>
          {!isAdmin ? (
            <Blocked onSignIn={() => setAuthModalOpen(true)} />
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    aria-label="Search reservations"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by ID or User..."
                    className="h-10 pl-10"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Filter status"
                    className="rounded-md border border-border bg-card px-3 py-2 text-xs"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="PAID">PAID</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reservationsQuery.refetch()}
                    disabled={reservationsQuery.isFetching}
                  >
                    <RefreshCw
                      className={`size-3.5 ${reservationsQuery.isFetching ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="p-4 font-medium text-muted-foreground">Reservation ID</th>
                      <th className="p-4 font-medium text-muted-foreground">User ID</th>
                      <th className="p-4 font-medium text-muted-foreground">Status</th>
                      <th className="p-4 font-medium text-muted-foreground">Qty</th>
                      <th className="p-4 font-medium text-muted-foreground">Created At</th>
                      <th className="p-4 font-medium text-muted-foreground">Expires At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reservationsQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                          Loading reservations...
                        </td>
                      </tr>
                    ) : reservationsQuery.data?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No reservations placed yet.
                        </td>
                      </tr>
                    ) : (
                      reservationsQuery.data?.data?.map((res) => {
                        const statusColors: Record<string, string> = {
                          ACCEPTED: "bg-blue-500/10 text-blue-500",
                          RESERVED: "bg-amber-500/10 text-amber-500",
                          PAID: "bg-emerald-500/10 text-emerald-500",
                          EXPIRED: "bg-muted text-muted-foreground",
                          CANCELLED: "bg-destructive/10 text-destructive",
                        };

                        return (
                          <tr key={res.id} className="hover:bg-muted/30">
                            <td className="p-4 font-mono text-[11px] font-semibold">{res.id}</td>
                            <td className="p-4 font-mono text-[11px] text-muted-foreground">
                              {res.userId}
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                  statusColors[res.status] || "bg-muted text-foreground"
                                }`}
                              >
                                {res.status}
                              </span>
                            </td>
                            <td className="p-4 font-semibold">{res.quantity}</td>
                            <td className="p-4 text-[11px] text-muted-foreground">
                              {formatDate(res.createdAt)}
                            </td>
                            <td className="p-4 text-[11px] text-muted-foreground">
                              {formatDate(res.expiresAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* METRICS VIEW */}
      {view === "metrics" && (
        <>
          {!isAdmin ? (
            <Blocked onSignIn={() => setAuthModalOpen(true)} />
          ) : (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-3">
                <div className="rounded-md border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="size-5 text-emerald-500" />
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h2 className="text-sm font-semibold">API Liveness</h2>
                  <p className="mt-2 text-2xl font-bold">200 OK</p>
                  <p className="mt-2 text-xs text-muted-foreground">Fastify HTTP Server Active</p>
                </div>

                <div className="rounded-md border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Database className="size-5 text-emerald-500" />
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                  <h2 className="text-sm font-semibold">PostgreSQL Database</h2>
                  <p className="mt-2 text-2xl font-bold capitalize">
                    {healthQuery.data?.components?.database ?? "Connected"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Aiven Cloud Connection Pool</p>
                </div>

                <div className="rounded-md border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Cpu className="size-5 text-emerald-500" />
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                  <h2 className="text-sm font-semibold">Redis In-Memory Engine</h2>
                  <p className="mt-2 text-2xl font-bold capitalize">
                    {healthQuery.data?.components?.redis ?? "Connected"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Pre-compiled Lua & Streams</p>
                </div>
              </div>

              <div className="mt-10 border-t border-border pt-6">
                <h2 className="text-sm font-semibold mb-4">Redis Stream Consumer Lag</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Layers className="size-3.5" /> Stream Length (XLEN)
                    </div>
                    <div className="text-2xl font-bold">
                      {metricsQuery.data?.worker?.streamLength ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Pending stream events</div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="size-3.5" /> Pending Lag (XPENDING)
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {metricsQuery.data?.worker?.streamPendingCount ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Unacknowledged messages</div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Cpu className="size-3.5" /> Consumer Group
                    </div>
                    <div className="text-sm font-mono font-semibold truncate">
                      {metricsQuery.data?.worker?.consumerGroup ?? "flash_workers_group"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Worker stream group</div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="size-3.5" /> Process Uptime
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.floor((metricsQuery.data?.infrastructure?.uptimeSeconds ?? 0) / 60)}m{" "}
                      {(metricsQuery.data?.infrastructure?.uptimeSeconds ?? 0) % 60}s
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">Backend uptime</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* SETTINGS VIEW */}
      {view === "settings" && (
        <section className="mt-9 max-w-2xl">
          <h2 className="text-sm font-semibold">Connection Information</h2>
          <dl className="mt-5 divide-y divide-border border-y border-border text-xs">
            <div className="flex flex-wrap justify-between gap-4 py-4">
              <dt className="text-muted-foreground">API Base URL</dt>
              <dd className="break-all font-mono font-semibold">{integration.backendUrl}</dd>
            </div>
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-muted-foreground">Connection Status</dt>
              <dd className="text-emerald-500 font-semibold flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                Connected (Live)
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-muted-foreground">Authentication Status</dt>
              <dd className={isAdmin ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                {isAdmin ? "Admin Authenticated" : "Not Authenticated"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-4">
              <dt className="text-muted-foreground">Active Token</dt>
              <dd className="font-mono text-[11px] truncate max-w-xs">
                {api.getToken() ? `${api.getToken()?.slice(0, 20)}...` : "None"}
              </dd>
            </div>
          </dl>

          <Button
            variant="outline"
            className="mt-5 text-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(integration.backendUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check className="size-3.5 mr-1" /> : <ArrowUpRight className="size-3.5 mr-1" />}
            {copied ? "Address copied" : "Copy service address"}
          </Button>
        </section>
      )}
    </AdminShell>
  );
}

function Blocked({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="sales-empty min-h-64 mt-8">
      <div className="empty-symbol">
        <WifiOff className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">Protected Information</h3>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        Admin authentication is required to access live campaigns, reservation streams, and operational metrics.
      </p>
      <Button size="sm" className="mt-5" onClick={onSignIn}>
        Sign In as Admin
      </Button>
    </div>
  );
}
