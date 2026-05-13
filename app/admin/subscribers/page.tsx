'use client';

import { useEffect, useState } from 'react';
import { Mail, Trash2, Send, Loader2, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const res = await fetch('/api/admin/subscribers');
        const data = await res.json() as any;
        if (data.subscribers) setSubscribers(data.subscribers);
      } catch (error) {
        console.error("Failed to fetch subscribers");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/subscribers');
      const data = await res.json() as any;
      if (data.subscribers) setSubscribers(data.subscribers);
    } catch (error) {
      console.error("Failed to fetch subscribers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !emailContent.subject || !emailContent.body) return;

    setIsSending(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/subscribers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedSub.email,
          subject: emailContent.subject,
          body: emailContent.body
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Email sent to ${selectedSub.email}!` });
        setSelectedSub(null);
        setEmailContent({ subject: '', body: '' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send email.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Server error.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm('Are you sure you want to remove this subscriber?')) return;
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setSubscribers(prev => prev.filter(s => s.email !== email));
      }
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const filtered = subscribers.filter(s => 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">न्यूज़लेटर सब्सक्राइबर्स</h1>
          <p className="text-neutral-500 mt-1">अपने ऑडियंस को मैनेज करें और ईमेल भेजें</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ईमेल खोजें..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-6 py-3 text-sm text-white focus:border-orange-500/50 outline-none transition-all w-full md:w-80"
          />
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} font-bold text-sm flex items-center gap-3`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">ईमेल एड्रेस</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center">स्टेटस</th>
              <th className="px-8 py-5 text-[10px] font-black text-neutral-500 uppercase tracking-widest text-right">कार्रवाई (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center text-neutral-500 font-medium">
                  कोई सब्सक्राइबर नहीं मिला।
                </td>
              </tr>
            ) : (
              filtered.map((sub) => (
                <tr key={sub.email} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-5 font-bold text-neutral-300">{sub.email}</td>
                  <td className="px-8 py-5 text-center">
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      Active
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedSub(sub)}
                        className="p-2.5 bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white rounded-xl transition-all"
                        title="Send Email"
                        aria-label="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(sub.email)}
                        className="p-2.5 bg-neutral-800 hover:bg-red-600 text-neutral-400 hover:text-white rounded-xl transition-all"
                        title="Delete"
                        aria-label="Delete Subscriber"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Email Modal */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSub(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSendEmail} className="p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-6 -mx-8 px-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-600/10 rounded-2xl">
                      <Send className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">ईमेल भेजें</h3>
                      <p className="text-xs text-neutral-500 font-bold">{selectedSub.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedSub(null)} className="p-2 text-neutral-500 hover:text-white transition-colors" title="Close" aria-label="Close">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">ईमेल विषय (Subject)</label>
                    <input 
                      type="text" 
                      required
                      value={emailContent.subject}
                      onChange={e => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Adityanveshan Academy - Weekly Update"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">ईमेल बॉडी (Message Body)</label>
                    <textarea 
                      required
                      rows={8}
                      value={emailContent.body}
                      onChange={e => setEmailContent(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="अपना संदेश यहाँ लिखें..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all text-sm leading-relaxed min-h-[200px]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="flex-1 px-8 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    ईमेल भेजें
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedSub(null)}
                    className="px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-2xl transition-all"
                  >
                    रद्द करें
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
