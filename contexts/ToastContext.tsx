"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10);
    setToasts((prev) => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
    toastTimersRef.current.set(id, timer);
  }, []);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const warning = useCallback((msg: string) => toast(msg, "warning"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);

  // Listen to Global Broadcasts
  useRealtimeChannel('global', (event) => {
    if (event.type === 'notification' && event.data?.message) {
      info(event.data.message);
    }
  });

  // Listen to User-Specific Broadcasts
  useRealtimeChannel('user:me', (event) => {
    if (event.type === 'notification' && event.data?.message) {
      info(event.data.message);
    }
  });

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "error":
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 shadow-emerald-500/10";
      case "error":
        return "border-rose-500/30 shadow-rose-500/10";
      case "warning":
        return "border-amber-500/30 shadow-amber-500/10";
      default:
        return "border-blue-500/30 shadow-blue-500/10";
    }
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full sm:w-96 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-4 bg-neutral-950/80 backdrop-blur-md border rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-0 animate-fade-in-up ${getBorderColor(
              t.type
            )}`}
            role="alert"
          >
            <div className="flex items-center gap-3">
              {getIcon(t.type)}
              <p className="text-sm font-medium text-white select-none">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors ml-4 shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
