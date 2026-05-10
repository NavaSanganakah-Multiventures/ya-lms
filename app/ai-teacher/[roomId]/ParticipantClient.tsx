"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { use } from 'react';

export default function AITeacherParticipantPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [status, setStatus] = useState('Waiting for init...');
  const hasJoined = useRef(false);
  const hasNotified = useRef(false);

  const audioContext = useRef<AudioContext | null>(null);
  const mediaStreamDestination = useRef<MediaStreamAudioDestinationNode | null>(null);
  const nextPlayTime = useRef(0);

  // Setup fake mic and message handler on mount
  useEffect(() => {
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

    const messageHandler = async (e: MessageEvent) => {
      if (!e.data) return;

      // Parent sends ai-init after iframe onLoad
      if (e.data.type === 'ai-init' && !hasJoined.current) {
        hasJoined.current = true;
        const { roomId } = e.data;
        setStatus('Fetching token...');

        try {
          const res = await fetch('/api/live/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ meetingId: roomId, isAI: true })
          });

          const json = await res.json() as { token?: string; error?: string };

          if (!json.token) {
            setStatus(`Token error: ${json.error || 'empty'}`);
            hasJoined.current = false;
            return;
          }

          setStatus('Calling initMeeting...');
          initMeeting({
            authToken: json.token,
            defaults: { audio: true, video: false }
          });
        } catch (err: any) {
          console.error('[AI Iframe] Init error:', err);
          setStatus(`Error: ${err.message}`);
          hasJoined.current = false;
        }
      }

      // Audio playback chunk from parent
      if (e.data.type === 'ai-audio-chunk') {
        if (audioContext.current && mediaStreamDestination.current) {
          try {
            const chunk = e.data.chunk as Float32Array;
            const buffer = audioContext.current.createBuffer(1, chunk.length, 24000);
            buffer.getChannelData(0).set(chunk);
            const source = audioContext.current.createBufferSource();
            source.buffer = buffer;
            source.connect(mediaStreamDestination.current);
            const ct = audioContext.current.currentTime;
            if (nextPlayTime.current < ct) nextPlayTime.current = ct;
            source.start(nextPlayTime.current);
            nextPlayTime.current += buffer.duration;
          } catch (e) { console.error('[AI Iframe] Audio error', e); }
        }
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      window.removeEventListener('message', messageHandler);
    };
  }, [initMeeting]);

  // When SDK meeting object becomes available, notify parent
  useEffect(() => {
    if (meeting && !hasNotified.current) {
      hasNotified.current = true;
      queueMicrotask(() => {
        setStatus('Joined ✅');
      });
      console.log('[AI Iframe] Meeting joined, notifying parent');
      window.parent.postMessage({ type: 'ai-participant-ready' }, '*');
    }
  }, [meeting]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (meeting) { try { (meeting as any).leave(); } catch (e) {} }
      if (audioContext.current) audioContext.current.close().catch(() => {});
    };
  }, [meeting]);

  return (
    <div style={{ background: '#000', color: '#0f0', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: 13 }}>
      🤖 AI Participant — {status}
    </div>
  );
}
