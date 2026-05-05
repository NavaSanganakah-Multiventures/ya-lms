import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, Volume2 } from 'lucide-react';

// Using Google's modern Gemini Multimodal Live API via WebSockets directly
export default function AITeacher({ isActive, onClose }: { isActive: boolean, onClose: () => void }) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);

  // For playback
  const audioQueue = useRef<Float32Array[]>([]);
  const isPlaying = useRef(false);
  const nextPlayTime = useRef(0);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const source = audioContext.current.createMediaStreamSource(stream);
      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);

      processor.current.onaudioprocess = (e) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32Array to Int16Array
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Convert to base64
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

      source.connect(processor.current);
      processor.current.connect(audioContext.current.destination);
    } catch (err) {
      console.error("Audio capture error:", err);
      setStatus('error');
    }
  };

  const playAudio = React.useCallback(() => {
    // We use a named function inside to allow recursion safely
    const playNext = () => {
      if (audioQueue.current.length === 0 || !audioContext.current) {
        isPlaying.current = false;
        setIsSpeaking(false);
        return;
      }

      isPlaying.current = true;
      setIsSpeaking(true);

      const chunk = audioQueue.current.shift()!;
      const buffer = audioContext.current.createBuffer(1, chunk.length, 24000); // Gemini returns 24kHz
      buffer.getChannelData(0).set(chunk);

      const source = audioContext.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.current.destination);

      source.onended = () => {
        playNext();
      };

      source.start();
    };
    playNext();
  }, []);

  const connectToGemini = React.useCallback(async () => {
    setStatus('connecting');
    let apiKey = '';
    try {
      const res = await fetch('/api/ai/token', {
         method: 'GET',
         headers: {
           "Authorization": `Bearer ${localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0] || ''}`
         }
      });
      if (res.ok) {
        const data = await res.json() as any;
        apiKey = data.token;
      }
    } catch (e) {
      console.error(e);
    }

    if (!apiKey) {
      setStatus('error');
      alert('AI Token not found');
      return;
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setStatus('connected');
      initAudio();

      // Send initial setup
      ws.current?.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.0-flash-exp",
          systemInstruction: {
            parts: [{ text: "You are Adityanveshan, an AI teacher participating in a live online class. Listen to the students, answer their questions accurately, keep your answers concise. Speak in Hinglish (Hindi + English)." }]
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
              // Convert base64 to Float32Array for playback
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

              audioQueue.current.push(float32Array);
              if (!isPlaying.current) {
                playAudio();
              }
            }
          }
        }
      } catch (err) {
        console.error("WS Message error:", err);
      }
    };

    ws.current.onerror = () => {
      setStatus('error');
    };

    ws.current.onclose = () => {
      setStatus('disconnected');
    };
  }, [playAudio]);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        connectToGemini();
      }, 0);
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (processor.current) {
        processor.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, connectToGemini]);

  if (!isActive) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-neutral-900/90 backdrop-blur border border-indigo-500/30 p-4 rounded-2xl shadow-2xl w-64">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'connected' ? 'bg-indigo-600' : 'bg-neutral-700'}`}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI Teacher</h3>
            <p className="text-[10px] text-green-400 font-medium">
              {status === 'connected' ? 'Listening...' : status}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-red-500 text-xs font-medium">Close</button>
      </div>

      <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-xl border border-neutral-700">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-indigo-500' : 'bg-green-500'}`} />
          {(status === 'connected' && !isSpeaking) && (
             <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
          )}
          {isSpeaking && (
             <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-75" />
          )}
        </div>
        <span className="text-xs text-neutral-300 font-medium">
          {isSpeaking ? 'AI Speaking...' : 'AI Listening...'}
        </span>
        {isSpeaking ? <Volume2 className="w-4 h-4 text-indigo-400 ml-auto" /> : <Mic className="w-4 h-4 text-green-400 ml-auto" />}
      </div>
    </div>
  );
}
