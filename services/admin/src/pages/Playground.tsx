import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Send, CheckCircle2, XCircle, Mail } from 'lucide-react';
import api from '../api';

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
}

interface BuiltinLayout {
  id: string;
  label: string;
  variables: string[];
}

function extractVars(text: string): string[] {
  const vars = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) if (m[1]) vars.add(m[1]);
  return Array.from(vars);
}

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors';
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

export default function PlaygroundPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [layouts, setLayouts] = useState<BuiltinLayout[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Template[]>('/api/templates'),
      api.get<BuiltinLayout[]>('/api/layouts'),
    ]).then(([{ data: tpl }, { data: lay }]) => {
      setTemplates(tpl);
      setLayouts(lay);
    });
  }, []);

  const kind = selectedId.startsWith('t:') ? 'template' : selectedId.startsWith('l:') ? 'layout' : null;
  const itemId = kind ? selectedId.slice(2) : '';

  const selectedTemplate = useMemo(
    () => (kind === 'template' ? templates.find(t => t.id === itemId) ?? null : null),
    [templates, itemId, kind],
  );
  const selectedLayout = useMemo(
    () => (kind === 'layout' ? layouts.find(l => l.id === itemId) ?? null : null),
    [layouts, itemId, kind],
  );

  const detectedVars = useMemo(() => {
    if (kind === 'template' && selectedTemplate)
      return extractVars(`${selectedTemplate.subject} ${selectedTemplate.html_body}`);
    if (kind === 'layout' && selectedLayout) return selectedLayout.variables;
    return [];
  }, [kind, selectedTemplate, selectedLayout]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setVariables({});
    setPreviewHtml('');
    setResult(null);
  }

  // Live preview — updates whenever selection or variables change
  useEffect(() => {
    if (!kind) { setPreviewHtml(''); return; }

    if (kind === 'template' && selectedTemplate) {
      const html = selectedTemplate.html_body.replace(
        /\{\{(\w+)\}\}/g,
        (_, k) =>
          variables[k]
            ? `<span style="background:#fef9c3;color:#713f12;padding:0 2px;border-radius:2px">${variables[k]}</span>`
            : `<span style="background:#fee2e2;color:#991b1b;padding:0 2px;border-radius:2px;font-size:12px">{{${k}}}</span>`,
      );
      setPreviewHtml(html);
    } else if (kind === 'layout' && selectedLayout) {
      api
        .post<{ html: string }>(`/api/layouts/${selectedLayout.id}/preview`, { variables })
        .then(r => setPreviewHtml(r.data.html))
        .catch(() =>
          setPreviewHtml('<p style="padding:1rem;color:red">Failed to render layout preview</p>'),
        );
    }
  }, [kind, selectedTemplate, selectedLayout, variables]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    setResult(null);
    setSending(true);
    try {
      const payload =
        kind === 'template'
          ? { from, to, templateId: itemId, variables }
          : { from, to, layoutId: itemId, variables };
      await api.post('/v1/send', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      setResult({ ok: true, message: 'Test email sent! Check your inbox.' });
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string }; status?: number } };
      setResult({
        ok: false,
        message: 'Failed to send.',
        detail: e2.response?.data?.error ?? `HTTP ${e2.response?.status ?? 'unknown'}`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={14} className="text-orange-500" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Testing</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Playground</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Select a template, fill in variables, preview and send a test email.
        </p>
      </div>

      {/* 2-col layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — config */}
        <div className="w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-5 space-y-4">
          {/* Template / layout selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Template</p>
            <select
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {templates.length > 0 && (
                <optgroup label="Custom templates">
                  {templates.map(t => (
                    <option key={t.id} value={`t:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {layouts.length > 0 && (
                <optgroup label="Built-in layouts">
                  {layouts.map(l => (
                    <option key={l.id} value={`l:${l.id}`}>{l.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {kind === 'template' && selectedTemplate && (
              <p className="text-xs text-zinc-500 truncate">Subject: {selectedTemplate.subject}</p>
            )}
          </div>

          {/* Variables */}
          {detectedVars.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-300">Variables</p>
              {detectedVars.map(v => (
                <div key={v}>
                  <label className={labelCls}>
                    <code className="font-mono text-orange-400">{`{{${v}}}`}</code>
                  </label>
                  <input
                    value={variables[v] ?? ''}
                    onChange={e => setVariables(p => ({ ...p, [v]: e.target.value }))}
                    placeholder={`Value for ${v}`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Send test */}
          <form
            onSubmit={handleSend}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-zinc-300">Send test email</p>
            <div>
              <label className={labelCls}>API key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="ef_live_…"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelCls}>From</label>
              <input
                type="email"
                value={from}
                onChange={e => setFrom(e.target.value)}
                placeholder="hello@yourdomain.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>To</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            {result && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
                result.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {result.ok
                  ? <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" />
                  : <XCircle size={12} className="flex-shrink-0 mt-0.5" />}
                <div>
                  <div className="font-medium">{result.message}</div>
                  {result.detail && <div className="opacity-80 mt-0.5">{result.detail}</div>}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!kind || !apiKey || !from || !to || sending}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              <Send size={13} /> {sending ? 'Sending…' : 'Send test email'}
            </button>
          </form>
        </div>

        {/* Right panel — live preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Live Preview
            </span>
            {kind === 'template' && selectedTemplate && (
              <span className="text-xs text-zinc-600 truncate max-w-xs">{selectedTemplate.subject}</span>
            )}
            {kind === 'layout' && selectedLayout && (
              <span className="text-xs text-zinc-600">{selectedLayout.label}</span>
            )}
          </div>
          <div className="flex-1 relative">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-700 bg-zinc-950">
                <Mail size={40} strokeWidth={1} />
                <p className="text-sm">Select a template or layout to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scope: string;
  active: number;
}
