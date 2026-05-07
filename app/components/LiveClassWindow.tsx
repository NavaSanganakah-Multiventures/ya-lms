'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X, Users, Minimize2, Maximize2, Mic, MicOff, Layout, Timer } from 'lucide-react';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting, provideRtkDesignSystem } from '@cloudflare/realtimekit-react-ui';
import AITeacher from './AITeacher';
import WhiteboardPanel from './WhiteboardPanel';

// ─────────────────────────────────────────────────────
//  Apply Adityanveshan Brand Theme to RealtimeKit UI Kit
//  Called via useEffect on mount (needs document.body for SSR safety)
// ─────────────────────────────────────────────────────
const YA_THEME = {
  theme: 'darkest' as const,
  colors: {
    brand: {
      300: '#FDBA74',
      500: '#EA580C',
      700: '#9A3412',
    },
    background: {
      500: '#0A0A0A',
      600: '#111111',
      700: '#1A1A1A',
    },
    text: '#F5F5F5',
    danger: '#EF4444',
  },
  fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
  borderRadius: 'rounded' as const,
  borderWidth: 'thin' as const,
};

// ─────────────────────────────────────────────────────
//  Live Timer Hook
// ─────────────────────────────────────────────────────
function useLiveTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ─────────────────────────────────────────────────────
//  Inner meeting view (uses useRealtimeKitClient hook)
// ─────────────────────────────────────────────────────
function RealtimeMeetingView({
  meeting,
  roomId,
  sessionId,
  onClose,
  isAdmin,
  userId,
  userName,
}: {
  meeting: any;
  roomId: string;
  sessionId: string;
  onClose: () => void;
  isAdmin: boolean;
  userId: string;
  userName: string;
}) {
  const [aiActive, setAiActive] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [canWriteWhiteboard, setCanWriteWhiteboard] = useState(false); // for students
  const liveTime = useLiveTimer();

  // Students: listen for whiteboard permission signals
  useEffect(() => {
    if (isAdmin) return;
    // The WhiteboardPanel itself handles permission polling.
    // This state is passed down so the button label updates.
  }, [isAdmin]);

  // Auto PiP on tab change
  useEffect(() => {
    if (!meeting) return;
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const videoEl = document.querySelector('video');
        if (videoEl && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          try { await videoEl.requestPictureInPicture(); } catch {}
        }
      } else if (document.pictureInPictureElement) {
        try { await document.exitPictureInPicture(); } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [meeting]);

  const toggleRecording = async () => {
    const action = isRecording ? 'stop' : 'start';
    try {
      const res = await fetch('/api/live/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: roomId, action }),
      });
      if (res.ok) setIsRecording(!isRecording);
      else alert('Failed to change recording status.');
    } catch { alert('Error toggling recording.'); }
  };

  const endClass = async () => {
    if (!confirm('Are you sure you want to end this meeting for everyone? This will save the recording.')) return;
    try {
      const res = await fetch('/api/live/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: roomId }),
      });
      if (res.ok) { alert('Meeting ended successfully.'); onClose(); }
    } catch { console.error('End class failed.'); }
  };

  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-orange-500/20 rounded-full animate-ping absolute" />
          <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">कनेक्ट हो रहा है...</h3>
          <p className="text-neutral-500 text-sm">Cloudflare Realtime से जुड़ रहे हैं...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative w-full h-full bg-[#0A0A0A] overflow-hidden flex flex-col">

      {/* ── YA Watermark ── */}
      <div className="absolute top-20 right-4 z-40 opacity-[0.07] pointer-events-none select-none">
        <div className="w-16 h-16 rounded-2xl border-2 border-orange-400 flex items-center justify-center">
          <span className="text-orange-400 font-black text-lg tracking-widest">YA</span>
        </div>
      </div>

      {/* ── LIVE badge (admin) ── */}
      {isAdmin && (
        <div className="absolute top-[4.5rem] left-4 z-50">
          <div className="px-3 py-1.5 bg-red-600 rounded-xl flex items-center gap-2 shadow-lg shadow-red-500/30">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE</span>
          </div>
        </div>
      )}

      {/* ── RtkMeeting (UI Kit — themed) ── */}
      <div className="flex-1 relative">
        <RtkMeeting meeting={meeting} mode="fill" showSetupScreen={true} />
      </div>

      {/* ── Admin Control Bar ── */}
      {isAdmin && (
        <div className="relative z-40 w-full border-t border-white/5 bg-neutral-950/90 backdrop-blur-xl">
          <div className="px-4 py-3 flex flex-wrap items-center gap-2">

            {/* Recording */}
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-500/30'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-500'}`} />
              {isRecording ? 'REC' : 'Start REC'}
            </button>

            {/* AI Teacher */}
            <button
              onClick={() => setAiActive(!aiActive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                aiActive
                  ? 'bg-orange-600/20 text-orange-400 border border-orange-500/40 shadow-[0_0_12px_rgba(234,88,12,0.2)] hover:bg-orange-600/30'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600'
              }`}
            >
              <span className="text-base">🤖</span>
              {aiActive ? 'Stop AI' : 'AI Teacher'}
            </button>

            {/* Whiteboard */}
            <button
              onClick={() => setShowWhiteboard(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white hover:border-neutral-500 hover:bg-neutral-700`}
            >
              <Layout className="w-4 h-4" />
              Whiteboard
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-xl border border-white/5">
              <Timer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-mono text-orange-400 tracking-widest">{liveTime}</span>
            </div>

            {/* End Class */}
            <button
              onClick={endClass}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              End Class
            </button>
          </div>
        </div>
      )}

      {/* ── Student Whiteboard Access Button ── */}
      {!isAdmin && (
        <div className="absolute bottom-4 right-4 z-50">
          <button
            onClick={() => setShowWhiteboard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-neutral-900/90 text-neutral-300 border border-white/10 hover:border-orange-500/40 hover:text-orange-400 transition-all backdrop-blur-sm shadow-xl"
          >
            <Layout className="w-4 h-4" />
            Whiteboard
          </button>
        </div>
      )}

      {/* ── AI Teacher Panel ── */}
      {isAdmin && <AITeacher isActive={aiActive} onClose={() => setAiActive(false)} meeting={meeting} roomId={roomId} />}

      {/* ── Whiteboard Panel ── */}
      {showWhiteboard && (
        <WhiteboardPanel
          sessionId={sessionId}
          isAdmin={isAdmin}
          userId={userId}
          userName={userName}
          canWrite={isAdmin || canWriteWhiteboard}
          onClose={() => setShowWhiteboard(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  Main LiveClassWindow export
// ─────────────────────────────────────────────────────
export default function LiveClassWindow({
  roomId,
  sessionId,
  isAdmin = false,
  onClose,
  userId = 'unknown',
  userName = 'Unknown User',
}: {
  roomId: string;
  sessionId: string;
  isAdmin?: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
}) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const liveTime = useLiveTimer();

  const pathname = usePathname();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== initialPathname.current) setIsMinimized(true);
  }, [pathname]);

  // 1. Initialize meeting
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        const res = await fetch('/api/live/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: roomId }),
        });
        const { token } = await res.json() as { token: string };
        if (!token) throw new Error('Token failure');
        initMeeting({
          authToken: token,
          defaults: {
            audio: true,
            video: true,
            mediaConfiguration: {
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            },
          },
        });
      } catch {
        alert('लाइव क्लास शुरू नहीं हो सकी।');
        onClose();
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [roomId, initMeeting, onClose]);

  // 2. WakeLock + cleanup
  useEffect(() => {
    let wakeLock: any = null;
    (async () => {
      try {
        if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {}
    })();
    return () => {
      if (wakeLock) wakeLock.release().catch(console.error);
      if (meeting) { try { meeting.leave(); } catch {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Apply YA theme to document.body (needs client)
  useEffect(() => {
    try { provideRtkDesignSystem(document.body, YA_THEME); } catch {}
  }, []);

  // 3. Mic state
  useEffect(() => {
    if (meeting?.self) {
      const update = () => setMicEnabled(meeting.self.audioEnabled);
      meeting.self.addListener('audioUpdate', update);
      setMicEnabled(meeting.self.audioEnabled);
      return () => { meeting.self.removeListener('audioUpdate', update); };
    }
  }, [meeting]);

  // ── Minimized PiP ──
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 w-[300px] h-[170px] bg-neutral-950 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[9999] overflow-hidden border border-orange-500/20 transition-all hover:scale-105 cursor-pointer group"
      >
        {/* PiP content placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-white" />
            </div>
            <p className="text-white text-xs font-bold">लाइव क्लास चल रही है</p>
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded-md flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
        </div>

        {/* Timer */}
        <div className="absolute top-2 right-12 px-2 py-1 bg-black/50 rounded-md">
          <span className="text-[9px] font-mono text-orange-400">{liveTime}</span>
        </div>

        {/* Controls overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (meeting?.self) {
                if (micEnabled) await meeting.self.disableAudio();
                else await meeting.self.enableAudio();
              }
            }}
            className={`p-1.5 rounded-lg text-white transition-colors ${micEnabled ? 'bg-green-600/80' : 'bg-neutral-900/80'}`}
          >
            {micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1.5 bg-red-600/80 hover:bg-red-600 rounded-lg text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <p className="absolute bottom-2 left-0 right-0 text-center text-[9px] text-neutral-500">Click to expand</p>
      </div>
    );
  }

  // ── Fullscreen ──
  return (
    <div className="fixed inset-0 bg-neutral-950 z-[100] flex flex-col font-sans overflow-hidden">

      {/* ── Header ── */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-5 bg-neutral-900/80 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-xs tracking-widest">YA</span>
          </div>
          <div>
            <h2 className="text-white font-black text-sm leading-none">लाइव क्लास</h2>
            <p className="text-[9px] text-orange-400/70 mt-0.5 uppercase tracking-widest font-bold">Cloudflare Realtime</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all border border-transparent hover:border-neutral-700"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-600/10 rounded-xl text-neutral-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Meeting Content ── */}
      <div className="flex-1 overflow-hidden">
        <RealtimeKitProvider value={meeting}>
          <RealtimeMeetingView
            meeting={meeting}
            roomId={roomId}
            sessionId={sessionId}
            onClose={onClose}
            isAdmin={isAdmin}
            userId={userId}
            userName={userName}
          />
        </RealtimeKitProvider>
      </div>
    </div>
  );
}
