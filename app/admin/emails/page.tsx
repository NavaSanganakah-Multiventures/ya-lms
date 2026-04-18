'use client';

import { useEffect, useState } from 'react';
import { Mail, Check, Trash2, Eye, EyeOff, Loader2, Send, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmailDraft {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  is_html: number;
  status: 'draft' | 'sent' | 'cancelled';
  created_at: string;
  sent_at: string | null;
}

export default function AdminEmailsPage() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [previewMode, setPreviewMode] = useState<'rich' | 'code'>('rich');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/emails/drafts');
      if (res.ok) {
        const data = await res.json() as EmailDraft[];
        setDrafts(data);
      }
    } catch (e) {
      console.error("Failed to fetch drafts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDraft = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/emails/drafts/${id}/send`, { method: 'POST' });
      if (res.ok) {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'sent', sent_at: new Date().toISOString() } : d));
        if (selectedDraft?.id === id) {
            setSelectedDraft(prev => prev ? { ...prev, status: 'sent', sent_at: new Date().toISOString() } : null);
        }
      }
    } catch (e) {
      console.error("Failed to send draft", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("क्या आप वाकई इस ड्राफ्ट को हटाना चाहते हैं?")) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/emails/drafts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (selectedDraft?.id === id) setSelectedDraft(null);
      }
    } catch (e) {
      console.error("Failed to delete draft", e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Mail className="w-8 h-8 text-indigo-500" />
            ईमेल ड्राफ्ट्स मैनेजमेंट
          </h1>
          <p className="text-neutral-400 mt-2">AI द्वारा तैयार किए गए ईमेल ड्राफ्ट्स की समीक्षा करें और भेजें।</p>
        </div>
        <button 
          onClick={fetchDrafts}
          className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all shadow-lg active:scale-95"
        >
          <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Draft List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[700px]">
          <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">हाल के ड्राफ्ट्स</span>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded-full font-bold border border-indigo-500/20">
              {drafts.length} ड्राफ्ट्स
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-neutral-500 text-sm">ड्राफ्ट्स लोड किए जा रहे हैं...</p>
              </div>
            ) : drafts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                <Mail className="w-12 h-12 text-neutral-700" />
                <p className="text-neutral-500 text-sm">कोई ड्राफ्ट नहीं मिला।</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => setSelectedDraft(draft)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative group overflow-hidden ${selectedDraft?.id === draft.id ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-neutral-950/30 border-neutral-800 hover:border-neutral-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${draft.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                      {draft.status === 'sent' ? 'भेजा गया (Sent)' : 'प्रतीक्षारत (Pending)'}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate pr-4">{draft.subject}</h3>
                  <p className="text-[11px] text-neutral-400 truncate">To: {draft.recipient}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Draft Preview & Detail */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl min-h-[700px] flex flex-col relative">
           <AnimatePresence mode="wait">
             {selectedDraft ? (
               <motion.div
                 key={selectedDraft.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="flex flex-col flex-1"
               >
                 <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Mail className="w-5 h-5 text-indigo-400" />
                       <span className="text-sm font-bold text-white">ड्राफ्ट विवरण</span>
                    </div>
                    <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                      <button 
                        onClick={() => setPreviewMode('rich')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${previewMode === 'rich' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                      >
                        Rich Preview
                      </button>
                      <button 
                        onClick={() => setPreviewMode('code')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${previewMode === 'code' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                      >
                        Plain Code
                      </button>
                    </div>
                 </div>

                
                  <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Recipients (Comma separated)</p>
                          <textarea 
                             className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                             value={selectedDraft.recipient}
                             onChange={(e) => setSelectedDraft({ ...selectedDraft, recipient: e.target.value })}
                             rows={3}
                          />
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Status</p>
                          <p className={`text-sm font-bold ${selectedDraft.status === 'sent' ? 'text-green-400' : 'text-yellow-400'}`}>
                             {selectedDraft.status === 'sent' ? 'भेजा गया ✔' : 'मंजूरी की प्रतीक्षा ✉'}
                          </p>
                       </div>
                    </div>
                    {/* ... rest of the UI (Subject, Content Preview) ... */}

                    <div className="space-y-1">
                       <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Subject</p>
                       <p className="text-base text-white font-bold">{selectedDraft.subject}</p>
                    </div>

                    <div className="pt-4 border-t border-neutral-800 space-y-3">
                       <div className="flex items-center justify-between">
                           <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Content Preview</p>
                           {selectedDraft.is_html === 1 && (
                             <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">HTML Supported</span>
                           )}
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner h-[400px]">
                           {previewMode === 'rich' && selectedDraft.is_html === 1 ? (
                              <iframe 
                                srcDoc={`
                                  <html>
                                    <head>
                                    <base target="_blank">
                                    <style>
                                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #333; line-height: 1.6; background: #fff; }
                                      .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
                                      .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999; }
                                    </style>
                                    </head>
                                    <body>${selectedDraft.body}</body>
                                  </html>
                                `}
                                className="w-full h-full border-0"
                              />
                            ) : (
                              <div className="p-6 h-full overflow-auto">
                                <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed">
                                  {selectedDraft.body}
                                </pre>
                              </div>
                            )}
                        </div>
                     </div>
                  </div>

                  <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                      <div className="flex gap-2">
                         <button 
                           onClick={() => handleDeleteDraft(selectedDraft.id)}
                           disabled={actionLoading === selectedDraft.id}
                           className="p-3 w-12 h-12 flex items-center justify-center bg-neutral-900 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-xl transition-all border border-neutral-800 hover:border-red-500/20 active:scale-95 shrink-0"
                           title="Delete Draft"
                         >
                           {actionLoading === selectedDraft.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                         </button>
                         {selectedDraft.status !== 'sent' && (
                           <button 
                             onClick={async () => {
                                setActionLoading('update');
                                await fetch(`/api/admin/emails/drafts/${selectedDraft.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ recipient: selectedDraft.recipient })
                                });
                                setActionLoading(null);
                                alert("Recipients Updated Successfully!");
                             }}
                             disabled={actionLoading === 'update'}
                             className="px-4 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all border border-indigo-500 active:scale-95 text-sm font-bold flex items-center gap-2"
                             title="Save List"
                           >
                             {actionLoading === 'update' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                             Save Recipients
                           </button>
                         )}
                      </div>
                     
                     {selectedDraft.status !== 'sent' ? (
                        <button 
                          onClick={() => handleSendDraft(selectedDraft.id)}
                          disabled={actionLoading === selectedDraft.id}
                          className="flex-1 max-w-[250px] bg-green-600 hover:bg-green-500 text-white h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-600/20 active:scale-[0.98]"
                        >
                          {actionLoading === selectedDraft.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          Approve & Send (Bulk)
                        </button>
                     ) : (
                       <div className="flex-1 bg-neutral-800 text-green-400 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-3 border border-neutral-700">
                          <Check className="w-5 h-5" />
                          Successfully Delivered
                       </div>
                     )}
                  </div>
                </motion.div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center">
                     <Eye className="w-10 h-10 text-neutral-700" />
                  </div>
                  <div className="text-center space-y-2">
                     <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">Preview Area</p>
                     <p className="text-neutral-600 text-sm">प्रिव्यू देखने के लिए बाईं ओर से एक ड्राफ्ट चुनें।</p>
                  </div>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
