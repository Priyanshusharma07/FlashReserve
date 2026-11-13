import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Ticket,
  Activity,
  Settings,
  ArrowUpRight,
  Shield,
  Menu,
  X,
  LockKeyhole,
} from "lucide-react";
import { Brand } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/campaigns", label: "Campaigns", icon: Package },
  { to: "/admin/reservations", label: "Reservations", icon: Ticket },
  { to: "/admin/metrics", label: "System health", icon: Activity },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="admin-side" data-open={open}>
        <div className="flex items-center justify-between">
          <Brand />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <p className="eyebrow mb-8 mt-8 text-muted-foreground">OPERATIONS CONSOLE</p>
        <nav aria-label="Operations navigation">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="admin-link"
              activeOptions={{ exact: true }}
              onClick={() => setOpen(false)}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-8 left-8 right-8 border-t border-border pt-5">
          <Link to="/" className="flex items-center justify-between text-xs text-muted-foreground">
            Back to storefront <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </aside>
      <div className="admin-body">
        <header className="flex h-20 items-center justify-between gap-4 border-b border-border bg-card px-6 md:px-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <span className="text-xs text-muted-foreground">
              Operations <span className="mx-3">/</span>
              <span className="text-foreground">{title}</span>
            </span>
          </div>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-4" />
            Not authenticated
          </span>
        </header>
        <main className="p-6 md:p-10">
          <p className="eyebrow text-muted-foreground">FLASHRESERVE OPERATIONS</p>
          <h1 className="section-heading mb-3 mt-4">{title}</h1>
          <p className="section-subtitle">Sale operations, with a clear view of what’s verified.</p>
          <div className="mt-8 flex items-start gap-3 border-y border-border bg-warning-surface px-4 py-4">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <h2 className="text-xs font-semibold">Authorized access required</h2>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                The identity service is not connected. Private campaigns, reservations, and
                operational metrics are not accessible.
              </p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
