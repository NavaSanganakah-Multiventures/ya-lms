'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';

const safeRandomId = (): string => {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
};

const createAIChatSessionId = (prefix: string) =>
  `${prefix}-${Date.now()}-${safeRandomId().split('-')[0]}`;

export default function AIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Avoid reading localStorage during state initialization to prevent SSR/hydration mismatch.
  const [chatSessionId, setChatSessionId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedSessionId = localStorage.getItem('ya-ai-assistant-session-id');
    if (storedSessionId) {
      setChatSessionId(storedSessionId);
    } else {
      const initialSessionId = createAIChatSessionId('student-assistant');
      localStorage.setItem('ya-ai-assistant-session-id', initialSessionId);
      setChatSessionId(initialSessionId);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const startNewChat = () => {
    const nextSessionId = createAIChatSessionId('student-assistant');
    localStorage.setItem('ya-ai-assistant-session-id', nextSessionId);
    setChatSessionId(nextSessionId);
    setMessages([]);
    setInput('');
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!chatSessionId) return;
        const res = await fetch(`/api/ai/history?sessionId=${encodeURIComponent(chatSessionId)}`);
        if (res.ok) {
          const data = await res.json() as any[];
          setMessages(data.map(r => ({ role: r.role === 'ai' ? 'ai' : 'user', content: r.content })));
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
    };
    if (isOpen && chatSessionId) {
      fetchHistory();
    }
  }, [isOpen, chatSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Do not show on the login page or in the admin panel.
  // We allow it on '/' now as per requirements, but maybe the user wants it hidden on '/' based on this comment.
  // Wait, the user said "home page per hi Hamara artificial intelligence hai isko aise karo ki Bina login ke koi bhi sawal jawab Na kar sake".
  // Let's make sure it's visible on the home page so they can interact and get the login prompt.
  // Hide on login and admin pages
  // Hide on login and admin pages
  if (pathname === '/auth/login' || pathname.startsWith('/admin')) return null;

  // On home page, we want a slightly different default message and strict no-auth UI
  const isHomePage = pathname === '/';

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const activeSessionId = chatSessionId || createAIChatSessionId('student-assistant');
    if (!chatSessionId) {
      localStorage.setItem('ya-ai-assistant-session-id', activeSessionId);
      setChatSessionId(activeSessionId);
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userMessage, sessionId: activeSessionId })
      });

      if (res.ok) {
        const data = await res.json() as any;
        setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'कार्य पूर्ण हुआ।' }]);
      } else if (res.status === 401) {
        setMessages(prev => [...prev, { role: 'ai', content: 'कृपया AI सहायक का उपयोग करने के लिए लॉगिन करें। (Please log in to use the AI Assistant)' }]);
      } else if (res.status === 429) {
         const data = await res.json() as any;
         setMessages(prev => [...prev, { role: 'ai', content: data.error || 'आपके AI क्रेडिट समाप्त हो गए हैं या बहुत अधिक अनुरोध हुए हैं।' }]);
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
        className={`fixed bottom-24 right-4 sm:bottom-6 sm:right-6 p-4 bg-orange-600 hover:bg-orange-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 z-[60] flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 relative pointer-events-none' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Assistant"
        title="Open AI Assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 bottom-20 h-[min(500px,calc(100dvh-7rem))] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[60] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[500px] sm:max-h-[80dvh]">
          {/* Header */}
          <div className="bg-neutral-950 p-3 sm:p-4 border-b border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600/20 p-2 rounded-lg">
                <Bot className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">Yagya Mitra</h3>
                <p className="text-xs text-neutral-400">यज्ञ मित्र • विद्या सहायक</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={startNewChat}
                className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Start new chat"
                title="Start new chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900/50"
          >
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 mt-10">
                <p className="font-medium text-neutral-400">नमस्ते! मैं आपका &quot;यज्ञ मित्र&quot; हूँ।</p>
                {isHomePage ? (
                   <p className="text-sm mt-2 leading-relaxed px-4">यज्ञ आश्रम में आपका स्वागत है! मैं एक AI सहायक हूँ। कृपया अपने सवाल पूछने के लिए लॉगिन करें।</p>
                ) : (
                   <p className="text-sm mt-2 leading-relaxed px-4">मैं आपकी पढ़ाई, कोर्सेस और आश्रम के नियमों को समझने में मदद करूँगा। आप मुझसे कुछ भी पूछ सकते हैं!</p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-orange-600 text-white rounded-2xl rounded-tr-sm shadow-sm'
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
                className="min-w-0 flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-base sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading}
                className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
                title="Send message"
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
