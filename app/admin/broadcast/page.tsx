'use client';

import { useState, useEffect } from 'react';
import { Send, Users, BookOpen, Layers, Bell, Mail, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminBroadcastPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [broadcastData, setBroadcastData] = useState({
    target: 'all', // all, course, batch
    targetId: '',
    subject: '',
    message: '',
    sendEmail: true,
    sendNotification: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/batches')
      ]);
      const coursesData = await coursesRes.json();
      const batchesData = await batchesRes.json();
      setCourses(coursesData.courses || []);
      setBatches(batchesData.batches || []);
    } catch (e) {
      console.error("Failed to fetch broadcast targets", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastData.message) return alert("सन्देश (Message) अनिवार्य है।");
    if (broadcastData.target !== 'all' && !broadcastData.targetId) return alert("कृपया कोर्स या बैच चुनें।");

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Area */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSendBroadcast} className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              {/* Target Selection */}
              <div className="space-y-4">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> लक्षित समूह (Recipients)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'all', label: 'सभी छात्र', icon: Users },
                    { id: 'course', label: 'कोर्स', icon: BookOpen },
                    { id: 'batch', label: 'बैच', icon: Layers }
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
                  {broadcastData.target !== 'all' && (
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
                        <option value="">{broadcastData.target === 'course' ? 'कोर्स चुनें...' : 'बैच चुनें...'}</option>
                        {broadcastData.target === 'course' 
                          ? courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                          : batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.course_title})</option>)
                        }
                      </select>
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

            <div className="p-6 bg-neutral-950 border-t border-neutral-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                अभी ब्रॉडकास्ट भेजें (Send Now)
              </button>
            </div>
          </form>
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
