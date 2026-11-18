import { useState } from 'react';
import { Shield, User, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'admin' | 'user';
}

export function AuthModal({ open, onOpenChange, defaultRole = 'user' }: AuthModalProps) {
  const { login, loginAsSeed, isLoading } = useAuth();
  const [email, setEmail] = useState(
    defaultRole === 'admin' ? 'admin@flashreserve.io' : 'user@flashreserve.io',
  );
  const [password, setPassword] = useState(
    defaultRole === 'admin' ? 'Admin@12345' : 'User@12345',
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'user') => {
    setError('');
    setSubmitting(true);
    try {
      await loginAsSeed(role);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <LogIn className="size-5" />
          </div>
          <DialogTitle>Sign In to FlashReserve</DialogTitle>
          <DialogDescription>
            Choose a test account or enter your credentials to access drops and the operations console.
          </DialogDescription>
        </DialogHeader>

        {/* 1-Click Quick Seed Accounts */}
        <div className="space-y-2 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick 1-Click Test Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex items-center justify-start gap-2 h-auto py-2.5 px-3 border-border hover:border-primary/50 text-left"
              disabled={submitting || isLoading}
              onClick={() => handleQuickLogin('admin')}
            >
              <Shield className="size-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-xs">Admin Access</div>
                <div className="text-[10px] text-muted-foreground truncate">admin@flashreserve.io</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="flex items-center justify-start gap-2 h-auto py-2.5 px-3 border-border hover:border-primary/50 text-left"
              disabled={submitting || isLoading}
              onClick={() => handleQuickLogin('user')}
            >
              <User className="size-4 text-emerald-500 shrink-0" />
              <div>
                <div className="font-semibold text-xs">Customer Access</div>
                <div className="text-[10px] text-muted-foreground truncate">user@flashreserve.io</div>
              </div>
            </Button>
          </div>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              disabled={submitting || isLoading}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={submitting || isLoading}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive" role="alert">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || isLoading}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
