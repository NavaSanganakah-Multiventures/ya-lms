'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, Mail, MessageSquareText, RefreshCcw, Save, Send, Settings2, ShieldAlert, Terminal, UserRound, XCircle } from 'lucide-react';

type ErrorSession = {
  id: string;
  source: string;
  status: string;
  severity: string;
  title: string;
  error_message: string;
  stack_trace?: string;
  full_payload?: string;
  ai_prompt?: string;
  url?: string;
  user_id?: string;
  device_info?: string;
  email_from?: string;
  email_subject?: string;
  repeat_count?: number;
  last_seen_at?: string;
  created_at: string;
  updated_at?: string;
};

type ErrorSessionDetail = {
  session: ErrorSession;
  events: Array<{ id: string; type: string; payload?: string; created_at: string }>;
  jobs: Array<{ id: string; status: string; jules_session_id?: string; prompt?: string; response?: string; created_at: string; updated_at?: string }>;
};

type JulesConfig = {
  JULES_SOURCE_NAME: string;
  JULES_STARTING_BRANCH: string;
  JULES_AUTOMATION_MODE: string;
  JULES_REQUIRE_PLAN_APPROVAL: string;
  JULES_API_BASE_URL: string;
  JULES_AUTO_SEND_ENABLED: string;
};

type JulesSource = {
  name: string;
  id?: string;
  githubRepo?: { owner?: string; repo?: string };
};

const defaultJulesConfig: JulesConfig = {
  JULES_SOURCE_NAME: '',
  JULES_STARTING_BRANCH: 'main',
  JULES_AUTOMATION_MODE: 'AUTO_CREATE_PR',
  JULES_REQUIRE_PLAN_APPROVAL: 'false',
  JULES_API_BASE_URL: 'https://jules.googleapis.com',
  JULES_AUTO_SEND_ENABLED: 'true',
};

const statusStyles: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  ai_prompted: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  sent_to_jules: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  awaiting_config: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  failed: 'bg-red-500/10 text-red-300 border-red-500/30',
  resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  ignored: 'bg-neutral-500/10 text-neutral-300 border-neutral-500/30',
};

const severityStyles: Record<string, string> = {
  critical: 'text-red-300 bg-red-500/10 border-red-500/30',
  high: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  low: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function safeParse(value?: string) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

function formatRecord(value?: string) {
  const parsed = safeParse(value);
  if (parsed === null) return '—';
  return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
}

type ChatMessageRole = 'error' | 'ai' | 'jules' | 'admin' | 'system';

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  title: string;
  body: string;
  time?: string;
  meta?: string;
};

function getPayloadField(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function formatJulesActivity(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return formatRecord(JSON.stringify(payload));
  const record = payload as Record<string, unknown>;
  const activity = record.activity && typeof record.activity === 'object' ? record.activity as Record<string, unknown> : null;
  const summary = typeof record.summary === 'string' ? record.summary : '';
  const description = typeof activity?.description === 'string' ? activity.description : '';
  const artifacts = Array.isArray(activity?.artifacts) && activity.artifacts.length
    ? `

Artifacts / outputs:
${JSON.stringify(activity.artifacts, null, 2)}`
    : '';
  return [summary || description || 'Jules activity captured', '', JSON.stringify(activity || payload, null, 2)].join('\n') + artifacts;
}

function buildChatMessages(detail: ErrorSessionDetail | null, selectedSession: ErrorSession | null): ChatMessage[] {
  if (!selectedSession) return [];

  const fullErrorRecord = [
    `Title: ${selectedSession.title}`,
    `Source: ${selectedSession.source}`,
    `Severity: ${selectedSession.severity}`,
    `Status: ${selectedSession.status}`,
    `URL: ${selectedSession.url || 'N/A'}`,
    `User / Email: ${selectedSession.user_id || selectedSession.email_from || 'Guest'}`,
    '',
    'Error message:',
    selectedSession.error_message || 'No message',
    '',
    'Stack trace / Email body:',
    selectedSession.stack_trace || 'No stack trace',
    '',
    'Full payload:',
    formatRecord(selectedSession.full_payload),
  ].join('\n');

  const messages: ChatMessage[] = [
    {
      id: `${selectedSession.id}-error`,
      role: 'error',
      title: 'Production error captured',
      body: fullErrorRecord,
      time: selectedSession.created_at,
      meta: `${selectedSession.id} · repeat x${selectedSession.repeat_count || 1}`,
    },
  ];

  if (selectedSession.ai_prompt) {
    messages.push({
      id: `${selectedSession.id}-ai-prompt`,
      role: 'ai',
      title: 'AI prompt prepared for Jules',
      body: selectedSession.ai_prompt,
      time: selectedSession.updated_at,
      meta: 'Stored in ErrorSessions.ai_prompt',
    });
  }

  for (const event of detail?.events || []) {
    const parsedPayload = safeParse(event.payload);
    const note = getPayloadField(parsedPayload, 'note');
    const prompt = getPayloadField(parsedPayload, 'prompt');
    const eventRole: ChatMessageRole = event.type.includes('jules') ? 'jules' : event.type.includes('ignored') || event.type.includes('resolved') || event.type.includes('reopened') || event.type.includes('admin_note') ? 'admin' : 'system';
    const julesActivityName = getPayloadField(parsedPayload, 'julesActivityName');
    messages.push({
      id: `event-${event.id}`,
      role: eventRole,
      title: event.type === 'jules_activity' ? 'Jules chat/activity saved' : event.type.replaceAll('_', ' '),
      body: event.type === 'jules_activity' ? formatJulesActivity(parsedPayload) : note || prompt || formatRecord(event.payload),
      time: getPayloadField(parsedPayload, 'createTime') || event.created_at,
      meta: julesActivityName || 'Timeline event',
    });
  }

  for (const job of detail?.jobs || []) {
    messages.push({
      id: `job-${job.id}-prompt`,
      role: 'admin',
      title: 'Prompt sent to Jules',
      body: job.prompt || 'Prompt not stored.',
      time: job.created_at,
      meta: `${job.id} · status ${job.status}`,
    });
    messages.push({
      id: `job-${job.id}-response`,
      role: 'jules',
      title: 'Full Jules response',
      body: formatRecord(job.response),
      time: job.updated_at || job.created_at,
      meta: job.jules_session_id || job.id,
    });
  }

  return messages.sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
}

export default function AdminErrorSessionsPage() {
  const [sessions, setSessions] = useState<ErrorSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErrorSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [julesConfig, setJulesConfig] = useState<JulesConfig>(defaultJulesConfig);
  const [hasJulesApiKey, setHasJulesApiKey] = useState(false);
  const [julesSources, setJulesSources] = useState<JulesSource[]>([]);
  const [julesSettingsLoading, setJulesSettingsLoading] = useState(false);
  const [julesMessage, setJulesMessage] = useState('');
  const [noteDraft, setNoteDraft] = useState('');


  const selectedSession = useMemo(
    () => detail?.session || sessions.find((session) => session.id === selectedId) || null,
    [detail, selectedId, sessions],
  );

  const chatMessages = useMemo(
    () => buildChatMessages(detail, selectedSession),
    [detail, selectedSession],
  );

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/error-sessions?status=${encodeURIComponent(statusFilter)}`);
      const data = await res.json() as { sessions?: ErrorSession[] };
      setSessions(data.sessions || []);
      const urlSelected = new URLSearchParams(window.location.search).get('selected');
      if (!selectedId && (urlSelected || data.sessions?.[0]?.id)) {
        setSelectedId(urlSelected || data.sessions?.[0]?.id || null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId, statusFilter]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/error-sessions/${encodeURIComponent(id)}`);
      if (res.ok) {
        setDetail(await res.json() as ErrorSessionDetail);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchJulesConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/jules/config');
      if (res.ok) {
        const data = await res.json() as { config?: JulesConfig; hasApiKey?: boolean };
        setJulesConfig({ ...defaultJulesConfig, ...(data.config || {}) });
        setHasJulesApiKey(Boolean(data.hasApiKey));
      }
    } catch (error) {
      console.error('Failed to load Jules config', error);
    }
  }, []);

  const fetchJulesSources = async () => {
    setJulesSettingsLoading(true);
    setJulesMessage('');
    try {
      const res = await fetch('/api/admin/jules/sources');
      const data = await res.json() as { sources?: JulesSource[]; error?: string; details?: unknown; pageCount?: number; nextPageToken?: string | null };
      if (!res.ok) {
        setJulesMessage(data.error || 'Unable to fetch Jules sources.');
        return;
      }
      const sources = data.sources || [];
      setJulesSources(sources);
      if (!sources.length) {
        setJulesMessage('No sources found. Connect GitHub repo in Jules first.');
      } else if (data.nextPageToken) {
        setJulesMessage(`Fetched ${sources.length} sources from ${data.pageCount || 1} pages. More pages may still exist; please try again or contact support.`);
      } else {
        setJulesMessage(`Fetched all ${sources.length} sources. Select repository and save settings.`);
      }
    } finally {
      setJulesSettingsLoading(false);
    }
  };

  const saveJulesConfig = async () => {
    setJulesSettingsLoading(true);
    setJulesMessage('');
    try {
      const res = await fetch('/api/admin/jules/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(julesConfig),
      });
      const data = await res.json() as { config?: JulesConfig; error?: string; hasApiKey?: boolean };
      if (!res.ok) {
        setJulesMessage(data.error || 'Failed to save Jules settings.');
        return;
      }
      setJulesConfig({ ...defaultJulesConfig, ...(data.config || {}) });
      setHasJulesApiKey(Boolean(data.hasApiKey));
      setJulesMessage('Jules settings saved in PLATFORM_SECRETS KV.');
    } finally {
      setJulesSettingsLoading(false);
    }
  };

  // Initial/list loading intentionally synchronizes server data into local UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchJulesConfig(); }, [fetchJulesConfig]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [fetchDetail, selectedId]);

  const runAction = async (action: 'generate-prompt' | 'send-to-jules' | 'sync-jules' | 'ignore' | 'resolve' | 'reopen') => {
    if (!selectedId) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/error-sessions/${encodeURIComponent(selectedId)}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(data.error || 'Action failed');
      }
      await fetchDetail(selectedId);
      await fetchSessions();
    } finally {
      setActionLoading(null);
    }
  };

  const addNote = async () => {
    if (!selectedId || !noteDraft.trim()) return;
    setActionLoading('add-note');
    try {
      const res = await fetch(`/api/admin/error-sessions/${encodeURIComponent(selectedId)}/add-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteDraft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(data.error || 'Note save failed');
        return;
      }
      setNoteDraft('');
      await fetchDetail(selectedId);
      await fetchSessions();
    } finally {
      setActionLoading(null);
    }
  };

  const copyChatRecord = () => {
    const record = chatMessages.map((message) => [
      `[${formatDate(message.time)}] ${message.title}`,
      message.meta ? `Meta: ${message.meta}` : '',
      message.body,
    ].filter(Boolean).join('\n')).join('\n\n---\n\n');
    navigator.clipboard.writeText(record);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Error Sessions + Jules</h1>
              <p className="text-neutral-400 text-sm">Global errors aur alert-error@lms.yagyaashram.com emails ko AI prompt bana kar Jules tak bhejne ka control center.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="ai_prompted">AI Prompted</option>
            <option value="sent_to_jules">Sent to Jules</option>
            <option value="awaiting_config">Awaiting Config</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
          <button onClick={fetchSessions} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm font-bold hover:bg-neutral-800">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <section className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-white">
              <Settings2 className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-black">Jules API Settings</h2>
            </div>
            <p className="text-sm text-neutral-400">API key sirf PLATFORM_SECRETS KV me rahegi. Source aur baaki config yahin se fetch/save honge.</p>
          </div>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${hasJulesApiKey ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            <KeyRound className="h-4 w-4" />
            {hasJulesApiKey ? 'JULES_API_KEY found in KV' : 'JULES_API_KEY missing in KV'}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Source name</span>
            <div className="flex gap-2">
              <select
                value={julesConfig.JULES_SOURCE_NAME}
                onChange={(e) => setJulesConfig(prev => ({ ...prev, JULES_SOURCE_NAME: e.target.value }))}
                className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm outline-none"
              >
                <option value="">Select Jules source</option>
                {julesSources.map((source) => (
                  <option key={source.name} value={source.name}>{source.name}</option>
                ))}
                {julesConfig.JULES_SOURCE_NAME && !julesSources.some(source => source.name === julesConfig.JULES_SOURCE_NAME) && (
                  <option value={julesConfig.JULES_SOURCE_NAME}>{julesConfig.JULES_SOURCE_NAME}</option>
                )}
              </select>
              <button
                onClick={fetchJulesSources}
                disabled={julesSettingsLoading || !hasJulesApiKey}
                className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-bold text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {julesSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch Sources'}
              </button>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Starting branch</span>
            <input
              value={julesConfig.JULES_STARTING_BRANCH}
              onChange={(e) => setJulesConfig(prev => ({ ...prev, JULES_STARTING_BRANCH: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm outline-none"
              placeholder="main"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Automation mode</span>
            <select
              value={julesConfig.JULES_AUTOMATION_MODE}
              onChange={(e) => setJulesConfig(prev => ({ ...prev, JULES_AUTOMATION_MODE: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm outline-none"
            >
              <option value="AUTO_CREATE_PR">AUTO_CREATE_PR</option>
              <option value="AUTOMATION_MODE_UNSPECIFIED">No automatic PR</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Auto send</span>
            <select
              value={julesConfig.JULES_AUTO_SEND_ENABLED}
              onChange={(e) => setJulesConfig(prev => ({ ...prev, JULES_AUTO_SEND_ENABLED: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm outline-none"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">Require plan approval</span>
            <select
              value={julesConfig.JULES_REQUIRE_PLAN_APPROVAL}
              onChange={(e) => setJulesConfig(prev => ({ ...prev, JULES_REQUIRE_PLAN_APPROVAL: e.target.value }))}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-sm outline-none"
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">API key yahan show/save nahi hoti. Sirf server KV se read hoti hai.</p>
          <div className="flex items-center gap-3">
            {julesMessage && <span className="text-xs font-bold text-amber-300">{julesMessage}</span>}
            <button
              onClick={saveJulesConfig}
              disabled={julesSettingsLoading}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {julesSettingsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Jules Settings
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <section className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="font-black text-white">Recent Sessions</h2>
            <span className="text-xs text-neutral-500">{sessions.length} records</span>
          </div>
          <div className="divide-y divide-neutral-800 max-h-[75vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-neutral-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">No error sessions found.</div>
            ) : sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedId(session.id)}
                className={`w-full text-left p-4 hover:bg-white/[0.03] transition-colors ${selectedId === session.id ? 'bg-orange-500/10' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{session.title}</p>
                    <p className="text-xs text-neutral-500 font-mono">{session.id}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border ${severityStyles[session.severity] || severityStyles.medium}`}>{session.severity}</span>
                </div>
                <p className="text-sm text-neutral-400 line-clamp-2 mb-3">{session.error_message}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border ${statusStyles[session.status] || statusStyles.new}`}>{session.status}</span>
                  <span className="text-[11px] text-neutral-500">x{session.repeat_count || 1} · {formatDate(session.updated_at || session.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden min-h-[75vh]">
          {!selectedSession ? (
            <div className="h-full flex items-center justify-center text-neutral-500">Select an error session.</div>
          ) : detailLoading ? (
            <div className="h-full flex items-center justify-center text-neutral-400"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading details...</div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border ${severityStyles[selectedSession.severity] || severityStyles.medium}`}>{selectedSession.severity}</span>
                    <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-lg border ${statusStyles[selectedSession.status] || statusStyles.new}`}>{selectedSession.status}</span>
                    <span className="text-[10px] uppercase font-black px-2 py-1 rounded-lg border border-neutral-700 text-neutral-300 bg-neutral-800">{selectedSession.source}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">{selectedSession.title}</h2>
                  <p className="text-xs text-neutral-500 font-mono">{selectedSession.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => runAction('generate-prompt')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    {actionLoading === 'generate-prompt' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} Generate Prompt
                  </button>
                  <button onClick={() => runAction('send-to-jules')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    {actionLoading === 'send-to-jules' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to Jules
                  </button>
                  <button onClick={() => runAction('sync-jules')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    {actionLoading === 'sync-jules' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Sync Jules Chat
                  </button>
                  <button onClick={() => runAction('resolve')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    {actionLoading === 'resolve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
                  </button>
                  <button onClick={() => runAction('reopen')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    {actionLoading === 'reopen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Reopen
                  </button>
                  <button onClick={() => runAction('ignore')} disabled={!!actionLoading} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-sm font-bold flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Ignore
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InfoCard label="URL" value={selectedSession.url || 'N/A'} icon={<ExternalLink className="w-4 h-4" />} />
                <InfoCard label="User / Email" value={selectedSession.user_id || selectedSession.email_from || 'Guest'} icon={<Mail className="w-4 h-4" />} />
                <InfoCard label="Last Seen" value={formatDate(selectedSession.last_seen_at)} icon={<AlertTriangle className="w-4 h-4" />} />
                <InfoCard label="Created" value={formatDate(selectedSession.created_at)} icon={<CheckCircle2 className="w-4 h-4" />} />
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 overflow-hidden">
                <div className="border-b border-neutral-800 px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-black text-white"><MessageSquareText className="h-4 w-4 text-orange-400" /> Chat-style Error + Jules Record</div>
                    <p className="text-xs text-neutral-500">Error, AI prompt, Jules request/response, admin notes aur timeline ek conversation me manage honge.</p>
                  </div>
                  <button onClick={copyChatRecord} className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-2"><Copy className="w-3 h-3" />Copy full chat</button>
                </div>
                <div className="max-h-[44rem] space-y-4 overflow-y-auto p-4">
                  {chatMessages.map((message) => <ChatBubble key={message.id} message={message} />)}
                </div>
                <div className="border-t border-neutral-800 p-4">
                  <div className="flex flex-col gap-2 md:flex-row">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      className="min-h-20 flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-600"
                      placeholder="Admin note likho... jaise Jules response verify kiya, manual fix kiya, ya customer follow-up pending hai."
                    />
                    <button onClick={addNote} disabled={!noteDraft.trim() || !!actionLoading} className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-500 disabled:opacity-50">
                      {actionLoading === 'add-note' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Note'}
                    </button>
                  </div>
                </div>
              </div>

              <CodePanel title="Error Message" value={selectedSession.error_message || 'No message'} />
              <CodePanel title="Stack Trace / Email Body" value={selectedSession.stack_trace || 'No stack trace'} />
              <CodePanel title="Full Captured Error Payload" value={formatRecord(selectedSession.full_payload)} copyable />
              <CodePanel title="AI Prompt for Jules" value={selectedSession.ai_prompt || 'Prompt not generated yet.'} copyable />

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
                  <h3 className="font-black text-white mb-3">Jules Jobs</h3>
                  <p className="text-xs text-neutral-500 mb-3">Jules ko bheja gaya prompt aur Jules API se aaya poora response yahan record ke roop me dikhega.</p>
                  <div className="space-y-3 max-h-[42rem] overflow-y-auto pr-1">
                    {(detail?.jobs || []).length === 0 ? <p className="text-sm text-neutral-500">No Jules jobs yet.</p> : detail?.jobs.map((job) => (
                      <div key={job.id} className="border border-neutral-800 rounded-xl p-3 bg-neutral-900/60 space-y-3">
                        <div className="flex justify-between gap-2 mb-1"><span className="font-mono text-xs text-neutral-400">{job.id}</span><span className="text-xs text-emerald-300 font-bold">{job.status}</span></div>
                        <p className="text-xs text-neutral-500">Jules: {job.jules_session_id || '—'} · Created: {formatDate(job.created_at)} · Updated: {formatDate(job.updated_at)}</p>
                        <div>
                          <p className="text-[11px] uppercase font-black text-neutral-400 mb-1">Prompt sent to Jules</p>
                          <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap overflow-x-auto max-h-72 rounded-lg border border-neutral-800 bg-neutral-950 p-3">{job.prompt || 'Prompt not stored.'}</pre>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase font-black text-neutral-400 mb-1">Full Jules Response</p>
                          <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap overflow-x-auto max-h-72 rounded-lg border border-neutral-800 bg-neutral-950 p-3">{formatRecord(job.response)}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
                  <h3 className="font-black text-white mb-3">Timeline</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {(detail?.events || []).map((event) => (
                      <div key={event.id} className="border-l-2 border-orange-500/50 pl-3">
                        <p className="text-sm font-bold text-neutral-200">{event.type}</p>
                        <p className="text-xs text-neutral-500 mb-1">{formatDate(event.created_at)}</p>
                        <pre className="text-[11px] text-neutral-500 whitespace-pre-wrap line-clamp-4">{JSON.stringify(safeParse(event.payload), null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


function ChatBubble({ message }: { message: ChatMessage }) {
  const isRight = message.role === 'admin' || message.role === 'ai';
  const roleStyles: Record<ChatMessageRole, string> = {
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
    ai: 'border-purple-500/30 bg-purple-500/10 text-purple-100',
    jules: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    admin: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    system: 'border-neutral-700 bg-neutral-900 text-neutral-200',
  };
  const roleIcon: Record<ChatMessageRole, ReactNode> = {
    error: <ShieldAlert className="h-4 w-4" />,
    ai: <Bot className="h-4 w-4" />,
    jules: <Send className="h-4 w-4" />,
    admin: <UserRound className="h-4 w-4" />,
    system: <Terminal className="h-4 w-4" />,
  };

  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-3xl rounded-2xl border p-4 ${roleStyles[message.role]}`}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-black capitalize">{roleIcon[message.role]} {message.title}</div>
            <p className="mt-1 text-[11px] text-neutral-400">{message.meta || message.role} · {formatDate(message.time)}</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(message.body)} className="shrink-0 text-xs text-neutral-400 hover:text-white flex items-center gap-1"><Copy className="h-3 w-3" />Copy</button>
        </div>
        <pre className="max-h-96 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/25 p-3 text-xs leading-relaxed text-neutral-100">{message.body}</pre>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-neutral-500 text-xs font-black uppercase tracking-wider mb-2">{icon}{label}</div>
      <p className="text-sm text-neutral-200 break-all">{value}</p>
    </div>
  );
}

function CodePanel({ title, value, copyable = false }: { title: string; value: string; copyable?: boolean }) {
  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-white"><Terminal className="w-4 h-4 text-orange-400" />{title}</div>
        {copyable && <button onClick={() => navigator.clipboard.writeText(value)} className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>}
      </div>
      <pre className="p-4 text-xs text-neutral-300 whitespace-pre-wrap overflow-x-auto max-h-96">{value}</pre>
    </div>
  );
}
