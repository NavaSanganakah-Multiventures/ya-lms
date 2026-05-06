'use client';

import { CurrencyProvider } from '@/hooks/useCurrency';
import AIAssistant from '@/components/AIAssistant';
import NotificationPrompt from '@/components/NotificationPrompt';
import { LiveSessionProvider } from '@/contexts/LiveSessionContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <LiveSessionProvider>
        {children}
        <AIAssistant />
        <NotificationPrompt />
      </LiveSessionProvider>
    </CurrencyProvider>
  );
}
