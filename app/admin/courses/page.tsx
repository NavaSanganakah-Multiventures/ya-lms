'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Sparkles, X, BookOpen, User, DollarSign, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import AdminAI from '@/components/AdminAI';
import { AnimatePresence } from 'motion/react';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAdminAIOpen, setIsAdminAIOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    price: 0,
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
      // For now, we take teacher_id as the admin's ID if not provided
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourse,
          price: Math.round(newCourse.price * 100) // Convert to cents
        })
      });

      if (res.ok) {
        setShowModal(false);
        setNewCourse({ title: '', description: '', price: 0, teacher_id: '', category_id: '' });
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

  if (isLoading && courses.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">पाठ्यक्रम प्रबंधन</h1>
          <p className="text-neutral-400 mt-2 text-sm">सभी पाठ्यक्रमों बनाएं, संपादित करें और प्रबंधित करें।</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => router.push('/admin/categories')}
             className="inline-flex py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-all items-center gap-2 border border-neutral-700"
           >
             श्रेणियाँ प्रबंधित करें
           </button>
           <button 
             onClick={() => setShowModal(true)}
             className="inline-flex py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all items-center gap-2 shadow-lg shadow-indigo-500/20"
           >
             <Plus className="w-4 h-4" />
             पाठ्यक्रम जोड़ें
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
                <th className="px-6 py-4 font-medium text-right">मूल्य</th>
                <th className="px-6 py-4 font-medium text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => router.push(`/admin/course?id=${course.id}`)}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-neutral-200">{course.title}</div>
                    <div className="text-xs text-neutral-500 mt-1 line-clamp-1 max-w-xs">{course.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs rounded-lg border border-indigo-500/20">
                      {course.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-400">
                    {course.teacher_email?.split('@')[0] || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-indigo-400 text-right">
                    {formatPrice(course.price)}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button className="text-xs font-semibold text-indigo-400 hover:text-white px-3 py-1.5 border border-indigo-500/30 rounded-md hover:bg-indigo-600/30 transition-colors">
                        Manage
                     </button>
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

      <button 
        onClick={() => setIsAdminAIOpen(true)}
        className="fixed bottom-8 right-8 bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 group transition-all hover:scale-105 z-40"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="font-bold hidden sm:inline">Admin AI</span>
      </button>

      <AnimatePresence>
        {isAdminAIOpen && (
          <AdminAI isOpen={isAdminAIOpen} onClose={() => setIsAdminAIOpen(false)} />
        )}
      </AnimatePresence>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                नया पाठ्यक्रम बनाएँ
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> शीर्षक (Title)
                </label>
                <input 
                  required 
                  type="text" 
                  value={newCourse.title}
                  onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                  placeholder="उदा. एडवांस योग विज्ञान" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                   विवरण (Description)
                </label>
                <textarea 
                  required 
                  rows={3}
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  placeholder="पाठ्यक्रम के बारे में संक्षेप में बताएं" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    श्रेणी (Category)
                  </label>
                  <select 
                    value={newCourse.category_id}
                    onChange={e => setNewCourse({...newCourse, category_id: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
                  >
                    <option value="">कोई श्रेणी नहीं (No Category)</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> मूल्य (Price in $)
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="0.01"
                    value={newCourse.price}
                    onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value)})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> टीचर आईडी (Teacher ID)
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={newCourse.teacher_id}
                    onChange={e => setNewCourse({...newCourse, teacher_id: e.target.value})}
                    placeholder="शिक्षक की ID डालें" 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl font-bold transition-all"
                >
                  रद्द करें
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'पाठ्यक्रम सहेजें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
