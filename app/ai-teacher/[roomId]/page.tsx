"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRealtimeKitClient, RealtimeKitProvider } from '@cloudflare/realtimekit-react';
import { use } from 'react';

export default function AITeacherParticipantPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [status, setStatus] = useState('Initializing AI Participant...');
  
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamDestination = useRef<MediaStreamAudioDestinationNode | null>(null);

  useEffect(() => {
    // 1. Mock getUserMedia
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      // If audio is requested, we intercept it
      if (constraints && constraints.audio) {
         if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            mediaStreamDestination.current = audioContext.current.createMediaStreamDestination();
         }
         return mediaStreamDestination.current!.stream;
      }
      return originalGetUserMedia(constraints);
    };

    // 2. Fetch token as AI
    const init = async () => {
       try {
         setStatus('Fetching AI Token...');
         const res = await fetch('/api/live/token', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ meetingId: resolvedParams.roomId, isAI: true })
         });
         const { token } = await res.json() as { token: string };
         
         if (!token) throw new Error("Token failure");

         setStatus('Joining meeting...');
         initMeeting({
           authToken: token,
           defaults: { audio: true, video: false }
         });
       } catch (err) {
         console.error(err);
         setStatus('Failed to join');
       }
    };
    init();

    // 3. Listen for postMessage from parent
    let nextPlayTime = 0;
    const messageHandler = (e: MessageEvent) => {
       if (e.data && e.data.type === 'ai-audio-chunk') {
          // Play the chunk into the mediaStreamDestination
          if (audioContext.current && mediaStreamDestination.current) {
             const chunk = e.data.chunk; // Float32Array
             const buffer = audioContext.current.createBuffer(1, chunk.length, 24000); // 24kHz Gemini
             buffer.getChannelData(0).set(chunk);
             
             const source = audioContext.current.createBufferSource();
             source.buffer = buffer;
             source.connect(mediaStreamDestination.current);
             
             const currentTime = audioContext.current.currentTime;
             if (nextPlayTime < currentTime) {
                nextPlayTime = currentTime;
             }
             source.start(nextPlayTime);
             nextPlayTime += buffer.duration;
          }
       }
    };
    window.addEventListener('message', messageHandler);

    return () => {
       navigator.mediaDevices.getUserMedia = originalGetUserMedia; // Restore
       window.removeEventListener('message', messageHandler);
    };
  }, [resolvedParams.roomId, initMeeting]);

  // Clean up meeting explicitly
  useEffect(() => {
     return () => {
        if (meeting) {
           try { meeting.leave(); } catch (e) {}
        }
     }
  }, [meeting]);

  useEffect(() => {
     if (meeting) {
        setStatus('Connected');
        // Tell parent we are ready
        window.parent.postMessage({ type: 'ai-participant-ready' }, '*');
     }
  }, [meeting]);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white text-xs">
       <div>
         AI Participant Sandbox<br/>
         Status: {status}
       </div>
    </div>
  );
}
