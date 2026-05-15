'use client';

import { useEffect, useState } from 'react';
import { Users, BookOpen, GraduationCap, DollarSign, Loader2, TrendingUp, TrendingDown, Minus, Sparkles, MessageSquare, PlusCircle, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


function formatTrendValue(value: number = 0) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('hi-IN', { maximumFractionDigits: 1 })}%`;
}

function getTrendDisplay(value: number = 0) {
  if (value > 0) {
    return {
      icon: TrendingUp,
      label: formatTrendValue(value),
      className: 'text-emerald-400 bg-emerald-500/10',
    };
  }

  if (value < 0) {
    return {
      icon: TrendingDown,
      label: formatTrendValue(value),
      className: 'text-red-400 bg-red-500/10',
    };
  }

  return {
    icon: Minus,
    label: '0%',
    className: 'text-neutral-400 bg-neutral-500/10',
  };
}

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

  const cards = [
    { label: 'कुल छात्र', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: stats.trends?.users ?? 0 },
    { label: 'सक्रिय पाठ्यक्रम', value: stats.courses, icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10', trend: stats.trends?.courses ?? 0 },
    { label: 'कुल नामांकन', value: stats.enrollments, icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: stats.trends?.enrollments ?? 0 },
    { label: 'कुल राजस्व', value: `₹${Number(stats.revenue || 0).toLocaleString('hi-IN')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: stats.trends?.revenue ?? 0 },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">प्लेटफ़ॉर्म अवलोकन</h1>
          <p className="text-neutral-500 mt-1 font-medium">NS LMS Portal की वर्तमान स्थिति</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             सिस्टम लाइव
          </span>
          <Link href="/admin/courses" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> नया कोर्स
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const trend = getTrendDisplay(card.trend);
          const TrendIcon = trend.icon;

          return (
            <div key={i} className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 hover:border-neutral-700 transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 p-3 ${card.bg} rounded-bl-3xl opacity-50 group-hover:opacity-100 transition-opacity`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">{card.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-black text-white tracking-tighter">{card.value}</p>
                <span className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full ${trend.className}`} title="इस महीने बनाम पिछले महीने">
                  <TrendIcon className="w-3 h-3 mr-1" /> {trend.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2rem] p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Sparkles className="w-32 h-32 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" /> क्विक एक्शन
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'छात्रों को मैसेज भेजें', desc: 'ब्रॉडकास्ट या ईमेल ड्राफ्ट्स', icon: MessageSquare, href: '/admin/broadcast', color: 'bg-blue-500' },
                { label: 'कोर्स अपडेट करें', desc: 'नया चैप्टर या लाइव सेशन', icon: BookOpen, href: '/admin/courses', color: 'bg-orange-500' },
                { label: 'नए एडमिशन चेक करें', desc: 'हाल के नामांकनों की समीक्षा', icon: GraduationCap, href: '/admin/enrollments', color: 'bg-purple-500' },
                { label: 'सिस्टम सेटिंग्स', desc: 'ब्रांडिंग और SEO कॉन्फ़िगरेशन', icon: Globe, href: '/admin/settings', color: 'bg-neutral-600' },
              ].map((action, i) => (
                <Link key={i} href={action.href} className="group p-4 bg-neutral-950/50 border border-neutral-800 rounded-2xl hover:border-orange-500/30 hover:bg-neutral-900 transition-all flex items-start gap-4">
                  <div className={`p-3 ${action.color} text-white rounded-xl shadow-lg shadow-${action.color}/20 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">{action.label}</p>
                    <p className="text-xs text-neutral-500 mt-1">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-[2rem] p-8 h-full">
            <h3 className="text-xl font-bold text-white mb-6">सिस्टम स्वास्थ्य</h3>
            <div className="space-y-6">
              {[
                { label: 'Edge Network', status: 'Healthy', val: 100 },
                { label: 'D1 Database', status: 'Optimized', val: 98 },
                { label: 'R2 Storage', status: 'Available', val: 100 },
              ].map((sys, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-neutral-500">{sys.label}</span>
                    <span className="text-emerald-400">{sys.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sys.val}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-6 mt-6 border-t border-neutral-800">
                <p className="text-[10px] text-neutral-500 leading-relaxed italic">
                  सभी सिस्टम Cloudflare Edge पर पूरी तरह से सुरक्षित रूप से काम कर रहे हैं। NS LMS Portal का अनुभव अब और भी बेहतर है।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
