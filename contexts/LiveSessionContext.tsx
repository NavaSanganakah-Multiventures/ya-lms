'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import LiveClassWindow from '../app/components/LiveClassWindow';

interface LiveSessionContextType {
  activeSession: { roomId: string; sessionId: string; isAdmin: boolean } | null;
  startSession: (roomId: string, sessionId: string, isAdmin?: boolean) => void;
  endSession: () => void;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

export function LiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<{
    roomId: string;
    sessionId: string;
    isAdmin: boolean;
  } | null>(null);

  // Fetch current user info for whiteboard identity
  const [userInfo, setUserInfo] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    // Fetch profile to get userId + name for whiteboard
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data?.user) {
          setUserInfo({
            id: data.user.id || '',
            name: data.user.full_name || data.user.email || 'Unknown User',
          });
        }
        setUserLoaded(true);
      })
      .catch(() => { setUserLoaded(true); });
  }, []);

  const startSession = (roomId: string, sessionId: string, isAdmin: boolean = false) => {
    setActiveSession({ roomId, sessionId, isAdmin });
  };

  const endSession = () => {
    setActiveSession(null);
  };

  return (
    <LiveSessionContext.Provider value={{ activeSession, startSession, endSession }}>
      {children}
      {activeSession && userLoaded && userInfo.id && (
        <LiveClassWindow
          roomId={activeSession.roomId}
          sessionId={activeSession.sessionId}
          isAdmin={activeSession.isAdmin}
          onClose={endSession}
          userId={userInfo.id}
          userName={userInfo.name}
        />
      )}
      {activeSession && userLoaded && !userInfo.id && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Authentication Failed</h2>
            <p className="text-neutral-300 mb-6 text-sm">We could not verify your identity to join the live session. Please refresh the page and try again.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={endSession} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-bold transition-all">Close</button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all">Refresh Page</button>
            </div>
          </div>
        </div>
      )}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSession() {
  const context = useContext(LiveSessionContext);
  if (context === undefined) {
    throw new Error('useLiveSession must be used within a LiveSessionProvider');
  }
  return context;
}
