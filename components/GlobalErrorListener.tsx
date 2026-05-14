'use client';

import { useEffect } from 'react';

export default function GlobalErrorListener() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
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
      const msg = event.reason?.message || String(event.reason);
      if (msg === 'Load failed' || msg === 'Failed to fetch' || msg === 'Network request failed') {
        event.preventDefault();
        return; // Avoid logging or bubbling up generic network failures
      }

      fetch('/api/report-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg,
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
