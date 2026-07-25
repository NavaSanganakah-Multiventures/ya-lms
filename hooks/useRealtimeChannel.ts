'use client';

import { useEffect, useState, useRef } from 'react';
import { addRealtimeListener } from './useRealtimeWebSocket';

export interface ChannelEvent {
  type?: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export function useRealtimeChannel(channel: string | null, onEvent?: (event: ChannelEvent) => void) {
  const [latestData, setLatestData] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // 🔴 FIX: Reset stale data when channel changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLatestData(null);
    setLastAction(null);

    if (!channel) return;

    const remove = addRealtimeListener((event: any) => {
      if (!mountedRef.current) return;
      if (event.channel === channel) {
        setLatestData(event.data ?? null);
        setLastAction(event.action ?? null);
        if (callbackRef.current) {
          callbackRef.current(event);
        }
      }
    });

    return () => { remove(); };
  }, [channel]);

  return { latestData, lastAction };
}
