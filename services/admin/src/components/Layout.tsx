import React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboard, Globe, FileText, Key, ScrollText, LogOut, FlaskConical,
} from 'lucide-react';

function AppLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0f0f0f"/>
      <rect x="10" y="20" width="44" height="30" rx="4" fill="none" stroke="#f5f5f5" strokeWidth="2.5"/>
      <polyline points="10,20 32,38 54,20" fill="none" stroke="#f5f5f5" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M43 10 C43 10 46 13 45.5 16.5 C45 19 43 20 43 20 C43 20 44 18 43.2 16.5 C42.5 15 41 14.5 41 14.5 C41 14.5 42 16 41.5 17.5 C41 19 39.5 20 39.5 20 C39.5 20 38.5 17.5 40 15 C41 13 43 10 43 10 Z" fill="#f97316"/>
    </svg>
  );
}
import { clearToken } from '../api';
import { cn } from '../lib/utils';

const nav = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/domains',   label: 'Domains',    icon: Globe },
  { to: '/templates', label: 'Templates',  icon: FileText },
  { to: '/keys',      label: 'API Keys',   icon: Key },
  { to: '/logs',      label: 'Logs',       icon: ScrollText },
  { to: '/playground',label: 'Playground', icon: FlaskConical },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AppLogo />
            <span className="text-sm font-semibold text-white tracking-tight">EmailFlare</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
                '[&.active]:bg-zinc-800 [&.active]:text-white',
              )}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}

