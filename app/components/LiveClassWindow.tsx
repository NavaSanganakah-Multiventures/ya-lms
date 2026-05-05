'use client';

import { useEffect, useState } from 'react';
import { X, Users } from 'lucide-react';
import { RealtimeKitProvider, useRealtimeKitClient } from '@cloudflare/realtimekit-react';


import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import AITeacher from './AITeacher';

function RealtimeMeetingView({ meeting, roomId, onClose, isAdmin }: { meeting: any, roomId: string, onClose: () => void, isAdmin: boolean }) {
  const [aiActive, setAiActive] = useState(false);
  const [isRecording, setIsRecording] = useState(true); // backend defaults record_on_start: true

  if (!meeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-orange-500/20 rounded-full animate-ping absolute" />
          <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">कनेक्ट हो रहा है...</h3>
          <p className="text-neutral-500 text-sm">Cloudflare SFU से हाथ मिला रहे हैं...</p>
        </div>
      </div>
    );
  }

  const toggleRecording = async () => {
    const action = isRecording ? "stop" : "start";
    try {
      const res = await fetch("/api/live/recording", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0] || ''}`
        },
        body: JSON.stringify({ meetingId: roomId, action }),
      });
      if (res.ok) {
        setIsRecording(!isRecording);
      } else {
        alert("Failed to change recording status.");
      }
    } catch (e) {
      console.error(e);
      alert("Error toggling recording.");
    }
  };

  return (
    <div className="flex-1 relative w-full h-full bg-black overflow-hidden flex flex-col">
      {isAdmin && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 flex items-center gap-2">
           <div className="px-3 py-1.5 bg-red-600 rounded-lg flex items-center gap-2 animate-pulse shadow-lg w-fit">
             <div className="w-2 h-2 rounded-full bg-white" />
             <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE</span>
           </div>
        </div>
      )}

      <div className="flex-1 relative">
         <RtkMeeting meeting={meeting} mode="fill" showSetupScreen={true} />
      </div>

      {isAdmin && (
        <div className="w-full bg-neutral-900 border-t border-neutral-800 p-3 md:p-4 flex flex-wrap items-center justify-center gap-2 md:gap-4 z-40 relative">
           <button
             onClick={toggleRecording}
             className={`flex-1 md:flex-none min-h-[44px] px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${
               isRecording
                 ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                 : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
             }`}
           >
             <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-ping' : 'bg-red-500'}`} />
             <span className="text-xs md:text-sm whitespace-nowrap">{isRecording ? 'Stop Rec' : 'Start Rec'}</span>
           </button>

           <button
             onClick={() => setAiActive(!aiActive)}
             className={`flex-1 md:flex-none min-h-[44px] px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${
               aiActive
                 ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]'
                 : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
             }`}
           >
             <div className="w-4 h-4 flex items-center justify-center text-lg">
                🤖
             </div>
             <span className="text-xs md:text-sm whitespace-nowrap">{aiActive ? 'Stop AI' : 'Start AI'}</span>
           </button>

           <button
             onClick={async () => {
               if(confirm('Are you sure you want to end this meeting for everyone? This will save the recording.')) {
                 try {
                   const res = await fetch("/api/live/end", {
                     method: "POST",
                     headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0] || ''}`
                     },
                     body: JSON.stringify({ meetingId: roomId })
                   });
                   if(res.ok) {
                     alert("Meeting ended successfully.");
                     onClose();
                   }
                 } catch(e) {
                   console.error(e);
                 }
               }
             }}
             className="w-full md:w-auto min-h-[44px] px-4 py-2 rounded-lg font-bold flex justify-center items-center gap-2 transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg mt-2 md:mt-0"
           >
             <span className="text-xs md:text-sm whitespace-nowrap">End Class for All</span>
           </button>

        </div>
      )}

      {isAdmin && <AITeacher isActive={aiActive} onClose={() => setAiActive(false)} />}
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

  // Clean up meeting when unmounting window
  useEffect(() => {
    return () => {
      if (meeting) {
        try { meeting.leave(); } catch (e) { console.error("Error leaving meeting:", e); }
      }
    };
  }, [meeting]);

  return (
    <div className="fixed inset-0 bg-neutral-950 z-[100] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900 shadow-xl z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
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
        <RealtimeMeetingView meeting={meeting} roomId={roomId} onClose={onClose} isAdmin={isAdmin} />
      </RealtimeKitProvider>
    </div>
  );
}
