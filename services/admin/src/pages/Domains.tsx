import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
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
  const [dnsModal, setDnsModal] = useState<{ domain: Domain; records: DnsRecord[] } | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get<Domain[]>('/api/domains');
    setDomains(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/domains', form);
      setForm({ name: '', cfZoneId: '' });
      setCreating(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to create domain';
      alert(msg);
    }
  }

  async function handleVerify(domain: Domain) {
    await api.post(`/api/domains/${domain.id}/verify`);
    load();
  }

  async function handleDelete(domain: Domain) {
    if (!confirm(`Delete domain "${domain.name}"?`)) return;
    await api.delete(`/api/domains/${domain.id}`);
    load();
  }

  async function handleDns(domain: Domain) {
    const { data } = await api.get<DnsRecord[]>(`/api/domains/${domain.id}/dns`);
    setDnsModal({ domain, records: data });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Domains</h1>
          <p className="text-sm text-slate-500 mt-1">Sending domains managed via Cloudflare</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={15} /> Add domain
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">New domain</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Domain / subdomain</label>
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="mail.example.com" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cloudflare Zone ID</label>
              <input
                value={form.cfZoneId} onChange={e => setForm(f => ({ ...f, cfZoneId: e.target.value }))}
                placeholder="abc123" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
              Create
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No domains yet. Add your first sending domain.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {domains.map(d => (
            <div key={d.id} className="flex items-center px-5 py-3.5 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">{d.name}</span>
                  {d.verified ? (
                    <CheckCircle size={14} className="text-emerald-500" />
                  ) : (
                    <XCircle size={14} className="text-amber-400" />
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">{d.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDns(d)} className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50">
                  <ExternalLink size={12} /> DNS
                </button>
                <button onClick={() => handleVerify(d)} className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-50">
                  <RefreshCw size={12} /> Verify
                </button>
                <button onClick={() => handleDelete(d)} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DNS records modal */}
      {dnsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDnsModal(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-slate-900 mb-1">DNS records — {dnsModal.domain.name}</h2>
            <p className="text-xs text-slate-400 mb-4">Add these records to your DNS provider to enable sending.</p>
            <div className="space-y-3">
              {dnsModal.records.map((r, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 font-mono text-xs">
                  <div className="flex gap-3 flex-wrap">
                    <span className="text-brand-700 font-semibold">{r.type}</span>
                    <span className="text-slate-600">{r.name}</span>
                    <span className="text-slate-800 break-all">{r.content}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setDnsModal(null)} className="mt-5 text-sm text-slate-500 hover:text-slate-700">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
