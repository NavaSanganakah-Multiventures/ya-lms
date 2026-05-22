'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, UserPlus, Trash2, Search, GraduationCap, BookOpen, AlertCircle, Award, X, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatLocalDate } from '@/lib/time';
import { useToast } from '@/contexts/ToastContext';

export default function AdminEnrollmentsPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [search, setSearch] = useState('');

  // Separate OTP state for "assign paid" action
  const [assignOtp, setAssignOtp] = useState('');
  const [assignOtpSent, setAssignOtpSent] = useState(false);
  const [isSendingAssignOtp, setIsSendingAssignOtp] = useState(false);

  // Separate OTP state + modal for "issue certificate" action
  const [certModal, setCertModal] = useState<any>(null); // holds enrollment being certified
  const [certOtp, setCertOtp] = useState('');
  const [certOtpSent, setCertOtpSent] = useState(false);
  const [isSendingCertOtp, setIsSendingCertOtp] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);

  const [issuingEnrollmentId, setIssuingEnrollmentId] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    user_id: '',
    course_id: '',
    batch_id: '',
    status: 'active',
    payment_status: 'pending',
    amount_paid: 0,
    payment_source: ''
  });
  const router = useRouter();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/enrollments'),
      fetch('/api/admin/users'),
      fetch('/api/admin/courses'),
      fetch('/api/admin/batches')
    ]).then(async ([enRes, userRes, courseRes, batchRes]) => {
      if (enRes.status === 401 || enRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const enData = await enRes.json() as any;
      const userData = await userRes.json() as any;
      const courseData = await courseRes.json() as any;
      const batchData = await batchRes.json() as any;
      if (enData.enrollments) setEnrollments(enData.enrollments);
      if (userData.users) setUsers(userData.users);
      if (courseData.courses) setCourses(courseData.courses);
      if (batchData.batches) setBatches(batchData.batches);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    const doFetch = () => {
      fetchData();
    };
    doFetch();
  }, [fetchData]);


  const handleSendOtp = async () => {
    setIsSendingAssignOtp(true);
    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) setAssignOtpSent(true);
      else showError("Failed to send OTP to Admin email");
    } catch (e) {
      console.error(e);
      showError("Error sending OTP");
    } finally {
      setIsSendingAssignOtp(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.user_id || !newAssignment.course_id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newAssignment, otp: newAssignment.payment_status === 'paid' ? assignOtp : undefined })
      });
      if (res.ok) {
        setShowAssignModal(false);
        setNewAssignment({ user_id: '', course_id: '', batch_id: '', status: 'active', payment_status: 'pending', amount_paid: 0, payment_source: '' });
        setAssignOtp('');
        setAssignOtpSent(false);
        fetchData();
      } else {
        const data = await res.json() as any;
        showError(data.error || "Failed to assign course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canIssueCertificate = (enrollment: any) => {
    return enrollment.payment_status === 'paid' && Number(enrollment.progress || 0) >= 100 && enrollment.certificate_issued !== 1;
  };

  // Opens the certificate OTP modal — no window.prompt()
  const handleIssueCertificate = async (enrollment: any) => {
    if (!canIssueCertificate(enrollment)) return;
    setCertModal(enrollment);
    setCertOtp('');
    setCertOtpSent(false);
    // Auto-send OTP when modal opens
    setIsSendingCertOtp(true);
    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) setCertOtpSent(true);
      else showError('Failed to send OTP to Admin email');
    } catch (e) {
      showError('Error sending OTP');
    } finally {
      setIsSendingCertOtp(false);
    }
  };

  const handleConfirmCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certOtp.trim() || !certModal) return;
    setIssuingCert(true);
    try {
      const res = await fetch(`/api/admin/enrollments/${certModal.id}/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: certOtp.trim() })
      });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) {
        showError(data.error || 'Failed to issue certificate');
        return;
      }
      showSuccess(data.message || 'Certificate issued successfully');
      setCertModal(null);
      setCertOtp('');
      setCertOtpSent(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Error issuing certificate');
    } finally {
      setIssuingCert(false);
    }
  };

  const handleDeassign = async (id: string) => {
    if (!confirm("Are you sure you want to remove this enrollment?")) return;
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else showError("Failed to remove enrollment");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEnrollments = enrollments.filter(e =>
    e.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.course_title?.toLowerCase().includes(search.toLowerCase()) ||
    e.batch_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && enrollments.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">नामांकन प्रबंधन (Enrollments)</h1>
          <p className="text-neutral-400 mt-2 text-sm">विद्यार्थियों को कोर्स असाइन करें और उनके नामांकन प्रबंधित करें।</p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
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
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
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
                       <div className="w-8 h-8 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-400">
                          <GraduationCap className="w-4 h-4" />
                       </div>
                       <div>
                          <div className="text-sm font-bold text-white">{en.user_name || 'Anonymous'}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">{en.user_email}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                       <div className="flex items-center gap-2">
                          <BookOpen className="w-3 h-3 text-neutral-500" />
                          <span className="text-sm text-neutral-300 font-medium">{en.course_title}</span>
                       </div>
                       {en.batch_name && (
                         <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mt-1 ml-5">
                           {en.batch_name}
                         </div>
                       )}
                       {/* Progress Indicator */}
                       <div className="mt-2 ml-5 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden max-w-[100px]">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${en.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-500">{en.progress || 0}%</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        en.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {en.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        en.payment_status === 'paid' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {en.payment_status === 'paid' ? `PAID (₹${en.amount_paid || 0})` : 'FREE / PENDING'}
                      </span>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        en.certificate_issued === 1 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : en.certificate_eligible === 1 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {en.certificate_issued === 1 ? 'CERTIFICATE ISSUED' : en.certificate_eligible === 1 ? 'CERTIFICATE READY' : 'NO CERTIFICATE'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right text-xs text-neutral-500 flex flex-col items-end gap-1">
                    <span>{formatLocalDate(en.purchased_at)}</span>
                    {en.payment_source && <span className="text-[9px] uppercase font-mono tracking-widest text-orange-400/70">{en.payment_source}</span>}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleIssueCertificate(en)}
                        disabled={!canIssueCertificate(en) || issuingEnrollmentId === en.id}
                        title={en.certificate_issued === 1 ? 'Certificate already issued' : 'Issue certificate'}
                        className="p-2 hover:bg-indigo-500/10 text-indigo-400 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {issuingEnrollmentId === en.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeassign(en.id)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                        aria-label="Remove enrollment"
                        title="Remove enrollment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                   <X className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={handleAssign} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">विद्यार्थी चुनें (Select Student)</label>
                <select
                  required
                  value={newAssignment.user_id}
                  onChange={e => setNewAssignment({...newAssignment, user_id: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
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
                  onChange={e => setNewAssignment({...newAssignment, course_id: e.target.value, batch_id: ''})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                >
                  <option value="">कोर्स चुनें...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {newAssignment.course_id && (
                <>
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">बैच चुनें (Select Batch)</label>
                  <select
                    value={newAssignment.batch_id}
                    onChange={e => setNewAssignment({...newAssignment, batch_id: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                  >
                    <option value="">कोई विशेष बैच नहीं (No Specific Batch)</option>
                    {batches.filter(b => b.course_id === newAssignment.course_id).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-400">भुगतान स्थिति (Payment Status)</label>
                  <select
                    value={newAssignment.payment_status}
                    onChange={e => setNewAssignment({...newAssignment, payment_status: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="pending">लंबित (Pending / Free Access)</option>
                    <option value="paid">भुगतान प्राप्त (Paid Premium Access)</option>
                  </select>
                </div>

                {newAssignment.payment_status === 'paid' && (
                  <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-pink-400">प्राप्त राशि (Amount Paid) ₹</label>
                        <input
                          type="number"
                          min="0"
                          value={newAssignment.amount_paid}
                          onChange={e => setNewAssignment({...newAssignment, amount_paid: Number(e.target.value) || 0})}
                          className="w-full bg-neutral-950 border border-pink-500/30 rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-pink-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-pink-400">स्रोत / ट्रांज़ैक्शन ID (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Cash, UPI Ref..."
                          value={newAssignment.payment_source}
                          onChange={e => setNewAssignment({...newAssignment, payment_source: e.target.value})}
                          className="w-full bg-neutral-950 border border-pink-500/30 rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-pink-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="h-px bg-pink-500/20 w-full"></div>
                    <p className="text-xs text-pink-400 flex gap-2"><AlertCircle className="w-4 h-4"/> Paid मार्क करने के लिए एडमिन OTP अनिवार्य है।</p>

                    {!assignOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingAssignOtp}
                        className="w-full py-2 bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {isSendingAssignOtp ? 'Sending...' : 'एडमिन ईमेल पर OTP भेजें'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-400">✅ OTP भेजा गया!</p>
                        <input
                          type="text"
                          required
                          value={assignOtp}
                          onChange={e => setAssignOtp(e.target.value)}
                          placeholder="6 अंकों का OTP दर्ज करें"
                          maxLength={6}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none text-center font-mono tracking-widest text-lg"
                        />
                      </div>
                    )}
                  </div>
                )}
                </>
              )}

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
                  disabled={isSubmitting || (newAssignment.payment_status === 'paid' && (!assignOtpSent || !assignOtp))}
                  className="flex-1 py-4 bg-white text-black hover:bg-neutral-200 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'असाइन करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Issue OTP Modal — replaces window.prompt() */}
      {certModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-indigo-500/30 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-indigo-500/10">
              <h3 className="text-xl font-black text-indigo-300 flex items-center gap-2">
                <Award className="w-5 h-5" /> सर्टिफिकेट जारी करें
              </h3>
              <button onClick={() => setCertModal(null)} className="p-2 hover:bg-indigo-500/20 rounded-lg text-indigo-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmCertificate} className="p-8 space-y-6">
              <div className="bg-indigo-500/10 text-indigo-300 p-4 rounded-xl border border-indigo-500/20 text-sm leading-relaxed">
                <strong>{certModal.user_name || certModal.user_email}</strong> को <strong>{certModal.course_title}</strong> का सर्टिफिकेट जारी करने जा रहे हैं।
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> एडमिन OTP (Admin Verification)
                </label>
                {isSendingCertOtp ? (
                  <p className="text-xs text-neutral-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> OTP भेजा जा रहा है...</p>
                ) : certOtpSent ? (
                  <p className="text-xs text-orange-400">✅ आपके एडमिन ईमेल पर 6 अंकों का OTP भेजा गया है।</p>
                ) : (
                  <button type="button" onClick={async () => {
                    setIsSendingCertOtp(true);
                    try {
                      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
                      if (res.ok) setCertOtpSent(true);
                      else showError('Failed to send OTP');
                    } catch { showError('Error sending OTP'); }
                    finally { setIsSendingCertOtp(false); }
                  }} className="text-xs text-indigo-400 underline">OTP दोबारा भेजें</button>
                )}
                <input
                  type="text"
                  required
                  value={certOtp}
                  onChange={e => setCertOtp(e.target.value)}
                  placeholder="6 अंकों का OTP दर्ज करें"
                  maxLength={6}
                  disabled={!certOtpSent}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none text-center font-mono tracking-widest text-xl disabled:opacity-50"
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setCertModal(null)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold">
                  रद्द करें
                </button>
                <button type="submit" disabled={issuingCert || !certOtpSent || !certOtp}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  {issuingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Award className="w-4 h-4" /> जारी करें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
