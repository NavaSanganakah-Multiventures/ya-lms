'use client';

import React, { useState } from 'react';

// LEGACY: WebPushTest component (DEPRECATED — use Firebase FCM for push notifications)
// This component is kept for development/testing of the legacy VAPID web push path only.
// New push subscriptions should use Firebase Cloud Messaging via /api/notifications/register-device.

export default function WebPushTest() {
  const [status, setStatus] = useState<string>('');

  const handleBroadcast = async () => {
    setStatus('Broadcasting...');
    try {
      const res = await fetch('/api/web-push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hello from NS LMS!',
          body: 'This is a test web push broadcast.',
          data: { url: '/' }
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to trigger broadcast');
      }

      setStatus('Broadcast triggered successfully!');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4 border border-yellow-400/30 rounded-md shadow-sm bg-yellow-50/10 text-white space-y-4 max-w-md mx-auto my-8">
      <h2 className="text-xl font-bold text-yellow-400">Legacy Web Push Test</h2>
      <p className="text-xs text-yellow-300/70">
        DEPRECATED — Use FCM for new integrations. This component is for legacy test broadcasts only.
      </p>
      <p className="text-sm text-gray-400">Status: {status}</p>

      <div className="flex space-x-2">
        <button
          onClick={handleBroadcast}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
        >
          Test Legacy Broadcast
        </button>
      </div>
    </div>
  );
}
