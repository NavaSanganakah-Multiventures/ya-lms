'use client';

import { useEffect, useState, useRef } from 'react';
import { addRealtimeListener } from './useRealtimeWebSocket';

interface ChannelEvent {
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export function useRealtimeChannel(channel: string | null) {
  const [latestData, setLatestData] = useState<any>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // 🔴 FIX: Reset stale data when channel changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLatestData(null);
    setLastAction(null);

    if (!channel) return;

    const remove = addRealtimeListener((event) => {
      if (!mountedRef.current) return;
      if (event.channel === channel) {
        setLatestData(event.data ?? null);
        setLastAction(event.action ?? null);
      }
    });

    return () => { remove(); };
  }, [channel]);

  return { latestData, lastAction };
}
