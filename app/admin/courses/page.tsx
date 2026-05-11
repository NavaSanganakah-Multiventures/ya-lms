'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Sparkles, X, BookOpen, User, DollarSign, FileText, Edit2, Trash2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { AnimatePresence } from 'motion/react';
import ContentAI from '@/components/ContentAI';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'seo'>('basic');
  const [newCourse, setNewCourse] = useState({
    title: '',
    title_hi: '',
    description: '',
    description_hi: '',
    price_inr: 0,
    price_usd: 0,
    teacher_id: '',
    category_id: '',
    self_study_enabled: false,
    self_study_credit_cost: 0,
    self_study_only: false,
    individual_class_booking_enabled: false,
    individual_class_credit_cost: 0,
    individual_class_duration_minutes: 30,
    seo_title_en: '',
    seo_title_hi: '',
    seo_description_en: '',
    seo_description_hi: '',
    seo_keywords_en: '',
    seo_keywords_hi: ''
  });
  const router = useRouter();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/categories'),
      fetch('/api/auth/me'),
      fetch('/api/admin/users')
    ]).then(async ([courseRes, catRes, userRes, usersRes]) => {
      if (courseRes.status === 401 || courseRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const courseData = await courseRes.json() as any;
      const catData = await catRes.json() as any;
      const userData = await userRes.json() as any;
      
      if (courseData && courseData.courses) setCourses(courseData.courses);
      if (catData && catData.categories) setCategories(catData.categories);
      if (userData && userData.user) {
        setCurrentUser(userData.user);
        // Pre-fill teacher_id if user is found
        setNewCourse(prev => ({ ...prev, teacher_id: userData.user.id }));
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json() as any;
        if (usersData && usersData.users) {
          setTeachers(usersData.users.filter((u: any) => u.role === 'teacher' || u.role === 'admin'));
        }
      }

      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    const doFetch = () => fetchData();
    doFetch();
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
        setNewCourse({ 
          title: '', 
          title_hi: '',
          description: '', 
          description_hi: '',
          price_inr: 0, 
          price_usd: 0, 
          teacher_id: currentUser?.id || '', 
          category_id: '',
          self_study_enabled: false,
          self_study_credit_cost: 0,
          self_study_only: false,
          individual_class_booking_enabled: false,
          individual_class_credit_cost: 0,
          individual_class_duration_minutes: 30,
          seo_title_en: '',
          seo_title_hi: '',
          seo_description_en: '',
          seo_description_hi: '',
          seo_keywords_en: '',
          seo_keywords_hi: ''
        });
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

  if (isLoading && courses.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

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
             onClick={() => { setShowModal(true); setActiveTab('basic'); }}
             className="inline-flex py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all items-center gap-2 shadow-lg shadow-orange-500/20"
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
              <tr className="bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-8 py-5">कोर्स आईडी एवं शीर्षक</th>
                <th className="px-8 py-5">विवरण</th>
                <th className="px-8 py-5 text-right">INR / USD मूल्य</th>
                <th className="px-8 py-5 text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5" onClick={() => router.push(`/admin/course?id=${course.id}`)}>
                    <div className="text-sm font-black text-white group-hover:text-orange-400 transition-colors tracking-tight">{course.title}</div>
                    <div className="text-[10px] font-mono text-orange-400 mt-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 w-fit">
                      ID: {course.id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[9px] uppercase font-bold rounded border border-neutral-700">
                          {course.category_name || 'Uncategorized'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-medium italic">
                          By: {course.teacher_email || 'Staff'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 line-clamp-1 max-w-xs">{course.description}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="text-sm font-bold text-emerald-400">₹{course.price_inr?.toLocaleString() || '0'}</div>
                    <div className="text-[10px] font-medium text-orange-400 mt-1">${course.price_usd || '0'}</div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setEditingCourse({...course}); setActiveTab('basic'); }}
                         className="p-2.5 bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                         className="p-2.5 bg-neutral-800 hover:bg-pink-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
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

      {(showModal || editingCourse) && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                {editingCourse ? 'पाठ्यक्रम संपादित करें' : 'नया पाठ्यक्रम बनाएँ'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingCourse(null); }} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-800/30 p-4 border-b border-neutral-800 flex items-center justify-between">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Bilingual Content AI
              </p>
              <ContentAI 
                context="course"
                initialData={{
                  title_en: editingCourse ? editingCourse.title : newCourse.title,
                  description_en: editingCourse ? editingCourse.description : newCourse.description
                }}
                onApply={(data) => {
                  if (editingCourse) {
                    setEditingCourse({ ...editingCourse, ...data });
                  } else {
                    setNewCourse({ ...newCourse, ...data });
                  }
                }}
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/30">
               <button 
                 onClick={() => setActiveTab('basic')}
                 className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'basic' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                 बेसिक जानकारी (Basic)
               </button>
               <button 
                 onClick={() => setActiveTab('seo')}
                 className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'seo' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                 SEO सेटिंग्स (Search)
               </button>
            </div>

            <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'basic' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                        English Title
                      </label>
                      <input 
                        required 
                        type="text" 
                        value={editingCourse ? editingCourse.title : newCourse.title}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, title: e.target.value}) : setNewCourse({...newCourse, title: e.target.value})}
                        placeholder="e.g. Vedic Astrology Basics"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-orange-500/70 uppercase tracking-widest flex items-center gap-2">
                        Hindi शीर्षक
                      </label>
                      <input 
                        required 
                        type="text" 
                        value={editingCourse ? editingCourse.title_hi : newCourse.title_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, title_hi: e.target.value}) : setNewCourse({...newCourse, title_hi: e.target.value})}
                        placeholder="जैसे: वैदिक ज्योतिष के मूल सिद्धांत"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">English Description</label>
                      <textarea 
                        required 
                        rows={3}
                        value={editingCourse ? editingCourse.description : newCourse.description}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, description: e.target.value}) : setNewCourse({...newCourse, description: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-orange-500/70 uppercase tracking-widest">Hindi विवरण</label>
                      <textarea 
                        required 
                        rows={3}
                        value={editingCourse ? editingCourse.description_hi : newCourse.description_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, description_hi: e.target.value}) : setNewCourse({...newCourse, description_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none resize-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-neutral-400">श्रेणी (Category)</label>
                      <select 
                        value={editingCourse ? editingCourse.category_id : newCourse.category_id}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, category_id: e.target.value}) : setNewCourse({...newCourse, category_id: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
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
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
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
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>

                    <div className="col-span-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-violet-200">Self Study Credit Mode</h3>
                        <p className="text-xs text-neutral-400 mt-1">Is course ko credit-based self-study flow me chalane ke liye settings.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.self_study_enabled : newCourse.self_study_enabled)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_enabled: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, self_study_enabled: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          Self Study चालू करें
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.self_study_only : newCourse.self_study_only)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_only: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, self_study_only: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          केवल Self Study plans
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Course unlock credits</label>
                          <input
                            type="number"
                            min={0}
                            value={editingCourse ? (editingCourse.self_study_credit_cost || 0) : newCourse.self_study_credit_cost}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_credit_cost: parseInt(e.target.value) || 0}) : setNewCourse({...newCourse, self_study_credit_cost: parseInt(e.target.value) || 0})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.individual_class_booking_enabled : newCourse.individual_class_booking_enabled)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_booking_enabled: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, individual_class_booking_enabled: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          Individual booking
                        </label>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Individual credits</label>
                          <input
                            type="number"
                            min={0}
                            value={editingCourse ? (editingCourse.individual_class_credit_cost || 0) : newCourse.individual_class_credit_cost}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_credit_cost: parseInt(e.target.value) || 0}) : setNewCourse({...newCourse, individual_class_credit_cost: parseInt(e.target.value) || 0})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Duration min</label>
                          <input
                            type="number"
                            min={1}
                            value={editingCourse ? (editingCourse.individual_class_duration_minutes || 30) : newCourse.individual_class_duration_minutes}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_duration_minutes: parseInt(e.target.value) || 30}) : setNewCourse({...newCourse, individual_class_duration_minutes: parseInt(e.target.value) || 30})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                          <User className="w-4 h-4" /> शिक्षक (Teacher)
                        </label>
                        <select
                          value={editingCourse ? editingCourse.teacher_id : newCourse.teacher_id}
                          onChange={e => editingCourse ? setEditingCourse({...editingCourse, teacher_id: e.target.value}) : setNewCourse({...newCourse, teacher_id: e.target.value})}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                          required
                        >
                          <option value="">शिक्षक चुनें</option>
                          {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.full_name || teacher.email} ({teacher.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* English SEO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="w-8 h-px bg-neutral-800" />
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">English SEO</span>
                       <span className="flex-1 h-px bg-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Title</label>
                      <input 
                        type="text" 
                        value={editingCourse ? editingCourse.seo_title_en : newCourse.seo_title_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_title_en: e.target.value}) : setNewCourse({...newCourse, seo_title_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g. Learn Vedic Astrology Online"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Description</label>
                      <textarea 
                        rows={2}
                        value={editingCourse ? editingCourse.seo_description_en : newCourse.seo_description_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_description_en: e.target.value}) : setNewCourse({...newCourse, seo_description_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Keywords</label>
                      <input 
                        type="text" 
                        value={editingCourse ? editingCourse.seo_keywords_en : newCourse.seo_keywords_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_keywords_en: e.target.value}) : setNewCourse({...newCourse, seo_keywords_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="comma, separated, keywords"
                      />
                    </div>
                  </div>

                  {/* Hindi SEO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="w-8 h-px bg-neutral-800" />
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Hindi SEO</span>
                       <span className="flex-1 h-px bg-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO शीर्षक</label>
                      <input 
                        type="text" 
                        value={editingCourse ? editingCourse.seo_title_hi : newCourse.seo_title_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_title_hi: e.target.value}) : setNewCourse({...newCourse, seo_title_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="जैसे: ऑनलाइन वैदिक ज्योतिष सीखें"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO विवरण</label>
                      <textarea 
                        rows={2}
                        value={editingCourse ? editingCourse.seo_description_hi : newCourse.seo_description_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_description_hi: e.target.value}) : setNewCourse({...newCourse, seo_description_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO कीवर्ड</label>
                      <input 
                        type="text" 
                        value={editingCourse ? editingCourse.seo_keywords_hi : newCourse.seo_keywords_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_keywords_hi: e.target.value}) : setNewCourse({...newCourse, seo_keywords_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20"
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
