import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../api';

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  layout: string | null;
  domain_id: string | null;
  created_at: string;
  updated_at: string;
}

type Mode = 'list' | 'create' | 'edit';

const EMPTY_FORM = { name: '', subject: '', htmlBody: '', textBody: '', layout: '', domainId: '' };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    const { data } = await api.get<Template[]>('/api/templates');
    setTemplates(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMode('create');
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, htmlBody: t.html_body, textBody: t.text_body ?? '', layout: t.layout ?? '', domainId: t.domain_id ?? '' });
    setMode('edit');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      subject: form.subject,
      htmlBody: form.htmlBody,
      textBody: form.textBody || undefined,
      layout: form.layout || undefined,
      domainId: form.domainId || undefined,
    };
    if (mode === 'create') {
      await api.post('/api/templates', payload);
    } else if (editing) {
      await api.put(`/api/templates/${editing.id}`, payload);
    }
    setMode('list');
    load();
  }

  async function handleDelete(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await api.delete(`/api/templates/${t.id}`);
    load();
  }

  if (mode !== 'list') {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{mode === 'create' ? 'New template' : `Edit — ${editing?.name}`}</h1>
        <form onSubmit={handleSave} className="space-y-4">
          {(['name', 'subject'] as const).map(field => (
            <div key={field}>
              <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">{field}</label>
              <input
                value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">HTML body</label>
            <textarea
              value={form.htmlBody} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))} required rows={12}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="<p>Hello {{name}},</p>"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Plain-text body (optional)</label>
            <textarea
              value={form.textBody} onChange={e => setForm(f => ({ ...f, textBody: e.target.value }))} rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
            <button type="button" onClick={() => setMode('list')} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Reusable email templates with variable substitution</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={15} /> New template
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-slate-200 h-16 animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No templates yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {templates.map(t => (
            <div key={t.id} className="flex items-center px-5 py-3.5 gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm">{t.name}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">{t.subject}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(t)} className="text-xs text-slate-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 flex items-center gap-1">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(t)} className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
