'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Edit2, X, Save, Trash2, Key, Coins, CheckCircle2, Plus, UserPlus, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatLocalDate, toUTCForDB } from '@/lib/time';
import { useToast } from '@/contexts/ToastContext';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  birth_date: string | null;
  father_name: string | null;
  mother_name: string | null;
  grand_father_name: string | null;
  gender: string | null;
  bio: string | null;
  birth_place: string | null;
  pincode: string | null;
  created_at: string;
}

interface Batch {
  id: string;
  name: string;
  course_id: string;
  course_title: string;
}

interface Country {
  name: string;
  code: string;
}

interface StateProvince {
  name: string;
  code: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtp, setDeleteOtp] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [userToCredit, setUserToCredit] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(10);
  const [creditType, setCreditType] = useState('self_study');
  const [creditOtpSent, setCreditOtpSent] = useState(false);
  const [creditOtp, setCreditOtp] = useState('');
  const [viewingLedgerUser, setViewingLedgerUser] = useState<User | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'student', phone: '', district: '01', state: '', country: 'IN', birth_date: '', father_name: '', mother_name: '', grand_father_name: '', gender: '', bio: '', birth_place: '', pincode: '' });
  const [countriesList, setCountriesList] = useState<Country[]>([{ name: 'India', code: 'IN' }]);
  const [statesList, setStatesList] = useState<StateProvince[]>([{ name: 'Other', code: 'OT' }]);
  const { success: showSuccess, error: showError } = useToast();

  // BUG-09 fix: AbortController se countries fetch karo — memory leak prevent hoga
  useEffect(() => {
    const controller = new AbortController();
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const formatted = (data as any[]).map((c: any) => ({ name: c.name.common, code: c.cca2 })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountriesList(formatted);
      }).catch(err => {
        if (err?.name !== 'AbortError') console.error('Countries fetch failed:', err);
      });
    return () => controller.abort();
  }, []);

  // BUG-09 fix: AbortController se states fetch karo
  useEffect(() => {
    const selectedCountryObj = countriesList.find(c => c.code === newUser.country);
    if (!selectedCountryObj) return;

    const controller = new AbortController();
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: selectedCountryObj.name }),
      signal: controller.signal,
    })
    .then(res => res.json())
    .then((data: any) => {
      if (data && data.data && data.data.states && data.data.states.length > 0) {
        const formatted = data.data.states.map((s: any) => ({ name: s.name, code: s.state_code || s.name.substring(0, 2).toUpperCase() }));
        setStatesList(formatted);
        setNewUser(prev => {
          if (!formatted.find((s: any) => s.code === prev.district)) {
            return { ...prev, district: formatted[0].code };
          }
          return prev;
        });
      } else {
        setStatesList([{ name: 'Other', code: 'OT' }]);
        setNewUser(prev => ({...prev, district: 'OT'}));
      }
    }).catch(err => {
      if (err?.name !== 'AbortError') {
        setStatesList([{ name: 'Other', code: 'OT' }]);
        setNewUser(prev => ({...prev, district: 'OT'}));
      }
    });
    return () => controller.abort();
  }, [newUser.country, countriesList]);

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBatchCourseId, setSelectedBatchCourseId] = useState('');

  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(50);

  const router = useRouter();

  // BUG-08 fix: fetchUsers aur reloadUsers ek hi useCallback mein — duplicate code remove kiya
  const fetchUsers = useCallback((currentPage: number = 1) => {
    setIsLoading(true);
    fetch(`/api/admin/users?page=${currentPage}&limit=${limit}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.users) {
          setUsers(data.users);
          setTotalUsers(data.total || 0);
          setPage(data.page || 1);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(page);
      fetch('/api/admin/batches')
        .then(res => res.json())
        .then((data: any) => setBatches(data.batches || []));
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, page]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) {
        setEditingUser(null);
        showSuccess("User updated successfully!");
        fetchUsers();
      } else {
        showError("Failed to update user");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while updating the user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateCredit = async (user: User) => {
    setUserToCredit(user);
    setCreditOtpSent(false);
    setCreditOtp('');
    setCreditAmount(10);
    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) {
        setCreditOtpSent(true);
        showSuccess("OTP sent to your admin email.");
      } else {
        showError("Failed to send OTP to Admin email");
        setUserToCredit(null);
      }
    } catch (err) {
      console.error(err);
      showError("Error sending OTP");
      setUserToCredit(null);
    }
  };

  const handleConfirmCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToCredit) return;
    if (!creditOtp) {
      showError("OTP is required");
      return;
    }
    if (!creditAmount || creditAmount <= 0) {
      showError("Valid credit amount is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToCredit.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: creditOtp, amount: creditAmount, credit_type: creditType })
      });
      if (res.ok) {
        setUserToCredit(null);
        showSuccess("Credits added successfully");
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to add credits");
      }
    } catch (err) {
      console.error(err);
      showError("Error adding credits");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateDelete = async (user: User) => {
    setUserToDelete(user);
    setDeleteOtpSent(false);
    setDeleteOtp('');
    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) {
        setDeleteOtpSent(true);
        showSuccess("OTP sent to your admin email.");
      } else {
        showError("Failed to send OTP to Admin email");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while sending OTP");
    }
  };

  const handleViewLedger = async (user: User) => {
    setViewingLedgerUser(user);
    setIsLedgerLoading(true);
    try {
      const res = await fetch(`/api/credits/ledger?userId=${user.id}`);
      const data = await res.json() as any;
      if (res.ok) {
        setLedgerData(data.ledger || []);
      } else {
        showError("Failed to fetch ledger");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while fetching ledger");
    } finally {
      setIsLedgerLoading(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;
    if (!deleteOtp) {
      showError("OTP is required");
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: deleteOtp })
      });
      if (res.ok) {
        setUserToDelete(null);
        showSuccess("User deleted successfully!");
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while deleting the user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const submissionData = {
        ...newUser,
        birth_date: toUTCForDB(newUser.birth_date)
      };
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      if (res.ok) {
        setShowCreateModal(false);
        showSuccess("User created successfully!");
        setNewUser({ email: '', full_name: '', role: 'student', phone: '', district: '01', state: '', country: 'IN', birth_date: '', father_name: '', mother_name: '', grand_father_name: '', gender: '', bio: '', birth_place: '', pincode: '' });
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while creating the user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollInBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEnrollModal) return;
    if (!selectedBatchId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/batches/${selectedBatchId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: showEnrollModal.id, course_id: selectedBatchCourseId })
      });
      if (res.ok) {
        setShowEnrollModal(null);
        setSelectedBatchId('');
        setSelectedBatchCourseId('');
        showSuccess("Student enrolled successfully!");
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to enroll student");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while enrolling the student");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && users.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">उपयोगकर्ता प्रबंधन (User Management)</h1>
          <p className="text-neutral-400 mt-2 text-sm">प्लेटफ़ॉर्म में सभी पंजीकृत उपयोगकर्ताओं को देखें और प्रबंधित करें।</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2"
        >
           <Plus className="w-4 h-4" /> नया यूजर जोड़ें
        </button>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
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
                    <span className="font-mono text-sm text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
                      {user.id}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm text-white font-bold tracking-tight">{user.full_name || 'Anonymous Student'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{user.email}</div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border ${
                      user.role === 'admin' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                      user.role === 'teacher' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-neutral-400 font-medium text-right">
                    {formatLocalDate(user.created_at)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex justify-center gap-2">
                       {user.role !== 'admin' && (
                         <button 
                           onClick={() => setShowEnrollModal(user)}
                           className="p-2.5 bg-neutral-800 hover:bg-emerald-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                           title="Enroll in Batch"
                           aria-label={`Enroll ${user.full_name || 'user'} in batch`}
                         >
                             <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2.5 bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                             title="Edit User"
                             aria-label={`Edit ${user.full_name || 'user'}`}
                           >
                              <Edit2 className="w-4 h-4" />
                         </button>
                       )}
                       <button
                         onClick={() => handleInitiateCredit(user)}
                         className="p-2.5 bg-neutral-800 hover:bg-violet-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         title="Give Credits"
                         aria-label={`Give Credits to ${user.full_name || 'user'}`}
                       >
                          <Coins className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleViewLedger(user)}
                         className="p-2.5 bg-neutral-800 hover:bg-blue-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         title="View Ledger"
                         aria-label={`View ledger for ${user.full_name || 'user'}`}
                       >
                          <Activity className="w-4 h-4" />
                       </button>
                       {user.role !== 'admin' && (
                         <button 
                           onClick={() => handleInitiateDelete(user)}
                           className="p-2.5 bg-neutral-800 hover:bg-pink-600 text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                           title="Delete User"
                           aria-label={`Delete ${user.full_name || 'user'}`}
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

        {/* Mobile Card View */}
        <div className="block lg:hidden divide-y divide-white/5">
          {users.map((user) => (
            <div key={user.id} className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-base text-white font-bold tracking-tight">{user.full_name || 'Anonymous Student'}</div>
                  <div className="text-xs text-neutral-500 mt-1">{user.email}</div>
                  <div className="mt-2 text-xs text-neutral-500">
                    <span className="font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      ID: {user.id}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border ${
                  user.role === 'admin' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                  user.role === 'teacher' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="text-xs text-neutral-400">
                Joined: {formatLocalDate(user.created_at)}
              </div>
              <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2">
                 {user.role !== 'admin' && (
                   <button 
                     onClick={() => setShowEnrollModal(user)}
                     className="flex-1 min-w-[3rem] p-3 flex justify-center bg-neutral-800 hover:bg-emerald-600 text-neutral-400 hover:text-white rounded-xl transition-all active:scale-95"
                   >
                       <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                  {user.role !== 'admin' && (
                    <button 
                      onClick={() => setEditingUser(user)}
                      className="flex-1 min-w-[3rem] p-3 flex justify-center bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white rounded-xl transition-all active:scale-95"
                     >
                        <Edit2 className="w-4 h-4" />
                   </button>
                 )}
                 <button
                   onClick={() => handleInitiateCredit(user)}
                   className="flex-1 min-w-[3rem] p-3 flex justify-center bg-neutral-800 hover:bg-violet-600 text-neutral-400 hover:text-white rounded-xl transition-all active:scale-95"
                 >
                    <Coins className="w-4 h-4" />
                 </button>
                 <button
                   onClick={() => handleViewLedger(user)}
                   className="flex-1 min-w-[3rem] p-3 flex justify-center bg-neutral-800 hover:bg-blue-600 text-neutral-400 hover:text-white rounded-xl transition-all active:scale-95"
                 >
                    <Activity className="w-4 h-4" />
                 </button>
                 {user.role !== 'admin' && (
                   <button 
                     onClick={() => handleInitiateDelete(user)}
                     className="flex-1 min-w-[3rem] p-3 flex justify-center bg-neutral-800 hover:bg-pink-600 text-neutral-400 hover:text-white rounded-xl transition-all active:scale-95"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-8 text-center text-neutral-500 italic">
              कोई उपयोगकर्ता नहीं मिला।
            </div>
          )}
        </div>

        {/* Pagination UI Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-8 py-5 bg-white/[0.02] border-t border-white/5 gap-4">
          <div className="text-sm text-neutral-400">
            Showing <span className="text-white font-bold">{users.length}</span> of <span className="text-white font-bold">{totalUsers}</span> users
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
              Page {page} of {Math.ceil(totalUsers / limit) || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(totalUsers / limit), p + 1))}
              disabled={page >= Math.ceil(totalUsers / limit)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                उपयोगकर्ता संपादित करें
              </h3>
              <button onClick={() => setEditingUser(null)} aria-label="Close modal" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">भूमिका (Role)</label>
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
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
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> सहेजें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToCredit && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-violet-500/10">
              <h3 className="text-xl font-bold text-violet-500 flex items-center gap-2">
                <Coins className="w-5 h-5" /> क्रेडिट दें
              </h3>
              <button onClick={() => setUserToCredit(null)} aria-label="Close modal" className="p-2 hover:bg-violet-500/20 rounded-lg text-violet-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmCredit} className="p-8 space-y-6">
              <div className="bg-violet-500/10 text-violet-400 p-4 rounded-xl border border-violet-500/20 text-sm leading-relaxed mb-4">
                आप <strong>{userToCredit.full_name || userToCredit.email}</strong> को क्रेडिट देने जा रहे हैं।
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">Amount</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">Credit Type</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="self_study">Self Study Credits</option>
                  <option value="live_class">Live Class Credits</option>
                  <option value="ai">AI Credits</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> एडमिन OTP (Admin Verification)
                </label>
                {creditOtpSent ? (
                   <p className="text-xs text-orange-400 mb-2">✅ आपके एडमिन ईमेल पर 6 अंकों का OTP भेजा गया है।</p>
                ) : (
                   <p className="text-xs text-neutral-500 mb-2">Sending OTP to your admin email...</p>
                )}
                <input
                  type="text"
                  required
                  value={creditOtp}
                  onChange={e => setCreditOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none text-center tracking-widest text-lg font-bold"
                  disabled={!creditOtpSent}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setUserToCredit(null)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !creditOtpSent || !creditOtp || creditAmount <= 0}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-violet-500/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> क्रेडिट दें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-pink-500/10">
              <h3 className="text-xl font-bold text-pink-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> उपयोगकर्ता हटाएं
              </h3>
              <button onClick={() => setUserToDelete(null)} aria-label="Close modal" className="p-2 hover:bg-pink-500/20 rounded-lg text-pink-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmDelete} className="p-8 space-y-6">
              <div className="bg-pink-500/10 text-pink-400 p-4 rounded-xl border border-pink-500/20 text-sm leading-relaxed mb-4">
                <strong>चेतावनी:</strong> आप <strong>{userToDelete.full_name || userToDelete.email}</strong> का खाता हटाने जा रहे हैं। यह एक अपूरणीय क्रिया (irreversible action) है। इससे उनका सभी डेटा, कोर्स और प्रोग्रेस हटा दिया जाएगा।
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> एडमिन OTP (Admin Verification)
                </label>
                {deleteOtpSent ? (
                   <p className="text-xs text-orange-400 mb-2">✅ आपके एडमिन ईमेल पर 6 अंकों का OTP भेजा गया है।</p>
                ) : (
                   <p className="text-xs text-neutral-500 mb-2">Sending OTP to your admin email...</p>
                )}
                <input 
                  type="text" 
                  value={deleteOtp}
                  onChange={e => setDeleteOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  disabled={!deleteOtpSent}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-pink-500/50 outline-none text-center font-mono tracking-widest text-xl disabled:opacity-50"
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
                  disabled={isDeleting || !deleteOtpSent || !deleteOtp}
                  className="flex-1 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-orange-600/10">
              <h3 className="text-xl font-bold text-white">नया यूजर जोड़ें</h3>
              <button onClick={() => setShowCreateModal(false)} aria-label="Close modal" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-4 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">नाम (Full Name)</label>
                  <input type="text" required value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">ईमेल (Email)</label>
                  <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">भूमिका (Role)</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">फ़ोन (Phone)</label>
                  <input required type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">जन्म तिथि (Birth Date)</label>
                  <input type="date" value={newUser.birth_date} onChange={e => setNewUser({...newUser, birth_date: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">पिता का नाम (Father&apos;s Name)</label>
                  <input type="text" value={newUser.father_name} onChange={e => setNewUser({...newUser, father_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">माता का नाम (Mother&apos;s Name)</label>
                  <input type="text" value={newUser.mother_name} onChange={e => setNewUser({...newUser, mother_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">दादा का नाम (Grandfather&apos;s Name)</label>
                  <input type="text" value={newUser.grand_father_name} onChange={e => setNewUser({...newUser, grand_father_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">लिंग (Gender)</label>
                  <select
                    value={newUser.gender}
                    onChange={e => setNewUser({...newUser, gender: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">जीवनी (Bio)</label>
                  <input type="text" value={newUser.bio} onChange={e => setNewUser({...newUser, bio: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">जन्म स्थान (Birth Place)</label>
                  <input type="text" value={newUser.birth_place} onChange={e => setNewUser({...newUser, birth_place: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">पिन कोड (Pin Code)</label>
                  <input type="text" value={newUser.pincode} onChange={e => setNewUser({...newUser, pincode: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">देश (Country)</label>
                  <select
                    required
                    value={newUser.country}
                    onChange={e => setNewUser({...newUser, country: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                  >
                    {countriesList.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">राज्य (State)</label>
                  <select
                    required
                    value={newUser.district}
                    onChange={e => {
                      const selectedState = statesList.find(s => s.code === e.target.value);
                      setNewUser({...newUser, district: e.target.value, state: selectedState ? selectedState.name : ''});
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                  >
                    {statesList.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 border border-neutral-800 text-neutral-400 rounded-xl font-bold">रद्द करें</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold disabled:opacity-50">बनाएं</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-emerald-600/10">
              <h3 className="text-xl font-bold text-white">बैच में नामांकन (Enroll in Batch)</h3>
              <button onClick={() => setShowEnrollModal(null)} aria-label="Close modal" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
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
                  onChange={e => {
                    const chosen = batches.find(b => b.id === e.target.value);
                    setSelectedBatchId(e.target.value);
                    setSelectedBatchCourseId(chosen?.course_id || '');
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">बैच का चयन करें...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.course_title} - {b.course_id})</option>
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

      {viewingLedgerUser && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" /> Credit Ledger
                </h3>
                <p className="text-sm text-neutral-400">{viewingLedgerUser.full_name || viewingLedgerUser.email}</p>
              </div>
              <button onClick={() => setViewingLedgerUser(null)} aria-label="Close modal" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLedgerLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : ledgerData.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 italic">
                  कोई क्रेडिट हिस्ट्री नहीं मिली (No credit history found).
                </div>
              ) : (
                <div className="space-y-3">
                  {ledgerData.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white capitalize">{item.credit_type} Credit</p>
                        <p className="text-xs text-neutral-400">{item.reason}</p>
                        <p className="text-[10px] text-neutral-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className={`text-lg font-black ${item.change_amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.change_amount > 0 ? '+' : ''}{item.change_amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
