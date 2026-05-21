"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Bot, Mic, Volume2 } from 'lucide-react';

export default function AITeacher({ isActive, onClose, meeting, roomId }: { isActive: boolean, onClose: () => void, meeting?: any, roomId?: string }) {
  const [status, setStatus] = useState('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const mixedDestination = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const mutationObserver = useRef<MutationObserver | null>(null);

  // For playback via iframe
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // State tracking for System Events
  const lastStateStr = useRef<string>('');

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      mixedDestination.current = audioContext.current.createMediaStreamDestination();

      // Connect admin mic
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(mixedDestination.current);

      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      processor.current.onaudioprocess = (e) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const buffer = new Uint8Array(pcm16.buffer);
          const base64Data = btoa(String.fromCharCode(...buffer));

          ws.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
              }]
            }
          }));
        }
      };

      // Connect the mixed destination to the processor
      const mixedSource = audioContext.current.createMediaStreamSource(mixedDestination.current.stream);
      mixedSource.connect(processor.current);
      processor.current.connect(audioContext.current.destination);

      // Start observing for remote <audio> elements
      observeRemoteAudio();

    } catch (err) {
      console.error("Audio capture error:", err);
      setStatus('error');
    }
  };

  const observeRemoteAudio = () => {
     if (!audioContext.current || !mixedDestination.current) return;
     const observer = new MutationObserver(() => {
        const audios = document.querySelectorAll('audio');
        audios.forEach((audio: any) => {
           if (!audio.dataset.aiCaptured && audio.srcObject) {
              audio.dataset.aiCaptured = "true";
              try {
                 const source = audioContext.current!.createMediaStreamSource(audio.srcObject as MediaStream);
                 source.connect(mixedDestination.current!);
              } catch (e) {
                 console.error("Failed to capture remote audio", e);
              }
           }
        });
     });
     observer.observe(document.body, { childList: true, subtree: true });
     mutationObserver.current = observer;
  };

  const connectToGemini = React.useCallback(() => {
    setStatus('connecting');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ai/ws`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setStatus('connected');
      initAudio();

      ws.current?.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.0-flash-exp",
          systemInstruction: {
            parts: [{ text: "You are Adityanveshan, the class teacher participating in a live online class. Listen to the students and the admin. You will receive system text events telling you who is speaking and their camera status. Address students by name. Tell them to turn on cameras if they are speaking with it off. If multiple people speak, discipline them and ask them to speak one by one. Maintain strict discipline. Speak in Hinglish." }],
            role: "user"
          },
          generationConfig: {
            responseModalities: ["AUDIO"]
          }
        }
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.serverContent?.modelTurn?.parts) {
          const parts = data.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
              setIsSpeaking(true);
              const base64Str = part.inlineData.data;
              const binaryString = atob(base64Str);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }
              
              if (iframeRef.current?.contentWindow) {
                 iframeRef.current.contentWindow.postMessage({ type: 'ai-audio-chunk', chunk: float32Array }, window.location.origin);
              }
              
              clearTimeout((window as any).speakTimeout);
              (window as any).speakTimeout = setTimeout(() => setIsSpeaking(false), 1000);
            }
          }
        }
      } catch (err) {
        console.error("WS Message error:", err);
      }
    };

    ws.current.onerror = (e) => {
      console.error("Gemini WS Error", e);
      setStatus('error');
    };

    ws.current.onclose = (e) => {
      console.log("Gemini WS Closed", e.code, e.reason);
      setStatus('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
     if (!isActive || !meeting || status !== 'connected') return;
     
     const interval = setInterval(() => {
        try {
           const p = meeting.participants || meeting.sessions || meeting.remoteParticipants || new Map();
           const list = p instanceof Map ? Array.from(p.values()) : Array.isArray(p) ? p : Object.values(p);
           
           let currentState = '';
           for (const participant of list as any[]) {
              if (participant.isSpeaking || (participant.audioLevel && participant.audioLevel > 0.05)) {
                 const name = participant.name || participant.identity || 'A Student';
                 const videoOff = participant.videoEnabled === false;
                 currentState += `[System Event: ${name} is speaking. Video is ${videoOff ? 'OFF' : 'ON'}.] `;
              }
           }
           
           if (currentState && currentState !== lastStateStr.current && ws.current?.readyState === WebSocket.OPEN) {
              lastStateStr.current = currentState;
              ws.current.send(JSON.stringify({
                 clientContent: {
                    turns: [{
                       role: "user",
                       parts: [{ text: currentState }]
                    }],
                    turnComplete: true
                 }
              }));
           }
        } catch (e) {}
     }, 2000);
     
     return () => clearInterval(interval);
  }, [isActive, meeting, status]);

  useEffect(() => {
     const handler = (e: MessageEvent) => {
        // Iframe joined meeting successfully → connect to Gemini
        if (e.data && e.data.type === 'ai-participant-ready') {
           setIframeReady(true);
           connectToGemini();
        }
     };
     window.addEventListener('message', handler);
     return () => window.removeEventListener('message', handler);
  }, [connectToGemini]);

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
      if (processor.current) processor.current.disconnect();
      if (audioContext.current) audioContext.current.close();
      if (mediaStream.current) mediaStream.current.getTracks().forEach(track => track.stop());
      if (mutationObserver.current) mutationObserver.current.disconnect();
    };
  }, []);

  if (!isActive) return null;

  return (
    <>
      <iframe
        ref={iframeRef}
        src={`/ai-teacher/${roomId}`}
        allow="microphone; autoplay"
        className="hidden"
        onLoad={() => {
          // Iframe is fully loaded — safely send auth token now (no race condition)
          const authToken = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0] || '';
          iframeRef.current?.contentWindow?.postMessage({ type: 'ai-init', authToken, roomId }, window.location.origin);
        }}
      />
      <div className="absolute top-4 right-4 z-50 bg-neutral-900/90 backdrop-blur border border-orange-500/30 p-4 rounded-2xl shadow-2xl w-64">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'connected' ? 'bg-orange-600' : 'bg-neutral-700'}`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">AI Teacher</h3>
              <p className="text-[10px] text-green-400 font-medium">
                {!iframeReady ? 'Joining meeting...' : status === 'connected' ? 'Listening...' : status}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-red-500 text-xs font-medium">Close</button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-orange-500' : 'bg-green-500'}`} />
            {(status === 'connected' && !isSpeaking) && (
               <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
            )}
            {isSpeaking && (
               <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
            )}
          </div>
          <span className="text-xs text-neutral-300 font-medium">
            {isSpeaking ? 'AI Speaking...' : 'AI Listening...'}
          </span>
          {isSpeaking ? <Volume2 className="w-4 h-4 text-orange-400 ml-auto" /> : <Mic className="w-4 h-4 text-green-400 ml-auto" />}
        </div>
      </div>
    </>
  );
}
