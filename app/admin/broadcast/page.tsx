'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Users, BookOpen, Layers, Bell, Mail, Loader2, CheckCircle2, AlertCircle, Info, Save, Clock, Copy, Calendar, ShieldCheck } from 'lucide-react';
import { formatLocalDate } from '@/lib/time';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/contexts/ToastContext';

export default function AdminBroadcastPage() {
  const { success: showSuccess, error: showError } = useToast();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'drafts' | 'history'>('new');
  const [draftsList, setDraftsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [broadcastData, setBroadcastData] = useState({
    target: 'all', // all, course, batch, custom
    targetId: '',
    customEmails: '',
    subject: '',
    message: '',
    otp: '',
    sendEmail: true,
    sendNotification: true,
    sendPush: true,
    pushAudience: 'all' as 'all' | 'logged_in' | 'anonymous' | 'students' | 'teachers' | 'admin',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, batchesRes] = await Promise.all([
          fetch('/api/admin/courses'),
          fetch('/api/admin/batches')
        ]);
        const coursesData = await coursesRes.json() as any;
        const batchesData = await batchesRes.json() as any;
        setCourses(coursesData.courses || []);
        setBatches(batchesData.batches || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchPushHistory = async () => {
    try {
      const res = await fetch('/api/admin/broadcasts?page=1&limit=50');
      const data = await res.json() as any;
      if (res.ok) {
        setPushHistory(data.broadcasts || []);
      }
    } catch (e) {
      console.error('Failed to fetch push broadcast history', e);
    }
  };

  useEffect(() => {
    const fetchDrafts = async (type: string) => {
      try {
        const res = await fetch(`/api/admin/broadcast/drafts?type=${type}`);
        const data = await res.json() as any[];
        if (res.ok) {
          if (type === 'draft') setDraftsList(data);
          if (type === 'history') setHistoryList(data);
        }
      } catch (e) {
        console.error("Failed to fetch drafts/history", e);
      }
    };
    if (activeTab === 'drafts') fetchDrafts('draft');
    if (activeTab === 'history') {
      fetchDrafts('history');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPushHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!broadcastData.sendPush) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/admin/audience-count?audience=${broadcastData.pushAudience}`);
        const data = await res.json() as any;
        if (res.ok) {
          setAudienceCount(data.count ?? 0);
        }
      } catch (e) {
        console.error('Failed to fetch audience count', e);
        setAudienceCount(null);
      }
    };
    const t = setTimeout(fetchCount, 250);
    return () => clearTimeout(t);
  }, [broadcastData.sendPush, broadcastData.pushAudience]);

  // Derived: hide audience count when push is disabled (avoids
  // synchronous setState in an effect, per react-hooks/immutability).
  const effectiveAudienceCount = broadcastData.sendPush ? audienceCount : null;

  const handleSaveDraft = async () => {
    if (!broadcastData.message) return showError("सन्देश (Message) अनिवार्य है।");
    setIsSavingDraft(true);
    try {
      const res = await fetch('/api/admin/broadcast/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });
      const data = await res.json() as any;
      if (res.ok) {
        showSuccess("ड्राफ्ट सफलतापूर्वक सेव हो गया!");
        setActiveTab('drafts');
      } else {
        showError(data.error || "ड्राफ्ट सेव करने में विफल।");
      }
    } catch (e) {
      console.error(e);
      showError("एक त्रुटि हुई।");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/admin/actions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json() as any;
      if (res.ok) {
        showSuccess(data.message || "OTP आपके ईमेल पर भेज दिया गया है।");
      } else {
        showError(data.error || "OTP भेजने में विफल।");
      }
    } catch (e) {
      console.error(e);
      showError("OTP भेजने में एक त्रुटि हुई।");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleReuse = (item: any) => {
    setBroadcastData({
      target: item.target_type || 'all',
      targetId: item.target_id || '',
      customEmails: item.custom_emails || '',
      subject: item.subject || '',
      message: item.message || '',
      sendEmail: item.send_email === 1,
      sendNotification: item.send_notification === 1,
      sendPush: item.send_push === 1,
      pushAudience: item.push_audience || 'all',
      otp: '',
    });
    setActiveTab('new');
  };

  const importStudentEmails = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json() as any;
      if (data.users) {
        const studentEmails = data.users
          .filter((u: any) => u.role === 'student' && u.email)
          .map((u: any) => u.email)
          .join(', ');
        setBroadcastData(prev => ({ ...prev, customEmails: prev.customEmails ? `${prev.customEmails}, ${studentEmails}` : studentEmails }));
      }
    } catch (e) {
      console.error("Failed to import student emails", e);
      showError("छात्रों के ईमेल आयात करने में विफल।");
    }
  };

  const importSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/subscribers');
      const data = await res.json() as any;
      if (data.subscribers) {
        const subEmails = data.subscribers
          .map((s: any) => s.email)
          .join(', ');
        setBroadcastData(prev => ({ 
          ...prev, 
          customEmails: prev.customEmails ? `${prev.customEmails}, ${subEmails}` : subEmails 
        }));
      }
    } catch (e) {
      console.error("Failed to import subscribers", e);
      showError("सब्सक्राइबर्स के ईमेल आयात करने में विफल।");
    }
  };

  const removeDuplicates = () => {
    if (!broadcastData.customEmails) return;
    const emails = broadcastData.customEmails
      .split(/[\s,]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e !== '');
    
    const uniqueEmails = Array.from(new Set(emails));
    setBroadcastData(prev => ({ ...prev, customEmails: uniqueEmails.join(', ') }));
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.message) return showError("सन्देश (Message) अनिवार्य है।");
    if (broadcastData.target === 'course' && !broadcastData.targetId) return showError("कृपया कोर्स चुनें।");
    if (broadcastData.target === 'batch' && !broadcastData.targetId) return showError("कृपया बैच चुनें।");
    if (broadcastData.target === 'custom' && !broadcastData.customEmails) return showError("कृपया कस्टम ईमेल दर्ज करें।");
    if (!broadcastData.otp || broadcastData.otp.trim().length < 4) return showError("कृपया OTP दर्ज करें (सुरक्षा सत्यापन के लिए)।");

    if (!confirm(`क्या आप वाकई ${broadcastData.target === 'all' ? 'सभी छात्रों' : 'चयनित समूह'} को यह ब्रॉडकास्ट भेजना चाहते हैं?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });
      const data = await res.json() as any;
      if (res.ok) {
        if (data.pushResult) {
          const skip = data.pushResult.skipped ? `, ${data.pushResult.skipped} skipped (free limit)` : '';
          const errorDetail = data.pushResult.errors?.length ? `\nErrors: ${data.pushResult.errors.map((e: any) => `${e.status ? `HTTP ${e.status}` : ''}: ${e.error}`).join(' | ')}` : '';
          showSuccess(`${data.message}${skip}${errorDetail}`);
        } else {
          showSuccess(data.message || "ब्रॉडकास्ट सफलतापूर्वक भेज दिया गया!");
        }

        setBroadcastData({ ...broadcastData, subject: '', message: '', otp: '' });
      } else {
        showError(data.error || "ब्रॉडकास्ट भेजने में विफल।");
      }
    } catch (e) {
      console.error(e);
      showError("एक त्रुटि हुई।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">ब्रॉडकास्ट (प्रसारण)</h1>
            <p className="text-neutral-400">सभी छात्रों या विशिष्ट समूहों को सूचनाएं और ईमेल भेजें।</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/scheduled-notifications')}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition font-semibold text-sm"
          title="शेड्यूल नोटिफिकेशन्स"
        >
          <Calendar className="w-4 h-4" />
          शेड्यूल नोटिफिकेशन्स
        </button>
      </div>


      {/* Tabs */}
      <div className="flex border-b border-neutral-800 mb-6">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'new' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          नया ब्रॉडकास्ट
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'drafts' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          ड्राफ्ट्स
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'history' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          हिस्ट्री
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'new' ? (

          <form onSubmit={handleSendBroadcast} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              {/* Target Selection */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> लक्षित समूह (Recipients)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'all', label: 'सभी छात्र', icon: Users },
                    { id: 'course', label: 'कोर्स', icon: BookOpen },
                    { id: 'batch', label: 'बैच', icon: Layers },
                    { id: 'custom', label: 'कस्टम ईमेल', icon: Mail }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBroadcastData({ ...broadcastData, target: t.id, targetId: '' })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${broadcastData.target === t.id ? 'bg-orange-600/10 border-orange-500 text-white shadow-lg shadow-orange-500/10' : 'bg-neutral-950/50 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'}`}
                    >
                      <t.icon className="w-6 h-6" />
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {broadcastData.target === 'course' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="pt-2"
                    >
                      <select
                        required
                        value={broadcastData.targetId}
                        onChange={(e) => setBroadcastData({ ...broadcastData, targetId: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                      >
                        <option value="">कोर्स चुनें...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </motion.div>
                  )}
                  {broadcastData.target === 'batch' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="pt-2"
                    >
                      <select
                        required
                        value={broadcastData.targetId}
                        onChange={(e) => setBroadcastData({ ...broadcastData, targetId: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                      >
                        <option value="">बैच चुनें...</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.course_title})</option>)}
                      </select>
                    </motion.div>
                  )}
                  {broadcastData.target === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="pt-2 space-y-2"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ईमेल दर्ज करें (कॉमा से अलग करें)</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={importStudentEmails}
                            className="text-[10px] bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all border border-neutral-700"
                          >
                            छात्रों के ईमेल
                          </button>
                          <button
                            type="button"
                            onClick={importSubscribers}
                            className="text-[10px] bg-orange-600/20 text-orange-400 hover:bg-orange-600/40 hover:text-orange-300 px-3 py-1.5 rounded-lg font-bold transition-all border border-orange-500/20"
                          >
                            सब्सक्राइबर्स
                          </button>
                          <button
                            type="button"
                            onClick={removeDuplicates}
                            className="text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 px-3 py-1.5 rounded-lg font-bold transition-all border border-emerald-500/20"
                          >
                            Duplicate हटाएँ
                          </button>
                        </div>
                      </div>
                      <textarea
                        required
                        placeholder="user1@example.com, user2@example.com..."
                        rows={3}
                        value={broadcastData.customEmails}
                        onChange={(e) => setBroadcastData({ ...broadcastData, customEmails: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-neutral-700 resize-none font-mono text-sm"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Channels */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <Bell className="w-4 h-4" /> चैनल (Channels)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl">
                  {/* Email */}
                  <button
                    type="button"
                    onClick={() => setBroadcastData({ ...broadcastData, sendEmail: !broadcastData.sendEmail })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      broadcastData.sendEmail
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold">Email</span>
                    {broadcastData.sendEmail && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>

                  {/* In-App Notification */}
                  <button
                    type="button"
                    onClick={() => setBroadcastData({ ...broadcastData, sendNotification: !broadcastData.sendNotification })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      broadcastData.sendNotification
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span className="text-xs font-bold">In-App</span>
                    {broadcastData.sendNotification && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>

                  {/* Browser Push Notification */}
                  <button
                    type="button"
                    onClick={() => setBroadcastData({ ...broadcastData, sendPush: !broadcastData.sendPush })}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      broadcastData.sendPush
                        ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2v-1H6v1a2 2 0 002 2zM10.293 3.293A1 1 0 0112 4v.09A8.001 8.001 0 0120 12v3l1.71 1.71A1 1 0 0121 18H3a1 1 0 01-.71-1.29L4 15v-3a8 8 0 018-8.91V4a1 1 0 01.293-.707z" />
                    </svg>
                    <span className="text-xs font-bold">Browser Push</span>
                    {broadcastData.sendPush && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>
                </div>

                {/* Push notification info note */}
                {broadcastData.sendPush && (
                  <>
                    <p className="text-[11px] text-orange-400/70 bg-orange-500/5 border border-orange-500/15 rounded-xl px-4 py-2.5 leading-relaxed">
                      <span className="font-bold">ℹ️ Browser Push:</span> केवल उन्हीं छात्रों को मिलेगा जिन्होंने ब्राउज़र नोटिफिकेशन की अनुमति दी है और एक बार लॉगिन किया हो।
                    </p>
                    <div className="bg-neutral-950/50 border border-neutral-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Push Audience Filter</label>
                        {effectiveAudienceCount !== null && (
                          <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-0.5">
                            {effectiveAudienceCount} device{effectiveAudienceCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'logged_in', label: 'Logged-in Only' },
                          { id: 'anonymous', label: 'Anonymous Only' },
                          { id: 'students', label: 'Students' },
                          { id: 'teachers', label: 'Teachers' },
                          { id: 'admin', label: 'Admin' },
                        ].map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setBroadcastData({ ...broadcastData, pushAudience: a.id as any })}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              broadcastData.pushAudience === a.id
                                ? 'bg-orange-600/15 border-orange-500 text-orange-300'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                      {(broadcastData.pushAudience === 'all' || broadcastData.pushAudience === 'anonymous') && (
                        <p className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 leading-relaxed">
                          ⚠️ Anonymous devices पर free limit लागू है (default: 5/month per device) — limit पूरी होने पर skip हो जाएंगे।
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">विषय (Subject - Only for Email)</label>
                  <input
                    type="text"
                    placeholder="e.g., महत्वपूर्ण अपडेट: नई कक्षाओं की जानकारी"
                    value={broadcastData.subject}
                    onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-neutral-700 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">सन्देश (Message Content)</label>
                  <textarea
                    required
                    placeholder="छात्रों के लिए अपना सन्देश यहाँ लिखें..."
                    rows={8}
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-4 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-neutral-700 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* OTP Verification */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> सुरक्षा सत्यापन (OTP)
                </label>
                <div className="p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl space-y-3">
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    ब्रॉडकास्ट भेजने के लिए OTP अनिवार्य है। &quot;OTP भेजें&quot; बटन दबाकर अपने ईमेल पर OTP प्राप्त करें।
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-अंकीय OTP दर्ज करें"
                      value={broadcastData.otp}
                      onChange={(e) => setBroadcastData({ ...broadcastData, otp: e.target.value.replace(/[^0-9]/g, '') })}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-neutral-700 font-mono text-center tracking-[0.4em]"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || isSubmitting}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-emerald-500/30"
                    >
                      {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      OTP भेजें
                    </button>
                  </div>
                </div>
              </div>
            </div>


            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="flex-1 h-14 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 border border-neutral-700"
              >
                {isSavingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                ड्राफ्ट सेव करें
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isSavingDraft}
                className="flex-1 h-14 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                अभी भेजें
              </button>
            </div>
          </form>
          ) : (
            <div className="space-y-6">
              {activeTab === 'history' && pushHistory.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Send className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Push Notification Broadcasts</h3>
                    <span className="text-[10px] text-neutral-500">({pushHistory.length})</span>
                  </div>
                  {pushHistory.map((b: any) => (
                    <div key={b.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-1 rounded-md border border-orange-500/20 uppercase tracking-widest">
                          {b.audience}
                        </span>
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatLocalDate(b.created_at)}
                        </span>
                        {b.sent_by_name && (
                          <span className="text-[10px] text-neutral-500">by {b.sent_by_name}</span>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ✓ {b.sent_count} sent
                          </span>
                          {b.failed_count > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              ✗ {b.failed_count} failed
                            </span>
                          )}
                          {b.skip_count > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              ⊘ {b.skip_count} skipped
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1">{b.title}</h4>
                      <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">{b.body}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {activeTab === 'history' && pushHistory.length > 0 && (
                  <div className="flex items-center gap-2 px-2 pt-4 border-t border-neutral-800">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Email/Notification History</h3>
                  </div>
                )}
              {(activeTab === 'drafts' ? draftsList : historyList).length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center">
                  <p className="text-neutral-500 font-bold">कोई डेटा नहीं मिला।</p>
                </div>
              ) : (
                (activeTab === 'drafts' ? draftsList : historyList).map((item, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                         <span className="bg-orange-500/10 text-orange-400 text-[10px] font-bold px-2 py-1 rounded-md border border-orange-500/20 uppercase tracking-widest">{item.target_type}</span>
                         {item.target_type === 'course' || item.target_type === 'batch' ? <span className="text-[10px] text-neutral-500 font-mono">{item.target_id}</span> : null}
                         <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatLocalDate(item.created_at)}</span>
                         <div className="flex items-center gap-1 ml-auto">
                            {item.send_email === 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Email</span>
                            )}
                            {item.send_notification === 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">In-App</span>
                            )}
                            {item.send_push === 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">Push</span>
                            )}
                         </div>
                      </div>
                      <h3 className="text-white font-bold text-sm">{item.subject || 'No Subject'}</h3>
                      <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">{item.message}</p>
                    </div>
                    <button
                      onClick={() => handleReuse(item)}
                      className="shrink-0 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-neutral-700"
                    >
                      <Copy className="w-4 h-4"/>
                      री-यूज (Reuse)
                    </button>
                  </div>
                ))
              )}
              </div>
            </div>
          )}
        </div>


        {/* Info Area */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-400" /> महत्वपूर्ण निर्देश
            </h2>
            <ul className="space-y-3">
              {[
                "सभी छात्र: यह विकल्प आपके डेटाबेस के सभी सक्रिय छात्रों को सन्देश भेजेगा।",
                "कोर्स: केवल उस कोर्स में नामांकित (Enrolled) छात्रों को सन्देश जाएगा।",
                "बैच: विशिष्ट बैच के छात्रों को लक्षित करने के लिए इसका उपयोग करें।",
                "कस्टम ईमेल: मैन्युअल रूप से ईमेल दर्ज करें या एक क्लिक में सभी छात्रों के ईमेल आयात करें।",
                "In-App: सन्देश छात्र के Notification Bell (🔔) में दिखाई देता है जब वे अगली बार लॉगिन करें।",
                "Browser Push: तुरंत ब्राउज़र/मोबाइल पर Pop-up दिखाता है — केवल उन्हीं को जिन्होंने अनुमति दी है।",
                "आप तीनों channels एक साथ या अलग-अलग चुन सकते हैं।"
              ].map((text, i) => (
                <li key={i} className="text-xs text-neutral-400 leading-relaxed flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-500 uppercase tracking-tighter mb-1">सावधानी</p>
              <p className="text-xs text-amber-200/60 leading-relaxed">
                ब्रॉडकास्ट को वापस नहीं लिया जा सकता। भेजने से पहले सामग्री और लक्षित समूह की सावधानीपूर्वक जाँच करें।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
