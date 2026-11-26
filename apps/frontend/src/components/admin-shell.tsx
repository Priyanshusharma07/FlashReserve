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
  ShieldCheck,
  Menu,
  X,
  LockKeyhole,
  LogOut,
  LogIn,
} from "lucide-react";
import { Brand } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/campaigns", label: "Campaigns", icon: Package },
  { to: "/admin/reservations", label: "Reservations", icon: Ticket },
  { to: "/admin/metrics", label: "System health", icon: Activity },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultRole="admin"
      />

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

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-500 font-medium">
                  <ShieldCheck className="size-3.5" />
                  {user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="size-4 text-warning" />
                  Not authenticated
                </span>
                <Button
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <LogIn className="size-3.5" />
                  Admin Sign In
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="p-6 md:p-10">
          <p className="eyebrow text-muted-foreground">FLASHRESERVE OPERATIONS</p>
          <h1 className="section-heading mb-3 mt-4">{title}</h1>
          <p className="section-subtitle">Sale operations, with real-time inventory and live metrics.</p>

          {!isAdmin && (
            <div className="mt-8 flex items-start justify-between gap-4 border-y border-border bg-warning-surface px-4 py-4">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  <h2 className="text-xs font-semibold">Authorized access required</h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    Sign in with an authorized administrator account to manage campaigns, monitor reservations, and audit inventory drift.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuthModalOpen(true)}
                className="shrink-0 text-xs"
              >
                Sign In
              </Button>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
