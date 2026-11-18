import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Zap, User, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReservationLookup } from "@/components/reservation-lookup";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";

export function Brand() {
  return (
    <Link to="/" aria-label="FlashReserve home" className="brand">
      <span className="brand-mark">
        <Zap className="size-5" size={21} fill="currentColor" />
      </span>
      FlashReserve<span className="text-primary">.</span>
    </Link>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      <header className="border-b border-border bg-card">
        <div className="page-width flex min-h-20 items-center justify-between gap-4">
          <Brand />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link to="/" className="nav-link" activeOptions={{ exact: true }}>
              Home
            </Link>
            <Link to="/sales" className="nav-link">
              Flash sales
            </Link>
            <Link to="/how-it-works" className="nav-link">
              How it works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ReservationLookup />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full">
                  <User className="size-3" />
                  <span className="max-w-[120px] truncate">{user?.email}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Sign Out"
                  className="size-8 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <LogIn className="size-3.5" />
                Sign In
              </Button>
            )}

            <span className="hidden h-5 border-l border-border lg:block" />
            <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
              <Link to="/admin">
                Operations <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
        <nav
          className="page-width flex justify-between border-t border-border md:hidden"
          aria-label="Mobile navigation"
        >
          <Link to="/" className="py-3 text-xs font-semibold">
            Home
          </Link>
          <Link to="/sales" className="py-3 text-xs font-semibold">
            Flash sales
          </Link>
          <Link to="/how-it-works" className="py-3 text-xs font-semibold">
            How it works
          </Link>
          <Link to="/admin" className="py-3 text-xs font-semibold">
            Operations
          </Link>
        </nav>
      </header>
      {children}
      <footer className="border-t border-border bg-card">
        <div className="page-width flex flex-wrap items-center justify-between gap-6 py-8">
          <div>
            <Brand />
            <p className="mt-3 text-[11px] text-muted-foreground">
              A fair shot at something exceptional.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <Link to="/sales">Flash sales</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/admin">
              Operations <ArrowUpRight className="ml-1 inline size-3" />
            </Link>
          </div>
        </div>
        <div className="page-width flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-[10px] text-muted-foreground">
          <span>© {new Date().getFullYear()} FlashReserve. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <Zap className="size-3" />
            Built for the moment.
          </span>
        </div>
      </footer>
    </>
  );
}
