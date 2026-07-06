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

// Safely patch RTCRtpSender.prototype.replaceTrack to prevent Unhandled Promise Rejections
// Context: RealtimeKit tries to replace a track (like toggling mic) after the peer connection
// is already closed by an external event, resulting in an InvalidStateError.
if (typeof window !== 'undefined' && typeof RTCRtpSender !== 'undefined') {
  if (!(RTCRtpSender.prototype.replaceTrack as any)._isPatched) {
    const originalReplaceTrack = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = function (withTrack: MediaStreamTrack | null): Promise<void> {
      return originalReplaceTrack.call(this, withTrack).catch((e: any) => {
        if (e.name === 'InvalidStateError' && e.message.includes('peer connection is closed')) {
          console.warn('Safely caught RTCRtpSender.replaceTrack error: The peer connection is closed.');
          return Promise.resolve();
        }
        throw e;
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
