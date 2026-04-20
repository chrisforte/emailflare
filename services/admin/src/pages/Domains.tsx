import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle2, Clock, ExternalLink, Globe, X, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../api';

interface Domain {
  id: string;
  name: string;
  cf_zone_id: string;
  cf_subdomain_id: string | null;
  verified: number;
  dkim_selector: string | null;
  return_path_domain: string | null;
  created_at: string;
}

interface DnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  required: boolean;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', cfZoneId: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [dnsModal, setDnsModal] = useState<{ domain: Domain; records: DnsRecord[] } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get<Domain[]>('/api/domains');
    setDomains(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/api/domains', { name: form.name, ...(form.cfZoneId ? { cfZoneId: form.cfZoneId } : {}) });
      setForm({ name: '', cfZoneId: '' });
      setCreating(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to create domain';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(domain: Domain) {
    setVerifying(domain.id);
    try {
      await api.post(`/api/domains/${domain.id}/verify`);
      load();
    } finally {
      setVerifying(null);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await api.delete(`/api/domains/${deleteId}`);
    setDeleteId(null);
    load();
  }

  async function handleDns(domain: Domain) {
    const { data } = await api.get<DnsRecord[]>(`/api/domains/${domain.id}/dns`);
    setDnsModal({ domain, records: data });
  }

  return (
    <div className="p-8">
      <div className="max-w-[580px]">
      {/* Confirm delete modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold mb-2">Delete domain?</h2>
            <p className="text-zinc-400 text-sm mb-5">This will remove the domain and revoke all associated API key bindings. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Delete</button>
              <button onClick={() => setDeleteId(null)} className="text-sm text-zinc-400 hover:text-white px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-orange-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Sending</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Domains</h1>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(null); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={14} /> Add domain
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">New sending domain</h2>
            <button type="button" onClick={() => setCreating(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
          {formError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Domain / subdomain</label>
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="mail.example.com" required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Cloudflare Zone ID
                <span className="text-zinc-600 font-normal ml-1">(optional — auto-resolved if blank)</span>
              </label>
              <input
                value={form.cfZoneId} onChange={e => setForm(f => ({ ...f, cfZoneId: e.target.value }))}
                placeholder="abc123def456"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={submitting}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create domain'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-zinc-500 hover:text-zinc-300 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Domain list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">
          No domains yet. Add your first sending domain.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
          {domains.map(d => (
            <div key={d.id} className="flex items-center px-5 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  {d.verified ? (
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Clock size={14} className="text-amber-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-white text-sm">{d.name}</span>
                  {/* DKIM / Return-path icon-only indicators */}
                  <span title={d.dkim_selector ? 'DKIM configured' : 'DKIM not configured'}>
                    {d.dkim_selector
                      ? <ShieldCheck size={13} className="text-emerald-500/70" />
                      : <ShieldOff size={13} className="text-zinc-700" />}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 mt-1 font-mono">{d.id}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDns(d)}
                  className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink size={11} /> DNS
                </button>
                <button
                  onClick={() => handleVerify(d)}
                  disabled={verifying === d.id}
                  className="text-xs text-zinc-500 hover:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={11} className={verifying === d.id ? 'animate-spin' : ''} />
                  {verifying === d.id ? '…' : 'Verify'}
                </button>
                <button
                  onClick={() => setDeleteId(d.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
      {/* DNS records modal */}
      {dnsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setDnsModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white text-sm">DNS Records</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{dnsModal.domain.name}</p>
              </div>
              <button onClick={() => setDnsModal(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4 bg-zinc-800 rounded-lg px-3 py-2">
              Add these records to your DNS provider to enable sending.
            </p>
            <div className="space-y-2">
              {dnsModal.records.map((r, i) => (
                <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 font-mono text-xs">
                  <div className="flex gap-3 flex-wrap items-start">
                    <span className="text-orange-400 font-semibold w-10 flex-shrink-0">{r.type}</span>
                    <span className="text-zinc-300 flex-shrink-0">{r.name}</span>
                    <span className="text-zinc-400 break-all">{r.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
