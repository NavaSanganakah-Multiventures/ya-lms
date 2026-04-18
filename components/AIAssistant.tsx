'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ai/history');
      if (res.ok) {
        const data = await res.json() as any[];
        setMessages(data.map(r => ({ role: r.role === 'ai' ? 'ai' : 'user', content: r.content })));
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  // Do not show on the login page (assuming root '/' is login)
  if (pathname === '/') return null;

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Stream': 'true'
        },
        body: JSON.stringify({ prompt: userMessage })
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        setMessages(prev => [...prev, { role: 'ai', content: '' }]);
        
        let done = false;
        let fullReply = '';
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunk = decoder.decode(value, { stream: true });
          
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const data = line.slice(6);
               if (data === '[DONE]') continue;
               try {
                 const json = JSON.parse(data);
                 const content = json.choices[0]?.delta?.content || '';
                 fullReply += content;
                 setMessages(prev => {
                   const n = [...prev];
                   n[n.length-1].content = fullReply;
                   return n;
                 });
               } catch (e) {}
            }
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'सिस्टम में तकनीकी समस्या है, कृपया बाद में प्रयास करें।' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection failed. Please verify your connection.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 z-50 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 relative pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 h-[500px] max-h-[80vh]">
          {/* Header */}
          <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/20 p-2 rounded-lg">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">Yagya AI</h3>
                <p className="text-xs text-neutral-400">Student & Admin Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/50"
          >
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 mt-10">
                <p className="font-medium text-neutral-400">नमस्ते! मैं आपका सहायक AI हूँ।</p>
                <p className="text-sm mt-2">आप मुझसे कोर्स, टॉपिक्स या मैनेजमेंट से जुड़ा कोई भी सवाल पूछ सकते हैं।</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-sm' 
                    : 'bg-neutral-800 text-neutral-200 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-tl-sm p-4 w-16 flex items-center justify-center shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="यहाँ अपना सवाल लिखें..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
