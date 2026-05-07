import { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CourseClient from './CourseClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await searchParams;
  const id = params.id as string;
  if (!id) return { title: 'Course Details | Yagya Ashram' };

  try {
    const baseUrl = 'https://lms.yagyaashram.com';
    const response = await fetch(`${baseUrl}/api/courses/${id}`, { next: { revalidate: 3600 } });
    const { course } = await response.json() as any;

    if (!course) return { title: 'Course Not Found | Yagya Ashram' };

    const lang = params.lang as string;
    const isHindi = lang === 'hi';

    // Priority: Specific SEO Field -> Generic Title/Description -> Fallback
    const title = isHindi 
      ? (course.seo_title_hi || course.title)
      : (course.seo_title_en || course.title);
    
    const description = isHindi
      ? (course.seo_description_hi || course.description)
      : (course.seo_description_en || course.description);

    const keywords = isHindi
      ? (course.seo_keywords_hi || '')
      : (course.seo_keywords_en || '');

    return {
      title: `${title} | Yagya Ashram`,
      description,
      keywords,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${baseUrl}/course?id=${id}`,
      },
      alternates: {
        canonical: `${baseUrl}/course?id=${id}`,
        languages: {
          'en-US': `${baseUrl}/course?id=${id}&lang=en`,
          'hi-IN': `${baseUrl}/course?id=${id}&lang=hi`,
        },
      },
    };
  } catch (error) {
    return { title: 'Course | Yagya Ashram' };
  }
}

export default function CoursePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-neutral-500 font-medium animate-pulse">लोड हो रहा है...</p>
          </div>
        }>
          <CourseClient />
        </Suspense>
      </main>
    </div>
  );
}
