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
    document.body.removeChild = function (child: Node) {
      if (child && child.parentNode !== this) {
        console.warn('Safely caught removeChild error: node is not a child of document.body.');
        if (child.parentNode) {
          return child.parentNode.removeChild(child);
        }
        return child;
      }
      return originalRemoveChild.call(this, child);
    };
    (document.body.removeChild as any)._isPatched = true;
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
