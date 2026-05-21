'use client';

import { useState } from 'react';
import { Sparkles, Languages, Globe, Search, Loader2, Check, Copy, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContentAIProps {
  context: 'course' | 'batch' | 'form';
  initialData?: {
    title_en?: string;
    description_en?: string;
  };
  onApply: (data: any) => void;
}

export default function ContentAI({ context, initialData, onApply }: ContentAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const handleGenerate = async (type: 'translate' | 'seo' | 'optimize') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/content-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          context, 
          type, 
          data: initialData 
        })
      });
      if (res.ok) {
        const result = await res.json() as any;
        setSuggestion(result.suggestion);
      }
    } catch (e) {
      console.error("AI Generation failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 group"
      >
        <Sparkles className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform" />
        AI Content Assistant
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl z-50 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                AI Magic
              </h4>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white" aria-label="Refresh/Close" title="Refresh/Close">
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">सहायता चुनें (Choose Action)</p>
              
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleGenerate('translate')}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-2xl border border-neutral-700 hover:border-orange-500/30 transition-all text-left group"
                >
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20">
                    <Languages className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white">Translate English to Hindi</p>
                    <p className="text-[9px] text-neutral-500 font-bold">शीर्षक और विवरण का अनुवाद करें</p>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerate('seo')}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-2xl border border-neutral-700 hover:border-emerald-500/30 transition-all text-left group"
                >
                  <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20">
                    <Search className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white">Generate Bilingual SEO</p>
                    <p className="text-[9px] text-neutral-500 font-bold">Title, Description & Keywords</p>
                  </div>
                </button>
              </div>

              {isLoading && (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest animate-pulse">Thinking...</p>
                </div>
              )}

              {suggestion && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 space-y-4 pt-4 border-t border-neutral-800"
                >
                  <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {Object.entries(suggestion).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-black/40 p-3 rounded-xl border border-neutral-800">
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-neutral-300 font-bold leading-relaxed">{val}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onApply(suggestion);
                      setIsOpen(false);
                    }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <Check className="w-4 h-4" />
                    लागू करें (Apply Changes)
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
