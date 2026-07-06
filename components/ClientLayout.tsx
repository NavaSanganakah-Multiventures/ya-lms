'use client';

import { CurrencyProvider } from '@/hooks/useCurrency';
import AIAssistant from '@/components/AIAssistant';
import NotificationPrompt from '@/components/NotificationPrompt';
import FirebaseInit from '@/components/FirebaseInit';
import { LiveSessionProvider } from '@/contexts/LiveSessionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import GlobalErrorListener from '@/components/GlobalErrorListener';
import { ToastProvider } from '@/contexts/ToastContext';

// Safely patch document.body.removeChild to prevent 3rd-party Cloudflare RealtimeKit PiP crashes
// Context: RealtimeKit's PiP toggle calls removeChild on nodes that might already be removed
// causing a Global JS Error (NotFoundError).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!(document.body.removeChild as any)._isPatched) {
    const originalRemoveChild = document.body.removeChild;
    document.body.removeChild = function <T extends Node>(child: T): T {
      if (child && child.parentNode !== this) {
        console.warn('Safely caught removeChild error: node is not a child of document.body.');
        if (child.parentNode) {
          return child.parentNode.removeChild(child) as unknown as T;
        }
        return child as unknown as T;
      }
      return originalRemoveChild.call(this, child) as unknown as T;
    };
    (document.body.removeChild as any)._isPatched = true;
  }
}

// Safely patch WebRTC methods to prevent unhandled promise rejections on closed connections
if (typeof window !== 'undefined') {
  if (typeof RTCPeerConnection !== 'undefined' && !(RTCPeerConnection.prototype.getStats as any)._isPatched) {
    const originalGetStats = RTCPeerConnection.prototype.getStats;
    RTCPeerConnection.prototype.getStats = function (selector?: MediaStreamTrack | null) {
      if (this.signalingState === 'closed') {
        console.warn('Caught getStats call on closed RTCPeerConnection.');
        return Promise.resolve(new Map() as any);
      }
      return originalGetStats.call(this, selector).catch((err: any) => {
        if (err.name === 'InvalidStateError' || err.message.includes('closed')) {
          console.warn('Caught InvalidStateError in getStats:', err);
          return new Map() as any;
        }
        throw err;
      });
    };
    (RTCPeerConnection.prototype.getStats as any)._isPatched = true;
  }

  if (typeof RTCRtpSender !== 'undefined' && !(RTCRtpSender.prototype.replaceTrack as any)._isPatched) {
    const originalReplaceTrack = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = function (withTrack: MediaStreamTrack | null) {
      return originalReplaceTrack.call(this, withTrack).catch((err: any) => {
        if (err.name === 'InvalidStateError' || err.message.includes('closed')) {
          console.warn('Caught InvalidStateError in replaceTrack:', err);
          return Promise.resolve();
        }
        throw err;
      });
    };
    (RTCRtpSender.prototype.replaceTrack as any)._isPatched = true;
  }
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <GlobalErrorBoundary>
      <GlobalErrorListener />
      <ToastProvider>
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
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
