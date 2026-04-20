import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [token, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/login', { token });
      navigate({ to: '/' });
    } catch {
      setError('Invalid admin token. Check your ADMIN_TOKEN environment variable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0c0c0e]">
      {/* Left panel — brand/product info */}
      <div className="hidden lg:flex w-[420px] flex-shrink-0 flex-col justify-between bg-[#0f0f12] border-r border-white/[0.06] p-10">
        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="lg-bg" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#9a3412"/>
                <stop offset="58%" stopColor="#ea580c"/>
                <stop offset="100%" stopColor="#fb923c"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="13" fill="url(#lg-bg)"/>
            <path d="M53 11 L9 28 L23 38 Z" fill="white"/>
            <path d="M53 11 L23 38 L9 53 Z" fill="white" opacity="0.82"/>
          </svg>
          <span className="text-[15px] font-semibold text-white tracking-tight">EmailFlare</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Transactional email,<br />
            <span className="text-orange-400">built for developers.</span>
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed mb-8">
            Send, track, and manage emails at scale through Cloudflare Email Routing — with templates, API keys, and detailed delivery logs.
          </p>

          <div className="space-y-3">
            {[
              'Cloudflare-native email routing',
              'Template engine with variable substitution',
              'Per-key rate limiting & usage tracking',
              'Real-time delivery logs & analytics',
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                <span className="w-1 h-1 rounded-full bg-orange-500 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-700">Powered by Cloudflare Workers &amp; D1</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <rect width="64" height="64" rx="14" fill="#18181b"/>
              <rect x="10" y="20" width="44" height="30" rx="4" fill="none" stroke="#e4e4e7" strokeWidth="2.5"/>
              <polyline points="10,20 32,38 54,20" fill="none" stroke="#e4e4e7" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M43 10 C43 10 46 13 45.5 16.5 C45 19 43 20 43 20 C43 20 44 18 43.2 16.5 C42.5 15 41 14.5 41 14.5 C41 14.5 42 16 41.5 17.5 C41 19 39.5 20 39.5 20 C39.5 20 38.5 17.5 40 15 C41 13 43 10 43 10 Z" fill="#f97316"/>
            </svg>
            <span className="text-[15px] font-semibold text-white tracking-tight">EmailFlare</span>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-semibold text-white tracking-tight">Sign in to admin</h2>
            <p className="text-sm text-zinc-500 mt-1">Enter your admin token to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="token">
                Admin token
              </label>
              <div className="relative">
                <input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setTokenInput(e.target.value)}
                  required
                  className="w-full bg-[#161618] border border-white/[0.1] rounded-lg px-3 pr-10 py-2.5 text-sm font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  placeholder="ef_adm_••••••••••••••••"
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  tabIndex={-1}
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg px-3.5 py-2.5">
                <span className="text-red-500 mt-0.5 flex-shrink-0">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-all duration-150 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-[11px] text-zinc-700 text-center mt-6">
            Token is set via <code className="font-mono text-zinc-600">ADMIN_TOKEN</code> env var
          </p>
        </div>
      </div>
    </div>
  );
}


