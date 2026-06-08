'use client';

import React, { useState } from 'react';
import { subscribeToWebPush } from '../lib/web-push';

export default function WebPushTest() {
  const [status, setStatus] = useState<string>('');

  const handleSubscribe = async () => {
    setStatus('Subscribing...');
    try {
      await subscribeToWebPush();
      setStatus('Successfully subscribed to Web Push Notifications!');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: \${error.message}`);
    }
  };

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
      setStatus(`Error: \${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white text-black space-y-4 max-w-md mx-auto my-8">
      <h2 className="text-xl font-bold">Web Push Setup</h2>
      <p className="text-sm text-gray-600">Status: {status}</p>

      <div className="flex space-x-2">
        <button
          onClick={handleSubscribe}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Subscribe
        </button>

        <button
          onClick={handleBroadcast}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Test Broadcast
        </button>
      </div>
    </div>
  );
}
