import { useState, useEffect } from 'react';
import { Shield, User, LogIn, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'admin' | 'user';
}

export function AuthModal({ open, onOpenChange, defaultRole = 'user' }: AuthModalProps) {
  const { login, register, loginAsSeed, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  
  // Clean credentials state - NEVER pre-filled with plaintext passwords
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset errors and password visibility when modal opens/closes
  useEffect(() => {
    if (!open) {
      setError('');
      setPassword('');
      setShowPassword(false);
      setShowRegisterPassword(false);
    }
  }, [open]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
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
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
            <LogIn className="size-5" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight">
            Account Access
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sign in to reserve flash-sale drops, view orders, or access operations.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as 'signin' | 'register');
            setError('');
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
            <TabsTrigger value="signin" className="text-xs font-semibold">
              <LogIn className="mr-1.5 size-3.5" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="register" className="text-xs font-semibold">
              <UserPlus className="mr-1.5 size-3.5" />
              Create Account
            </TabsTrigger>
          </TabsList>

          {/* SIGN IN TAB */}
          <TabsContent value="signin" className="mt-0 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={submitting || isLoading}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-foreground">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={submitting || isLoading}
                    className="h-9 text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium" role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={submitting || isLoading}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* CREATE ACCOUNT TAB */}
          <TabsContent value="register" className="mt-0 space-y-4">
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Full Name <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  disabled={submitting || isLoading}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  disabled={submitting || isLoading}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min 6 characters)"
                    autoComplete="new-password"
                    required
                    disabled={submitting || isLoading}
                    className="h-9 text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center cursor-pointer"
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium" role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={submitting || isLoading}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Quick Sandbox Personas (Clean and secure, never exposes credentials in inputs) */}
        <div className="mt-4 pt-3.5 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium text-[11px] uppercase tracking-wider">Quick Sandbox Demo Access</span>
            <span className="text-[10px] text-muted-foreground/70">1-click bypass</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-medium border-border hover:border-primary/40"
              disabled={submitting || isLoading}
              onClick={() => handleQuickLogin('admin')}
              title="Sign in with seeded Admin role"
            >
              <Shield className="size-3.5 text-primary shrink-0" />
              <span>Admin Persona</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 font-medium border-border hover:border-emerald-500/40"
              disabled={submitting || isLoading}
              onClick={() => handleQuickLogin('user')}
              title="Sign in with seeded Customer role"
            >
              <User className="size-3.5 text-emerald-500 shrink-0" />
              <span>Customer Persona</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
