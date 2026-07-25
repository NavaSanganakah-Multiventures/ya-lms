'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

export interface ProctoringViolation {
  type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'right_click' | 'fullscreen_exit';
  message: string;
  timestamp: string;
}

interface UseProctoringOptions {
  enabled: boolean;
  maxWarnings?: number;
  examId?: string;
  onAutoSubmit?: () => void;
}

interface UseProctoringReturn {
  warningCount: number;
  violations: ProctoringViolation[];
  latestViolation: ProctoringViolation | null;
  isFullscreen: boolean;
  requestFullscreen: () => void;
  clearLatestViolation: () => void;
}

export function useProctoring({
  enabled,
  maxWarnings = 3,
  examId,
  onAutoSubmit,
}: UseProctoringOptions): UseProctoringReturn {
  const [warningCount, setWarningCount] = useState(0);
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const [latestViolation, setLatestViolation] = useState<ProctoringViolation | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const warningCountRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logViolation = useCallback(async (violation: ProctoringViolation) => {
    if (!examId) return;
    try {
      await fetch(`/api/exams/${examId}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violation),
      });
    } catch (_) {
      // silent fail — don't block the UI
    }
  }, [examId]);

  const addViolation = useCallback((type: ProctoringViolation['type'], message: string) => {
    if (!enabled || isSubmittingRef.current) return;

    // Debounce: prevent double-counting blur + tab_switch within 500ms
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 500) return;
    lastViolationTimeRef.current = now;

    const violation: ProctoringViolation = {
      type,
      message,
      timestamp: new Date().toISOString(),
    };

    setViolations(prev => [...prev, violation]);
    setLatestViolation(violation);
    logViolation(violation);

    warningCountRef.current += 1;
    setWarningCount(warningCountRef.current);

    if (warningCountRef.current >= maxWarnings) {
      isSubmittingRef.current = true;
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = setTimeout(() => {
        onAutoSubmit?.();
      }, 2000); // 2 second delay to show the final warning
    }
  }, [enabled, maxWarnings, onAutoSubmit, logViolation]);

  // Tab Switch & Window Blur Detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('tab_switch', 'Tab switch detected! Do not leave the exam window.');
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        addViolation('window_blur', 'Window focus lost! Stay in the exam window.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, addViolation]);

  // Copy / Paste / Cut Block
  useEffect(() => {
    if (!enabled) return;

    const blockCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy_paste', 'Copy/paste is not allowed during the exam.');
    };

    document.addEventListener('copy', blockCopyPaste);
    document.addEventListener('paste', blockCopyPaste);
    document.addEventListener('cut', blockCopyPaste);

    return () => {
      document.removeEventListener('copy', blockCopyPaste);
      document.removeEventListener('paste', blockCopyPaste);
      document.removeEventListener('cut', blockCopyPaste);
    };
  }, [enabled, addViolation]);

  // Right-Click Block
  useEffect(() => {
    if (!enabled) return;

    const blockRightClick = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('right_click', 'Right-click is disabled during the exam.');
    };

    document.addEventListener('contextmenu', blockRightClick);
    return () => document.removeEventListener('contextmenu', blockRightClick);
  }, [enabled, addViolation]);

  // Keyboard Shortcut Block (F12, Ctrl+Shift+I, Ctrl+U etc.)
  useEffect(() => {
    if (!enabled) return;

    const blockShortcuts = (e: KeyboardEvent) => {
      const forbidden =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U') ||
        (e.ctrlKey && e.key.toUpperCase() === 'P'); // Print

      if (forbidden) {
        e.preventDefault();
        addViolation('copy_paste', 'Developer tools / print shortcut blocked.');
      }
    };

    document.addEventListener('keydown', blockShortcuts);
    return () => document.removeEventListener('keydown', blockShortcuts);
  }, [enabled, addViolation]);

  // Fullscreen Detection
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && warningCountRef.current < maxWarnings) {
        addViolation('fullscreen_exit', 'You exited fullscreen mode. Please return to fullscreen.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, addViolation, maxWarnings]);

  // Request Fullscreen
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  const clearLatestViolation = useCallback(() => {
    setLatestViolation(null);
  }, []);

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      warningCountRef.current = 0;
      isSubmittingRef.current = false;
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
      const timer = setTimeout(() => {
        setWarningCount(0);
        setViolations([]);
        setLatestViolation(null);
      }, 0);
      // Exit fullscreen if enabled
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return () => clearTimeout(timer);
    }
  }, [enabled]);

  return {
    warningCount,
    violations,
    latestViolation,
    isFullscreen,
    requestFullscreen,
    clearLatestViolation,
  };
}
