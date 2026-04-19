import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
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

export default function LogsPage() {
  const [result, setResult] = useState<PagedLogs | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (status) params.set('status', status);
    const { data } = await api.get<PagedLogs>(`/api/logs?${params}`);
    setResult(data);
    setLoading(false);
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  function handleStatus(val: string) {
    setStatus(val);
    setPage(1);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText size={14} className="text-orange-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Activity</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Email logs</h1>
        </div>
        <div className="flex gap-1">
          {STATUS_OPTS.map(o => (
            <button key={o.value} onClick={() => handleStatus(o.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                status === o.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="bg-zinc-900 h-12 rounded-lg border border-zinc-800 animate-pulse" />)}</div>
      ) : !result || result.data.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">No logs{status ? ` with status "${status}"` : ''}.</div>
      ) : (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 mb-4">
            {result.data.map(log => (
              <div key={log.id} className="flex items-center px-5 py-3 gap-4">
                <div className="flex-shrink-0">
                  {log.status === 'sent'
                    ? <CheckCircle2 size={14} className="text-emerald-500" />
                    : <XCircle size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-baseline">
                    <span className="text-sm font-medium text-white truncate max-w-[300px]">{log.subject}</span>
                    <span className="text-xs text-zinc-500">→ {log.to_address}</span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    From: {log.from_address}
                    {log.error && <span className="text-red-400 ml-2">{log.error}</span>}
                  </div>
                </div>
                <div className="text-xs text-zinc-600 whitespace-nowrap">
                  {new Date(log.sent_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {result.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>{result.total} total · page {result.page} of {result.pages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
