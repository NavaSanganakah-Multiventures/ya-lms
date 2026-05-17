import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CourseClient from './CourseClient';

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
