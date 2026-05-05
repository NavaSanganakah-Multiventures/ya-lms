'use client';

import { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, DollarSign, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/stats')
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

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  if (!stats) return <div className="text-red-400">आंकड़े लोड करने में विफल।</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">प्लेटफ़ॉर्म अवलोकन</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">कुल उपयोगकर्ता</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.users}</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">सक्रिय पाठ्यक्रम</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.courses}</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">कुल नामांकन</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.enrollments}</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-400 font-medium">कुल राजस्व</p>
            <p className="text-2xl font-bold text-white mt-1">${((stats.revenue || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950/50">
            <h3 className="text-lg font-semibold text-white">सिस्टम की स्थिति</h3>
          </div>
          <div className="p-6">
            <p className="text-neutral-400 text-sm">
              सभी सिस्टम Cloudflare Edge पर पूरी तरह से काम कर रहे हैं। DB माइग्रेशन और प्रारंभिक जाँच प्रक्रिया सफलतापूर्वक प्रबंधित की जा रही है।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
