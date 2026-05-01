'use client';

import { useEffect, useState } from 'react';
import { Loader2, Edit2, X, Save, Trash2, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'student' });
  const [selectedBatchId, setSelectedBatchId] = useState('');

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
    fetch('/api/admin/batches')
      .then(res => res.json())
      .then((data: any) => setBatches(data.batches || []));
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

  const handleInitiateDelete = async (user: any) => {
    setUserToDelete(user);
    setOtpSent(false);
    setOtp('');
    // Trigger OTP
    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) {
        setOtpSent(true);
      } else {
        alert("Failed to send OTP to Admin email");
        setUserToDelete(null);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending OTP");
      setUserToDelete(null);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return alert("OTP is required");
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      if (res.ok) {
        setUserToDelete(null);
        fetchUsers();
      } else {
        const data = await res.json() as any;
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', full_name: '', role: 'student' });
        fetchUsers();
      } else {
        const data = await res.json() as any;
        alert(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollInBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: showEnrollModal.id })
      });
      if (res.ok) {
        setShowEnrollModal(null);
        setSelectedBatchId('');
        alert("Student enrolled successfully!");
      } else {
        const data = await res.json() as any;
        alert(data.error || "Failed to enroll student");
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
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" /> नया यूजर जोड़ें
        </button>
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
                    <div className="flex justify-center gap-2">
                       {user.role !== 'admin' && (
                         <button 
                           onClick={() => setShowEnrollModal(user)}
                           className="p-2.5 bg-neutral-800 hover:bg-emerald-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                           title="Enroll in Batch"
                         >
                            <Loader2 className="w-4 h-4" />
                         </button>
                       )}
                       {user.role !== 'admin' && (
                         <button 
                           onClick={() => setEditingUser(user)}
                           className="p-2.5 bg-neutral-800 hover:bg-indigo-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         >
                            <Edit2 className="w-4 h-4" />
                         </button>
                       )}
                       {user.role !== 'admin' && (
                         <button 
                           onClick={() => handleInitiateDelete(user)}
                           className="p-2.5 bg-neutral-800 hover:bg-rose-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                       )}
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

      {userToDelete && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-rose-500/10">
              <h3 className="text-xl font-bold text-rose-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> उपयोगकर्ता हटाएं
              </h3>
              <button onClick={() => setUserToDelete(null)} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmDelete} className="p-8 space-y-6">
              <div className="bg-rose-500/10 text-rose-400 p-4 rounded-xl border border-rose-500/20 text-sm leading-relaxed mb-4">
                <strong>चेतावनी:</strong> आप <strong>{userToDelete.full_name || userToDelete.email}</strong> का खाता हटाने जा रहे हैं। यह एक अपूरणीय क्रिया (irreversible action) है। इससे उनका सभी डेटा, कोर्स और प्रोग्रेस हटा दिया जाएगा।
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> एडमिन OTP (Admin Verification)
                </label>
                {otpSent ? (
                   <p className="text-xs text-indigo-400 mb-2">✅ आपके एडमिन ईमेल पर 6 अंकों का OTP भेजा गया है।</p>
                ) : (
                   <p className="text-xs text-neutral-500 mb-2">Sending OTP to your admin email...</p>
                )}
                <input 
                  type="text" 
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  disabled={!otpSent}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none text-center font-mono tracking-widest text-xl disabled:opacity-50" 
                  required
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button 
                  type="submit" 
                  disabled={isDeleting || !otpSent || !otp}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-4 h-4" /> हटाएं</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-indigo-600/10">
              <h3 className="text-xl font-bold text-white">नया यूजर जोड़ें</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">नाम (Full Name)</label>
                <input type="text" required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">ईमेल (Email)</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">पासवर्ड (Password)</label>
                <input type="text" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">भूमिका (Role)</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-neutral-800 text-neutral-400 rounded-xl font-bold">रद्द करें</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50">बनाएं</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-emerald-600/10">
              <h3 className="text-xl font-bold text-white">बैच में नामांकन (Enroll in Batch)</h3>
              <button onClick={() => setShowEnrollModal(null)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEnrollInBatch} className="p-8 space-y-6">
              <p className="text-sm text-neutral-400"><strong>{showEnrollModal.full_name}</strong> को किस बैच में जोड़ना चाहते हैं?</p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">बैच चुनें (Select Batch)</label>
                <select 
                  required
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">बैच का चयन करें...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.course_title})</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowEnrollModal(null)} className="flex-1 py-3 border border-neutral-800 text-neutral-400 rounded-xl font-bold">रद्द करें</button>
                <button type="submit" disabled={isSubmitting || !selectedBatchId} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">नामांकित करें</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
