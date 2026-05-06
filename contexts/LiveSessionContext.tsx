'use client';

import React, { createContext, useContext, useState } from 'react';
import LiveClassWindow from '../app/components/LiveClassWindow';

interface LiveSessionContextType {
  activeSession: { roomId: string, sessionId: string, isAdmin: boolean } | null;
  startSession: (roomId: string, sessionId: string, isAdmin?: boolean) => void;
  endSession: () => void;
}

const LiveSessionContext = createContext<LiveSessionContextType | undefined>(undefined);

export function LiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<{ roomId: string, sessionId: string, isAdmin: boolean } | null>(null);

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
