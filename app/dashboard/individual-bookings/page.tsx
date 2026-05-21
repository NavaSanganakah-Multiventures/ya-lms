'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Coins, ExternalLink, Loader2, Video, XCircle } from 'lucide-react';

export default function MyIndividualBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/individual-bookings')
      .then(r => r.json())
      .then((data: any) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      completed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return map[status] || 'bg-neutral-800 text-neutral-500';
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3"><Video className="w-6 h-6 text-violet-400" /> My Individual Classes</h1>
        <p className="text-sm text-neutral-400 mt-1">Booked one-on-one classes</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold">No individual bookings yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b: any) => (
            <div key={b.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{b.course_title || b.course_title_hi || 'Individual Class'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(b.status)}`}>{b.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(b.scheduled_at).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {b.credits_charged} credits</span>
                </div>
              </div>
              {b.rtc_room_id && (b.status === 'scheduled' || b.status === 'live') && (
                <a
                  href={`/live?roomId=${b.rtc_room_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs transition-all shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Join
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
