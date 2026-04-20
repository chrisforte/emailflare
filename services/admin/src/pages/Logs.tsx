import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Search, X, Mail, Hash, Clock, AlertTriangle, Server } from 'lucide-react';
import api from '../api';

interface LogRow {
  id: string;
  to_address: string;
  from_address: string;
  subject: string;
  status: 'sent' | 'failed';
  cf_message_id: string | null;
  domain_id: string | null;
  template_id: string | null;
  error: string | null;
  sent_at: string;
}

interface PagedLogs {
  data: LogRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_OPTS = [
  { label: 'All', value: '' },
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
];

type DetailTab = 'email' | 'metadata';

// ─── Right panel ────────────────────────────────────────────────────────────

function DetailPanel({ log }: { log: LogRow }) {
  const [tab, setTab] = useState<DetailTab>('email');

  const sentAt = new Date(log.sent_at);
  const isSent = log.status === 'sent';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          {isSent
            ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
            : <XCircle size={13} className="text-red-400 flex-shrink-0" />}
          <span className={`text-xs font-semibold ${isSent ? 'text-emerald-400' : 'text-red-400'}`}>
            {isSent ? 'Delivered' : 'Failed'}
          </span>
          <span className="text-zinc-700 text-xs">·</span>
          <span className="text-xs text-zinc-600">{sentAt.toLocaleString()}</span>
        </div>
        <h2 className="text-[15px] font-semibold text-white leading-snug line-clamp-2">
          {log.subject || <span className="text-zinc-600 italic font-normal">No subject</span>}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {([['email', 'Email'], ['metadata', 'Metadata']] as [DetailTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-orange-500 text-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'email' && (
          <div className="p-6">
            {/* Email envelope card */}
            <div className="bg-[#0f0f12] border border-white/[0.07] rounded-xl overflow-hidden">
              {/* "Email client" header */}
              <div className="px-5 py-4 border-b border-white/[0.06] space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-zinc-600 w-12 flex-shrink-0 pt-0.5">From</span>
                  <span className="text-sm text-zinc-200 font-mono break-all">{log.from_address}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-zinc-600 w-12 flex-shrink-0 pt-0.5">To</span>
                  <span className="text-sm text-zinc-200 font-mono break-all">{log.to_address}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-zinc-600 w-12 flex-shrink-0 pt-0.5">Subject</span>
                  <span className="text-sm text-zinc-200 break-all">{log.subject || '—'}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[11px] text-zinc-600 w-12 flex-shrink-0 pt-0.5">Date</span>
                  <span className="text-sm text-zinc-400">{sentAt.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Body area */}
              <div className="px-5 py-5 flex flex-col items-center gap-3 text-center min-h-[140px] justify-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSent ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <Mail size={18} className={isSent ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    {isSent ? 'Email delivered successfully' : 'Email delivery failed'}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Message body is not stored — emails are sent directly via Cloudflare Email API.
                  </p>
                </div>
              </div>

              {/* Error block */}
              {log.error && (
                <div className="px-5 py-4 border-t border-red-500/10 bg-red-500/5 flex items-start gap-2.5">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-1">Delivery error</p>
                    <p className="text-xs text-red-300/80 font-mono break-all leading-relaxed">{log.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'metadata' && (
          <div className="p-6 space-y-2">
            {[
              { label: 'Log ID', value: log.id, icon: Hash },
              { label: 'CF Message ID', value: log.cf_message_id ?? '—', icon: Server },
              { label: 'Domain ID', value: log.domain_id ?? '—', icon: Server },
              { label: 'Template ID', value: log.template_id ?? '—', icon: Server },
              { label: 'Sent at', value: sentAt.toISOString(), icon: Clock },
              { label: 'Status', value: log.status, icon: isSent ? CheckCircle2 : XCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-[#0f0f12] border border-white/[0.07] rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className="text-zinc-600" />
                  <span className="text-[11px] text-zinc-600 uppercase tracking-wide font-medium">{label}</span>
                </div>
                <span className={`text-xs font-mono break-all ${
                  label === 'Status'
                    ? isSent ? 'text-emerald-400' : 'text-red-400'
                    : 'text-zinc-300'
                }`}>{value}</span>
              </div>
            ))}
            {log.error && (
              <div className="bg-red-500/8 border border-red-500/15 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={11} className="text-red-400" />
                  <span className="text-[11px] text-red-400 uppercase tracking-wide font-medium">Error</span>
                </div>
                <span className="text-xs font-mono text-red-300/80 break-all">{log.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [result, setResult] = useState<PagedLogs | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const { data } = await api.get<PagedLogs>(`/api/logs?${params}`);
    setResult(data);
    setLoading(false);
  }, [page, status, search, from, to]);

  useEffect(() => { load(); }, [load]);

  function handleStatus(val: string) { setStatus(val); setPage(1); }
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }
  function clearSearch() { setSearch(''); setSearchInput(''); setPage(1); }

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* ── Left pane ──────────────────────────────────────────────────────── */}
      <div className="w-[560px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden">
        {/* Pane header */}
        <div className="px-5 pt-5 pb-3 border-b border-white/[0.06] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-orange-500" />
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sending</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Logs</h1>
            </div>
            {/* Status toggle */}
            <div className="flex bg-[#111114] border border-white/[0.07] rounded-lg p-[3px]">
              {STATUS_OPTS.map(o => (
                <button key={o.value} onClick={() => handleStatus(o.value)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all duration-150 ${
                    status === o.value
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-600 hover:text-zinc-300'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search + date filters */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search subject, to, from…"
                className="w-full bg-[#111114] border border-white/[0.07] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
            {search && (
              <button type="button" onClick={clearSearch} className="text-zinc-600 hover:text-zinc-400">
                <X size={12} />
              </button>
            )}
          </form>

          <div className="flex items-center gap-2">
            <input type="date" value={from}
              onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="flex-1 bg-[#111114] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            <span className="text-zinc-700 text-xs">→</span>
            <input type="date" value={to}
              onChange={e => { setTo(e.target.value); setPage(1); }}
              className="flex-1 bg-[#111114] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); setPage(1); }} className="text-zinc-600 hover:text-zinc-400">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-1.5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[58px] bg-[#111114] border border-white/[0.04] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !result || result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-700 py-20">
              <Search size={20} className="opacity-40" />
              <p className="text-xs">No matching logs</p>
            </div>
          ) : (
            <div className="p-2 space-y-px">
              {result.data.map(log => {
                const isActive = selected?.id === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-100 ${
                      isActive
                        ? 'bg-orange-500/10 border border-orange-500/20'
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {log.status === 'sent'
                        ? <CheckCircle2 size={13} className="text-emerald-500" />
                        : <XCircle size={13} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate leading-tight ${isActive ? 'text-orange-100' : 'text-zinc-200'}`}>
                        {log.subject || <span className="text-zinc-600 italic font-normal">No subject</span>}
                      </p>
                      <p className="text-[11px] text-zinc-600 font-mono truncate mt-0.5">{log.to_address}</p>
                      {log.error && (
                        <p className="text-[11px] text-red-400/70 truncate mt-0.5">{log.error}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-700 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {result && result.pages > 1 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {result.total} total · {result.page}/{result.pages}
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-md border border-white/[0.07] bg-[#111114] hover:bg-white/[0.05] disabled:opacity-40 transition-colors">
                <ChevronLeft size={12} />
              </button>
              <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-md border border-white/[0.07] bg-[#111114] hover:bg-white/[0.05] disabled:opacity-40 transition-colors">
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right pane ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-[#0c0c0e]">
        {selected ? (
          <DetailPanel key={selected.id} log={selected} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700 select-none">
            <Mail size={32} strokeWidth={1.2} className="opacity-30" />
            <p className="text-sm">Select a log entry to inspect</p>
          </div>
        )}
      </div>
    </div>
  );
}
