"use client";

import { useState, useEffect } from "react";
import { Trophy, Star, Medal, Crown, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ICON_MAP: Record<string, React.ReactNode> = {
  Trophy: <Trophy className="w-10 h-10" />,
  Star: <Star className="w-10 h-10" />,
  Medal: <Medal className="w-10 h-10" />,
  Crown: <Crown className="w-10 h-10" />,
};

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned_at?: string;
  criteria_type: string;
  criteria_value: number;
}

export default function TrophyRoom() {
  const [data, setData] = useState<{
    xp: number;
    level: number;
    nextLevelXp: number;
    earnedBadges: Badge[];
    allBadges: Badge[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      const res = await fetch("/api/user/gamification");
      if (!res.ok) throw new Error("Failed to load gamification data");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-neutral-400">Loading Trophy Room...</div>;
  }

  const earnedIds = new Set(data.earnedBadges.map(b => b.id));
  const lockedBadges = data.allBadges.filter(b => !earnedIds.has(b.id));

  const xpProgress = ((data.xp % 1000) / 1000) * 100;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 bg-gradient-to-b from-neutral-900 to-black rounded-3xl border border-neutral-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
        <Crown className="w-16 h-16 text-yellow-500 animate-pulse" />
        <h1 className="text-4xl font-black text-white tracking-tight">Level {data.level}</h1>
        <p className="text-neutral-400 text-lg">{data.xp} Total XP</p>
        
        <div className="w-full max-w-md px-4 mt-4">
          <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
            <span>{data.level * 1000 - 1000} XP</span>
            <span>{data.nextLevelXp} XP (Next Level)</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-4 overflow-hidden border border-neutral-700">
            <div 
              className="bg-gradient-to-r from-orange-500 to-yellow-400 h-4 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              style={{ width: `${xpProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500 w-6 h-6" />
          Earned Badges ({data.earnedBadges.length})
        </h2>
        
        {data.earnedBadges.length === 0 ? (
          <div className="text-center p-12 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed text-neutral-500">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>You haven't earned any badges yet. Keep learning!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.earnedBadges.map(badge => (
              <div key={badge.id} className="bg-neutral-900 border border-yellow-500/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:scale-105 transition-transform duration-300">
                <div className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] mb-4">
                  {ICON_MAP[badge.icon] || <Trophy className="w-10 h-10" />}
                </div>
                <h3 className="font-bold text-white text-sm">{badge.name}</h3>
                <p className="text-xs text-neutral-400 mt-2">{badge.description}</p>
                <div className="mt-4 text-[10px] font-black uppercase text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded">
                  +{badge.xp_reward} XP
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lockedBadges.length > 0 && (
        <div className="pt-8">
          <h2 className="text-xl font-bold text-neutral-400 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Locked Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {lockedBadges.map(badge => (
              <div key={badge.id} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="text-neutral-500 mb-4">
                  {ICON_MAP[badge.icon] || <Trophy className="w-10 h-10" />}
                </div>
                <h3 className="font-bold text-neutral-300 text-sm">{badge.name}</h3>
                <p className="text-[10px] text-neutral-500 mt-2">Requires: {badge.criteria_value} {badge.criteria_type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
