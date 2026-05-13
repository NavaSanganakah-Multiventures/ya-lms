'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles, Plus } from 'lucide-react';
import { motion } from 'motion/react';

const createAIChatSessionId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface AITutorProps {
  lesson: any;
  course: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function AITutor({ lesson, course, isOpen, onClose }: AITutorProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const lessonSessionPrefix = `lesson-tutor-${lesson?.id || 'general'}`;
  const storageKey = `ya-ai-tutor-session-id:${lesson?.id || 'general'}`;
  const [chatSessionId, setChatSessionId] = useState(() => {
    if (typeof window === 'undefined') return '';

    const storedSessionId = localStorage.getItem(storageKey);
    if (storedSessionId) return storedSessionId;

    const initialSessionId = createAIChatSessionId(lessonSessionPrefix);
    localStorage.setItem(storageKey, initialSessionId);
    return initialSessionId;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const startNewChat = () => {
    const nextSessionId = createAIChatSessionId(lessonSessionPrefix);
    localStorage.setItem(storageKey, nextSessionId);
    setChatSessionId(nextSessionId);
    setMessages([]);
    setInput('');
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedSessionId = localStorage.getItem(storageKey);
      if (storedSessionId) {
        setChatSessionId(storedSessionId);
        setMessages([]);
        return;
      }

      const initialSessionId = createAIChatSessionId(lessonSessionPrefix);
      localStorage.setItem(storageKey, initialSessionId);
      setChatSessionId(initialSessionId);
      setMessages([]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [lessonSessionPrefix, storageKey]);

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

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const activeSessionId = chatSessionId || createAIChatSessionId(lessonSessionPrefix);
    if (!chatSessionId) {
      localStorage.setItem(storageKey, activeSessionId);
      setChatSessionId(activeSessionId);
    }

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // We pass the context about the current lesson so the AI knows what we are talking about
      const promptWithContext = `I am currently studying the lesson "${lesson.title}" from the course "${course.title}". 
      Lesson Type: ${lesson.type}.
      Student Question: ${userMessage}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          prompt: promptWithContext,
          isTutor: true,
          lessonId: lesson.id,
          sessionId: activeSessionId
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        setMessages((prev) => [...prev, { role: 'ai', content: data.reply || 'कार्य पूर्ण हुआ।' }]);
      } else {
        const errorData = await res.json().catch(() => ({})) as any;
        const errorMsg = errorData.error || errorData.reply || 'सिस्टम में तकनीकी समस्या है। कृपया फिर से प्रयास करें।';
        setMessages((prev) => [...prev, { role: 'ai', content: errorMsg }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Connection failed. Please check your network.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed top-16 right-0 bottom-0 w-full md:w-96 bg-neutral-900 border-l border-neutral-800 z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600/20 p-2 rounded-xl border border-orange-500/20">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">AI Tutor</h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Assisting: {lesson.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={startNewChat}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            aria-label="Start new chat"
            title="Start new chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="space-y-4 mt-8">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
              <Bot className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold">Namaste!</h4>
              <p className="text-sm text-neutral-400 mt-2">
                मैं आपका निजी ट्यूटर हूँ। आप मुझसे इस पाठ &quot;{lesson.title}&quot; के बारे में कुछ भी पूछ सकते हैं।
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                "इस पाठ का सारांश क्या है?",
                "मुख्य बिंदु समझाएं",
                "मुझे एक उदाहरण दें"
              ].map((q, i) => (
                <button 
                  key={i}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors border border-neutral-700/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-orange-600 text-white rounded-2xl rounded-tr-sm shadow-sm font-medium'
                : 'bg-neutral-800 text-neutral-200 rounded-2xl rounded-tl-sm shadow-sm border border-neutral-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-tl-sm p-3 w-14 flex items-center justify-center shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-neutral-950 border-t border-neutral-800">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="अपना सवाल पूछें..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1.5 p-1.5 bg-orange-600 text-white rounded-xl hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-neutral-600 text-center mt-3">Powered by Yagya AI Engine</p>
      </div>
    </motion.div>
  );
}
