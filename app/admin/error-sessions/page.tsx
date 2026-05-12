'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Copy, ExternalLink, Loader2, Mail, RefreshCcw, Send, ShieldAlert, Terminal, XCircle } from 'lucide-react';

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
  jobs: Array<{ id: string; status: string; jules_session_id?: string; response?: string; created_at: string }>;
};

const statusStyles: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  ai_prompted: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  sent_to_jules: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  awaiting_config: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  failed: 'bg-red-500/10 text-red-300 border-red-500/30',
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

export default function AdminErrorSessionsPage() {
  const [sessions, setSessions] = useState<ErrorSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErrorSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const selectedSession = useMemo(
    () => detail?.session || sessions.find((session) => session.id === selectedId) || null,
    [detail, selectedId, sessions],
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

  // Initial/list loading intentionally synchronizes server data into local UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [fetchDetail, selectedId]);

  const runAction = async (action: 'generate-prompt' | 'send-to-jules' | 'ignore') => {
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
            <option value="ignored">Ignored</option>
          </select>
          <button onClick={fetchSessions} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm font-bold hover:bg-neutral-800">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

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

              <CodePanel title="Error Message" value={selectedSession.error_message || 'No message'} />
              <CodePanel title="Stack Trace / Email Body" value={selectedSession.stack_trace || 'No stack trace'} />
              <CodePanel title="AI Prompt for Jules" value={selectedSession.ai_prompt || 'Prompt not generated yet.'} copyable />

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4">
                  <h3 className="font-black text-white mb-3">Jules Jobs</h3>
                  <div className="space-y-3">
                    {(detail?.jobs || []).length === 0 ? <p className="text-sm text-neutral-500">No Jules jobs yet.</p> : detail?.jobs.map((job) => (
                      <div key={job.id} className="border border-neutral-800 rounded-xl p-3 bg-neutral-900/60">
                        <div className="flex justify-between gap-2 mb-1"><span className="font-mono text-xs text-neutral-400">{job.id}</span><span className="text-xs text-emerald-300 font-bold">{job.status}</span></div>
                        <p className="text-xs text-neutral-500">Jules: {job.jules_session_id || '—'} · {formatDate(job.created_at)}</p>
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
