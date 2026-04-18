import { useEffect, useState } from 'react';
import { Globe, FileText, Key, Send } from 'lucide-react';
import api from '../api';

interface Stats {
  totalDomains: number;
  verifiedDomains: number;
  totalTemplates: number;
  totalKeys: number;
  totalEmails: number;
  sentToday: number;
  failedToday: number;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.FC<{size?: number; className?: string}>; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-brand-50 rounded-lg">
          <Icon size={16} className="text-brand-600" />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/api/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);

  if (!stats) return (
    <div className="p-8">
      <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-28 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your email platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Globe}    label="Domains"    value={stats.totalDomains}    sub={`${stats.verifiedDomains} verified`} />
        <StatCard icon={FileText} label="Templates"  value={stats.totalTemplates} />
        <StatCard icon={Key}      label="Active keys" value={stats.totalKeys} />
        <StatCard icon={Send}     label="Sent today"  value={stats.sentToday}      sub={`${stats.failedToday} failed`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Total emails sent</h2>
        <div className="text-4xl font-bold text-brand-600">{stats.totalEmails.toLocaleString()}</div>
      </div>
    </div>
  );
}
