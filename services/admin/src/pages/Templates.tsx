import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileText, Cpu, X, Eye, Mail } from 'lucide-react';
import api from '../api';

interface Template {
  id: string;
  name: string;
  slug: string | null;
  subject: string;
  html_body: string;
  text_body: string | null;
  layout: string | null;
  is_system: number;
  domain_id: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

type Mode = 'list' | 'create' | 'edit';

const EMPTY_FORM = { name: '', slug: '', subject: '', htmlBody: '', textBody: '', domainId: '' };

function extractVars(text: string): string[] {
  const vars = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) if (m[1]) vars.add(m[1]);
  return Array.from(vars);
}

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors';
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Preview slide-over (works for both system + custom templates)
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

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
    setForm({ name: t.name, slug: t.slug ?? '', subject: t.subject, htmlBody: t.html_body, textBody: t.text_body ?? '', domainId: t.domain_id ?? '' });
    setMode('edit');
  }

  async function openPreview(t: Template) {
    setPreviewing(t);
    setPreviewVars({});
    setPreviewHtml('');
    setPreviewLoading(true);
    try {
      const { data } = await api.post<{ html: string }>(`/api/templates/${t.id}/preview`, { variables: {} });
      setPreviewHtml(data.html);
    } catch {
      setPreviewHtml('<p style="padding:1rem;color:red">Failed to render preview</p>');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function refreshPreview(t: Template, vars: Record<string, string>) {
    try {
      const { data } = await api.post<{ html: string }>(`/api/templates/${t.id}/preview`, { variables: vars });
      setPreviewHtml(data.html);
    } catch { /* keep previous */ }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      subject: form.subject,
      htmlBody: form.htmlBody,
      textBody: form.textBody || undefined,
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

  // Live preview for edit/create form
  const editPreviewVars = useMemo(() => extractVars(`${form.subject} ${form.htmlBody}`), [form.subject, form.htmlBody]);
  const [editVarValues, setEditVarValues] = useState<Record<string, string>>({});
  const editPreviewHtml = useMemo(() => {
    if (!form.htmlBody) return '';
    return form.htmlBody.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) =>
        editVarValues[k]
          ? `<span style="background:#fef9c3;color:#713f12;padding:0 2px;border-radius:2px">${editVarValues[k]}</span>`
          : `<span style="background:#fee2e2;color:#991b1b;padding:0 2px;border-radius:2px;font-size:12px">{{${k}}}</span>`,
    );
  }, [form.htmlBody, editVarValues]);

  // Variables for the preview slide-over
  const previewDetectedVars = useMemo(() => {
    if (!previewing) return [];
    return previewing.variables.length > 0
      ? previewing.variables
      : extractVars(`${previewing.subject} ${previewing.html_body}`);
  }, [previewing]);

  const systemTemplates = templates.filter(t => t.is_system === 1);
  const customTemplates = templates.filter(t => t.is_system === 0);

  if (mode !== 'list') {
    return (
      <div className="flex h-full">
        {/* Form panel */}
        <div className="w-[480px] flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">
              {mode === 'create' ? 'New template' : `Edit — ${editing?.name}`}
            </h1>
            <button onClick={() => { setMode('list'); setEditVarValues({}); }} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            {(['name', 'subject'] as const).map(field => (
              <div key={field}>
                <label className={labelCls + ' capitalize'}>{field}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className={labelCls}>Slug <span className="text-zinc-600">(auto-generated if empty)</span></label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="auto-generated-from-name"
                className={`${inputCls} font-mono`}
              />
              <p className="text-[10px] text-zinc-600 mt-1">Used as <code className="text-zinc-500">templateSlug</code> in the send API.</p>
            </div>
            <div>
              <label className={labelCls}>HTML body</label>
              <textarea
                value={form.htmlBody}
                onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))}
                required
                rows={12}
                className={`${inputCls} font-mono`}
                placeholder="<p>Hello {{name}},</p>"
              />
            </div>
            <div>
              <label className={labelCls}>Plain-text body <span className="text-zinc-600">(optional)</span></label>
              <textarea
                value={form.textBody}
                onChange={e => setForm(f => ({ ...f, textBody: e.target.value }))}
                rows={4}
                className={`${inputCls} font-mono`}
                placeholder="Hello {{name}}, ..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
                {mode === 'create' ? 'Create' : 'Save changes'}
              </button>
              <button type="button" onClick={() => { setMode('list'); setEditVarValues({}); }} className="text-sm text-zinc-500 hover:text-zinc-300 px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Preview panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Live Preview</span>
            {form.subject && <span className="text-xs text-zinc-600 truncate max-w-xs">{form.subject}</span>}
          </div>
          {editPreviewVars.length > 0 && (
            <div className="px-5 py-3 border-b border-zinc-800 flex flex-wrap gap-3">
              {editPreviewVars.map(v => (
                <div key={v} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-orange-400">{`{{${v}}}`}</span>
                  <input
                    value={editVarValues[v] ?? ''}
                    onChange={e => setEditVarValues(p => ({ ...p, [v]: e.target.value }))}
                    placeholder={v}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 w-28"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 relative">
            {editPreviewHtml ? (
              <iframe srcDoc={editPreviewHtml} className="w-full h-full border-0 bg-white" sandbox="allow-same-origin" title="Template preview" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-700">
                <Mail size={40} strokeWidth={1} />
                <p className="text-sm">Your preview will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-orange-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Email</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          <Plus size={14} /> New template
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl h-16 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* System / built-in templates */}
          {systemTemplates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={13} className="text-purple-400" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Built-in templates</span>
                <span className="text-xs text-zinc-700 ml-1">· rendered server-side, read-only</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                {systemTemplates.map(t => (
                  <div key={t.id} className="flex items-center px-5 py-3.5 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{t.name}</span>
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">{t.slug}</span>
                      </div>
                      <div className="text-xs text-zinc-600 mt-0.5">
                        Variables: {t.variables.map(v => <code key={v} className="text-zinc-400 mr-1.5">{`{{${v}}}`}</code>)}
                      </div>
                    </div>
                    <button
                      onClick={() => openPreview(t)}
                      className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                    >
                      <Eye size={11} /> Preview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={13} className="text-orange-400" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Custom templates</span>
            </div>
            {customTemplates.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm bg-zinc-900 border border-zinc-800 rounded-xl">
                No custom templates yet.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                {customTemplates.map(t => (
                  <div key={t.id} className="flex items-center px-5 py-3.5 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{t.name}</span>
                        {t.slug && (
                          <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">{t.slug}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">{t.subject}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openPreview(t)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                        <Eye size={11} /> Preview
                      </button>
                      <button onClick={() => openEdit(t)} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => handleDelete(t)} className="text-xs text-zinc-600 hover:text-red-400 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview slide-over (system + custom templates) */}
      {previewing && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreviewing(null)} />
          <div className="relative ml-auto w-[70%] max-w-4xl bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
            <div className="flex items-start justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white">{previewing.name}</h2>
                  {previewing.is_system === 1 && (
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">built-in</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Subject: {previewing.subject}</p>
              </div>
              <button onClick={() => setPreviewing(null)} className="text-zinc-500 hover:text-zinc-300 ml-4">
                <X size={16} />
              </button>
            </div>
            {previewDetectedVars.length > 0 && (
              <div className="px-6 py-3 border-b border-zinc-800 flex flex-wrap gap-3 flex-shrink-0">
                {previewDetectedVars.map(v => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-orange-400">{`{{${v}}}`}</span>
                    <input
                      value={previewVars[v] ?? ''}
                      onChange={e => {
                        const next = { ...previewVars, [v]: e.target.value };
                        setPreviewVars(next);
                        refreshPreview(previewing, next);
                      }}
                      placeholder={v}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 w-28"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 bg-white relative">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <span className="text-xs text-zinc-400">Rendering…</span>
                </div>
              )}
              {previewHtml && (
                <iframe srcDoc={previewHtml} className="w-full h-full border-0" sandbox="allow-same-origin" title="Template preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


