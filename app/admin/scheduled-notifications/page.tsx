'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Play, Pause, Edit, Trash2, X, Plus, Search,
  Loader2, Bell, Users, CheckCircle2, AlertCircle, ChevronRight, Send, Eye
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

type Status = 'pending' | 'sent' | 'cancelled' | 'expired' | 'completed' | 'paused' | 'failed';
type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly';
type Audience = 'all' | 'logged_in' | 'anonymous' | 'students' | 'teachers' | 'admin' | 'specific';

interface ScheduledJob {
  id: string;
  created_by: string;
  title: string;
  title_hi?: string | null;
  body: string;
  body_hi?: string | null;
  audience: Audience;
  target_user_ids?: string | null;
  target_user_ids_parsed?: string[];
  data_json?: string | null;
  data_parsed?: Record<string, string>;
  schedule_type: ScheduleType;
  scheduled_at?: string | null;
  time_of_day?: string | null;
  days_of_week?: string | null;
  days_of_month?: string | null;
  timezone: string;
  status: Status;
  last_run_at?: string | null;
  next_run_at?: string | null;
  run_count: number;
  max_runs: number;
  expires_at?: string | null;
  result_log_id?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<Status, { label: string; color: string; bg: string }> = {
  pending: { label: 'प्रतीक्षा में', color: 'text-amber-700', bg: 'bg-amber-100' },
  sent: { label: 'भेजा गया', color: 'text-green-700', bg: 'bg-green-100' },
  paused: { label: 'रुका हुआ', color: 'text-blue-700', bg: 'bg-blue-100' },
  cancelled: { label: 'रद्द', color: 'text-gray-700', bg: 'bg-gray-100' },
  expired: { label: 'समाप्त', color: 'text-orange-700', bg: 'bg-orange-100' },
  completed: { label: 'पूर्ण', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  failed: { label: 'विफल', color: 'text-red-700', bg: 'bg-red-100' },
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'सभी',
  logged_in: 'लॉग इन',
  anonymous: 'अनाम',
  students: 'विद्यार्थी',
  teachers: 'शिक्षक',
  admin: 'एडमिन',
  specific: 'विशेष उपयोगकर्ता',
};

const DAY_LABELS = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

function formatDateTime(dt?: string | null) {
  if (!dt) return '—';
  try {
    const d = new Date(dt.includes('T') ? dt : dt.replace(' ', 'T') + 'Z');
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dt;
  }
}

function describeSchedule(job: ScheduledJob): string {
  if (job.schedule_type === 'once') {
    return `एक बार — ${formatDateTime(job.scheduled_at)}`;
  }
  const time = job.time_of_day || '09:00';
  if (job.schedule_type === 'daily') {
    return `रोज़ाना ${time} बजे`;
  }
  if (job.schedule_type === 'weekly') {
    const days = (job.days_of_week || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const dayNames = days.map(d => DAY_LABELS[d]).join(', ');
    return `हर ${dayNames} — ${time} बजे`;
  }
  if (job.schedule_type === 'monthly') {
    const dates = (job.days_of_month || '').split(',').map(s => s.trim()).filter(Boolean);
    return `हर महीने की ${dates.join(', ')} — ${time} बजे`;
  }
  return job.schedule_type;
}

function computeNext3Runs(job: { schedule_type: ScheduleType; time_of_day?: string | null; days_of_week?: string | null; days_of_month?: string | null; scheduled_at?: string | null }): string[] {
  const out: string[] = [];
  let now = new Date();
  if (job.schedule_type === 'once') {
    if (job.scheduled_at && new Date(job.scheduled_at) > now) out.push(job.scheduled_at);
    return out;
  }
  const [hh, mm] = (job.time_of_day || '09:00').split(':').map(s => parseInt(s, 10) || 0);
  for (let i = 0; i < 50 && out.length < 3; i++) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + i);
    candidate.setUTCHours(hh, mm, 0, 0);
    if (job.schedule_type === 'daily') {
      if (i === 0 && candidate <= now) continue;
      out.push(candidate.toISOString().replace('T', ' ').substring(0, 16));
    } else if (job.schedule_type === 'weekly') {
      const days = (job.days_of_week || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 0 && n <= 6);
      if (i === 0 && candidate <= now) continue;
      if (days.includes(candidate.getUTCDay())) out.push(candidate.toISOString().replace('T', ' ').substring(0, 16));
    } else if (job.schedule_type === 'monthly') {
      const days = (job.days_of_month || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 31);
      if (i === 0 && candidate <= now) continue;
      if (days.includes(candidate.getUTCDate())) out.push(candidate.toISOString().replace('T', ' ').substring(0, 16));
    }
  }
  return out;
}

export default function AdminScheduledNotificationsPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '100');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/scheduled-notifications?${params}`);
      const data = await res.json() as any;
      if (res.ok) {
        setJobs(data.items || []);
        setTotal(data.total || 0);
      }
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '100');
        if (statusFilter !== 'all') params.set('status', statusFilter);
        const res = await fetch(`/api/admin/scheduled-notifications?${params}`);
        const data = await res.json() as any;
        if (!cancelled && res.ok) {
          setJobs(data.items || []);
          setTotal(data.total || 0);
        }
      } catch {
        // handled silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const handleAction = async (id: string, action: 'run-now' | 'pause' | 'resume' | 'delete') => {
    const confirmMsg = action === 'delete' ? 'क्या आप वाकई इस शेड्यूल को रद्द करना चाहते हैं?' : null;
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      const method = action === 'delete' ? 'DELETE' : 'POST';
      const res = await fetch(`/api/admin/scheduled-notifications/${id}/${action}`, { method });
      const data = await res.json() as any;
      if (res.ok) {
        showSuccess(
          action === 'run-now' ? `भेजा गया! (${data.sent} सफल, ${data.failed} विफल)` :
          action === 'pause' ? 'रोक दिया गया' :
          action === 'resume' ? 'पुनः शुरू' :
          'रद्द कर दिया'
        );
        fetchJobs();
      } else {
        showError(data.error || 'विफल');
      }
    } catch {
      showError('नेटवर्क त्रुटि');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              शेड्यूल नोटिफिकेशन्स
            </h1>
            <p className="text-amber-700 mt-1">किसी भी समय किसी को भी रिमाइंडर भेजें — एक बार या बार-बार</p>
          </div>
          <button
            onClick={() => { setEditingJob(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            नया शेड्यूल
          </button>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'pending', 'paused', 'sent', 'completed', 'cancelled', 'expired'] as const).map(s => {
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  isActive ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-800 hover:bg-amber-100'
                }`}
              >
                {s === 'all' ? `सभी (${total})` : STATUS_LABELS[s as Status]?.label || s}
              </button>
            );
          })}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Bell className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h2 className="text-xl font-semibold text-amber-900 mb-2">कोई शेड्यूल नहीं मिला</h2>
            <p className="text-amber-700">ऊपर &ldquo;नया शेड्यूल&rdquo; बटन दबाकर अपना पहला रिमाइंडर बनाएँ।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const st = STATUS_LABELS[job.status] || STATUS_LABELS.pending;
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-amber-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${st.bg} ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          👥 {AUDIENCE_LABELS[job.audience]}
                        </span>
                        {job.schedule_type !== 'once' && (
                          <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            🔁 {job.run_count}/{job.max_runs} रन
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {job.title_hi || job.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mt-0.5">{job.body_hi || job.body}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{describeSchedule(job)}</span>
                        {job.next_run_at && job.status === 'pending' && (
                          <span className="flex items-center gap-1 text-amber-700 font-medium">
                            <ChevronRight className="w-3.5 h-3.5" />अगला: {formatDateTime(job.next_run_at)}
                          </span>
                        )}
                        {job.last_run_at && (
                          <span className="text-gray-500">पिछला: {formatDateTime(job.last_run_at)}</span>
                        )}
                      </div>
                      {job.last_error && (
                        <p className="text-xs text-red-600 mt-1">त्रुटि: {job.last_error}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {job.status === 'pending' && (
                        <>
                          <ActionBtn icon={Play} label="अभी भेजें" color="green" onClick={() => handleAction(job.id, 'run-now')} />
                          <ActionBtn icon={Pause} label="रोकें" color="blue" onClick={() => handleAction(job.id, 'pause')} />
                        </>
                      )}
                      {job.status === 'paused' && (
                        <ActionBtn icon={Play} label="पुनः शुरू" color="green" onClick={() => handleAction(job.id, 'resume')} />
                      )}
                      {(job.status === 'pending' || job.status === 'paused') && (
                        <ActionBtn icon={Edit} label="संपादित" color="amber" onClick={() => { setEditingJob(job); setShowCreateModal(true); }} />
                      )}
                      {job.status !== 'cancelled' && (
                        <ActionBtn icon={Trash2} label="रद्द" color="red" onClick={() => handleAction(job.id, 'delete')} />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateEditModal
              job={editingJob}
              onClose={() => { setShowCreateModal(false); setEditingJob(null); }}
              onSaved={() => { setShowCreateModal(false); setEditingJob(null); fetchJobs(); }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${colorMap[color]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function CreateEditModal({ job, onClose, onSaved }: { job: ScheduledJob | null; onClose: () => void; onSaved: () => void }) {
  const { success: showSuccess, error: showError } = useToast();
  const isEdit = !!job;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: job?.title || '',
    title_hi: job?.title_hi || '',
    body: job?.body || '',
    body_hi: job?.body_hi || '',
    audience: (job?.audience || 'all') as Audience,
    target_user_ids: job?.target_user_ids_parsed || [],
    data_url: (job?.data_parsed?.url as string) || '',
    schedule_type: (job?.schedule_type || 'once') as ScheduleType,
    scheduled_at: job?.scheduled_at ? job.scheduled_at.substring(0, 16) : '',
    time_of_day: job?.time_of_day || '09:00',
    days_of_week: job?.days_of_week || '1',
    days_of_month: job?.days_of_month || '1',
    max_runs: job?.max_runs || 100,
    expires_at: job?.expires_at ? job.expires_at.substring(0, 16) : '',
  });

  const next3Runs = useMemo(() => {
    return computeNext3Runs({
      schedule_type: form.schedule_type,
      time_of_day: form.time_of_day,
      days_of_week: form.days_of_week,
      days_of_month: form.days_of_month,
      scheduled_at: form.scheduled_at,
    });
  }, [form.schedule_type, form.time_of_day, form.days_of_week, form.days_of_month, form.scheduled_at]);

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      showError('शीर्षक और संदेश दोनों आवश्यक हैं');
      return;
    }
    if (form.schedule_type === 'once' && !form.scheduled_at) {
      showError('एक बार के लिए दिनांक और समय चुनें');
      return;
    }
    if (form.audience === 'specific' && form.target_user_ids.length === 0) {
      showError('विशेष उपयोगकर्ता चुनें');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        title: form.title,
        title_hi: form.title_hi || undefined,
        body: form.body,
        body_hi: form.body_hi || undefined,
        audience: form.audience,
        target_user_ids: form.audience === 'specific' ? form.target_user_ids : undefined,
        data: form.data_url ? { url: form.data_url, clickUrl: form.data_url } : undefined,
        schedule_type: form.schedule_type,
        time_of_day: form.schedule_type !== 'once' ? form.time_of_day : undefined,
        days_of_week: form.schedule_type === 'weekly' ? form.days_of_week : undefined,
        days_of_month: form.schedule_type === 'monthly' ? form.days_of_month : undefined,
        max_runs: form.max_runs,
      };
      if (form.schedule_type === 'once') payload.scheduled_at = form.scheduled_at;
      if (form.expires_at) payload.expires_at = form.expires_at;

      const url = isEdit ? `/api/admin/scheduled-notifications/${job!.id}` : '/api/admin/scheduled-notifications';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json() as any;
      if (res.ok) {
        showSuccess(isEdit ? 'अद्यतन किया गया' : 'शेड्यूल बना दिया');
        onSaved();
      } else {
        showError(data.error || 'विफल');
      }
    } catch {
      showError('नेटवर्क त्रुटि');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-amber-900">
            {isEdit ? '✏️ शेड्यूल संपादित करें' : '📅 नया शेड्यूल बनाएँ'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="बंद करें" title="बंद करें"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title (EN/HI) */}
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="शीर्षक (English)">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Class starts soon" />
            </Field>
            <Field label="शीर्षक (हिन्दी)">
              <input value={form.title_hi} onChange={e => setForm({ ...form, title_hi: e.target.value })} className={inputCls} placeholder="कक्षा जल्द शुरू होगी" />
            </Field>
          </div>

          {/* Body (EN/HI) */}
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="संदेश (English)">
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className={`${inputCls} min-h-[80px]`} placeholder="Your class starts in 15 minutes" />
            </Field>
            <Field label="संदेश (हिन्दी)">
              <textarea value={form.body_hi} onChange={e => setForm({ ...form, body_hi: e.target.value })} className={`${inputCls} min-h-[80px]`} placeholder="आपकी कक्षा 15 मिनट में शुरू होगी" />
            </Field>
          </div>

          {/* Audience */}
          <Field label="किसको भेजें">
            <div className="flex flex-wrap gap-2">
              {(['all', 'logged_in', 'anonymous', 'students', 'teachers', 'admin', 'specific'] as Audience[]).map(a => (
                <button
                  key={a}
                  onClick={() => setForm({ ...form, audience: a })}
                  className={`px-3 py-1.5 text-sm rounded-full font-medium transition ${
                    form.audience === a ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {AUDIENCE_LABELS[a]}
                </button>
              ))}
            </div>
          </Field>

          {form.audience === 'specific' && (
            <Field label="उपयोगकर्ता चुनें">
              <UserMultiSelect selected={form.target_user_ids} onChange={(ids) => setForm({ ...form, target_user_ids: ids })} />
            </Field>
          )}

          {/* Click URL */}
          <Field label="क्लिक URL (वैकल्पिक)">
            <input value={form.data_url} onChange={e => setForm({ ...form, data_url: e.target.value })} className={inputCls} placeholder="/dashboard/course/learn?batch=YA-BAT-xxx" />
          </Field>

          {/* Schedule type */}
          <Field label="शेड्यूल का प्रकार">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                { v: 'once', label: 'एक बार', icon: '📅' },
                { v: 'daily', label: 'रोज़ाना', icon: '🔁' },
                { v: 'weekly', label: 'हर हफ्ते', icon: '📆' },
                { v: 'monthly', label: 'हर महीने', icon: '🗓️' },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setForm({ ...form, schedule_type: opt.v as ScheduleType })}
                  className={`p-3 rounded-xl border-2 font-medium text-sm transition ${
                    form.schedule_type === opt.v
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-amber-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Schedule-specific fields */}
          {form.schedule_type === 'once' ? (
            <Field label="दिनांक और समय (एक बार)">
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className={inputCls} />
            </Field>
          ) : (
            <div className="space-y-3">
              <Field label="समय (हर दिन इस समय भेजें)">
                <input type="time" value={form.time_of_day} onChange={e => setForm({ ...form, time_of_day: e.target.value })} className={inputCls} />
              </Field>
              {form.schedule_type === 'weekly' && (
                <Field label="कौन-कौन से दिन">
                  <div className="flex flex-wrap gap-2">
                    {DAY_LABELS.map((label, idx) => {
                      const days = form.days_of_week.split(',').map(s => s.trim());
                      const isOn = days.includes(String(idx));
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const next = isOn ? days.filter(d => d !== String(idx)) : [...days, String(idx)];
                            setForm({ ...form, days_of_week: next.sort().join(',') || '0' });
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            isOn ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
              {form.schedule_type === 'monthly' && (
                <Field label="महीने की कौन-कौन सी तारीखें (1-31, अल्पविराम से अलग)">
                  <input value={form.days_of_month} onChange={e => setForm({ ...form, days_of_month: e.target.value })} className={inputCls} placeholder="1, 15, 30" />
                </Field>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="अधिकतम रन (रोकथाम)">
                  <input type="number" min={1} max={9999} value={form.max_runs} onChange={e => setForm({ ...form, max_runs: parseInt(e.target.value, 10) || 100 })} className={inputCls} />
                </Field>
                <Field label="समाप्ति दिनांक (वैकल्पिक)">
                  <input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {/* Next 3 runs preview */}
          {next3Runs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4" />अगले 3 रन का पूर्वावलोकन
              </h4>
              <ul className="space-y-1">
                {next3Runs.map((dt, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-center gap-2">
                    <span className="bg-amber-200 text-amber-900 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {new Date(dt.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isEdit ? 'अद्यतन करें' : 'शेड्यूल बनाएँ'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none";

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function UserMultiSelect({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users-list?search=${encodeURIComponent(search)}&limit=50`);
        const data = await res.json() as any;
        if (res.ok) setUsers(data.users || []);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const filtered = users.filter(u => !selected.includes(u.id));

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-1.5 min-h-[40px]">
        {selected.length === 0 ? (
          <span className="text-sm text-gray-500 px-2 py-1">कोई उपयोगकर्ता नहीं चुना</span>
        ) : (
          selected.map(id => {
            const u = users.find(x => x.id === id);
            return (
              <span key={id} className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-900 rounded-md text-xs">
                {u?.name || u?.email || id}
                <button onClick={() => toggle(id)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
              </span>
            );
          })
        )}
      </div>
      <div className="p-2 border-b border-gray-200 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="नाम, ईमेल, फोन से खोजें..." className="flex-1 outline-none text-sm bg-transparent" />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-3 text-center text-sm text-gray-500">{search ? 'कोई उपयोगकर्ता नहीं मिला' : 'सभी चुने गए'}</div>
        ) : (
          filtered.map(u => (
            <button key={u.id} onClick={() => toggle(u.id)} className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-gray-900">{u.name || '(No name)'}</div>
                <div className="text-xs text-gray-500">{u.email || u.phone}</div>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{u.role}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
