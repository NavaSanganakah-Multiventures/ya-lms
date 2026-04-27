'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Sparkles, X, BookOpen, User, DollarSign, FileText, Edit2, Trash2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { AnimatePresence } from 'motion/react';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price_inr: 0,
    price_usd: 0,
    teacher_id: '',
    category_id: ''
  });
  const router = useRouter();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/categories')
    ]).then(async ([courseRes, catRes]) => {
      if (courseRes.status === 401 || courseRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const courseData = await courseRes.json() as any;
      const catData = await catRes.json() as any;
      if (courseData && courseData.courses) setCourses(courseData.courses);
      if (catData && catData.categories) setCategories(catData.categories);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });

      if (res.ok) {
        setShowModal(false);
        setNewCourse({ title: '', description: '', price_inr: 0, price_usd: 0, teacher_id: '', category_id: '' });
        fetchData();
      } else {
        alert("Failed to create course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCourse)
      });
      if (res.ok) {
        setEditingCourse(null);
        fetchData();
      } else {
        alert("Failed to update course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert("Failed to delete course");
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && courses.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">पाठ्यक्रम प्रबंधन (Courses)</h1>
          <p className="text-neutral-400 mt-2 text-sm">सभी पाठ्यक्रमों बनाएं, संपादित करें और प्रबंधित करें।</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => router.push('/admin/categories')}
             className="inline-flex py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-all items-center gap-2 border border-neutral-700"
           >
             श्रेणियाँ
           </button>
           <button 
             onClick={() => setShowModal(true)}
             className="inline-flex py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all items-center gap-2 shadow-lg shadow-indigo-500/20"
           >
             <Plus className="w-4 h-4" />
             नया पाठ्यक्रम
           </button>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/50 text-neutral-400 text-sm font-medium border-b border-neutral-800">
                <th className="px-6 py-4 font-medium">शीर्षक</th>
                <th className="px-6 py-4 font-medium">श्रेणी</th>
                <th className="px-6 py-4 font-medium">शिक्षक</th>
                <th className="px-6 py-4 font-medium text-right">INR मूल्य</th>
                <th className="px-6 py-4 font-medium text-right">USD मूल्य</th>
                <th className="px-6 py-4 font-medium text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4" onClick={() => router.push(`/admin/course?id=${course.id}`)}>
                    <div className="text-sm font-medium text-neutral-200 group-hover:text-indigo-400 transition-colors">{course.title}</div>
                    <div className="text-xs text-neutral-500 mt-1 line-clamp-1 max-w-xs">{course.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold rounded-lg border border-indigo-500/20">
                      {course.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400">
                    {course.teacher_email?.split('@')[0] || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-emerald-400 text-right">
                    ₹{course.price_inr?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-indigo-400 text-right">
                    ${course.price_usd || '0'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setEditingCourse({...course}); }}
                         className="p-2 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-all"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                         className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    कोई पाठ्यक्रम नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin AI has been moved to global AdminLayout for consistency */}

      {(showModal || editingCourse) && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                {editingCourse ? 'पाठ्यक्रम संपादित करें' : 'नया पाठ्यक्रम बनाएँ'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingCourse(null); }} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> शीर्षक (Title)
                </label>
                <input 
                  required 
                  type="text" 
                  value={editingCourse ? editingCourse.title : newCourse.title}
                  onChange={e => editingCourse ? setEditingCourse({...editingCourse, title: e.target.value}) : setNewCourse({...newCourse, title: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">विवरण (Description)</label>
                <textarea 
                  required 
                  rows={3}
                  value={editingCourse ? editingCourse.description : newCourse.description}
                  onChange={e => editingCourse ? setEditingCourse({...editingCourse, description: e.target.value}) : setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-semibold text-neutral-400">श्रेणी (Category)</label>
                  <select 
                    value={editingCourse ? editingCourse.category_id : newCourse.category_id}
                    onChange={e => editingCourse ? setEditingCourse({...editingCourse, category_id: e.target.value}) : setNewCourse({...newCourse, category_id: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  >
                    <option value="">कोई श्रेणी नहीं</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> INR मूल्य (₹)
                  </label>
                  <input 
                    required 
                    type="number" 
                    value={editingCourse ? editingCourse.price_inr : newCourse.price_inr}
                    onChange={e => editingCourse ? setEditingCourse({...editingCourse, price_inr: parseFloat(e.target.value)}) : setNewCourse({...newCourse, price_inr: parseFloat(e.target.value)})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> USD मूल्य ($)
                  </label>
                  <input 
                    required 
                    type="number" 
                    value={editingCourse ? editingCourse.price_usd : newCourse.price_usd}
                    onChange={e => editingCourse ? setEditingCourse({...editingCourse, price_usd: parseFloat(e.target.value)}) : setNewCourse({...newCourse, price_usd: parseFloat(e.target.value)})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> टीचर आईडी
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={editingCourse ? editingCourse.teacher_id : newCourse.teacher_id}
                    onChange={e => editingCourse ? setEditingCourse({...editingCourse, teacher_id: e.target.value}) : setNewCourse({...newCourse, teacher_id: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingCourse(null); }}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> सहेजें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
