'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles, Terminal, Activity, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAIProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminAI({ isOpen, onClose }: AdminAIProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const promptWithContext = `I am the System Administrator for the Yagya Ashram LMS. 
      I need help with platform management, analytics, or developer tasks.
      Admin Inquiry: ${userMessage}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptWithContext,
          isAdmin: true
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        setMessages((prev) => [...prev, { role: 'ai', content: data.reply || 'Namaste Admin, I am currently processing several system tasks. How else can I help?' }]);
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
          <div className="bg-indigo-600/20 p-2.5 rounded-2xl border border-indigo-500/30">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg tracking-tight">Admin AI Intelligence</h3>
            <p className="text-[10px] text-green-500 uppercase tracking-[0.2em] font-mono animate-pulse">System Secured • Online</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats/Quick Info (Optional) */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/20 p-3 gap-2">
         <div className="flex-1 rounded-lg bg-neutral-900/50 p-2 border border-neutral-800/50 flex items-center gap-2">
            <Activity className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] text-neutral-400 font-mono">D1 HEALTH: OK</span>
         </div>
         <div className="flex-1 rounded-lg bg-neutral-900/50 p-2 border border-neutral-800/50 flex items-center gap-2">
            <Terminal className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-neutral-400 font-mono">LOGS: ACTIVE</span>
         </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[radial-gradient(circle_at_top_right,rgba(30,30,60,0.1),transparent)]"
      >
        {messages.length === 0 && (
          <div className="space-y-6 mt-10">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-8 text-center backdrop-blur-sm">
              <Bot className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h4 className="text-white text-xl font-bold">Admin Assistant</h4>
              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
                Welcome back, Admin. I can help you analyze course performance, manage users, or generate system reports.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                "कोर्स परफॉर्मेंस रिपोर्ट दिखाएं",
                "नए यूजर्स की लिस्ट दें",
                "सिस्टम यूसेज स्टैट्स दिखाएं",
                "सपोर्ट टिकट्स की स्थिति"
              ].map((q, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs p-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-2xl transition-all border border-neutral-800 hover:border-indigo-500/30 flex items-center gap-3 group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-4 text-sm leading-relaxed shadow-lg ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm font-medium' 
                : 'bg-neutral-900 text-neutral-200 rounded-2xl rounded-tl-sm border border-neutral-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-4 w-16 flex items-center justify-center shadow-lg">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-neutral-900/50 border-t border-neutral-800 backdrop-blur-md">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="सिस्टम कमांड या प्रश्न टाइप करें..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-4 pl-5 pr-14 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 top-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="flex justify-between items-center mt-4">
           <p className="text-[10px] text-neutral-600 font-mono tracking-widest">NavaSanganakah OS v1.0</p>
           <button className="text-[10px] text-indigo-400/70 hover:text-indigo-400 font-medium">रीबूट करें</button>
        </div>
      </div>
    </motion.div>
  );
}
