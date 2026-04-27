'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

export default function DashboardPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    // Check profile status
    fetch('/api/user/profile')
      .then(res => res.json())
      .then((data: any) => {
        const u = data.user;
        if (u && (!u.full_name || !u.phone || !u.birth_date || !u.father_name || !u.mother_name || !u.grand_father_name)) {
          setProfileIncomplete(true);
        }
      });

    fetch('/api/courses')
      .then(res => res.json())
      .then((data: any) => {
        setCourses(data.courses || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleSeed = async () => {
    await fetch('/api/dev/seed', { method: 'POST' });
    window.location.reload();
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div>
      {profileIncomplete && (
        <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-orange-500/5">
          <div className="flex items-center gap-3">
             <div className="bg-orange-500/20 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-400" />
             </div>
             <div>
                <p className="text-white font-medium">आपकी प्रोफ़ाइल अधूरी है!</p>
                <p className="text-xs text-neutral-400">सभी सुविधाओं का उपयोग करने के लिए कृपया अपनी जानकारी भरें।</p>
             </div>
          </div>
          <Link href="/dashboard/profile" className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20">
             जानकारी भरें
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">उपलब्ध पाठ्यक्रम</h1>
          <p className="text-neutral-400 mt-1 md:mt-2 text-sm md:text-base">हमारे नवीनतम पाठ्यक्रमों में ब्राउज़ करें और नामांकन करें।</p>
        </div>
        {courses.length === 0 && (
          <button onClick={handleSeed} className="w-full md:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm rounded-lg transition-colors text-white font-medium">
            टेस्ट कोर्स जोड़ें
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800">
          <BookOpen className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-300">कोई पाठ्यक्रम उपलब्ध नहीं है</h3>
          <p className="text-neutral-500 mt-1">नई सामग्री के लिए कृपया बाद में वापस आएं।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Link href={`/dashboard/course?id=${course.id}`} key={course.id} className="group flex flex-col bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="h-48 bg-neutral-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 shadow-lg">
                  {getCoursePrice(course)}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                <p className="text-neutral-400 mt-2 text-sm line-clamp-2 flex-1">{course.description}</p>
                <div className="mt-6 flex items-center text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
                  विवरण देखें <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
