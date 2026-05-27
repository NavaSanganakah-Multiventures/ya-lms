'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveSession } from '@/contexts/LiveSessionContext';


function LivePageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const { startSession, activeSession } = useLiveSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      const timer = setTimeout(() => {
        setError('Live class meeting ID missing hai.');
      }, 0);
      return () => clearTimeout(timer);
    }
    if (!activeSession) {
      startSession(roomId, roomId);
    }
  }, [roomId, startSession, activeSession]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <a href="/dashboard" className="text-violet-400 underline text-sm">Dashboard par wapas jayein</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 mx-auto border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-neutral-300">Live class join ho rahi hai...</p>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-300">Live class join ho rahi hai...</p>
        </div>
      </div>
    }>
      <LivePageContent />
    </Suspense>
  );
}
