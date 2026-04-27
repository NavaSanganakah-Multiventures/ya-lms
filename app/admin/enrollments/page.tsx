'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, Trash2, Search, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [search, setSearch] = useState('');
  const [newAssignment, setNewAssignment] = useState({
    user_id: '',
    course_id: '',
    status: 'active'
  });
  const router = useRouter();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/enrollments'),
      fetch('/api/admin/users'),
      fetch('/api/admin/courses')
    ]).then(async ([enRes, userRes, courseRes]) => {
      if (enRes.status === 401 || enRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const enData = await enRes.json();
      const userData = await userRes.json();
      const courseData = await courseRes.json();
      if (enData.enrollments) setEnrollments(enData.enrollments);
      if (userData.users) setUsers(userData.users);
      if (courseData.courses) setCourses(courseData.courses);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.user_id || !newAssignment.course_id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      });
      if (res.ok) {
        setShowAssignModal(false);
        setNewAssignment({ user_id: '', course_id: '', status: 'active' });
        fetchData();
      } else {
        alert("Failed to assign course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeassign = async (id: string) => {
    if (!confirm("Are you sure you want to remove this enrollment?")) return;
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert("Failed to remove enrollment");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEnrollments = enrollments.filter(e => 
    e.user_email?.toLowerCase().includes(search.toLowerCase()) || 
    e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.course_title?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && enrollments.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">नामांकन प्रबंधन (Enrollments)</h1>
          <p className="text-neutral-400 mt-2 text-sm">विद्यार्थियों को कोर्स असाइन करें और उनके नामांकन प्रबंधित करें।</p>
        </div>
        <button 
          onClick={() => setShowAssignModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <UserPlus className="w-5 h-5" />
          कोर्स असाइन करें
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input 
          type="text" 
          placeholder="विद्यार्थी या कोर्स खोजें..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
        />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-950/50 border-b border-neutral-800 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-5">विद्यार्थी (Student)</th>
                <th className="px-8 py-5">कोर्स (Course)</th>
                <th className="px-8 py-5">स्थिति</th>
                <th className="px-8 py-5 text-right">नामांकन तिथि</th>
                <th className="px-8 py-5 text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredEnrollments.map((en) => (
                <tr key={en.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                          <GraduationCap className="w-4 h-4" />
                       </div>
                       <div>
                          <div className="text-sm font-bold text-white">{en.user_name || 'Anonymous'}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">{en.user_email}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       <BookOpen className="w-3 h-3 text-neutral-500" />
                       <span className="text-sm text-neutral-300 font-medium">{en.course_title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                      en.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {en.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right text-xs text-neutral-500">
                    {new Date(en.purchased_at).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => handleDeassign(en.id)}
                      className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEnrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-neutral-500 italic">
                    कोई नामांकन नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/30">
               <div>
                  <h3 className="text-2xl font-black text-white">कोर्स असाइन करें</h3>
                  <p className="text-xs text-neutral-500 mt-1">विद्यार्थी को मैन्युअल रूप से कोर्स में जोड़ें</p>
               </div>
               <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors">
                  <Trash2 className="w-5 h-5 rotate-45" />
               </button>
            </div>
            <form onSubmit={handleAssign} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">विद्यार्थी चुनें (Select Student)</label>
                <select 
                  required
                  value={newAssignment.user_id}
                  onChange={e => setNewAssignment({...newAssignment, user_id: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                >
                  <option value="">विद्यार्थी चुनें...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">कोर्स चुनें (Select Course)</label>
                <select 
                  required
                  value={newAssignment.course_id}
                  onChange={e => setNewAssignment({...newAssignment, course_id: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                >
                  <option value="">कोर्स चुनें...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-4 border border-neutral-800 text-neutral-500 hover:text-white rounded-2xl font-black transition-all"
                >
                  रद्द करें
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-white text-black hover:bg-neutral-200 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'असाइन करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
