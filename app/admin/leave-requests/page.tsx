'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, CheckCircle, XCircle, Clock, Search, Loader2, Trash2, AlertCircle, BookOpen, Users } from 'lucide-react';

export default function AdminLeaveRequestsPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchLeaves = async (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/leave-requests?${params}`);
    if (res.ok) {
      const data: any = await res.json();
      setLeaves(data.leaves || []);
    }
  };

  const fetchStats = async () => {
    const res = await fetch('/api/admin/leave-requests/stats');
    if (res.ok) {
      const data: any = await res.json();
      setStats(data);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      Promise.all([fetchLeaves(), fetchStats()]).finally(() => setIsLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setSuccess('Leave approved successfully!');
        await fetchLeaves(statusFilter);
        await fetchStats();
      } else {
        const data: any = await res.json();
        setError(data.error || 'Failed to approve');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!actionId) return;
    setActionLoading(actionId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/leave-requests/${actionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: rejectNotes }),
      });
      if (res.ok) {
        setSuccess('Leave rejected!');
        setShowRejectModal(false);
        setRejectNotes('');
        setActionId(null);
        await fetchLeaves(statusFilter);
        await fetchStats();
      } else {
        const data: any = await res.json();
        setError(data.error || 'Failed to reject');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave request?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/leave-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Leave deleted!');
        await fetchLeaves(statusFilter);
        await fetchStats();
      } else {
        const data: any = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusFilter = async (status: string) => {
    setStatusFilter(status);
    await fetchLeaves(status);
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

  // ⚡ Bolt Optimization: Hoisted searchQuery.toLowerCase() outside the filter loop to prevent O(N) string allocations
  // and wrapped the result in useMemo to avoid redundant recalculations on unrelated component re-renders.
  const filteredLeaves = useMemo(() => {
    if (!searchQuery) return leaves;
    const searchLower = searchQuery.toLowerCase();
    return leaves.filter(l =>
      l.student_name?.toLowerCase().includes(searchLower) ||
      l.reason?.toLowerCase().includes(searchLower)
    );
  }, [leaves, searchQuery]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-orange-400" /> Leave Requests
        </h1>
        <p className="text-neutral-500 mt-1 font-medium">Manage student leave applications</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Pending</p>
            <p className="mt-2 text-2xl font-black text-yellow-400 bg-yellow-500/10 inline-block px-3 py-1 rounded-xl">{stats.pending}</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Approved (30d)</p>
            <p className="mt-2 text-2xl font-black text-emerald-400 bg-emerald-500/10 inline-block px-3 py-1 rounded-xl">{stats.approvedLast30Days}</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Rejected (30d)</p>
            <p className="mt-2 text-2xl font-black text-red-400 bg-red-500/10 inline-block px-3 py-1 rounded-xl">{stats.rejectedLast30Days}</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Total (30d)</p>
            <p className="mt-2 text-2xl font-black text-blue-400 bg-blue-500/10 inline-block px-3 py-1 rounded-xl">{stats.totalLast30Days}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by student or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {filteredLeaves.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl">
          <CalendarDays className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-600">No leave requests found</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeaves.map((leave: any) => (
            <div key={leave.id} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-neutral-800 rounded-lg">
                      <Users className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{leave.student_name}</p>
                      <p className="text-[10px] text-neutral-500">{leave.student_email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mb-2">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {leave.start_date} → {leave.end_date}</span>
                    <span className="text-neutral-700">|</span>
                    <span className="capitalize">{leave.type}</span>
                    {leave.course_title && (
                      <>
                        <span className="text-neutral-700">|</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {leave.course_title}</span>
                      </>
                    )}
                    {leave.batch_name && (
                      <span className="text-neutral-600">({leave.batch_name})</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-300 mb-2 line-clamp-2">{leave.reason}</p>
                  {leave.admin_notes && (
                    <div className="mt-1 p-2 bg-neutral-800/50 rounded-xl text-xs text-neutral-400">
                      <span className="font-bold text-neutral-500">Notes:</span> {leave.admin_notes}
                    </div>
                  )}
                  {leave.reviewer_name && (
                    <p className="text-[10px] text-neutral-600 mt-1">Reviewed by: {leave.reviewer_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {getStatusBadge(leave.status)}
                  {leave.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleApprove(leave.id)}
                        disabled={actionLoading === leave.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        {actionLoading === leave.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => { setShowRejectModal(true); setActionId(leave.id); setRejectNotes(''); }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleDelete(leave.id)}
                        disabled={actionLoading === leave.id}
                        className="p-2 bg-neutral-800 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Reject Leave Request</h3>
            <p className="text-sm text-neutral-400 mb-4">Please provide a reason for rejection:</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-all min-h-[100px] resize-y"
              placeholder="Reason for rejection..."
              required
            />
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={!rejectNotes || actionLoading === actionId}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {actionLoading === actionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Reject
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setActionId(null); }}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-black rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
