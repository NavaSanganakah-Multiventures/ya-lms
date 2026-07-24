'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const WS_URL = (() => {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
})();

const listeners = new Set<(event: RealtimeEvent) => void>();

export function addRealtimeListener(fn: (event: RealtimeEvent) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useRealtimeWebSocket(): UseRealtimeWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Ref to break circular dependency between connect↔scheduleReconnect
  const connectRef = useRef<(() => void) | null>(null);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
      RECONNECT_MAX_MS,
    );
    reconnectAttemptRef.current++;
    reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
  }, [clearReconnectTimer]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setConnectionState('connected');
        reconnectAttemptRef.current = 0;

        for (const ch of subscribedChannelsRef.current) {
          try { ws.send(JSON.stringify({ type: 'subscribe', channel: ch })); }
          catch (e) { console.warn('[WS] subscribe send failed', e); }
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          setLastEvent(parsed);
          // 🔴 FIX: Isolate each listener — one throwing callback
          // must not prevent others from receiving the event.
          listeners.forEach((fn) => {
            try { fn(parsed); }
            catch (e) { console.error('[WS] listener error', e); }
          });
        } catch {}
      };

      ws.onclose = () => {
        // 🔴 FIX: Only nullify wsRef if we are still the current socket.
        // Prevents old-socket's onclose from sabotaging a newly-created socket
        // during rapid reconnect cycles.
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        if (!mountedRef.current) return;
        setConnectionState('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, [scheduleReconnect]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setConnectionState('disconnected');
    }
  }, [clearReconnectTimer]);

  const subscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.add(channel);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: 'subscribe', channel })); }
      catch (e) { console.warn('[WS] subscribe send failed', e); }
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel })); }
      catch (e) { console.warn('[WS] unsubscribe send failed', e); }
    }
  }, []);

  // Sync connectRef after connect function identity stabilises.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { connectionState, lastEvent, subscribe, unsubscribe };
}
