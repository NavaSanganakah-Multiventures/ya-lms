'use client';

import { useEffect } from 'react';

const QUEUE_KEY = 'error_report_queue';
const MAX_RETRIES = 3;

function getQueue(): any[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setQueue(queue: any[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {}
}

async function sendReport(body: any): Promise<boolean> {
  try {
    const res = await fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function enqueueReport(body: any) {
  const queue = getQueue();
  queue.push({ body, retries: 0, timestamp: Date.now() });
  setQueue(queue);
}

async function processQueue() {
  const queue = getQueue();
  if (!queue.length) return;

  const remaining: any[] = [];
  for (const item of queue) {
    if (item.retries >= MAX_RETRIES) continue;
    const ok = await sendReport(item.body);
    if (!ok) {
      remaining.push({ ...item, retries: item.retries + 1 });
    }
  }
  setQueue(remaining);
}

export default function GlobalErrorListener() {
  useEffect(() => {
    processQueue();

    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('ResizeObserver loop') ||
        event.message?.includes('Load failed')
      ) {
        event.preventDefault();
        return;
      }

      const body = {
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        deviceInfo: navigator.userAgent,
        type: 'Global JS Error',
      };

      sendReport(body).then(ok => {
        if (!ok) enqueueReport(body);
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason);
      if (msg.includes('Load failed') || msg.includes('AwaitQueue stopped')) {
        event.preventDefault();
        return;
      }

      const body = {
        message: msg,
        stack: event.reason?.stack,
        url: window.location.href,
        deviceInfo: navigator.userAgent,
        type: 'Unhandled Promise Rejection',
      };

      sendReport(body).then(ok => {
        if (!ok) enqueueReport(body);
      });
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
