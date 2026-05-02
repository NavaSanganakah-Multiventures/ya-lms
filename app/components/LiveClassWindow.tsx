'use client';

import { useEffect, useState } from 'react';
import { X, Users } from 'lucide-react';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';

// Sub-component that handles the meeting UI
function RealtimeMeetingView({ meeting, onClose, isAdmin }: { meeting: any, onClose: () => void, isAdmin: boolean }) {
  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-ping absolute" />
          <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">कनेक्ट हो रहा है...</h3>
          <p className="text-neutral-500 text-sm">Cloudflare SFU से हाथ मिला रहे हैं...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black">
      <RtkMeeting
        mode="fill"
        meeting={meeting}
        showSetupScreen={true}
      />
    </div>
  );
}

export default function LiveClassWindow({ roomId, sessionId, isAdmin = false, onClose }: { 
  roomId: string, 
  sessionId: string,
  isAdmin?: boolean,
  onClose: () => void 
}) {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [isInitializing, setIsInitializing] = useState(false);

  // 1. Initialize meeting instance
  useEffect(() => {
    const startInit = async () => {
      try {
        setIsInitializing(true);
        const res = await fetch('/api/live/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: roomId })
        });
        const { token } = await res.json() as { token: string };
        
        if (!token) throw new Error("Token failure");

        // Follow Core SDK initialization pattern
        initMeeting({
          authToken: token,
          defaults: {
            audio: true,
            video: true,
            mediaConfiguration: {
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
              }
            }
          }
        });
      } catch (err) {
        console.error("[RealtimeKit] Init error:", err);
        alert("लाइव क्लास शुरू नहीं हो सकी।");
        onClose();
      } finally {
        setIsInitializing(false);
      }
    };

    startInit();
  }, [roomId, initMeeting, onClose]);

  // 2. Join when meeting object is ready (as per Core SDK docs)
  useEffect(() => {
    if (meeting) {
      meeting.join().catch((err: any) => {
        console.error("[RealtimeKit] Join failed:", err);
      });
      
      return () => {
        meeting.leave();
      };
    }
  }, [meeting]);

  return (
    <div className="fixed inset-0 bg-neutral-950 z-[100] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900 shadow-xl z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none">लाइव क्लास (Premium)</h2>
            <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest font-bold">Cloudflare Realtime Engine</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-red-600/10 rounded-xl text-neutral-400 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20">
          <X className="w-6 h-6" />
        </button>
      </div>

      <RealtimeKitProvider value={meeting}>
        <RealtimeMeetingView meeting={meeting} onClose={onClose} isAdmin={isAdmin} />
      </RealtimeKitProvider>
    </div>
  );
}
