import React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboard, Globe, FileText, Key, ScrollText, LogOut, FlaskConical,
} from 'lucide-react';
import api from '../api';
import { cn } from '../lib/utils';

function AppLogo() {
  return (
    <div className="relative flex-shrink-0">
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ef-bg" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#9a3412"/>
            <stop offset="58%" stopColor="#ea580c"/>
            <stop offset="100%" stopColor="#fb923c"/>
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="13" fill="url(#ef-bg)"/>
        <path d="M53 11 L9 28 L23 38 Z" fill="white"/>
        <path d="M53 11 L23 38 L9 53 Z" fill="white" opacity="0.82"/>
      </svg>
    </div>
  );
}

const nav = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/logs',       label: 'Logs',       icon: ScrollText },
  { to: '/templates',  label: 'Templates',  icon: FileText },
  { to: '/domains',    label: 'Domains',    icon: Globe },
  { to: '/keys',       label: 'API Keys',   icon: Key },
  { to: '/playground', label: 'Playground', icon: FlaskConical },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await api.post('/api/auth/logout').catch(() => {});
    router.navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0c0e]">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#0f0f12] border-r border-white/[0.06] flex flex-col">
        {/* Brand */}
        <div className="px-4 py-[18px] border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <AppLogo />
            <div>
              <span className="text-[13px] font-semibold text-white tracking-tight leading-none block">EmailFlare</span>
              <span className="text-[10px] text-zinc-600 leading-none mt-0.5 block">Admin</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-px">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-2.5 px-3 py-[7px] rounded-[7px] text-[13px] font-medium transition-all duration-150',
                'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]',
                '[&.active]:bg-orange-500/10 [&.active]:text-orange-200 [&.active]:shadow-[inset_2px_0_0_#f97316]',
              )}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon size={14} className="flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-px">
          {/* Status pill */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-zinc-600">Connected</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-[7px] text-[13px] font-medium text-zinc-500 hover:text-red-400 hover:bg-white/[0.05] transition-all duration-150"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[#0c0c0e]">
        {children}
      </main>
    </div>
  );
}

