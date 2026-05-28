'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Clock, AlertCircle, CheckCircle, XCircle, Send, Loader2, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LeavePage() {
  const { t, language } = useLanguage();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    type: 'other',
    course_id: '',
    batch_id: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/leave/my-leaves'),
      fetch('/api/user/my-courses'),
    ]).then(async ([leavesRes, coursesRes]) => {
      if (leavesRes.ok) {
        const data: any = await leavesRes.json();
        setLeaves(data.leaves || []);
      }
      if (coursesRes.ok) {
        const data: any = await coursesRes.json();
        setCourses(data.courses || data.enrolledCourses || []);
      }
    }).finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.start_date || !form.end_date || !form.reason) {
      setError('Start date, end date, and reason are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leave/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data: any = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to apply for leave');
      } else {
        setSuccess('Leave application submitted successfully!');
        setForm({ start_date: '', end_date: '', reason: '', type: 'other', course_id: '', batch_id: '' });
        const leavesRes = await fetch('/api/leave/my-leaves');
        if (leavesRes.ok) {
          const leavesData: any = await leavesRes.json();
          setLeaves(leavesData.leaves || []);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-widest"><Clock className="w-3 h-3" /> Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return null;
    }
  };

  // ⚡ Bolt Optimization: Wrapped filteredLeaves in useMemo to prevent recalculating on unrelated renders
  const filteredLeaves = useMemo(() => {
    return statusFilter ? leaves.filter(l => l.status === statusFilter) : leaves;
  }, [leaves, statusFilter]);

  // ⚡ Bolt Optimization: Memoized leave statistics to avoid recalculating counts multiple times per render
  const leaveStats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0;
    leaves.forEach(l => {
      if (l.status === 'pending') pending++;
      else if (l.status === 'approved') approved++;
      else if (l.status === 'rejected') rejected++;
    });
    return { pending, approved, rejected, total: leaves.length };
  }, [leaves]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Leave Management</h1>
          <p className="text-neutral-500 mt-1 font-medium">Apply for leave and track your requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leaves', value: leaveStats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Pending', value: leaveStats.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Approved', value: leaveStats.approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Rejected', value: leaveStats.rejected, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">{stat.label}</p>
            <p className={`mt-2 text-2xl font-black ${stat.color} ${stat.bg} inline-block px-3 py-1 rounded-xl`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Apply for Leave Form */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
            <Send className="w-5 h-5 text-orange-400" /> Apply for Leave
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Start Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">End Date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Leave Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
              >
                <option value="other">General / Other</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Course (Optional)</label>
              <select
                value={form.course_id}
                onChange={(e) => {
                  setForm({ ...form, course_id: e.target.value, batch_id: '' });
                }}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
              >
                <option value="">-- No specific course --</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {language === 'hi' ? c.title_hi || c.title : c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all min-h-[100px] resize-y"
                placeholder="Please describe the reason for your leave..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? 'Submitting...' : 'Submit Leave Application'}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-orange-400" /> Leave History
            </h2>
            <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg">
              {['', 'pending', 'approved', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    statusFilter === s ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          {filteredLeaves.length === 0 ? (
            <div className="text-center py-16 bg-neutral-950/50 rounded-2xl border border-dashed border-neutral-800">
              <CalendarDays className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-600 font-medium">No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {filteredLeaves.map((leave: any) => (
                <div key={leave.id} className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-bold">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {leave.start_date} → {leave.end_date}
                    </div>
                    {getStatusBadge(leave.status)}
                  </div>
                  <p className="text-sm text-neutral-300 mb-2">{leave.reason}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
                    <span className="px-2 py-1 bg-neutral-800 rounded-lg capitalize">{leave.type}</span>
                    {leave.course_title && (
                      <span className="px-2 py-1 bg-neutral-800 rounded-lg">{language === 'hi' ? leave.course_title_hi || leave.course_title : leave.course_title}</span>
                    )}
                    {leave.reviewer_name && (
                      <span className="text-neutral-600">
                        Reviewed by: {leave.reviewer_name}
                      </span>
                    )}
                  </div>
                  {leave.admin_notes && (
                    <div className="mt-2 p-2 bg-neutral-800/50 rounded-xl text-xs text-neutral-400">
                      <span className="font-bold text-neutral-500">Admin notes:</span> {leave.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
