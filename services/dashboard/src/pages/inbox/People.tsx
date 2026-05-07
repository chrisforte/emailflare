import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Send, MailOpen, User } from 'lucide-react';
import {
  getPeople, getThread, markRead, composeSend, replyTo,
  Person, Thread, InboxEmail, SentEmail,
} from '../../api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string) {
  if (name) return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return email[0].toUpperCase();
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Person row ────────────────────────────────────────────────────────────────

function PersonRow({ person, selected, onClick }: {
  person: Person;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors',
        selected ? 'bg-sidebar-accent' : 'hover:bg-muted',
      )}
    >
      <div className="size-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-white">
          {initials(person.name, person.email)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-[13px] truncate', person.unread_count > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
            {person.name ?? person.email}
          </p>
          {person.last_email_at && (
            <span className="text-[10.5px] text-muted-foreground shrink-0">{relativeTime(person.last_email_at)}</span>
          )}
        </div>
        {person.name && (
          <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{person.email}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] text-muted-foreground">{person.total_count} email{person.total_count !== 1 ? 's' : ''}</span>
          {person.unread_count > 0 && (
            <Badge className="h-4 px-1.5 text-[9px]">{person.unread_count}</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ item }: { item: InboxEmail | SentEmail }) {
  const isSent = item.type === 'sent';
  const date = isSent
    ? new Date((item as SentEmail).sent_at)
    : new Date((item as InboxEmail).received_at);

  return (
    <div className={cn('flex flex-col gap-1', isSent ? 'items-end' : 'items-start')}>
      <div className={cn(
        'max-w-[75%] rounded-xl px-4 py-3 text-sm',
        isSent
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm',
      )}>
        <p className="text-[11px] font-semibold mb-1 opacity-70">{item.subject}</p>
        {'body_text' in item && item.body_text
          ? <p className="whitespace-pre-wrap leading-relaxed">{item.body_text}</p>
          : <p className="leading-relaxed opacity-60 italic">No preview available</p>
        }
      </div>
      <span className="text-[10.5px] text-muted-foreground px-1">
        {date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ── Thread panel ──────────────────────────────────────────────────────────────

function ThreadPanel({ person, thread, onReply }: {
  person: Person;
  thread: Thread;
  onReply: (params: { text: string; subject: string }) => Promise<void>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.emails.length]);

  const lastReceivedEmail = [...thread.emails]
    .reverse()
    .find(e => e.type === 'received') as InboxEmail | undefined;

  async function handleSend() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReply({
        text: replyText.trim(),
        subject: subject.trim() || `Re: ${lastReceivedEmail?.subject ?? '(no subject)'}`,
      });
      setReplyText('');
      setSubject('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center">
            <span className="text-[12px] font-bold text-white">{initials(person.name, person.email)}</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">{person.name ?? person.email}</p>
            {person.name && <p className="text-[12px] text-muted-foreground">{person.email}</p>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {thread.emails.map(item => (
          <MessageBubble key={item.id} item={item} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-border px-6 py-4 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Subject (optional)"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="text-sm"
        />
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Write a reply…"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            className="resize-none text-sm min-h-[80px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="shrink-0 self-end"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </Button>
        </div>
        <p className="text-[10.5px] text-muted-foreground">⌘+Enter to send</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [fromAddress, setFromAddress] = useState('');

  useEffect(() => {
    setLoadingPeople(true);
    getPeople({ search: search || undefined })
      .then(({ data }) => setPeople(data))
      .finally(() => setLoadingPeople(false));
  }, [search]);

  async function selectPerson(id: string) {
    setSelectedId(id);
    setLoadingThread(true);
    try {
      const t = await getThread(id);
      setThread(t);
      await markRead(id).catch(() => {});
      setPeople(prev => prev.map(p => p.id === id ? { ...p, unread_count: 0 } : p));
    } finally {
      setLoadingThread(false);
    }
  }

  async function handleReply({ text, subject }: { text: string; subject: string }) {
    if (!selectedId || !thread) return;
    const lastReceived = [...thread.emails].reverse().find(e => e.type === 'received') as InboxEmail | undefined;
    await replyTo({
      personId: selectedId,
      from: fromAddress,
      subject,
      text,
      replyToMessageId: lastReceived?.message_id ?? '',
    });
    const updated = await getThread(selectedId);
    setThread(updated);
  }

  const filtered = people.filter(p => filter === 'unread' ? p.unread_count > 0 : true);
  const selected = people.find(p => p.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-[320px] shrink-0 border-r border-border flex flex-col h-full">
        {/* Search */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search people…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 pb-2 shrink-0">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded text-[12px] font-medium transition-colors capitalize',
                filter === f ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* People list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loadingPeople ? (
            <div className="flex justify-center pt-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center pt-12 gap-2 text-muted-foreground">
              <MailOpen size={24} className="opacity-30" />
              <p className="text-sm">{search ? 'No results' : filter === 'unread' ? 'All caught up!' : 'No emails yet'}</p>
            </div>
          ) : (
            filtered.map(p => (
              <PersonRow key={p.id} person={p} selected={p.id === selectedId} onClick={() => selectPerson(p.id)} />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selectedId && thread && selected ? (
          <ThreadPanel person={selected} thread={thread} onReply={handleReply} />
        ) : loadingThread ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <User size={40} className="opacity-20" />
            <p className="text-sm">Select a person to view their thread</p>
          </div>
        )}
      </div>
    </div>
  );
}
