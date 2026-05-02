'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Mic, MicOff, Video, VideoOff, MessageCircle, Users, Send, MonitorUp, MonitorOff } from 'lucide-react';

interface Signal {
  id: string;
  user_id: string;
  type: string;
  data: string;
  created_at: string;
}

export default function LiveClassWindow({ roomId, sessionId, isAdmin = false, onClose }: { 
  roomId: string, 
  sessionId: string,
  isAdmin?: boolean,
  onClose: () => void 
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [participants, setParticipants] = useState<number>(0);
  const [status, setStatus] = useState('संयोजन हो रहा है (Connecting)...');
  const [myId, setMyId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream, name: string }>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const lastPollRef = useRef<string>(new Date().toISOString());

  const sendSignal = useCallback(async (type: string, data: any) => {
    try {
      await fetch(`/api/live/signaling?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
    } catch (err) {
      console.error("Signal send error:", err);
    }
  }, [sessionId]);

  const createPeerConnection = useCallback((targetUserId: string) => {
    // If PC already exists, return it
    if (peerConnections.current.has(targetUserId)) return peerConnections.current.get(targetUserId)!;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(`ice_candidate:${targetUserId}`, event.candidate);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      console.log(`[RTC] Track received from ${targetUserId}`);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, { 
          stream: event.streams[0], 
          name: targetUserId === 'teacher' ? 'शिक्षक' : 'छात्र' 
        });
        return newMap;
      });
      setParticipants(peerConnections.current.size);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[RTC] Connection state with ${targetUserId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(targetUserId);
          return newMap;
        });
        peerConnections.current.delete(targetUserId);
        setParticipants(peerConnections.current.size);
      }
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [sendSignal]);

  const handleSignal = useCallback(async (signal: Signal) => {
    const data = JSON.parse(signal.data);
    const senderId = signal.user_id;

    if (signal.type === 'chat') {
      setMessages(prev => [...prev, data]);
      return;
    }

    if (signal.type === 'join') {
      console.log(`[RTC] User ${senderId} joined`);
      // If I have a smaller ID, I initiate the offer to the new joiner
      if (myId && myId < senderId) {
        const pc = createPeerConnection(senderId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(`offer:${senderId}`, offer);
      }
      return;
    }

    // Signals directed at ME
    if (myId) {
      if (signal.type === `offer:${myId}`) {
        console.log(`[RTC] Received offer from ${senderId}`);
        const pc = createPeerConnection(senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(`answer:${senderId}`, answer);
        setStatus('लाइव (Live)');
      } else if (signal.type === `answer:${myId}`) {
        console.log(`[RTC] Received answer from ${senderId}`);
        const pc = peerConnections.current.get(senderId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          setStatus('लाइव (Live)');
        }
      } else if (signal.type === `ice_candidate:${myId}`) {
        const pc = peerConnections.current.get(senderId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      }
    }
  }, [myId, createPeerConnection, sendSignal]);

  // Signaling poll function
  const pollSignaling = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/signaling?sessionId=${sessionId}&lastPoll=${lastPollRef.current}`);
      if (res.ok) {
        const { signals } = await res.json() as { signals: Signal[] };
        for (const signal of signals) {
          lastPollRef.current = signal.created_at > lastPollRef.current ? signal.created_at : lastPollRef.current;
          handleSignal(signal);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [sessionId, handleSignal]);

  useEffect(() => {
    const initMedia = async () => {
      try {
        // Fetch current user ID for mesh signaling
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json() as any;
          if (meData.user) setMyId(meData.user.id);
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (isAdmin) {
          setStatus('प्रसारण शुरू (Broadcasting)');
        } else {
          setStatus('शिक्षक के जुड़ने का इंतज़ार (Waiting for teacher)...');
        }

        // Broadcast join to everyone
        sendSignal('join', {});
      } catch (err) {
        console.error("Media error:", err);
        setStatus('मीडिया एक्सेस त्रुटि (Media Error)');
      }
    };

    initMedia();
    const interval = setInterval(pollSignaling, 1000); // Poll every 1s for better connectivity

    return () => {
      clearInterval(interval);
      const pcs = peerConnections.current;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      pcs.forEach(pc => pc.close());
    };
  }, [isAdmin, pollSignaling, sendSignal]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  // Setup video ref helper for dynamically rendering multiple participant videos
  const setVideoRef = useCallback((element: HTMLVideoElement | null, stream: MediaStream) => {
    if (element && element.srcObject !== stream) {
      element.srcObject = stream;
    }
  }, []);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      // Revert to camera video if we have it
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        const videoTrack = localStreamRef.current.getVideoTracks()[0];

        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && screenTrack) {
            sender.replaceTrack(screenTrack);
          }
        });
      } catch (err) {
        console.error("Screen sharing error:", err);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = { user: isAdmin ? 'शिक्षक' : 'छात्र', text: chatMessage };
    sendSignal('chat', msg);
    setMessages(prev => [...prev, msg]);
    setChatMessage('');
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-[60] flex flex-col font-sans">
      {/* Header */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-white font-bold text-lg">लाइव कक्षा: {roomId}</h2>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-400">
             <div className="flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded">
                <Users className="w-3 h-3" />
                <span>{isAdmin ? `${participants} छात्र` : 'लाइव'}</span>
             </div>
             <span className="text-indigo-400 font-medium">{status}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-all">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 bg-black relative group flex items-center justify-center p-4">

          {/* Multi-participant Video Grid */}
          <div className={`w-full h-full grid gap-4 ${remoteStreams.size === 0 ? 'grid-cols-1' : remoteStreams.size === 1 ? 'grid-cols-1 sm:grid-cols-2' : remoteStreams.size <= 3 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {/* Local Video */}
            <div className="relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border border-white/10">
                आप (You)
              </div>
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([userId, data]) => (
              <div key={userId} className="relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(el) => setVideoRef(el, data.stream)}
                />
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border border-white/10">
                  {data.name} ({userId.slice(0, 4)})
                </div>
              </div>
            ))}
          </div>

          {!isAdmin && status.includes('Waiting') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 z-20">
               <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               <p className="text-neutral-400 font-medium">{status}</p>
            </div>
          )}
          
          {/* Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
             {isAdmin ? (
               <>
                 <button onClick={toggleMute} className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all hover:scale-110 ${isMuted ? 'bg-red-600' : 'bg-neutral-800/80 backdrop-blur-md'}`}>
                    {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6 text-white"/> : <Mic className="w-5 h-5 md:w-6 md:h-6 text-white"/>}
                 </button>
                 <button onClick={toggleVideo} className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all hover:scale-110 ${isVideoOff ? 'bg-red-600' : 'bg-neutral-800/80 backdrop-blur-md'}`}>
                    {isVideoOff ? <VideoOff className="w-5 h-5 md:w-6 md:h-6 text-white"/> : <Video className="w-5 h-5 md:w-6 md:h-6 text-white"/>}
                 </button>
                 <button onClick={toggleScreenShare} className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all hover:scale-110 ${isScreenSharing ? 'bg-indigo-600' : 'bg-neutral-800/80 backdrop-blur-md'}`}>
                    {isScreenSharing ? <MonitorOff className="w-5 h-5 md:w-6 md:h-6 text-white"/> : <MonitorUp className="w-5 h-5 md:w-6 md:h-6 text-white"/>}
                 </button>
               </>
             ) : (
                <>
                 <button onClick={toggleMute} className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all hover:scale-110 ${isMuted ? 'bg-red-600' : 'bg-neutral-800/80 backdrop-blur-md'}`}>
                    {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6 text-white"/> : <Mic className="w-5 h-5 md:w-6 md:h-6 text-white"/>}
                 </button>
                 <button onClick={toggleVideo} className={`p-3 md:p-4 rounded-2xl shadow-xl transition-all hover:scale-110 ${isVideoOff ? 'bg-red-600' : 'bg-neutral-800/80 backdrop-blur-md'}`}>
                    {isVideoOff ? <VideoOff className="w-5 h-5 md:w-6 md:h-6 text-white"/> : <Video className="w-5 h-5 md:w-6 md:h-6 text-white"/>}
                 </button>
               </>
             )}
             <button onClick={onClose} className="p-3 md:p-4 rounded-2xl bg-red-600 shadow-xl transition-all hover:scale-110">
                <X className="w-5 h-5 md:w-6 md:h-6 text-white"/>
             </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 border-l border-neutral-800 bg-neutral-900 flex flex-col">
          <div className="p-4 border-b border-neutral-800 text-neutral-400 text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-400"/> चैट
            </div>
            <span className="text-[10px] text-neutral-600 uppercase font-mono tracking-tighter">Real-time Kit V2</span>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
             {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                  <MessageCircle className="w-12 h-12 mb-2" />
                  <p className="text-xs">बातचीत शुरू करें</p>
               </div>
             )}
             {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.user === 'शिक्षक' ? 'items-start' : 'items-end'}`}>
                   <span className="text-[10px] text-neutral-500 mb-1">{msg.user}</span>
                   <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${msg.user === 'शिक्षक' ? 'bg-neutral-800 text-white rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                      {msg.text}
                   </div>
                </div>
             ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-800 bg-neutral-900/50">
             <div className="relative">
               <input 
                 type="text" 
                 value={chatMessage}
                 onChange={e => setChatMessage(e.target.value)}
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
    </div>
  );
}
