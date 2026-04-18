import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import api, { setToken } from '../api';

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
      // Temporarily set the token so the axios interceptor sends it
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-brand-700">EmailFlair</span>
          <p className="text-sm text-slate-500 mt-1">Enter your admin token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin token</label>
            <input
              type="password"
              value={token}
              onChange={e => setTokenInput(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="••••••••••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
