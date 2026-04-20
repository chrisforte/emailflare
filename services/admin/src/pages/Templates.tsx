import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileText, Cpu, X, Mail, ChevronDown } from 'lucide-react';
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

function TemplateCard({ t, active, varsOpen, onToggleVars, onClick, detectedVars, varValues, onVarChange }: {
  t: Template;
  active: boolean;
  varsOpen: boolean;
  onToggleVars: (e: React.MouseEvent) => void;
  onClick: () => void;
  detectedVars: string[];
  varValues: Record<string, string>;
  onVarChange: (key: string, value: string) => void;
}) {
  const hasVars = t.variables.length > 0;
  return (
    <div
      className={`w-full text-left rounded-xl transition-all duration-100 overflow-hidden ${
        active
          ? 'bg-orange-500/10 border border-orange-500/20'
          : 'hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {/* Clickable header row */}
      <div onClick={onClick} className="px-3 py-3 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className={`text-[13px] font-medium truncate leading-tight ${active ? 'text-orange-100' : 'text-zinc-200'}`}>
            {t.name}
          </span>
          {t.is_system === 1 && (
            <span className="text-[9px] font-bold text-purple-400/70 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase shrink-0">sys</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[11px] text-zinc-600 truncate leading-tight">{t.subject}</p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-zinc-700">
              {new Date(t.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {active && hasVars && (
              <span
                role="button"
                onClick={onToggleVars}
                className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors ${
                  varsOpen
                    ? 'text-orange-400 bg-orange-500/15'
                    : 'text-zinc-600 hover:text-zinc-400 bg-zinc-800/60'
                }`}
              >
                <span>{t.variables.length} vars</span>
                <ChevronDown size={9} className={`transition-transform duration-150 ${varsOpen ? 'rotate-180' : ''}`} />
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Inline variable inputs — expands inside the card */}
      {active && varsOpen && detectedVars.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-orange-500/10 space-y-2.5">
          {detectedVars.map(v => (
            <div key={v}>
              <label className="block text-[10px] font-mono text-orange-400/70 mb-1">{`{{${v}}}`}</label>
              <input
                value={varValues[v] ?? ''}
                onChange={e => onVarChange(v, e.target.value)}
                placeholder={`Enter ${v}`}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [varsOpen, setVarsOpen] = useState(false);

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
    setVarsOpen(false);
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
    <div className="flex h-full">
      {/* ── Left pane: template list ──────────────────────────────────── */}
      <div className="w-[560px] flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
        {/* Header — same style as Domains/Logs */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-orange-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Email</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus size={14} /> New template
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-[70px] bg-[#111114] border border-white/[0.04] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {/* System / built-in */}
              {systemTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                    <Cpu size={10} className="text-purple-400" />
                    <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Built-in</span>
                  </div>
                  <div className="space-y-px">
                    {systemTemplates.map(t => (
                      <TemplateCard
                        key={t.id}
                        t={t}
                        active={previewing?.id === t.id}
                        varsOpen={previewing?.id === t.id && varsOpen}
                        onToggleVars={e => { e.stopPropagation(); setVarsOpen(v => !v); }}
                        onClick={() => openPreview(t)}
                        detectedVars={previewing?.id === t.id ? previewDetectedVars : []}
                        varValues={previewVars}
                        onVarChange={(key, val) => {
                          const next = { ...previewVars, [key]: val };
                          setPreviewVars(next);
                          if (previewing) refreshPreview(previewing, next);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom */}
              <div>
                <div className="flex items-center gap-1.5 px-3 pb-1">
                  <FileText size={10} className="text-orange-400" />
                  <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">Custom</span>
                </div>
                {customTemplates.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-[11px] text-zinc-700">No custom templates yet</p>
                    <button onClick={openCreate} className="mt-2 text-[11px] text-orange-500 hover:text-orange-400 transition-colors">
                      Create your first →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-px">
                    {customTemplates.map(t => (
                      <TemplateCard
                        key={t.id}
                        t={t}
                        active={previewing?.id === t.id}
                        varsOpen={previewing?.id === t.id && varsOpen}
                        onToggleVars={e => { e.stopPropagation(); setVarsOpen(v => !v); }}
                        onClick={() => openPreview(t)}
                        detectedVars={previewing?.id === t.id ? previewDetectedVars : []}
                        varValues={previewVars}
                        onVarChange={(key, val) => {
                          const next = { ...previewVars, [key]: val };
                          setPreviewVars(next);
                          if (previewing) refreshPreview(previewing, next);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right pane: preview ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0a0d]">
        {!previewing ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700 select-none">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-1">
              <Mail size={22} strokeWidth={1.2} className="opacity-50" />
            </div>
            <p className="text-sm">Select a template to preview</p>
            <button onClick={openCreate} className="text-xs text-orange-500/70 hover:text-orange-400 transition-colors mt-1">
              or create a new one →
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex-shrink-0 bg-[#0c0c0e] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h2 className="font-semibold text-white text-[15px] leading-tight">{previewing.name}</h2>
                  {previewing.is_system === 1 && (
                    <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-wide">built-in</span>
                  )}
                  {previewing.slug && (
                    <span className="text-[11px] text-orange-400/80 bg-orange-500/8 px-1.5 py-0.5 rounded font-mono border border-orange-500/10">{previewing.slug}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{previewing.subject}</p>
              </div>
              {previewing.is_system === 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(previewing)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors border border-white/[0.07]"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete template "${previewing.name}"?`)) return;
                      await api.delete(`/api/templates/${previewing.id}`);
                      setPreviewing(null);
                      load();
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-white/[0.07]"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* Email preview — centered card on dark bg */}
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-xs">Rendering…</span>
                  </div>
                </div>
              ) : previewHtml ? (
                <div className="max-w-[640px] mx-auto">
                  {/* Fake email client chrome */}
                  <div className="bg-[#1a1a1f] rounded-t-xl border border-white/[0.06] border-b-0 px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <span className="text-[11px] text-zinc-600 font-mono ml-2 truncate">{previewing.subject}</span>
                  </div>
                  <div className="bg-white rounded-b-xl overflow-hidden border border-white/[0.06] border-t-0 shadow-2xl shadow-black/50">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0 block"
                      style={{ minHeight: '480px', height: 'auto' }}
                      sandbox="allow-same-origin"
                      title="Template preview"
                      onLoad={e => {
                        const iframe = e.currentTarget;
                        const body = iframe.contentDocument?.body;
                        if (body) iframe.style.height = body.scrollHeight + 'px';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-700">
                  <Mail size={20} strokeWidth={1} className="opacity-40" />
                  <p className="text-xs">No preview available</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


