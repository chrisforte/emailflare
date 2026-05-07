import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { login } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

function AppLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="58%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="13" fill="url(#lg-bg)" />
      <path d="M53 11 L9 28 L23 38 Z" fill="white" />
      <path d="M53 11 L23 38 L9 53 Z" fill="white" opacity="0.82" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: '/' });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between bg-sidebar border-r border-sidebar-border p-10">
        <div className="flex items-center gap-2.5">
          <AppLogo size={30} />
          <span className="text-[15px] font-semibold text-foreground tracking-tight">EmailFlare</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
            Your inbox,<br />
            <span className="text-primary">your CRM.</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Receive, manage, and reply to emails through a unified inbox — with sequences, templates, and multi-user collaboration.
          </p>

          <div className="flex flex-col gap-3">
            {[
              'Unified inbox with thread view',
              'Automated email sequences',
              'Multi-user, invite-only access',
              'Full sending API built-in',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="size-1 rounded-full bg-primary flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/40">Powered by Cloudflare Workers &amp; D1</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={28} />
            <span className="text-[15px] font-semibold text-foreground tracking-tight">EmailFlare</span>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-semibold text-foreground tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your email and password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || !email.trim() || !password.trim()} className="w-full">
              {loading && <Loader2 size={14} className="animate-spin" data-icon="inline-start" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
