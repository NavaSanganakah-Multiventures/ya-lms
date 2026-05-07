import type {Metadata} from 'next';
import './globals.css'; // Global styles
import AIAssistant from '../components/AIAssistant';

export const metadata: Metadata = {
  title: {
    template: '%s | Adityanveshan Swadhyaya Vedika',
    default: 'Adityanveshan Swadhyaya Vedika',
  },
  description: 'Adityanveshan Swadhyaya Vedika by Yagya Ashram - a premier educational platform blending traditional knowledge with modern learning. A NavaSanganakah Multiventures initiative.',
  keywords: ['Adityanveshan', 'Swadhyaya Vedika', 'Yagya Ashram', 'NavaSanganakah', 'Online Courses', 'Vedic Studies', 'LMS', 'Education', 'Spiritual Learning'],
  authors: [
    { name: 'Acharya Pandit Dheerendra Tripathi', url: 'https://acharypdt.com' },
    { name: 'Yagya Ashram', url: 'https://yagyaashram.com' },
    { name: 'NavaSanganakah Multiventures', url: 'https://navasanganakah.com' }
  ],
  openGraph: {
    title: 'Adityanveshan Swadhyaya Vedika',
    description: 'Adityanveshan Swadhyaya Vedika by Yagya Ashram - a premier educational platform blending traditional knowledge with modern learning.',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://lms.yagyaashram.com/#organization',
        'name': 'Yagya Ashram',
        'url': 'https://yagyaashram.com',
        'logo': 'https://yagyaashram.com/logo.png',
        'sameAs': [
          'https://facebook.com/yagyaashram',
          'https://instagram.com/yagyaashram',
          'https://twitter.com/yagyaashram'
        ],
        'parentOrganization': {
          '@type': 'Organization',
          'name': 'NavaSanganakah Multiventures',
          'url': 'https://navasanganakah.com',
          'sameAs': [
            'https://facebook.com/navasanganakah',
            'https://instagram.com/navasanganakah',
            'https://twitter.com/navasanganakah'
          ]
        }
      },
      {
        '@type': 'Person',
        '@id': 'https://acharypdt.com/#person',
        'name': 'Acharya Pandit Dheerendra Tripathi',
        'url': 'https://acharypdt.com',
        'sameAs': [
          'https://share.google/fXfpcS0k8xu8YvEYh',
          'https://facebook.com/acharypdt',
          'https://instagram.com/acharypdt',
          'https://twitter.com/acharypdt'
        ],
        'jobTitle': 'Founder',
        'worksFor': { '@id': 'https://lms.yagyaashram.com/#organization' }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://lms.yagyaashram.com/#website',
        'url': 'https://lms.yagyaashram.com',
        'name': 'Adityanveshan Swadhyaya Vedika',
        'publisher': { '@id': 'https://lms.yagyaashram.com/#organization' }
      }
    ]
  };

  return (
    <html lang="hi">
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
