import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Send, CheckCircle2, XCircle, Mail, Code2, BookOpen, Eye } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import jsonLang from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github-dark.min.css';
import api from '../api';

hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', jsonLang);

function SyntaxCode({ code, lang, className = '' }: { code: string; lang: 'html' | 'json'; className?: string }) {
  const __html = useMemo(() => {
    try {
      const result = hljs.highlight(code, { language: lang === 'html' ? 'xml' : 'json' }).value;
      return result.replace(
        /\{\{(\w+)\}\}/g,
        '<span style="color:#fb923c;background:rgba(251,146,60,.15);border-radius:3px;padding:0 2px">{{$1}}</span>',
      );
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [code, lang]);
  return (
    <pre
      className={`hljs rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-800 p-4 ${className}`}
    >
      <code dangerouslySetInnerHTML={{ __html }} />
    </pre>
  );
}

interface Template {
  id: string;
  name: string;
  slug: string | null;
  subject: string;
  html_body: string;
  text_body: string | null;
  layout: string | null;
  is_system: number;
  variables: string[];
}

interface Domain {
  id: string;
  name: string;
  verified: number;
}

function extractVars(text: string): string[] {
  const vars = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) if (m[1]) vars.add(m[1]);
  return Array.from(vars);
}

function applyVarsPreview(text: string, variables: Record<string, string>): string {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, k) =>
      variables[k]
        ? `<span style="background:#fef9c3;color:#713f12;padding:0 2px;border-radius:2px">${variables[k]}</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:0 2px;border-radius:2px;font-size:12px">{{${k}}}</span>`,
  );
}

const inputCls =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors';
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';

type RightTab = 'preview' | 'code' | 'api';

export default function PlaygroundPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [senderName, setSenderName] = useState('');
  const [fromLocal, setFromLocal] = useState('');
  const [fromDomain, setFromDomain] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('preview');

  useEffect(() => {
    Promise.all([
      api.get<Template[]>('/api/templates'),
      api.get<Domain[]>('/api/domains'),
    ]).then(([{ data: tpl }, { data: dom }]) => {
      setTemplates(tpl);
      const verified = dom.filter(d => d.verified === 1);
      setDomains(verified);
      if (verified.length > 0) setFromDomain(verified[0].name);
    });
  }, []);

  const itemId = selectedId.startsWith('t:') ? selectedId.slice(2) : '';
  const hasTemplate = itemId !== '';

  const selectedTemplate = useMemo(
    () => (hasTemplate ? templates.find(t => t.id === itemId) ?? null : null),
    [templates, itemId, hasTemplate],
  );

  const detectedVars = useMemo(() => {
    if (!selectedTemplate) return [];
    // System templates expose their variable list from the backend
    if (selectedTemplate.variables.length > 0) return selectedTemplate.variables;
    return extractVars(`${selectedTemplate.subject} ${selectedTemplate.html_body}`);
  }, [selectedTemplate]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setVariables({});
    setPreviewHtml('');
    setResult(null);
    if (id.startsWith('t:')) {
      const tpl = templates.find(t => t.id === id.slice(2));
      if (tpl) setSubject(tpl.subject);
    } else {
      setSubject('');
    }
  }

  useEffect(() => {
    if (selectedTemplate && !subject) setSubject(selectedTemplate.subject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const fromAddress = fromLocal && fromDomain ? `${fromLocal}@${fromDomain}` : '';

  // Live preview — updates whenever selection or variables change
  useEffect(() => {
    if (!selectedTemplate) { setPreviewHtml(''); return; }

    if (selectedTemplate.layout) {
      // System template — render via backend (React Email)
      api
        .post<{ html: string }>(`/api/templates/${selectedTemplate.id}/preview`, { variables })
        .then(r => setPreviewHtml(r.data.html))
        .catch(() => setPreviewHtml('<p style="padding:1rem;color:red">Failed to render preview</p>'));
    } else {
      // Custom template — apply vars client-side
      setPreviewHtml(applyVarsPreview(selectedTemplate.html_body, variables));
    }
  }, [selectedTemplate, variables]);

  // Code snippets
  const codePayload = useMemo(() => {
    const templateRef = selectedTemplate?.slug
      ? { templateSlug: selectedTemplate.slug }
      : hasTemplate ? { templateId: itemId } : {};
    const obj: Record<string, unknown> = {
      from: fromAddress || 'hello@yourdomain.com',
      ...(senderName ? { fromName: senderName } : {}),
      to: to || 'recipient@example.com',
      ...(subject ? { subject } : {}),
      ...templateRef,
      variables: Object.keys(variables).length > 0 ? variables : detectedVars.reduce((acc, v) => ({ ...acc, [v]: `<${v}>` }), {}),
    };
    if (Object.keys(obj.variables as object).length === 0) delete obj.variables;
    return JSON.stringify(obj, null, 2);
  }, [fromAddress, senderName, to, subject, hasTemplate, itemId, selectedTemplate, variables, detectedVars]);

  const curlSnippet = useMemo(
    () =>
      `curl -X POST https://your-emailflare.com/v1/send \\\n  -H "Authorization: Bearer ${apiKey || '<YOUR_API_KEY>'}" \\\n  -H "Content-Type: application/json" \\\n  -d '${codePayload}'`,
    [apiKey, codePayload],
  );

  const fetchSnippet = useMemo(
    () =>
      `const res = await fetch('/v1/send', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${apiKey || '<YOUR_API_KEY>'}',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify(${codePayload}),\n});\nconst data = await res.json();`,
    [apiKey, codePayload],
  );

  const TABS: { id: RightTab; label: string; icon: React.ElementType }[] = [
    { id: 'preview', label: 'Live Preview', icon: Eye },
    { id: 'code', label: 'Code Template', icon: Code2 },
    { id: 'api', label: 'API Reference', icon: BookOpen },
  ];

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setResult(null);
    setSending(true);
    try {
      const payload = {
        from: fromAddress,
        ...(senderName ? { fromName: senderName } : {}),
        to,
        ...(subject ? { subject } : {}),
        variables,
        ...(selectedTemplate.slug ? { templateSlug: selectedTemplate.slug } : { templateId: selectedTemplate.id }),
      };
      await api.post('/v1/send', payload, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      setResult({ ok: true, message: 'Test email sent! Check your inbox.' });
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: unknown }; status?: number } };
      const raw = e2.response?.data?.error;
      const detail = typeof raw === 'string' ? raw : raw != null ? JSON.stringify(raw) : `HTTP ${e2.response?.status ?? 'unknown'}`;
      setResult({ ok: false, message: 'Failed to send.', detail });
    } finally {
      setSending(false);
    }
  }

  const systemTemplates = templates.filter(t => t.is_system === 1);
  const customTemplates = templates.filter(t => t.is_system === 0);

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
        <div className="w-[40rem] flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-5 space-y-4">
          {/* Template selector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Template</p>
            <select
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select —</option>
              {systemTemplates.length > 0 && (
                <optgroup label="Built-in templates">
                  {systemTemplates.map(t => (
                    <option key={t.id} value={`t:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              {customTemplates.length > 0 && (
                <optgroup label="Custom templates">
                  {customTemplates.map(t => (
                    <option key={t.id} value={`t:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedTemplate && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedTemplate.is_system === 1 && (
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">built-in</span>
                )}
                <p className="text-xs text-zinc-500 truncate">Subject: {selectedTemplate.subject}</p>
              </div>
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
              <label className={labelCls}>Sender name <span className="text-zinc-600">(optional)</span></label>
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Acme Inc."
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>From</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="text"
                  value={fromLocal}
                  onChange={e => setFromLocal(e.target.value)}
                  placeholder="hello"
                  className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <span className="text-zinc-500 text-sm flex-shrink-0">@</span>
                {domains.length > 0 ? (
                  <select
                    value={fromDomain}
                    onChange={e => setFromDomain(e.target.value)}
                    className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={fromDomain}
                    onChange={e => setFromDomain(e.target.value)}
                    placeholder="yourdomain.com"
                    className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                )}
              </div>
              {fromAddress && (
                <p className="text-[10px] text-zinc-600 mt-1 truncate">
                  {senderName ? `"${senderName}" <${fromAddress}>` : fromAddress}
                </p>
              )}
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

            <div>
              <label className={labelCls}>
                Subject
                {selectedTemplate && <span className="text-zinc-600 ml-1">(from template)</span>}
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject…"
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
              disabled={!selectedTemplate || !apiKey || !fromAddress || !to || sending}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              <Send size={13} /> {sending ? 'Sending…' : 'Send test email'}
            </button>
          </form>
        </div>

        {/* Right panel — tabbed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-zinc-800 flex-shrink-0 px-5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  rightTab === id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0">
              {selectedTemplate && (
                <span className="text-xs text-zinc-600 truncate max-w-xs">{selectedTemplate.subject}</span>
              )}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {/* Live Preview */}
            {rightTab === 'preview' && (
              previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-same-origin"
                  title="Email preview"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700 bg-zinc-950">
                  <Mail size={40} strokeWidth={1} />
                  <p className="text-sm">Select a template to preview</p>
                </div>
              )
            )}

            {/* Code Template */}
            {rightTab === 'code' && (
              <div className="h-full overflow-auto p-5 bg-zinc-950 space-y-4">
                {selectedTemplate ? (
                  selectedTemplate.layout ? (
                    // System / built-in template
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded uppercase">built-in</span>
                        <p className="text-xs text-zinc-500">Rendered server-side via React Email</p>
                      </div>
                      {detectedVars.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Variables</p>
                          <div className="flex flex-wrap gap-2">
                            {detectedVars.map(v => (
                              <span key={v} className="text-xs font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-1 rounded-md">{`{{${v}}}`}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {previewHtml && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Rendered HTML</p>
                          <SyntaxCode code={previewHtml} lang="html" />
                        </div>
                      )}
                    </>
                  ) : (
                    // Custom template
                    <>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Subject</p>
                        <pre className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-amber-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{selectedTemplate.subject}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">HTML Body</p>
                        <SyntaxCode code={selectedTemplate.html_body} lang="html" />
                      </div>
                      {selectedTemplate.text_body && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Plain Text Body</p>
                          <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{selectedTemplate.text_body}</pre>
                        </div>
                      )}
                      {detectedVars.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Detected Variables</p>
                          <div className="flex flex-wrap gap-2">
                            {detectedVars.map(v => (
                              <span key={v} className="text-xs font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-1 rounded-md">{`{{${v}}}`}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-700">
                    <Code2 size={40} strokeWidth={1} />
                    <p className="text-sm">Select a template to see its source code</p>
                  </div>
                )}
              </div>
            )}

            {/* API Reference */}
            {rightTab === 'api' && (
              <div className="h-full overflow-auto p-5 bg-zinc-950 space-y-5">
                {selectedTemplate && (
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                    {selectedTemplate.is_system === 1 && (
                      <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded uppercase">built-in</span>
                    )}
                    <span className="text-xs text-zinc-400 truncate">{selectedTemplate.name}</span>
                    {fromAddress && <span className="text-xs text-zinc-600 ml-auto flex-shrink-0">from: {fromAddress}</span>}
                  </div>
                )}

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">Request Payload</p>
                  <SyntaxCode code={codePayload} lang="json" />
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">cURL</p>
                  <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{curlSnippet}</pre>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1.5">fetch (JavaScript)</p>
                  <pre className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-sky-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">{fetchSnippet}</pre>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Fields in this request</p>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                    {([
                      { field: 'from', value: fromAddress || null },
                      { field: 'fromName', value: senderName || null },
                      { field: 'to', value: to || null },
                      { field: 'subject', value: subject || null },
                      selectedTemplate
                        ? { field: selectedTemplate.slug ? 'templateSlug' : 'templateId', value: selectedTemplate.slug ?? selectedTemplate.id }
                        : null,
                      ...detectedVars.map(v => ({ field: `variables.${v}`, value: variables[v] || null })),
                    ].filter(Boolean) as Array<{ field: string; value: string | null }>).map(({ field, value }) => (
                      <div key={field} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <code className="font-mono text-orange-400">{field}</code>
                        <span className={value ? 'text-zinc-300 font-mono max-w-xs truncate text-right' : 'text-zinc-700 italic'}>{
                          value ?? 'not set'
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

