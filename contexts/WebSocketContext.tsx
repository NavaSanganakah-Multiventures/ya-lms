"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useToast } from "./ToastContext";
import { usePathname } from "next/navigation";
import { dispatchRealtimeEvent } from "@/hooks/useRealtimeWebSocket";

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
      const wsUrl = `${protocol}//${host}/api/ws`;

      console.log("[WebSocket] Connecting to", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected to Realtime Engine");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Edge case: Ignore raw ping/pong
          if (data.type === "ping" || data.type === "pong") return;

          setLastMessage(data);
          
          // Feed events to the newer hook-based system (useRealtimeChannel)
          dispatchRealtimeEvent(data);

          // Listen for global broadcasts
          if (data.action === "course_published") {
            toastContext.success(`🚀 New Course Published: ${data.data.title}`);
          }
        } catch (e) {
          console.error("[WebSocket] Failed to parse message", e);
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
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
