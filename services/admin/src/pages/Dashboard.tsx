import { useEffect, useState } from 'react';
import { Globe, FileText, Key, Send, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import api from '../api';

interface DomainBreakdown {
  name: string;
  sent: number;
  failed: number;
}

interface Stats {
  totalDomains: number;
  verifiedDomains: number;
  totalTemplates: number;
  totalKeys: number;
  totalEmails: number;
  sentToday: number;
  failedToday: number;
  cfDailyLimit: number;
  domainBreakdown: DomainBreakdown[];
}

interface LogRow {
  id: string;
  to_address: string;
  from_address: string;
  subject: string;
  status: 'sent' | 'failed';
  error: string | null;
  sent_at: string;
}

// SVG ring showing a percentage
function Ring({ pct, size = 120, stroke = 10, color = '#f97316' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

function MiniDonut({ sent, failed }: { sent: number; failed: number }) {
  const total = sent + failed || 1;
  const sentPct = (sent / total) * 100;
  const size = 140;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const sentLen = circ * (sentPct / 100);
  const failedLen = circ - sentLen;
  // gap between segments
  const gap = 3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
      {/* Sent arc */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#10b981" strokeWidth={stroke}
        strokeDasharray={`${Math.max(sentLen - gap, 0)} ${circ - Math.max(sentLen - gap, 0)}`}
        strokeDashoffset={0}
      />
      {/* Failed arc */}
      {failed > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#ef4444" strokeWidth={stroke}
          strokeDasharray={`${Math.max(failedLen - gap, 0)} ${circ - Math.max(failedLen - gap, 0)}`}
          strokeDashoffset={-(sentLen)}
        />
      )}
    </svg>
  );
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    const [s, l] = await Promise.all([
      api.get<Stats>('/api/stats'),
      api.get<{ data: LogRow[] }>('/api/logs?limit=6&page=1'),
    ]);
    setStats(s.data);
    setLogs(l.data.data ?? []);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (!stats) return (
    <div className="p-8 space-y-4">
      <div className="h-7 w-32 bg-zinc-800 animate-pulse rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-28 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-52 animate-pulse" />)}
      </div>
    </div>
  );

  const deliveryRate = stats.sentToday + stats.failedToday > 0
    ? Math.round((stats.sentToday / (stats.sentToday + stats.failedToday)) * 100)
    : 100;

  const rateColor = deliveryRate >= 95 ? '#10b981' : deliveryRate >= 80 ? '#f59e0b' : '#ef4444';
  const rateLabel = deliveryRate >= 95 ? 'Healthy' : deliveryRate >= 80 ? 'Degraded' : 'Critical';

  return (
    <div className="p-8 min-h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={load} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Top row: delivery health + 3 stat cards ────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Delivery health — big card */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex gap-5 items-center">
          <div className="relative flex-shrink-0">
            <Ring pct={deliveryRate} size={110} stroke={10} color={rateColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white tabular-nums">{deliveryRate}%</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">rate</span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: rateColor }} />
              <span className="text-xs font-semibold" style={{ color: rateColor }}>{rateLabel}</span>
            </div>
            <p className="text-white font-semibold text-sm leading-snug mb-3">
              {deliveryRate === 100
                ? "All emails delivered today"
                : `${deliveryRate}% delivery rate today`}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Delivered</span>
                <span className="text-emerald-400 font-medium tabular-nums">{stats.sentToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Failed</span>
                <span className={`font-medium tabular-nums ${stats.failedToday > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{stats.failedToday}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 stat cards */}
        {[
          { label: 'Total emails', value: stats.totalEmails.toLocaleString(), icon: Send, sub: 'all time', accent: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Active domains', value: stats.totalDomains, icon: Globe, sub: `${stats.verifiedDomains} verified`, accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'API keys', value: stats.totalKeys, icon: Key, sub: `${stats.totalTemplates} templates`, accent: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(({ label, value, icon: Icon, sub, accent, bg }) => (
          <div key={label} className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
              <div className={`p-1.5 rounded-md ${bg}`}>
                <Icon size={13} className={accent} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
              <div className="text-xs text-zinc-600 mt-1">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Middle row: donut + domain health + quick stats ─────── */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Sent vs Failed donut */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Today's volume</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <MiniDonut sent={stats.sentToday} failed={stats.failedToday} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white tabular-nums">{stats.sentToday + stats.failedToday}</span>
                <span className="text-[10px] text-zinc-500">total</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-zinc-400">Sent</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white tabular-nums">{stats.sentToday}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-xs text-zinc-400">Failed</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white tabular-nums">{stats.failedToday}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domain verification pipeline */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Domain health</span>
            <span className="text-xs text-zinc-600">{stats.totalDomains} total</span>
          </div>
          <div className="space-y-3.5">
            {[
              { label: 'Verified', count: stats.verifiedDomains, total: stats.totalDomains, color: 'bg-emerald-500' },
              { label: 'Pending', count: stats.totalDomains - stats.verifiedDomains, total: stats.totalDomains, color: 'bg-amber-500' },
            ].map(({ label, count, total, color }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                      <span className="text-zinc-400">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 tabular-nums">{count} domains</span>
                      <span className="text-white font-medium w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-zinc-500 mb-1">Templates</div>
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-purple-400" />
                <span className="text-sm font-semibold text-white">{stats.totalTemplates}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">Active keys</div>
              <div className="flex items-center gap-1.5">
                <Key size={12} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">{stats.totalKeys}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CF Daily Limit card */}
        {(() => {
          const limit = stats.cfDailyLimit;
          const used = stats.sentToday;
          const pct = Math.min(100, Math.round((used / limit) * 100));
          const limitColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
          const limitLabel = pct >= 90 ? 'Critical' : pct >= 70 ? 'Warning' : 'Healthy';
          return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">CF Daily limit</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: limitColor, backgroundColor: `${limitColor}18` }}>{limitLabel}</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-shrink-0">
                  <Ring pct={pct} size={80} stroke={8} color={limitColor} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-white tabular-nums">{pct}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white tabular-nums">{used.toLocaleString()}<span className="text-sm text-zinc-500 font-normal"> / {limit.toLocaleString()}</span></div>
                  <div className="text-xs text-zinc-500 mt-0.5">emails sent today</div>
                  <div className="text-xs mt-2" style={{ color: limitColor }}>{limit - used} remaining</div>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: limitColor }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Per-domain breakdown ────────────────────────────────── */}
      {stats.domainBreakdown.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl mb-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Today's sends by domain</span>
            <span className="text-xs text-zinc-600">{stats.sentToday} / {stats.cfDailyLimit} limit</span>
          </div>
          <div className="divide-y divide-zinc-800">
            <div className="grid grid-cols-[1fr_100px_100px_120px] px-5 py-2.5 text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
              <span>Domain</span>
              <span className="text-right">Sent</span>
              <span className="text-right">Failed</span>
              <span className="text-right">Share of limit</span>
            </div>
            {stats.domainBreakdown.map(d => {
              const pct = Math.min(100, Math.round((d.sent / stats.cfDailyLimit) * 100));
              const barColor = pct >= 50 ? '#ef4444' : pct >= 25 ? '#f59e0b' : '#10b981';
              return (
                <div key={d.name} className="grid grid-cols-[1fr_100px_100px_120px] px-5 py-3 items-center hover:bg-zinc-800/40 transition-colors">
                  <span className="text-sm text-white truncate pr-4 font-mono">{d.name}</span>
                  <span className="text-sm text-emerald-400 font-medium tabular-nums text-right">{d.sent}</span>
                  <span className={`text-sm font-medium tabular-nums text-right ${d.failed > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{d.failed}</span>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs text-zinc-500 tabular-nums w-9 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent logs table ───────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Recent sends</span>
          <a href="/logs" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">View all →</a>
        </div>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-sm">No emails sent yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr] px-5 py-2.5 text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
              <span>Subject</span>
              <span>Recipient</span>
              <span>Status</span>
              <span className="text-right">When</span>
            </div>
            {logs.map(log => (
              <div key={log.id} className="grid grid-cols-[2fr_2fr_1fr_1fr] px-5 py-3 items-center hover:bg-zinc-800/40 transition-colors">
                <span className="text-sm text-white truncate pr-3">{log.subject || '(no subject)'}</span>
                <span className="text-xs text-zinc-400 truncate pr-3">{log.to_address}</span>
                <div className="flex items-center gap-1.5">
                  {log.status === 'sent'
                    ? <><CheckCircle2 size={12} className="text-emerald-500" /><span className="text-xs text-emerald-400">Sent</span></>
                    : <><XCircle size={12} className="text-red-400" /><span className="text-xs text-red-400">Failed</span></>
                  }
                </div>
                <div className="flex items-center justify-end gap-1 text-xs text-zinc-600">
                  <Clock size={10} />
                  {timeAgo(log.sent_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

