'use client';

import { useEffect, useState, useMemo } from 'react';
import { Loader2, Target, Clock, Trophy, BookOpen, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateCertificatePDF } from '@/lib/pdfGenerator';

export default function StudentAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCert, setIsGeneratingCert] = useState<string | null>(null);
  const router = useRouter();

  const handleDownloadCertificate = async (certificateId: string) => {
    try {
      setIsGeneratingCert(certificateId);
      const res = await fetch(`/api/user/certificates/${certificateId}`);
      if (!res.ok) throw new Error('Failed to fetch certificate');
      const certData = await res.json();
      
      const pdfBlob = await generateCertificatePDF(certData);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
      alert("Error generating certificate. Please try again.");
    } finally {
      setIsGeneratingCert(null);
    }
  };

  useEffect(() => {
    fetch('/api/user/analytics')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && !data.error) setStats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router]);

  // ⚡ Bolt Optimization: Calculate derived values in useMemo to prevent recalculation on every render (e.g. state changes)
  // useMemo moved above early returns to satisfy React Hook rules
  const { totalEnrollments, completedCourses, avgProgress, timeString } = useMemo(() => {
    if (!stats) return { totalEnrollments: 0, completedCourses: 0, avgProgress: 0, timeString: '0m' };

    // Format time spent (seconds to hours/mins)
    const totalSeconds = stats.timeSpentSeconds || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const enrollments = stats.enrollments || [];
    const count = enrollments.length;
    if (count === 0) return { totalEnrollments: 0, completedCourses: 0, avgProgress: 0, timeString: formattedTime };

    let completed = 0;
    let sumProgress = 0;

    // O(N) single pass loop instead of filter() followed by reduce() O(2N)
    for (let i = 0; i < count; i++) {
      const prog = enrollments[i].progress || 0;
      if (prog >= 100) completed++;
      sumProgress += prog;
    }

    return {
      totalEnrollments: count,
      completedCourses: completed,
      avgProgress: Math.round(sumProgress / count),
      timeString: formattedTime
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-400 font-bold p-6">Failed to load your progress data.</div>;
  }

  const summaryCards = [
    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: Target, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Time Spent', value: timeString, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Completed', value: `${completedCourses}/${totalEnrollments}`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <Target className="w-8 h-8 text-orange-500" /> My Progress
        </h1>
        <p className="text-neutral-500 mt-2 font-medium">Track your learning journey and achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden group hover:border-neutral-700 transition-all">
            <div className={`absolute -right-6 -top-6 p-10 rounded-full ${card.bg} opacity-20 group-hover:scale-150 transition-transform duration-700`} />
            <div className={`p-3 w-max rounded-xl ${card.bg} mb-4`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">{card.label}</p>
            <p className="text-3xl font-black text-white mt-1 tracking-tighter">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2rem] p-8">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-orange-400" /> Course Progress
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.enrollments && stats.enrollments.length > 0 ? (
            stats.enrollments.map((course: any, idx: number) => (
              <div key={idx} className="bg-neutral-950/50 border border-neutral-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all group">
                <h3 className="text-lg font-bold text-white mb-4 truncate group-hover:text-orange-400 transition-colors">
                  {course.courseTitle}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-neutral-500">Completion</span>
                    <span className="text-orange-400">{course.progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-1000" 
                      style={{ width: `${course.progress || 0}%` }} 
                    />
                  </div>
                </div>

                {course.progress >= 100 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      <Trophy className="w-3 h-3" /> Course Completed
                    </div>
                    {course.certificate_issued === 1 && course.certificate_id && (
                      <button 
                        onClick={() => handleDownloadCertificate(course.certificate_id)}
                        disabled={isGeneratingCert === course.certificate_id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-wider rounded-lg transition-colors"
                      >
                        {isGeneratingCert === course.certificate_id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Download className="w-3 h-3" /> Certificate 🎓</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 border border-dashed border-neutral-800 rounded-3xl">
              <BookOpen className="w-12 h-12 text-neutral-800 mx-auto mb-3" />
              <p className="text-neutral-500">You haven&apos;t enrolled in any courses yet.</p>
              <Link href="/dashboard" className="inline-block mt-4 text-orange-500 font-bold hover:underline">
                Explore Courses
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
