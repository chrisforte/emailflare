import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import api, { setToken } from '../api';

function AppLogo() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0f0f0f"/>
      <rect x="10" y="20" width="44" height="30" rx="4" fill="none" stroke="#f5f5f5" strokeWidth="2.5"/>
      <polyline points="10,20 32,38 54,20" fill="none" stroke="#f5f5f5" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M43 10 C43 10 46 13 45.5 16.5 C45 19 43 20 43 20 C43 20 44 18 43.2 16.5 C42.5 15 41 14.5 41 14.5 C41 14.5 42 16 41.5 17.5 C41 19 39.5 20 39.5 20 C39.5 20 38.5 17.5 40 15 C41 13 43 10 43 10 Z" fill="#f97316"/>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [token, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setToken(token);
      await api.get('/api/me');
      navigate({ to: '/' });
    } catch {
      setToken('');
      setError('Invalid admin token');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3"><AppLogo /></div>
          <span className="text-xl font-bold text-white tracking-tight">EmailFlare</span>
          <p className="text-sm text-zinc-500 mt-1">Admin panel</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Admin token</label>
              <input
                type="password"
                value={token}
                onChange={e => setTokenInput(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


