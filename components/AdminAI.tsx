'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles, Terminal, Activity, ShieldCheck, Mail, Check, Trash2, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAIProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

const TypewriterMessage = ({ content }: { content: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      if (i < content.length) {
        setDisplayedText(prev => prev + content.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 15); // Adjust typing speed here
    
    return () => clearInterval(timer);
  }, [content]);

  return <>{displayedText}</>;
};

export default function AdminAI({ isOpen, onClose }: AdminAIProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; draft?: EmailDraft }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [previewMode, setPreviewMode] = useState<'text' | 'html'>('html');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string>(() => 'sess_' + Date.now());

  useEffect(() => {
    fetchHistory(sessionId);
  }, [sessionId]);

  const fetchHistory = async (sid: string) => {
    try {
      const res = await fetch(`/api/ai/history?sessionId=${sid}`);
      if (res.ok) {
        const data = await res.json() as any[];
        setMessages(data.map(r => ({ role: r.role === 'ai' ? 'ai' : 'user', content: r.content })));
      }
    } catch (e) {
      console.error("Failed to fetch AI history", e);
    }
  };

  const handleNewChat = () => {
    setSessionId('sess_' + Date.now());
    setMessages([]);
  };

  const handleClearHistory = async (all: boolean = false) => {
    if (!confirm(all ? 'क्या आप पूरी चैट हिस्ट्री डिलीट करना चाहते हैं?' : 'क्या आप इस सेशन की चैट हिस्ट्री डिलीट करना चाहते हैं?')) return;
    try {
      const url = all ? '/api/ai/history' : `/api/ai/history?sessionId=${sessionId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (all) {
          handleNewChat();
        } else {
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendEmail = async (draft: EmailDraft, msgIndex: number) => {
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, isHtml: true })
      });
      if (res.ok) {
        setMessages(prev => {
          const next = [...prev];
          next[msgIndex] = { 
            ...next[msgIndex], 
            content: '✅ ईमेल भेज दिया गया! आप इसे [ईमेल ड्राफ्ट्स पेज](/admin/emails) पर देख सकते हैं।', 
            draft: undefined 
          };
          return next;
        });
      } else {
        alert('ईमेल भेजने में विफल।');
      }
    } catch (e) {
      alert('Network error.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const promptWithContext = `I am the System Administrator for the Yagya Ashram LMS. 
      I need help with platform management, analytics, email drafting (Sender: om@yagyaashram.com, Yagya Ashram), or developer tasks.
      If you perform a database action (create, edit, delete), you MUST include the "action" object in your JSON response.
      
      Admin Inquiry: ${userMessage}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prompt: promptWithContext,
          isAdmin: true,
          sessionId: sessionId
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        let contentToDisplay = data.reply || 'कार्य पूर्ण हुआ।';
        let draftToDisplay = undefined;

        if (data.action?.type === 'draft_email') {
          draftToDisplay = data.action.params;
        }

        // Post-processing PDF
        if (contentToDisplay.includes('GENERATE_PDF:')) {
          try {
            const jsonPart = contentToDisplay.split('GENERATE_PDF:')[1];
            const pdfData = JSON.parse(jsonPart);
            const pdfRes = await fetch('/api/admin/generate-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pdfData)
            });
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'report.pdf';
              a.click();
              contentToDisplay = 'आपका पीडीएफ रिपोर्ट तैयार है और डाउनलोड शुरू हो गया है!';
            }
          } catch(e) {}
        }

        setMessages((prev) => [...prev, { role: 'ai', content: contentToDisplay, draft: draftToDisplay }]);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: 'System latency detected. Please retry your request.' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Network disruption in secure channel.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] bg-neutral-950 border-l border-neutral-800 z-50 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="p-6 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600/20 p-2.5 rounded-2xl border border-orange-500/30">
            <ShieldCheck className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">Admin AI Intelligence</h3>
            <p className="text-[10px] text-green-500 uppercase tracking-[0.2em] font-mono animate-pulse">System Secured • Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNewChat} title="New Chat" className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => handleClearHistory(false)} title="Clear Session" className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} title="Close" className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[radial-gradient(circle_at_top_right,rgba(30,30,60,0.1),transparent)]"
      >
        {messages.length === 0 && (
          <div className="space-y-6 mt-10">
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-8 text-center backdrop-blur-sm">
              <Bot className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h4 className="text-white text-xl font-bold">Admin Assistant</h4>
              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
                Welcome back, Admin. I can help you analyze course performance, manage users, draft emails, or generate system reports.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                "कोर्स परफॉर्मेंस रिपोर्ट दिखाएं",
                "नए यूजर्स की लिस्ट दें",
                "स्टूडेंट acharypdt@gmail.com को कोर्स की बधाई का ईमेल ड्राफ्ट करें",
                "सिस्टम यूसेज स्टैट्स दिखाएं"
              ].map((q, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs p-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-2xl transition-all border border-neutral-800 hover:border-orange-500/30 flex items-center gap-3 group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40 group-hover:bg-orange-500 transition-colors" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 text-sm leading-relaxed shadow-lg whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-orange-600 text-white rounded-2xl rounded-tr-sm font-medium'
                  : 'bg-neutral-900 text-neutral-200 rounded-2xl rounded-tl-sm border border-neutral-800'
              }`}>
                {msg.role === 'ai' && i === messages.length - 1 ? (
                  <TypewriterMessage content={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            </div>

            {/* Email Draft Preview */}
            {msg.draft && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-orange-500/30 rounded-2xl overflow-hidden shadow-xl mx-2"
              >
                <div className="p-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-white">ईमेल ड्राफ्ट (Email Draft)</span>
                  </div>
                  <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button 
                      onClick={() => setPreviewMode('html')}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${previewMode === 'html' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-400'}`}
                    >
                      Rich
                    </button>
                    <button 
                      onClick={() => setPreviewMode('text')}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${previewMode === 'text' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-400'}`}
                    >
                      Code
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                    <span>To: <span className="text-orange-300 ml-1">{msg.draft.to}</span></span>
                    <span>Subject: <span className="text-white ml-1">{msg.draft.subject}</span></span>
                  </div>
                  
                  <div className="pt-3 border-t border-neutral-800">
                    {previewMode === 'html' ? (
                      <div className="bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-inner h-[250px] relative">
                         <iframe 
                           srcDoc={`
                            <html>
                               <head>
                                 <base target="_blank">
                                 <style>
                                   body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                                   .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
                                   .footer { margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999; }
                                 </style>
                               </head>
                               <body>
                                 ${msg.draft.body}
                               </body>
                             </html>
                           `}
                           className="w-full h-full border-0"
                           title="Email Preview"
                         />
                      </div>
                    ) : (
                      <div className="bg-black/50 p-4 rounded-xl border border-neutral-800 h-[250px] overflow-auto scrollbar-hide">
                         <pre className="text-[11px] text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed">
                           {msg.draft.body}
                         </pre>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex gap-2">
                  <button 
                    onClick={() => handleSendEmail(msg.draft!, i)}
                    disabled={isSendingEmail}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/10 hover:shadow-green-500/20"
                  >
                    {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    अनुमोदन करें और भेजें
                  </button>
                  <button 
                    onClick={() => {
                      setMessages(prev => {
                        const n = [...prev];
                        n[i] = { ...n[i], draft: undefined, content: 'ईमेल ड्राफ्ट रद्द कर दिया गया।' };
                        return n;
                      });
                    }}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl transition-all border border-neutral-700 hover:border-neutral-600 shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-4 w-auto flex items-center justify-center shadow-lg gap-3">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs text-orange-400/80 font-medium animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-neutral-900/50 border-t border-neutral-800 backdrop-blur-md font-sans">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="सिस्टम कमांड या प्रश्न टाइप करें..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-5 pr-14 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 top-2 p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="flex justify-between items-center mt-4">
           <p className="text-[10px] text-neutral-600 font-mono tracking-widest uppercase">Yagya AI Platform OS</p>
           <button onClick={() => handleClearHistory(true)} className="text-[10px] text-red-400/70 hover:text-red-400 font-medium transition-colors">पूरी हिस्ट्री डिलीट करें</button>
        </div>
      </div>
    </motion.div>
  );
}
