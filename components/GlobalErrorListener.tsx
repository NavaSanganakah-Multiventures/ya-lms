'use client';

import { useEffect } from 'react';

export default function GlobalErrorListener() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress known non-critical browser warnings/errors from noise and crashes
      if (
        event.message.includes('ResizeObserver loop') ||
        event.message.includes('Load failed')
      ) {
        event.preventDefault();
        return;
      }

      fetch('/api/report-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: event.message,
          stack: event.error?.stack,
          url: window.location.href,
          deviceInfo: navigator.userAgent,
          type: 'Global JS Error',
        }),
      }).catch(err => console.error('Failed to report global error:', err));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      fetch('/api/report-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          url: window.location.href,
          deviceInfo: navigator.userAgent,
          type: 'Unhandled Promise Rejection',
        }),
      }).catch(err => console.error('Failed to report promise rejection:', err));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
