'use client';

import { useState, useEffect } from 'react';
import { Send, Users, BookOpen, Layers, Bell, Mail, Loader2, CheckCircle2, AlertCircle, Info, Save, Clock, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminBroadcastPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'drafts' | 'history'>('new');
  const [draftsList, setDraftsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [broadcastData, setBroadcastData] = useState({
    target: 'all', // all, course, batch, custom
    targetId: '',
    customEmails: '',
    subject: '',
    message: '',
    sendEmail: true,
    sendNotification: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'drafts') fetchDrafts('draft');
    if (activeTab === 'history') fetchDrafts('history');
  }, [activeTab]);

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

  const handleSaveDraft = async () => {
    if (!broadcastData.message) return alert("सन्देश (Message) अनिवार्य है।");
    setIsSavingDraft(true);
    try {
      const res = await fetch('/api/admin/broadcast/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData)
      });
      const data = await res.json() as any;
      if (res.ok) {
        alert("ड्राफ्ट सफलतापूर्वक सेव हो गया!");
        setActiveTab('drafts');
      } else {
        alert(data.error || "ड्राफ्ट सेव करने में विफल।");
      }
    } catch (e) {
      console.error(e);
      alert("एक त्रुटि हुई।");
    } finally {
      setIsSavingDraft(false);
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
      sendNotification: item.send_notification === 1
    });
    setActiveTab('new');
  };

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
      console.error("Failed to fetch broadcast targets", e);
    } finally {
      setLoading(false);
    }
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
      alert("छात्रों के ईमेल आयात करने में विफल।");
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.message) return alert("सन्देश (Message) अनिवार्य है।");
    if (broadcastData.target === 'course' && !broadcastData.targetId) return alert("कृपया कोर्स चुनें।");
    if (broadcastData.target === 'batch' && !broadcastData.targetId) return alert("कृपया बैच चुनें।");
    if (broadcastData.target === 'custom' && !broadcastData.customEmails) return alert("कृपया कस्टम ईमेल दर्ज करें।");

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
        alert(data.message || "ब्रॉडकास्ट सफलतापूर्वक भेज दिया गया!");
        setBroadcastData({ ...broadcastData, subject: '', message: '' });
      } else {
        alert(data.error || "ब्रॉडकास्ट भेजने में विफल।");
      }
    } catch (e) {
      console.error(e);
      alert("एक त्रुटि हुई।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Send className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ब्रॉडकास्ट (प्रसारण)</h1>
          <p className="text-neutral-400">सभी छात्रों या विशिष्ट समूहों को सूचनाएं और ईमेल भेजें।</p>
        </div>
      </div>


      {/* Tabs */}
      <div className="flex border-b border-neutral-800 mb-6">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'new' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          नया ब्रॉडकास्ट
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'drafts' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          ड्राफ्ट्स
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-4 font-bold text-sm outline-none transition-all ${activeTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${broadcastData.target === t.id ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-neutral-950/50 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'}`}
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
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ईमेल दर्ज करें (कॉमा से अलग करें)</label>
                        <button
                          type="button"
                          onClick={importStudentEmails}
                          className="text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 hover:text-indigo-300 px-3 py-1.5 rounded-lg font-bold transition-all"
                        >
                          छात्रों के ईमेल आयात करें
                        </button>
                      </div>
                      <textarea
                        required
                        placeholder="user1@example.com, user2@example.com..."
                        rows={3}
                        value={broadcastData.customEmails}
                        onChange={(e) => setBroadcastData({ ...broadcastData, customEmails: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-neutral-700 resize-none font-mono text-sm"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Channels */}
              <div className="flex gap-4 p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBroadcastData({ ...broadcastData, sendEmail: !broadcastData.sendEmail })}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${broadcastData.sendEmail ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold">Email</span>
                  {broadcastData.sendEmail && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastData({ ...broadcastData, sendNotification: !broadcastData.sendNotification })}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${broadcastData.sendNotification ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-neutral-900 border-neutral-800 text-neutral-600'}`}
                >
                  <Bell className="w-4 h-4" />
                  <span className="text-xs font-bold">Notification</span>
                  {broadcastData.sendNotification && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                </button>
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
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-neutral-700 font-bold"
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
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-neutral-700 resize-none leading-relaxed"
                  />
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
                className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                अभी भेजें
              </button>
            </div>
          </form>
          ) : (
            <div className="space-y-4">
              {(activeTab === 'drafts' ? draftsList : historyList).length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 text-center">
                  <p className="text-neutral-500 font-bold">कोई डेटा नहीं मिला।</p>
                </div>
              ) : (
                (activeTab === 'drafts' ? draftsList : historyList).map((item, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                         <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-500/20 uppercase tracking-widest">{item.target_type}</span>
                         {item.target_type === 'course' || item.target_type === 'batch' ? <span className="text-[10px] text-neutral-500 font-mono">{item.target_id}</span> : null}
                         <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(item.created_at).toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata' })}</span>
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
          )}
        </div>


        {/* Info Area */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" /> महत्वपूर्ण निर्देश
            </h2>
            <ul className="space-y-3">
              {[
                "सभी छात्र: यह विकल्प आपके डेटाबेस के सभी सक्रिय छात्रों को सन्देश भेजेगा।",
                "कोर्स: केवल उस कोर्स में नामांकित (Enrolled) छात्रों को सन्देश जाएगा।",
                "बैच: विशिष्ट बैच के छात्रों को लक्षित करने के लिए इसका उपयोग करें।",
                "कस्टम ईमेल: मैन्युअल रूप से ईमेल दर्ज करें या एक क्लिक में सभी छात्रों के ईमेल आयात करें।",
                "पुश नोटिफिकेशन छात्रों के मोबाइल/ब्राउज़र पर तुरंत दिखाई देगा।"
              ].map((text, i) => (
                <li key={i} className="text-xs text-neutral-400 leading-relaxed flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
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
