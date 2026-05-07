import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://lms.yagyaashram.com';

  // Static routes
  const routes = [
    '',
    '/auth/login',
    '/auth/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic course routes
  try {
    const response = await fetch(`${baseUrl}/api/courses`);
    const { courses } = await response.json() as any;

    if (courses) {
      const courseRoutes = courses.map((course: any) => ({
        url: `${baseUrl}/course/${course.id}`,
        lastModified: new Date(course.created_at || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
      return [...routes, ...courseRoutes];
    }
  } catch (error) {
    console.error('Sitemap course fetch failed:', error);
  }

  return routes;
}
