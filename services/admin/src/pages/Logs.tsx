import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
          <h1 className="text-2xl font-bold text-slate-900">Email logs</h1>
          <p className="text-sm text-slate-500 mt-1">History of all outgoing emails</p>
        </div>
        <div className="flex gap-1">
          {STATUS_OPTS.map(o => (
            <button key={o.value} onClick={() => handleStatus(o.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${status === o.value ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="bg-white h-12 rounded-lg border border-slate-200 animate-pulse" />)}</div>
      ) : !result || result.data.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No logs{status ? ` with status "${status}"` : ''}.</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
            {result.data.map(log => (
              <div key={log.id} className="flex items-center px-5 py-3 gap-4">
                <div className="flex-shrink-0">
                  {log.status === 'sent'
                    ? <CheckCircle size={15} className="text-emerald-500" />
                    : <XCircle size={15} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-baseline">
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[300px]">{log.subject}</span>
                    <span className="text-xs text-slate-400">→ {log.to_address}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    From: {log.from_address}
                    {log.error && <span className="text-red-400 ml-2">{log.error}</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(log.sent_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {result.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{result.total} total · page {result.page} of {result.pages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
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
