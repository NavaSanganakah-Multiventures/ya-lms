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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const lastPollRef = useRef<string>('1970-01-01');

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

  const createPeerConnection = useCallback((userId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(`ice_candidate:${userId}`, event.candidate);
      }
    };

    // Both Admin and Student add tracks to the PC so they can see each other
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Both Admin and Student receive tracks
    pc.ontrack = (event) => {
      if (!isAdmin) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      } else {
         if (remoteVideoRef.current) {
           remoteVideoRef.current.srcObject = event.streams[0];
         }
      }
    };

    peerConnections.current.set(userId, pc);
    return pc;
  }, [isAdmin, sendSignal]);

  const handleSignal = useCallback(async (signal: Signal) => {
    const data = JSON.parse(signal.data);
    
    if (signal.type === 'chat') {
      setMessages(prev => [...prev, data]);
      return;
    }

    if (isAdmin) {
      // Teacher logic
      if (signal.type === 'offer_request') {
        const pc = createPeerConnection(signal.user_id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(`offer:${signal.user_id}`, offer);
        setParticipants(prev => prev + 1);
      } else if (signal.type === `answer:${signal.user_id}`) {
        const pc = peerConnections.current.get(signal.user_id);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        }
      } else if (signal.type === `ice_candidate:${signal.user_id}`) {
        const pc = peerConnections.current.get(signal.user_id);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      }
    } else {
      // Student logic
      if (signal.type.startsWith('offer:')) {
        const pc = createPeerConnection('teacher'); // Student only connects to 'teacher'
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(`answer:teacher`, answer); // In reality, we'd need teacher's ID, but teacher handles all
        setStatus('लाइव (Live)');
      } else if (signal.type === 'ice_candidate:teacher') {
        const pc = peerConnections.current.get('teacher');
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        }
      }
    }
  }, [isAdmin, createPeerConnection, sendSignal]);

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
        if (isAdmin) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setStatus('प्रसारण शुरू (Broadcasting)');
        } else {
          // Student also needs a local stream for mute/video off toggles to work and be seen
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream; // set local video for student to see themselves
          }
          // Student just sends join request
          sendSignal('offer_request', {});
          setStatus('शिक्षक के जुड़ने का इंतज़ार (Waiting for teacher)...');
        }
      } catch (err) {
        console.error("Media error:", err);
        setStatus('मीडिया एक्सेस त्रुटि (Media Error)');
      }
    };

    initMedia();
    const interval = setInterval(pollSignaling, 3000);

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
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative group p-4 gap-4">

          <div className="flex-1 w-full relative bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
             <video ref={isAdmin ? localVideoRef : remoteVideoRef} autoPlay playsInline muted={isAdmin} className="w-full h-full object-contain" />
             <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border border-white/10">
                {isAdmin ? 'आप (You)' : 'शिक्षक (Teacher)'}
             </div>

             {!isAdmin && status.includes('Waiting') && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-neutral-400 font-medium">{status}</p>
               </div>
             )}
          </div>

          {/* Small PiP Video */}
          <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 w-24 h-32 md:w-48 md:h-64 bg-neutral-900 rounded-xl overflow-hidden border-2 border-neutral-700 shadow-2xl z-10 transition-all hover:scale-105 cursor-pointer hover:border-indigo-500">
             <video ref={isAdmin ? remoteVideoRef : localVideoRef} autoPlay playsInline muted={!isAdmin} className="w-full h-full object-cover" />
             <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white shadow-lg border border-white/10">
                {isAdmin ? 'छात्र (Student)' : 'आप (You)'}
             </div>
          </div>
          
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
