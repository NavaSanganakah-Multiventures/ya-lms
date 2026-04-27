'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Calendar, Clock, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Batch {
  id: string;
  course_id: string;
  course_title: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface Course {
  id: string;
  title: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    course_id: '',
    name: '',
    start_date: '',
    end_date: '',
    status: 'upcoming'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, coursesRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/admin/courses')
      ]);
      const batchesData = await batchesRes.json() as any;
      const coursesData = await coursesRes.json() as any;
      setBatches(batchesData.batches || []);
      setCourses(coursesData.courses || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBatch ? `/api/admin/batches/${editingBatch.id}` : '/api/admin/batches';
    const method = editingBatch ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingBatch(null);
        setFormData({ course_id: '', name: '', start_date: '', end_date: '', status: 'upcoming' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save batch:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      course_id: batch.course_id,
      name: batch.name,
      start_date: batch.start_date ? batch.start_date.split('T')[0] : '',
      end_date: batch.end_date ? batch.end_date.split('T')[0] : '',
      status: batch.status
    });
    setIsModalOpen(true);
  };

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.course_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          onClick={() => { setEditingBatch(null); setFormData({ course_id: '', name: '', start_date: '', end_date: '', status: 'upcoming' }); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
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
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <select className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/50">
            <option>सभी स्टेटस</option>
            <option>Upcoming</option>
            <option>Ongoing</option>
            <option>Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-8 py-5">बैच विवरण</th>
                <th className="px-8 py-5">कोर्स</th>
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
                <tr key={batch.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight">{batch.name}</div>
                    <div className="text-[10px] font-mono text-indigo-400/80 mt-1.5 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 w-fit">
                      ID: {batch.id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm text-neutral-200 font-bold tracking-tight">{batch.course_title}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-1">CID: {batch.course_id}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs text-neutral-300 flex items-center gap-2 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      {batch.start_date ? new Date(batch.start_date).toLocaleDateString('hi-IN') : 'N/A'}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1.5 flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5" />
                       Ends: {batch.end_date ? new Date(batch.end_date).toLocaleDateString('hi-IN') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      batch.status === 'ongoing' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      batch.status === 'upcoming' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 
                      'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                    }`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(batch)}
                        className="p-2.5 bg-neutral-800 hover:bg-indigo-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(batch.id)}
                        className="p-2.5 bg-neutral-800 hover:bg-rose-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
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
              className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">
                {editingBatch ? 'बैच संपादित करें' : 'नया बैच जोड़ें'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1.5">कोर्स चुनें</label>
                  <select 
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">कोर्स का चयन करें...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1.5">बैच का नाम</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="जैसे: Batch 1 - June 2024"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">प्रारंभ तिथि</label>
                    <input 
                      type="date" 
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-400 mb-1.5">समाप्ति तिथि</label>
                    <input 
                      type="date" 
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1.5">स्टेटस</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
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
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    {editingBatch ? 'अपडेट करें' : 'बनाएं'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
