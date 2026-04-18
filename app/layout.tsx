import type {Metadata} from 'next';
import './globals.css'; // Global styles
import AIAssistant from '../components/AIAssistant';

export const metadata: Metadata = {
  title: {
    template: '%s | Adityanveshan Swadhyay Vedika',
    default: 'Adityanveshan Swadhyay Vedika | Yagya Ashram',
  },
  description: 'Welcome to Adityanveshan Swadhyay Vedika by Yagya Ashram - a premier educational platform blending traditional knowledge with modern learning. Join our courses for holistic development and spiritual education.',
  keywords: ['Adityanveshan', 'Swadhyay Vedika', 'Yagya Ashram', 'Online Courses', 'Vedic Studies', 'LMS', 'Education', 'Spiritual Learning'],
  authors: [{ name: 'Yagya Ashram' }],
  openGraph: {
    title: 'Adityanveshan Swadhyay Vedika | Yagya Ashram',
    description: 'Welcome to Adityanveshan Swadhyay Vedika by Yagya Ashram - a premier educational platform blending traditional knowledge with modern learning.',
    siteName: 'Adityanveshan Swadhyay Vedika',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adityanveshan Swadhyay Vedika | Yagya Ashram',
    description: 'Welcome to Adityanveshan Swadhyay Vedika by Yagya Ashram - a premier educational platform.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import ClientLayout from '@/components/ClientLayout';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="hi">
      <body suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
