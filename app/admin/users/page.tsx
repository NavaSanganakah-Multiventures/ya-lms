'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit2, X, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const fetchUsers = () => {
    setIsLoading(true);
    fetch('/api/admin/users')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.users) setUsers(data.users);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [router]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert("Failed to update user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && users.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">उपयोगकर्ता प्रबंधन (User Management)</h1>
          <p className="text-neutral-400 mt-2 text-sm">प्लेटफ़ॉर्म में सभी पंजीकृत उपयोगकर्ताओं को देखें और प्रबंधित करें।</p>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-8 py-5">स्टूडेंट आईडी (ID)</th>
                <th className="px-8 py-5">नाम एवं ईमेल</th>
                <th className="px-8 py-5">भूमिका (Role)</th>
                <th className="px-8 py-5 text-right">रजिस्ट्रेशन तिथि</th>
                <th className="px-8 py-5 text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <span className="font-mono text-sm text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                      {user.id}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm text-white font-bold tracking-tight">{user.full_name || 'Anonymous Student'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{user.email}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border ${
                      user.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      user.role === 'teacher' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-neutral-400 font-medium text-right">
                    {new Date(user.created_at).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center">
                       <button 
                         onClick={() => setEditingUser(user)}
                         className="p-2.5 bg-neutral-800 hover:bg-indigo-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-neutral-500 italic">
                    कोई उपयोगकर्ता नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                उपयोगकर्ता संपादित करें
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">नाम (Full Name)</label>
                <input 
                  type="text" 
                  value={editingUser.full_name || ''}
                  onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">भूमिका (Role)</label>
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="student">Student (छात्र)</option>
                  <option value="teacher">Teacher (शिक्षक)</option>
                  <option value="admin">Admin (एडमिन)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
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
