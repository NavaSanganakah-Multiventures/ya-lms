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
  const lang = params.lang as string;
  const isHindi = lang === 'hi';

  if (!id) return { title: 'Course Details | Adityanveshan' };

  // Graceful fallback metadata — actual content rendered by CourseClient
  return {
    title: 'Course Details | Adityanveshan',
    description: 'Explore our courses at Adityanveshan Swadhyaya Vedika',
    openGraph: {
      title: 'Course Details | Adityanveshan',
      description: 'Explore our courses at Adityanveshan Swadhyaya Vedika',
      type: 'website',
    },
  };
}

export default async function CoursePage({ searchParams }: Props) {
  const params = await searchParams;
  const id = params.id as string;

  if (!id) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Course ID required.</p>
      </div>
    );
  }

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
