'use client';

import { useEffect, useCallback, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

type RealtimeEvent = {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
};

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface UseRealtimeWebSocketReturn {
  connectionState: ConnectionState;
  lastEvent: RealtimeEvent | null;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

const listeners = new Set<(event: RealtimeEvent) => void>();

export function addRealtimeListener(fn: (event: RealtimeEvent) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function dispatchRealtimeEvent(event: RealtimeEvent) {
  listeners.forEach((fn) => {
    try { fn(event); }
    catch (e) { console.error('[WS] listener error', e); }
  });
}

// Keep a global list of subscriptions so the context can resubscribe on reconnect
export const globalSubscriptions = new Set<string>();
export let globalWsSend: ((msg: string) => void) | null = null;
export const globalWsSendSetter = (fn: ((msg: string) => void) | null) => { globalWsSend = fn; };

export function useRealtimeWebSocket(): UseRealtimeWebSocketReturn {
  const { isConnected } = useWebSocket();
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    const remove = addRealtimeListener((event) => {
      setLastEvent(event);
    });
    return () => remove();
  }, []);

  const subscribe = useCallback((channel: string) => {
    globalSubscriptions.add(channel);
    if (globalWsSend) {
      try { globalWsSend(JSON.stringify({ type: 'subscribe', channel })); }
      catch (e) { console.warn('[WS] subscribe send failed', e); }
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    globalSubscriptions.delete(channel);
    if (globalWsSend) {
      try { globalWsSend(JSON.stringify({ type: 'unsubscribe', channel })); }
      catch (e) { console.warn('[WS] unsubscribe send failed', e); }
    }
  }, []);

  return {
    connectionState: isConnected ? 'connected' : 'disconnected',
    lastEvent,
    subscribe,
    unsubscribe
  };
}
