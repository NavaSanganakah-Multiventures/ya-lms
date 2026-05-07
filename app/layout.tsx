import type {Metadata} from 'next';
import './globals.css'; 
import ClientLayout from '@/components/ClientLayout';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const baseUrl = 'https://lms.yagyaashram.com';
    const res = await fetch(`${baseUrl}/api/settings`, { next: { revalidate: 3600 } });
    const { settings } = await res.json() as any;

    const siteName = settings?.site_name || 'Adityanveshan';
    const dashboardName = settings?.dashboard_name || 'Adityanveshan Swadhyaya Vedika';
    const founderName = settings?.founder_name || 'Acharya Pandit Dheerendra Tripathi';
    const parentCompany = settings?.parent_company || 'NavaSanganakah Multiventures';
    const childCompany = settings?.child_company || 'Yagya Ashram';

    return {
      title: {
        template: `%s | ${dashboardName}`,
        default: dashboardName,
      },
      description: `${dashboardName} by ${childCompany} - a premier educational platform blending traditional knowledge with modern learning. A ${parentCompany} initiative.`,
      keywords: [siteName, 'Swadhyaya Vedika', childCompany, parentCompany, 'Online Courses', 'Vedic Studies', 'LMS', 'Education', 'Spiritual Learning'],
      authors: [
        { name: founderName, url: settings?.founder_website || 'https://acharypdt.com' },
        { name: childCompany, url: settings?.yagya_ashram_website || 'https://yagyaashram.com' },
        { name: parentCompany, url: settings?.navasanganakah_website || 'https://navasanganakah.com' }
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
  } catch (err) {
    return {
      title: 'Adityanveshan Swadhyaya Vedika',
      description: 'Adityanveshan Swadhyaya Vedika - Traditional knowledge with modern learning.',
    };
  }
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  let settings: any = {};
  try {
    const baseUrl = 'https://lms.yagyaashram.com';
    const res = await fetch(`${baseUrl}/api/settings`, { next: { revalidate: 3600 } });
    const data = await res.json() as any;
    settings = data.settings || {};
  } catch (e) {}

  const dashboardName = settings.dashboard_name || 'Adityanveshan Swadhyaya Vedika';
  const founderName = settings.founder_name || 'Acharya Pandit Dheerendra Tripathi';
  const childCompany = settings.child_company || 'Yagya Ashram';
  const parentCompany = settings.parent_company || 'NavaSanganakah Multiventures';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://lms.yagyaashram.com/#organization',
        'name': childCompany,
        'url': settings.yagya_ashram_website || 'https://yagyaashram.com',
        'logo': 'https://yagyaashram.com/logo.png',
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
        'sameAs': [
          settings.founder_google_panel || 'https://share.google/fXfpcS0k8xu8YvEYh',
          `https://facebook.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://instagram.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://twitter.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`
        ],
        'jobTitle': 'Founder',
        'worksFor': { '@id': 'https://lms.yagyaashram.com/#organization' }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://lms.yagyaashram.com/#website',
        'url': 'https://lms.yagyaashram.com',
        'name': dashboardName,
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
