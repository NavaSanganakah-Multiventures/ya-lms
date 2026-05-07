import type {Metadata} from 'next';
import './globals.css'; // Global styles
import AIAssistant from '../components/AIAssistant';

export const metadata: Metadata = {
  title: {
    template: '%s | Adityanveshan Swadhyaya Vedika',
    default: 'Adityanveshan Swadhyaya Vedika',
  },
  description: 'Welcome to Adityanveshan Swadhyaya Vedika - a premier educational platform blending traditional knowledge with modern learning. Join our courses for holistic development and spiritual education.',
  keywords: ['Adityanveshan', 'Swadhyaya Vedika', 'Online Courses', 'Vedic Studies', 'LMS', 'Education', 'Spiritual Learning'],
  authors: [{ name: 'Adityanveshan' }],
  openGraph: {
    title: 'Adityanveshan Swadhyaya Vedika',
    description: 'Welcome to Adityanveshan Swadhyaya Vedika - a premier educational platform blending traditional knowledge with modern learning.',
    siteName: 'Adityanveshan Swadhyaya Vedika',
    locale: 'hi_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adityanveshan Swadhyaya Vedika',
    description: 'Welcome to Adityanveshan Swadhyaya Vedika - a premier educational platform.',
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
