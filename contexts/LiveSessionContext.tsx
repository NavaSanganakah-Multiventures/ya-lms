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
  const [userInfo, setUserInfo] = useState<{ id: string; name: string }>({ id: 'unknown', name: 'Unknown User' });

  useEffect(() => {
    // Fetch profile to get userId + name for whiteboard
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data?.user) {
          setUserInfo({
            id: data.user.id || 'unknown',
            name: data.user.full_name || data.user.email || 'Unknown User',
          });
        }
      })
      .catch(() => {});
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
      {activeSession && (
        <LiveClassWindow
          roomId={activeSession.roomId}
          sessionId={activeSession.sessionId}
          isAdmin={activeSession.isAdmin}
          onClose={endSession}
          userId={userInfo.id}
          userName={userInfo.name}
        />
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
