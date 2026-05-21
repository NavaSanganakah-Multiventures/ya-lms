'use client';

import { CurrencyProvider } from '@/hooks/useCurrency';
import AIAssistant from '@/components/AIAssistant';
import NotificationPrompt from '@/components/NotificationPrompt';
import { LiveSessionProvider } from '@/contexts/LiveSessionContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import GlobalErrorListener from '@/components/GlobalErrorListener';
import { ToastProvider } from '@/contexts/ToastContext';

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
              <NotificationPrompt />
            </LiveSessionProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
