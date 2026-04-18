import React from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboard, Globe, FileText, Key, ScrollText, LogOut,
} from 'lucide-react';
import { clearToken } from '../api';
import { cn } from '../lib/utils';

const nav = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/domains',  label: 'Domains',   icon: Globe },
  { to: '/templates',label: 'Templates', icon: FileText },
  { to: '/keys',     label: 'API Keys',  icon: Key },
  { to: '/logs',     label: 'Logs',      icon: ScrollText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.navigate({ to: '/login' });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <span className="text-base font-bold text-brand-700 tracking-tight">
            EmailFlair
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                '[&.active]:bg-brand-50 [&.active]:text-brand-700',
              )}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
