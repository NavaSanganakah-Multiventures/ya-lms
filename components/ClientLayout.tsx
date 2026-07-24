'use client';

import { useEffect } from 'react';
import { CurrencyProvider } from '@/hooks/useCurrency';
import AIAssistant from '@/components/AIAssistant';
import NotificationPrompt from '@/components/NotificationPrompt';
import FirebaseInit from '@/components/FirebaseInit';
import { LiveSessionProvider } from '@/contexts/LiveSessionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import GlobalErrorListener from '@/components/GlobalErrorListener';
import { ToastProvider } from '@/contexts/ToastContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Apply defensive patches only once on the client, inside the component lifecycle,
  // rather than at module load time. This limits impact on third-party scripts and
  // browser extensions and makes the behavior easier to reason about.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cleanupFns: Array<() => void> = [];

    // Safely patch document.body.removeChild to prevent 3rd-party Cloudflare RealtimeKit PiP crashes
    if (typeof document !== 'undefined' && document.body && !(document.body.removeChild as any)._isPatched) {
      const originalRemoveChild = document.body.removeChild;
      document.body.removeChild = function <T extends Node>(child: T): T {
        if (child && child.parentNode !== this) {
          if (child.parentNode) {
            return child.parentNode.removeChild(child) as unknown as T;
          }
          return child as unknown as T;
        }
        return originalRemoveChild.call(this, child) as unknown as T;
      };
      (document.body.removeChild as any)._isPatched = true;
      cleanupFns.push(() => {
        document.body.removeChild = originalRemoveChild;
        delete (document.body.removeChild as any)._isPatched;
      });
    }

    // Safely patch RTCRtpSender.prototype.replaceTrack
    if (typeof RTCRtpSender !== 'undefined' && !(RTCRtpSender.prototype.replaceTrack as any)._isPatched) {
      const originalReplaceTrack = RTCRtpSender.prototype.replaceTrack;
      RTCRtpSender.prototype.replaceTrack = function (withTrack: MediaStreamTrack | null): Promise<void> {
        return originalReplaceTrack.call(this, withTrack).catch((e: any) => {
          if (e.name === 'InvalidStateError' && e.message.includes('peer connection is closed')) {
            return Promise.resolve();
          }
          throw e;
        });
      };
      (RTCRtpSender.prototype.replaceTrack as any)._isPatched = true;
      cleanupFns.push(() => {
        RTCRtpSender.prototype.replaceTrack = originalReplaceTrack;
        delete (RTCRtpSender.prototype.replaceTrack as any)._isPatched;
      });
    }

    // Safely patch RTCPeerConnection.prototype.getStats
    if (typeof RTCPeerConnection !== 'undefined' && !(RTCPeerConnection.prototype.getStats as any)._isPatched) {
      const originalGetStats = RTCPeerConnection.prototype.getStats;
      RTCPeerConnection.prototype.getStats = function (selector?: MediaStreamTrack | null): Promise<RTCStatsReport> {
        return originalGetStats.call(this, selector).catch((e: any) => {
          if (e.name === 'InvalidStateError' && e.message.includes('closed')) {
            return Promise.resolve(new Map() as unknown as RTCStatsReport);
          }
          throw e;
        });
      };
      (RTCPeerConnection.prototype.getStats as any)._isPatched = true;
      cleanupFns.push(() => {
        RTCPeerConnection.prototype.getStats = originalGetStats;
        delete (RTCPeerConnection.prototype.getStats as any)._isPatched;
      });
    }

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return (
    <GlobalErrorBoundary>
      <GlobalErrorListener />
      <ToastProvider>
        <WebSocketProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <LiveSessionProvider>
              {children}
              <AIAssistant />
              <FirebaseInit />
              <NotificationPrompt />
              </LiveSessionProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </WebSocketProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
