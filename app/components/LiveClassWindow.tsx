'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, MessageCircle, Send, Users } from 'lucide-react';
import { RealtimeKitProvider, useRealtimeKitClient, VideoGrid, MeetingControls } from '@cloudflare/realtimekit-react';

// Sub-component that handles the meeting logic using the hook
function RealtimeMeetingView({ meetingId, onClose, isAdmin }: { meetingId: string, onClose: () => void, isAdmin: boolean }) {
  const { join, leave, participants, messages, sendMessage, isConnected, status } = useRealtimeKitClient();
  const [chatInput, setChatInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const initMeeting = async () => {
      try {
        setIsJoining(true);
        // 1. Get authToken from our backend
        const res = await fetch('/api/live/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId })
        });
        const { token } = await res.json() as { token: string };
        
        if (!token) {
          throw new Error("Failed to get authToken from backend");
        }

        // 2. Join using the SDK
        await join(token);
        console.log("[RealtimeKit] Joined meeting successfully");
      } catch (err) {
        console.error("[RealtimeKit] Join error:", err);
        alert("लाइव क्लास से जुड़ने में विफल। कृपया सुनिश्चित करें कि आपके एडमिन ने Cloudflare Realtime Setup किया है।");
        onClose();
      } finally {
        setIsJoining(false);
      }
    };

    initMeeting();

    return () => {
      leave();
    };
  }, [meetingId, join, leave, onClose]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput('');
  };

  if (isJoining || !isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full animate-ping absolute" />
          <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">कनेक्ट हो रहा है...</h3>
          <p className="text-neutral-500 text-sm">{status === 'connecting' ? 'Cloudflare SFU से हाथ मिला रहे हैं...' : 'अपनी मीडिया तैयार कर रहे हैं...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black">
      {/* Main Video Area */}
      <div className="flex-1 relative flex flex-col p-4 gap-4">
        <div className="flex-1 rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl relative">
          <VideoGrid className="w-full h-full" />
          
          {/* Overlay Status */}
          <div className="absolute top-6 left-6 flex items-center gap-3">
             <div className="px-3 py-1.5 bg-red-600 rounded-lg flex items-center gap-2 animate-pulse shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE</span>
             </div>
             <div className="px-3 py-1.5 bg-neutral-950/80 backdrop-blur-md rounded-lg flex items-center gap-2 border border-white/10 text-white text-[10px] font-bold">
                <Users className="w-3 h-3" />
                <span>{participants.length} Participant{participants.length > 1 ? 's' : ''}</span>
             </div>
          </div>
        </div>

        {/* Controls */}
        <div className="h-20 flex items-center justify-center">
           <MeetingControls className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-2 rounded-2xl shadow-2xl" />
        </div>
      </div>

      {/* Sidebar Chat */}
      <div className="w-full md:w-80 border-l border-neutral-800 bg-neutral-950 flex flex-col shadow-2xl">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <MessageCircle className="w-4 h-4 text-indigo-400" /> संदेश (Chat)
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                <MessageCircle className="w-12 h-12 mb-2" />
                <p className="text-xs">बातचीत शुरू करें</p>
             </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-neutral-500 mb-1">{msg.senderName || 'Anonymous'}</span>
              <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${msg.isLocal ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-neutral-800 text-white rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-neutral-900/30 border-t border-neutral-800">
          <div className="relative">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="सन्देश लिखें..."
              className="w-full bg-black border border-neutral-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button type="submit" className="absolute right-2 top-2 p-2 text-indigo-500 hover:text-white transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LiveClassWindow({ roomId, sessionId, isAdmin = false, onClose }: { 
  roomId: string, 
  sessionId: string,
  isAdmin?: boolean,
  onClose: () => void 
}) {
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

      <RealtimeKitProvider>
        <RealtimeMeetingView meetingId={roomId} onClose={onClose} isAdmin={isAdmin} />
      </RealtimeKitProvider>
    </div>
  );
}
