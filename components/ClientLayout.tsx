'use client';

import { CurrencyProvider } from '@/hooks/useCurrency';
import AIAssistant from '@/components/AIAssistant';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      {children}
      <AIAssistant />
    </CurrencyProvider>
  );
}
