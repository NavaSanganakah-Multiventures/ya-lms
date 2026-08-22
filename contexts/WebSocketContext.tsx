"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useToast } from "./ToastContext";
import { usePathname } from "next/navigation";
import { dispatchRealtimeEvent, globalSubscriptions, globalWsSendSetter } from "@/hooks/useRealtimeWebSocket";

// Channels every web client should subscribe to.
const DEFAULT_WEB_CHANNELS = ["user:me", "global"];

/** Normalize DataSyncDO broadcast payload into the channel/action/entity shape
 *  expected by useRealtimeChannel listeners.
 *
 *  DataSyncDO sends: { type: "wallet", action: "wallet_updated", userId, data }
 *  useRealtimeChannel expects: { channel: "user:me", action: "...", entity: "wallet", data }
 *
 *  Channel mapping (matches the server's broadcast scope):
 *    - Global broadcast types (course, live_session, secret) → "global"
 *    - Everything else (wallet, notification, enrollment, progress, lesson, ...) → "user:me"
 */
const GLOBAL_BROADCAST_TYPES = new Set(["course", "live_session", "secret"]);

function normalizeRealtimeEvent(data: any) {
  if (!data || typeof data !== "object") return data;
  if (data.channel) return data; // already normalized
  if (typeof data.type === "string") {
    const entity = data.type;
    const channel = GLOBAL_BROADCAST_TYPES.has(entity) ? "global" : "user:me";
    return {
      channel,
      action: data.action || `${entity}_updated`,
      entity,
      data: data.data ?? null,
      userId: data.userId ?? null,
      raw: data,
    };
  }
  return data;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => void;
  lastMessage: any | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastContext = useToast();
  const pathname = usePathname(); // Using pathname to re-init on significant nav (login/logout)

  useEffect(() => {
    const connect = () => {
      // Create WebSocket connection to our Cloudflare Worker endpoint
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/data`;

      console.log("[WebSocket] Connecting to", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected to Realtime Engine");
        setIsConnected(true);
        globalWsSendSetter((msg: string) => {
           if (ws.readyState === WebSocket.OPEN) ws.send(msg);
        });
        // Ensure default web channels are registered, then resubscribe
        DEFAULT_WEB_CHANNELS.forEach((ch) => globalSubscriptions.add(ch));
        for (const ch of globalSubscriptions) {
           try { ws.send(JSON.stringify({ type: 'subscribe', channel: ch })); }
           catch (e) { console.warn('[WS] subscribe send failed', e); }
        }
      };

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);

          // Edge case: Ignore raw ping/pong
          if (rawData.type === "ping" || rawData.type === "pong") return;

          const normalized = normalizeRealtimeEvent(rawData);
          setLastMessage(normalized);

          // Feed events to the newer hook-based system (useRealtimeChannel)
          dispatchRealtimeEvent(normalized);

          // Listen for global broadcasts
          // (server sends action "course_updated" when a course is published)
          if (normalized?.entity === "course") {
            toastContext.success(`🚀 New Course Published: ${normalized?.data?.title ?? ""}`);
          }
        } catch (e) {
          console.error("[WebSocket] Failed to parse message", e);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        globalWsSendSetter(null);
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error", error);
        ws.close();
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [toastContext, pathname]);

  const sendMessage = (eventType: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "client_event",
          eventType,
          payload,
        })
      );
    } else {
      console.warn("[WebSocket] Cannot send message, not connected.");
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}
