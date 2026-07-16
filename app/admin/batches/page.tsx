'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatLocalDate, toUTCForDB, utcToLocalDateInput } from '@/lib/time';
import { Plus, Search, Filter, Edit2, Trash2, Calendar, Clock, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ContentAI from '@/components/ContentAI';
import { useToast } from '@/contexts/ToastContext';

interface Batch {
  id: string;
  course_id: string;
  course_title: string;
  book_id: string | null;       // BUG-11 fix: was missing, causing (batch as any) casts
  book_title: string | null;    // BUG-11 fix: was missing, causing (batch as any) casts
  name: string;
  name_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  start_date: string | null;
  end_date: string | null;
  class_start_time: string | null;
  class_end_time: string | null;
  class_days: string | null;
  self_study_group_enabled: number | null;
  cost_per_class_rupees: number;
  no_show_charge_rupees: number;
  group_class_credit_unit: string | null;
  credit_deduction_timing: string | null;
  status: 'upcoming' | 'ongoing' | 'completed';
  seo_json: string | null;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  purchased_at: string;
  progress: number;
}

interface Course {
  id: string;
  title: string;
}

interface Book {
  id: string;
  title: string;
}

export default function BatchesPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [scopeType, setScopeType] = useState<'course' | 'book'>('course');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalBatches, setTotalBatches] = useState(0);
  const [limit] = useState(50);

  // Form State
  const [formData, setFormData] = useState({
    course_id: '',
    book_id: '',
    name: '',
    name_hi: '',
    description_en: '',
    description_hi: '',
    start_date: '',
    end_date: '',
    status: 'upcoming',
    class_start_time: '',
    class_end_time: '',
    class_days: '',
    self_study_group_enabled: true,
    cost_per_class_rupees: 0,
    no_show_charge_rupees: 2,
    group_class_credit_unit: 'fifteen_minute',
    credit_deduction_timing: 'on_join',
    seo_json: '',
    send_update_email: false,
    send_announcement_email: false,
    announcement_audience: 'both',
    auto_post_social: false,
    social_platforms: ['facebook', 'instagram']
  });

  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [newStudentInput, setNewStudentInput] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const DAYS = [
    { label: 'सोम', value: 'Mon' },
    { label: 'मंगल', value: 'Tue' },
    { label: 'बुध', value: 'Wed' },
    { label: 'गुरु', value: 'Thu' },
    { label: 'शुक्र', value: 'Fri' },
    { label: 'शनि', value: 'Sat' },
    { label: 'रवि', value: 'Sun' },
  ];

  const fetchData = useCallback(async (currentPage: number = 1) => {
    setLoading(true);
    try {
      const [batchesRes, coursesRes, booksRes] = await Promise.all([
        fetch(`/api/admin/batches?page=${currentPage}&limit=${limit}`),
        fetch('/api/admin/courses'),
        fetch('/api/admin/books')
      ]);
      const batchesData = await batchesRes.json() as any;
      const coursesData = await coursesRes.json() as any;
      const booksData = await booksRes.json() as any;
      setBatches(batchesData.batches || []);
      setTotalBatches(batchesData.total || 0);
      setPage(batchesData.page || 1);
      setCourses(coursesData.courses || []);
      setBooks(booksData.books || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // BUG-14 fix: Promise.resolve().then() wrapper unnecessary tha
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBatch ? `/api/admin/batches/${editingBatch.id}` : '/api/admin/batches';
    const method = editingBatch ? 'PUT' : 'POST';

    try {
      const submissionData = {
        ...formData,
        start_date: toUTCForDB(formData.start_date),
        end_date: toUTCForDB(formData.end_date)
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingBatch(null);
        setFormData({ 
          course_id: '', 
          book_id: '',
          name: '', 
          name_hi: '', 
          description_en: '', 
          description_hi: '', 
          start_date: '', 
          end_date: '', 
          status: 'upcoming', 
          class_start_time: '', 
          class_end_time: '', 
          class_days: '',
          self_study_group_enabled: true,
          cost_per_class_rupees: 0,
          no_show_charge_rupees: 2,
          group_class_credit_unit: 'fifteen_minute',
          credit_deduction_timing: 'on_join',
          seo_json: '',
          send_update_email: false,
          send_announcement_email: false,
          announcement_audience: 'both',
          auto_post_social: false,
          social_platforms: ['facebook', 'instagram']
        });
        fetchData();
      } else {
        // BUG-03 fix: error handling add kiya — pehle koi else branch nahi tha
        const errData = await res.json().catch(() => ({})) as { error?: string };
        showError(errData.error || 'Batch save karne mein error aaya. Dobara try karein.');
      }
    } catch (err) {
      console.error('Failed to save batch:', err);
      showError('Network error. Apna internet connection check karein.');
    }
  };

  const handleViewDetails = async (batch: Batch) => {
    setSelectedBatchForDetails(batch);
    setIsDetailsOpen(true);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}/students`);
      const data = await res.json() as any;
      setBatchStudents(data.students || []);
    } catch (err) {
      console.error('Failed to fetch batch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddStudentToBatch = async () => {
    if (!selectedBatchForDetails || !newStudentInput) return;
    setIsAddingStudent(true);
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchForDetails.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: newStudentInput })
      });
      const data = await res.json() as any;
      if (res.ok) {
        setNewStudentInput('');
        handleViewDetails(selectedBatchForDetails);
        showSuccess("Student added successfully!");
      } else {
        showError(data.error || "Failed to add student");
      }
    } catch (err) {
      console.error('Failed to add student:', err);
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        // BUG-04 fix: error feedback add kiya — pehle kuch nahi hota tha
        const errData = await res.json().catch(() => ({})) as { error?: string };
        showError(errData.error || 'Batch delete karne mein error aaya.');
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
      showError('Network error. Apna internet connection check karein.');
    }
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setScopeType(batch.book_id ? 'book' : 'course');
    setFormData({
      course_id: batch.course_id || '',
      book_id: batch.book_id || '',
      name: batch.name,
      name_hi: batch.name_hi || '',
      description_en: batch.description_en || '',
      description_hi: batch.description_hi || '',
      start_date: utcToLocalDateInput(batch.start_date),
      end_date: utcToLocalDateInput(batch.end_date),
      status: batch.status,
      class_start_time: batch.class_start_time || '',
      class_end_time: batch.class_end_time || '',
      class_days: batch.class_days || '',
      self_study_group_enabled: batch.self_study_group_enabled !== 0,
      cost_per_class_rupees: batch.cost_per_class_rupees || 0,
      no_show_charge_rupees: batch.no_show_charge_rupees ?? 2,
      group_class_credit_unit: batch.group_class_credit_unit || 'fifteen_minute',
      credit_deduction_timing: batch.credit_deduction_timing || 'on_join',
      seo_json: batch.seo_json || '',
      send_update_email: false,
      send_announcement_email: false,
      announcement_audience: 'both',
      auto_post_social: false,
      social_platforms: ['facebook', 'instagram']
    });
    setIsModalOpen(true);
  };

  // ⚡ Bolt Optimization: Hoisted searchTerm.toLowerCase() outside the filter loop to prevent O(N) string allocations
  // and wrapped the result in useMemo to avoid redundant recalculations on unrelated component re-renders.
  const filteredBatches = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return batches.filter(b => {
      const titleMatch = b.book_title || b.course_title || "";
      const matchesSearch =
        (b.name || "").toLowerCase().includes(search) ||
        titleMatch.toLowerCase().includes(search);
      const matchesStatus = !statusFilter || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
            बैच मैनेजमेंट (Batches)
          </h1>
          <p className="text-neutral-500 mt-1">कोर्स के अलग-अलग समूहों को यहाँ से प्रबंधित करें।</p>
        </div>
        <button 
          onClick={() => { 
            setEditingBatch(null); 
            setScopeType('course');
            setFormData({ 
              course_id: '', book_id: '', name: '', name_hi: '', description_en: '', description_hi: '', 
              start_date: '', end_date: '', status: 'upcoming', class_start_time: '', 
              class_end_time: '', class_days: '', self_study_group_enabled: true, cost_per_class_rupees: 0, no_show_charge_rupees: 2, group_class_credit_unit: 'fifteen_minute', credit_deduction_timing: 'on_join', seo_json: '', send_update_email: false, send_announcement_email: false, announcement_audience: 'both', auto_post_social: false, social_platforms: ['facebook', 'instagram']
            }); 
            setIsModalOpen(true); 
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          नया बैच जोड़ें
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="बैच या कोर्स के नाम से खोजें..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 appearance-none outline-none focus:ring-2 focus:ring-orange-500/50">
            <option value="">सभी स्टेटस</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-8 py-5">बैच विवरण</th>
                <th className="px-8 py-5">कोर्स / पुस्तक</th>
                <th className="px-8 py-5">समयावधि</th>
                <th className="px-8 py-5">स्टेटस</th>
                <th className="px-8 py-5 text-right">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-8 h-20 bg-white/5"></td>
                  </tr>
                ))
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-neutral-500 italic">कोई बैच नहीं मिला।</td>
                </tr>
              ) : filteredBatches.map((batch) => (
                <tr 
                  key={batch.id} 
                  onClick={() => handleViewDetails(batch)}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <div className="font-black text-white group-hover:text-orange-400 transition-colors tracking-tight">{batch.name}</div>
                    <div className="text-[10px] font-mono text-orange-400/80 mt-1.5 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 w-fit">
                      ID: {batch.id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${batch.book_id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {batch.book_id ? 'BOOK' : 'COURSE'}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-200 font-bold tracking-tight">{batch.book_title || batch.course_title}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-1">ID: {batch.book_id || batch.course_id}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs text-neutral-300 flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      {batch.start_date ? formatLocalDate(batch.start_date) : 'N/A'}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1.5 flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                         <Clock className="w-3.5 h-3.5" />
                         Ends: {batch.end_date ? formatLocalDate(batch.end_date) : 'N/A'}
                       </div>
                       {batch.class_start_time && (
                         <div className="flex items-center gap-2 text-orange-400 font-bold">
                           <Clock className="w-3.5 h-3.5" />
                           {batch.class_start_time} - {batch.class_end_time || '??'} {batch.class_days ? `(${batch.class_days})` : ''}
                         </div>
                       )}
{batch.self_study_group_enabled !== 0 && Number(batch.cost_per_class_rupees || 0) > 0 && (
                                <span className="text-xs text-neutral-400">
                                  {'₹'}{batch.cost_per_class_rupees}{' per class'}
                                </span>
                              )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(batch); }}
                        className="p-2.5 bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                        aria-label="Edit batch"
                        title="Edit batch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(batch.id); }}
                        className="p-2.5 bg-neutral-800 hover:bg-pink-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                        aria-label="Delete batch"
                        title="Delete batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination UI Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-8 py-5 bg-white/[0.02] border-t border-white/5 gap-4">
          <div className="text-sm text-neutral-400">
            Showing <span className="text-white font-bold">{filteredBatches.length}</span> of <span className="text-white font-bold">{totalBatches}</span> batches
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-400 font-bold px-3">
              Page {page} of {Math.ceil(totalBatches / limit) || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(totalBatches / limit), p + 1))}
              disabled={page >= Math.ceil(totalBatches / limit)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90dvh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {editingBatch ? 'बैच संपादित करें' : 'नया बैच जोड़ें'}
                </h2>
                <ContentAI 
                  context="batch"
                  initialData={{
                    title_en: formData.name,
                    description_en: formData.description_en
                  }}
                  onApply={(data) => {
                    const mapped: any = {};
                    if (data.title_hi) mapped.name_hi = data.title_hi;
                    if (data.description_hi) mapped.description_hi = data.description_hi;
                    if (data.seo_title_en) mapped.seo_json = JSON.stringify(data);
                    setFormData({ ...formData, ...mapped });
                  }}
                />
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => { setScopeType('course'); setFormData({ ...formData, book_id: '' }); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scopeType === 'course' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                  >
                    Course Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScopeType('book'); setFormData({ ...formData, course_id: '' }); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scopeType === 'book' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                  >
                    Book Batch
                  </button>
                </div>
                {scopeType === 'course' ? (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">कोर्स चुनें</label>
                    <select 
                      required
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="">कोर्स का चयन करें...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">पुस्तक चुनें</label>
                    <select 
                      required
                      value={formData.book_id}
                      onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    >
                      <option value="">पुस्तक का चयन करें...</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>{b.title} ({b.id})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">Batch Name (EN)</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Batch 1 - June"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-orange-500/70 mb-1.5">बैच का नाम (HI)</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name_hi}
                      onChange={(e) => setFormData({ ...formData, name_hi: e.target.value })}
                      placeholder="जैसे: प्रथम बैच - जून"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">प्रारंभ तिथि</label>
                    <input 
                      type="date" 
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">समाप्ति तिथि</label>
                    <input 
                      type="date" 
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">क्लास शुरू (Start)</label>
                    <input 
                      type="time" 
                      value={formData.class_start_time}
                      onChange={(e) => setFormData({ ...formData, class_start_time: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">क्लास खत्म (End)</label>
                    <input 
                      type="time" 
                      value={formData.class_end_time}
                      onChange={(e) => setFormData({ ...formData, class_end_time: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1.5">स्टेटस</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-2">क्लास के दिन (Days)</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => {
                      const isSelected = formData.class_days.split(',').includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const days = formData.class_days ? formData.class_days.split(',') : [];
                            const newDays = days.includes(day.value)
                              ? days.filter(d => d !== day.value)
                              : [...days, day.value];
                            setFormData({ ...formData, class_days: newDays.filter(Boolean).join(',') });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                            isSelected 
                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-violet-200">Live Class Per-Class Pricing</h3>
                    <p className="text-xs text-neutral-400 mt-1">Har live class join par student ke wallet se itna charge hoga.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Per Class Charge (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={formData.cost_per_class_rupees || 0}
                        onChange={(e) => setFormData({ ...formData, cost_per_class_rupees: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                      <p className="mt-1 text-[11px] text-neutral-500">Join karte hi itne paise wallet se kattenge. Baad mein duration ke hisaab se reconcile hoga.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">No-Show Charge (₹)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={formData.no_show_charge_rupees ?? 2}
                        onChange={(e) => setFormData({ ...formData, no_show_charge_rupees: parseFloat(e.target.value) ?? 2 })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                      <p className="mt-1 text-[11px] text-neutral-500">Jo enrolled student class join nahi karta, usse itna charge hoga.</p>
                    </div>
                    </div>
                  </div>
                </div>

                {!editingBatch && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-4">
                    <label className="flex items-start gap-3 text-sm font-bold text-neutral-100">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.send_announcement_email)}
                        onChange={(e) => setFormData({ ...formData, send_announcement_email: e.target.checked })}
                        className="mt-1 h-5 w-5 accent-emerald-500"
                      />
                      <span>
                        Email announcement bhejna hai
                        <span className="block text-xs font-medium text-neutral-400">Naya batch create hote hi subscribers/students ko email jayega.</span>
                      </span>
                    </label>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Audience</label>
                      <select
                        value={formData.announcement_audience}
                        onChange={(e) => setFormData({ ...formData, announcement_audience: e.target.value })}
                        className="mt-2 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                      >
                        <option value="both">Subscribers + Students</option>
                        <option value="subscribers">Only Subscribers</option>
                        <option value="students">Only Students</option>
                      </select>
                    </div>
                  </div>
                )}

                {!editingBatch && (
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 space-y-4">
                    <label className="flex items-start gap-3 text-sm font-bold text-neutral-100">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.auto_post_social)}
                        onChange={(e) => setFormData({ ...formData, auto_post_social: e.target.checked })}
                        className="mt-1 h-5 w-5 accent-blue-500"
                      />
                      <span>
                        Social media par auto post
                        <span className="block text-xs font-medium text-neutral-400">Facebook/Instagram default; LinkedIn, Telegram aur X bhi configured secrets se supported hain.</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['facebook', 'instagram', 'linkedin', 'telegram', 'x'].map(platform => {
                        const selected = formData.social_platforms.includes(platform);
                        return (
                          <label key={platform} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold capitalize ${selected ? 'border-blue-500/60 bg-blue-500/10 text-blue-200' : 'border-neutral-800 bg-neutral-950 text-neutral-500'}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...formData.social_platforms, platform]
                                  : formData.social_platforms.filter(p => p !== platform);
                                setFormData({ ...formData, social_platforms: next });
                              }}
                              className="accent-blue-500"
                            />
                            {platform === 'x' ? 'X/Twitter' : platform}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {editingBatch && (
                  <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                    <input
                      type="checkbox"
                      id="send_email_check"
                      checked={formData.send_update_email}
                      onChange={(e) => setFormData({ ...formData, send_update_email: e.target.checked })}
                      className="w-5 h-5 rounded border-neutral-700 text-orange-600 focus:ring-orange-500 bg-neutral-900"
                    />
                    <label htmlFor="send_email_check" className="text-sm font-medium text-neutral-300 select-none">
                      छात्रों को अपडेट का ईमेल भेजें? (Send update email to students?)
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl transition-all"
                  >
                    रद्द करें
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
                  >
                    {editingBatch ? 'अपडेट करें' : 'बनाएं'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Batch Details Sheet */}
        {isDetailsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedBatchForDetails?.name}</h2>
                  <p className="text-neutral-500 text-sm font-medium">{selectedBatchForDetails?.course_title}</p>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 flex-1">
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-1">Schedule</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                       <Clock className="w-4 h-4 text-orange-400" />
                       {selectedBatchForDetails?.class_start_time} - {selectedBatchForDetails?.class_end_time}
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-1">Days</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-orange-400" />
                       {selectedBatchForDetails?.class_days || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Add Student Form */}
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-6">
                  <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> छात्र जोड़ें (Add Student)
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Student Email or ID..." 
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/50 text-white"
                      value={newStudentInput}
                      onChange={(e) => setNewStudentInput(e.target.value)}
                    />
                    <button 
                      onClick={handleAddStudentToBatch}
                      disabled={isAddingStudent || !newStudentInput}
                      className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    >
                      {isAddingStudent ? '...' : 'Add'}
                    </button>
                  </div>
                </div>

                {/* Students List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-orange-400" />
                       नामांकित छात्र ({batchStudents.length})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {loadingStudents ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                      ))
                    ) : batchStudents.length === 0 ? (
                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-neutral-500 italic">
                        इस बैच में अभी कोई छात्र नामांकित नहीं है।
                      </div>
                    ) : (
                      batchStudents.map(student => (
                        <div key={student.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between group hover:border-orange-500/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 font-black">
                              {(student.full_name || "U").charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white">
                                {student.full_name || "Unknown"}
                              </div>
                              <div className="text-xs text-neutral-500 font-medium">
                                {student.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                               {student.progress}%
                             </div>
                             <div className="text-[9px] text-neutral-600 mt-1 uppercase tracking-tighter">
                               {formatLocalDate(student.purchased_at)}
                             </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
