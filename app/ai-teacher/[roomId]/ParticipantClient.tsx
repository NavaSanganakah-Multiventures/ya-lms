"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { use } from 'react';

export default function AITeacherParticipantPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [status, setStatus] = useState('Waiting...');
  const isJoined = useRef(false);
  
  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamDestination = useRef<MediaStreamAudioDestinationNode | null>(null);

  useEffect(() => {
    // 1. Mock getUserMedia before SDK loads
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints && constraints.audio) {
        if (!audioContext.current) {
          audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          mediaStreamDestination.current = audioContext.current.createMediaStreamDestination();
        }
        return mediaStreamDestination.current!.stream;
      }
      return originalGetUserMedia(constraints);
    };

    // 2. Listen for postMessage from parent to get auth token & roomId
    const messageHandler = async (e: MessageEvent) => {
      if (e.data && e.data.type === 'ai-init' && !isJoined.current) {
        isJoined.current = true;
        const { authToken, roomId } = e.data;
        
        try {
          setStatus('Fetching AI Token...');
          const res = await fetch('/api/live/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ meetingId: roomId, isAI: true })
          });
          const json = await res.json() as { token?: string };
          
          if (!json.token) throw new Error("No token received");

          setStatus('Joining meeting...');
          initMeeting({
            authToken: json.token,
            defaults: { audio: true, video: false }
          });
        } catch (err) {
          console.error('[AI Participant] Init error:', err);
          setStatus('Failed to join');
          isJoined.current = false;
        }
      }

      // 3. Audio playback from parent
      if (e.data && e.data.type === 'ai-audio-chunk') {
        if (audioContext.current && mediaStreamDestination.current) {
          const chunk = e.data.chunk as Float32Array;
          const buffer = audioContext.current.createBuffer(1, chunk.length, 24000);
          buffer.getChannelData(0).set(chunk);

          const source = audioContext.current.createBufferSource();
          source.buffer = buffer;
          source.connect(mediaStreamDestination.current);
          source.start();
        }
      }
    };
    window.addEventListener('message', messageHandler);

    // Tell parent we are ready to receive init
    window.parent.postMessage({ type: 'ai-sandbox-ready' }, '*');

    return () => {
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      window.removeEventListener('message', messageHandler);
    };
  }, [initMeeting]);

  // When meeting joins successfully, notify parent
  useEffect(() => {
    if (meeting && !isJoined.current) {
      // meeting obj exists means joined
      setStatus('Connected ✅');
      window.parent.postMessage({ type: 'ai-participant-ready' }, '*');
    } else if (meeting) {
      setStatus('Connected ✅');
      window.parent.postMessage({ type: 'ai-participant-ready' }, '*');
    }
  }, [meeting]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (meeting) { try { meeting.leave(); } catch (e) {} }
      if (audioContext.current) audioContext.current.close();
    };
  }, [meeting]);

  return (
    <div style={{ background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
      AI Participant — {status}
    </div>
  );
}
