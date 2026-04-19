import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, CheckCheck, Key, X } from 'lucide-react';
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
          <div className="flex items-center gap-2 mb-1">
            <Key size={14} className="text-orange-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Auth</span>
          </div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={14} /> New key
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-400 mb-1">Copy your new API key — it won't be shown again</p>
              <code className="text-xs font-mono text-emerald-300 break-all">{newKey.key}</code>
            </div>
            <button onClick={() => copyKey(newKey.key)} className="flex-shrink-0 flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">Dismiss</button>
        </div>
      )}

      {creating && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">New API key</h2>
            <button type="button" onClick={() => setCreating(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="My integration"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Scope</label>
              <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value as typeof form.scope }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors">
                <option value="global">Global</option>
                <option value="domain">Domain</option>
                <option value="multi">Multi-domain</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-zinc-500 hover:text-zinc-300 px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-14 animate-pulse" />)}</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">No active API keys.</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
          {keys.map(k => (
            <div key={k.id} className="flex items-center px-5 py-3.5 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{k.name}</span>
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">{k.scope}</span>
                </div>
                <code className="text-xs text-zinc-600 font-mono mt-0.5">{k.key_prefix}…</code>
              </div>
              <button onClick={() => handleRevoke(k)} className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                <Trash2 size={11} /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
