import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, CheckCheck } from 'lucide-react';
import api from '../api';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scope: 'global' | 'domain' | 'multi';
  active: number;
  created_at: string;
}

interface NewKey extends ApiKey {
  key: string;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', scope: 'global' as const });

  async function load() {
    setLoading(true);
    const { data } = await api.get<ApiKey[]>('/api/keys');
    setKeys(data.filter(k => k.active));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await api.post<NewKey>('/api/keys', form);
    setNewKey(data);
    setCreating(false);
    setForm({ name: '', scope: 'global' });
    load();
  }

  async function handleRevoke(key: ApiKey) {
    if (!confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return;
    await api.delete(`/api/keys/${key.id}`);
    load();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-sm text-slate-500 mt-1">Keys for authenticating the /v1/send endpoint</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={15} /> New key
        </button>
      </div>

      {/* New key banner — shown once immediately after creation */}
      {newKey && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800 mb-1">Your new API key — copy it now, it won't be shown again</p>
              <code className="text-xs font-mono text-emerald-900 bg-emerald-100 px-2 py-1 rounded break-all">{newKey.key}</code>
            </div>
            <button onClick={() => copyKey(newKey.key)} className="flex-shrink-0 flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium">
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-emerald-600 hover:text-emerald-800">Dismiss</button>
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">New API key</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="My integration"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scope</label>
              <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value as typeof form.scope }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="global">Global</option>
                <option value="domain">Domain</option>
                <option value="multi">Multi-domain</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-200 h-14 animate-pulse" />)}</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No active API keys.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {keys.map(k => (
            <div key={k.id} className="flex items-center px-5 py-3.5 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">{k.name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{k.scope}</span>
                </div>
                <code className="text-xs text-slate-400 font-mono mt-0.5">{k.key_prefix}…</code>
              </div>
              <button onClick={() => handleRevoke(k)} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50">
                <Trash2 size={12} /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
