import type {Metadata, Viewport} from 'next';
import './globals.css'; 
import ClientLayout from '@/components/ClientLayout';

const SITE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lms.yagyaashram.com';

type SiteSettings = {
  site_name?: string;
  dashboard_name?: string;
  founder_name?: string;
  parent_company?: string;
  child_company?: string;
  contact_phone?: string;
  site_address?: string;
  founder_website?: string;
  yagya_ashram_website?: string;
  navasanganakah_website?: string;
  founder_phone?: string;
  founder_google_panel?: string;
  founder_social_handle?: string;
  yagya_ashram_social_handle?: string;
  navasanganakah_social_handle?: string;
};

async function fetchSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${SITE_BASE_URL}/api/settings`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const data = await res.json() as { settings?: SiteSettings };
    return data.settings || {};
  } catch {
    return {};
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();

  const siteName = settings.site_name || 'Adityanveshan';
  const dashboardName = settings.dashboard_name || 'Adityanveshan Swadhyaya Vedika';
  const founderName = settings.founder_name || 'Acharya Pandit Dheerendra Tripathi';
  const parentCompany = settings.parent_company || 'NavaSanganakah Multiventures';
  const childCompany = settings.child_company || 'Yagya Ashram';
  const contactPhone = settings.contact_phone || '+919669509960';

  return {
    title: {
      template: `%s | ${dashboardName}`,
      default: dashboardName,
    },
    icons: {
      icon: '/icon.png',
      shortcut: '/icon.png',
      apple: '/icon.png',
    },
    description: `${dashboardName} by ${childCompany} - a premier educational platform blending traditional knowledge with modern learning. A ${parentCompany} initiative. Contact: ${contactPhone}.`,
    keywords: [siteName, 'Swadhyaya Vedika', childCompany, parentCompany, 'Online Courses', 'Vedic Studies', 'LMS', 'Education', 'Spiritual Learning'],
    authors: [
      { name: founderName, url: settings.founder_website || 'https://acharypdt.com' },
      { name: childCompany, url: settings.yagya_ashram_website || 'https://yagyaashram.com' },
      { name: parentCompany, url: settings.navasanganakah_website || 'https://navasanganakah.com' }
    ],
    openGraph: {
      title: dashboardName,
      description: `${dashboardName} by ${childCompany} - a premier educational platform blending traditional knowledge with modern learning.`,
      siteName: dashboardName,
      locale: 'hi_IN',
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const settings = await fetchSettings();

  const dashboardName = settings.dashboard_name || 'Adityanveshan Swadhyaya Vedika';
  const founderName = settings.founder_name || 'Acharya Pandit Dheerendra Tripathi';
  const childCompany = settings.child_company || 'Yagya Ashram';
  const parentCompany = settings.parent_company || 'NavaSanganakah Multiventures';
  const contactPhone = settings.contact_phone || '+919669509960';
  const siteAddress = settings.site_address || 'Rajgarh, MP, India';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_BASE_URL}/#organization`,
        'name': childCompany,
        'url': settings.yagya_ashram_website || 'https://yagyaashram.com',
        'logo': 'https://yagyaashram.com/logo.png',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': siteAddress
        },
        'telephone': contactPhone,
        'sameAs': [
          `https://facebook.com/${settings.yagya_ashram_social_handle?.replace('@', '') || 'yagyaashram'}`,
          `https://instagram.com/${settings.yagya_ashram_social_handle?.replace('@', '') || 'yagyaashram'}`,
          `https://twitter.com/${settings.yagya_ashram_social_handle?.replace('@', '') || 'yagyaashram'}`
        ],
        'parentOrganization': {
          '@type': 'Organization',
          'name': parentCompany,
          'url': settings.navasanganakah_website || 'https://navasanganakah.com',
          'sameAs': [
            `https://facebook.com/${settings.navasanganakah_social_handle?.replace('@', '') || 'navasanganakah'}`,
            `https://instagram.com/${settings.navasanganakah_social_handle?.replace('@', '') || 'navasanganakah'}`,
            `https://twitter.com/${settings.navasanganakah_social_handle?.replace('@', '') || 'navasanganakah'}`
          ]
        }
      },
      {
        '@type': 'Person',
        '@id': 'https://acharypdt.com/#person',
        'name': founderName,
        'url': settings.founder_website || 'https://acharypdt.com',
        'telephone': settings.founder_phone || contactPhone,
        'sameAs': [
          settings.founder_google_panel || 'https://share.google/fXfpcS0k8xu8YvEYh',
          `https://facebook.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://instagram.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://twitter.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`
        ],
        'jobTitle': 'Founder',
        'worksFor': { '@id': `${SITE_BASE_URL}/#organization` }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_BASE_URL}/#website`,
        'url': SITE_BASE_URL,
        'name': dashboardName,
        'publisher': { '@id': `${SITE_BASE_URL}/#organization` }
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
