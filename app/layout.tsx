import type {Metadata, Viewport} from 'next';
import './globals.css'; 
import ClientLayout from '@/components/ClientLayout';


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const baseUrl = 'https://lms.navasanganakah.com';
    const res = await fetch(`${baseUrl}/api/settings`, { next: { revalidate: 3600 } });
    const { settings } = await res.json() as any;

    const siteName = settings?.site_name || 'NS LMS';
    const dashboardName = settings?.dashboard_name || 'NS LMS Portal';
    const founderName = settings?.founder_name || 'Director Navasanganakah';
    const parentCompany = settings?.parent_company || 'NavaSanganakah Group';
    const childCompany = settings?.child_company || 'NavaSanganakah LMS';
    const contactPhone = settings?.contact_phone || '+919669509960';
    const siteAddress = settings?.site_address || 'Rajgarh, MP, India';

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
      keywords: [siteName, 'Academic Portal', childCompany, parentCompany, 'Online Courses', 'Science & Math Study', 'LMS', 'Education', 'Academic Excellence'],
      authors: [
        { name: founderName, url: settings?.founder_website || 'https://navasanganakah.com' },
        { name: childCompany, url: settings?.ns_lms_website || 'https://navasanganakah.com' },
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
      title: 'NS LMS Portal',
      description: 'NS LMS Portal - Traditional knowledge with modern learning.',
    };
  }
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  let settings: any = {};
  try {
    const baseUrl = 'https://lms.navasanganakah.com';
    const res = await fetch(`${baseUrl}/api/settings`, { next: { revalidate: 3600 } });
    const data = await res.json() as any;
    settings = data.settings || {};
  } catch (e) {}

  const dashboardName = settings.dashboard_name || 'NS LMS Portal';
  const founderName = settings.founder_name || 'Director Navasanganakah';
  const childCompany = settings.child_company || 'NavaSanganakah LMS';
  const parentCompany = settings.parent_company || 'NavaSanganakah Group';
  const contactPhone = settings.contact_phone || '+919669509960';
  const siteAddress = settings.site_address || 'Rajgarh, MP, India';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://lms.navasanganakah.com/#organization',
        'name': childCompany,
        'url': settings.ns_lms_website || 'https://navasanganakah.com',
        'logo': 'https://navasanganakah.com/logo.png',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': siteAddress
        },
        'telephone': contactPhone,
        'sameAs': [
          `https://facebook.com/${settings.ns_lms_social_handle?.replace('@', '') || 'navasanganakah'}`,
          `https://instagram.com/${settings.ns_lms_social_handle?.replace('@', '') || 'navasanganakah'}`,
          `https://twitter.com/${settings.ns_lms_social_handle?.replace('@', '') || 'navasanganakah'}`
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
        '@id': 'https://navasanganakah.com/#person',
        'name': founderName,
        'url': settings.founder_website || 'https://navasanganakah.com',
        'telephone': settings.founder_phone || contactPhone,
        'sameAs': [
          settings.founder_google_panel || 'https://share.google/fXfpcS0k8xu8YvEYh',
          `https://facebook.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://instagram.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`,
          `https://twitter.com/${settings.founder_social_handle?.replace('@', '') || 'acharypdt'}`
        ],
        'jobTitle': 'Founder',
        'worksFor': { '@id': 'https://lms.navasanganakah.com/#organization' }
      },
      {
        '@type': 'WebSite',
        '@id': 'https://lms.navasanganakah.com/#website',
        'url': 'https://lms.navasanganakah.com',
        'name': dashboardName,
        'publisher': { '@id': 'https://lms.navasanganakah.com/#organization' }
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
