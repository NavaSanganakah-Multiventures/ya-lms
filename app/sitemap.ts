import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lms.yagyaashram.com';

  // Static routes
  const routes = [
    '',
    '/auth/login',
    '/auth/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Legal Document routes
  const legalSlugs = ['privacy', 'terms', 'refund'];
  const legalRoutes: MetadataRoute.Sitemap = legalSlugs.map((slug) => ({
    url: `${baseUrl}/legal-docs?slug=${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Dynamic routes (Courses)
  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Fetch courses
    const courseRes = await fetch(`${baseUrl}/api/courses`);
    if (courseRes.ok) {
      const { courses } = await courseRes.json() as any;
      if (Array.isArray(courses)) {
        const courseEntries: MetadataRoute.Sitemap = courses.map((course: any) => ({
          url: `${baseUrl}/course?id=${course.id}`,
          lastModified: new Date(course.created_at || Date.now()),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
        dynamicRoutes = [...dynamicRoutes, ...courseEntries];
      }
    }
  } catch (error) {
    console.error('Sitemap course fetch failed:', error);
  }

  return [...routes, ...legalRoutes, ...dynamicRoutes];
}
