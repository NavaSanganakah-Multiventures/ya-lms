'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Users, BookOpen, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/analytics')
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-red-400 font-bold p-6">Failed to load analytics data.</div>;
  }

  const overviewCards = [
    { label: 'Total Revenue', value: `₹${Number(stats.revenue || 0).toLocaleString('hi-IN')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Students', value: stats.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Courses', value: stats.totalCourses || 0, icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-emerald-500" /> Platform Analytics
        </h1>
        <p className="text-neutral-500 mt-2 font-medium">Enterprise data insights and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards.map((card, i) => (
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-400" /> Top Performing Courses
          </h2>
        </div>

        <div className="space-y-4">
          {stats.topCourses && stats.topCourses.length > 0 ? (
            stats.topCourses.map((course: any, idx: number) => {
              const maxEnrollments = stats.topCourses[0].enrollments || 1;
              const percentage = Math.round((course.enrollments / maxEnrollments) * 100);
              
              return (
                <div key={course.id} className="group flex items-center gap-4 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-800/50 hover:border-purple-500/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center font-black text-purple-400">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate group-hover:text-purple-400 transition-colors">{course.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                        {course.enrollments} Enrolled
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-neutral-500 text-sm py-10 text-center border border-dashed border-neutral-800 rounded-2xl">
              No course enrollment data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
