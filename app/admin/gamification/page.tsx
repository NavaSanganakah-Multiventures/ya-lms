"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Trophy, Star, Medal, Crown } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const ICON_MAP: Record<string, React.ReactNode> = {
  Trophy: <Trophy className="w-6 h-6 text-yellow-500" />,
  Star: <Star className="w-6 h-6 text-yellow-400" />,
  Medal: <Medal className="w-6 h-6 text-blue-500" />,
  Crown: <Crown className="w-6 h-6 text-purple-500" />,
};

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  criteria_type: string;
  criteria_value: number;
}

export default function GamificationAdminPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Badge>>({
    name: "",
    description: "",
    icon: "Trophy",
    xp_reward: 100,
    criteria_type: "lessons_completed",
    criteria_value: 1,
  });

  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await fetch("/api/admin/badges");
      if (!res.ok) throw new Error("Failed to fetch badges");
      const data = await res.json() as Badge[];
      setBadges(data);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/admin/badges/${isEditing}` : "/api/admin/badges";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error("Failed to save badge");
      
      showSuccess("Badge saved successfully.");
      setFormData({ name: "", description: "", icon: "Trophy", xp_reward: 100, criteria_type: "lessons_completed", criteria_value: 1 });
      setIsEditing(null);
      fetchBadges();
    } catch (e: any) {
      showError(e.message || "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;
    try {
      const res = await fetch(`/api/admin/badges/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete badge");
      showSuccess("Badge removed successfully.");
      fetchBadges();
    } catch (e: any) {
      showError(e.message);
    }
  };

  const handleEdit = (badge: Badge) => {
    setIsEditing(badge.id);
    setFormData(badge);
  };

  if (loading) return <div className="p-8 text-neutral-500">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Trophy className="h-7 w-7 text-orange-500" /> Gamification (XP & Badges)
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Badges, experience points (XP), aur rewards criteria yahan manage karein.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create / Edit Form */}
        <div className="lg:col-span-1 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl space-y-6 h-fit">
          <h2 className="text-xl font-black text-white">{isEditing ? "Edit Badge" : "Create New Badge"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-xs">Badge Name *</label>
              <input required type="text" className="input-dark mt-2 w-full" value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rigveda Explorer" />
            </div>
            <div>
              <label className="label-xs">Description *</label>
              <textarea required className="input-dark mt-2 w-full min-h-[80px]" value={formData.description || ""} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="e.g. Complete all modules in Rigveda." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-xs">Icon</label>
                <select className="input-dark mt-2 w-full" value={formData.icon || "Trophy"} onChange={(e) => setFormData({...formData, icon: e.target.value})}>
                  <option value="Trophy">Trophy</option>
                  <option value="Star">Star</option>
                  <option value="Medal">Medal</option>
                  <option value="Crown">Crown</option>
                </select>
              </div>
              <div>
                <label className="label-xs">XP Reward</label>
                <input required type="number" min="0" className="input-dark mt-2 w-full" value={formData.xp_reward || 0} onChange={(e) => setFormData({...formData, xp_reward: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-xs">Criteria Type</label>
                <select className="input-dark mt-2 w-full" value={formData.criteria_type || "lessons_completed"} onChange={(e) => setFormData({...formData, criteria_type: e.target.value})}>
                  <option value="lessons_completed">Lessons Completed</option>
                  <option value="course_completed">Courses Completed</option>
                </select>
              </div>
              <div>
                <label className="label-xs">Criteria Value</label>
                <input required type="number" min="1" className="input-dark mt-2 w-full" value={formData.criteria_value || 1} onChange={(e) => setFormData({...formData, criteria_value: parseInt(e.target.value) || 1})} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 text-sm cursor-pointer">
                {isEditing ? "Update" : "Create"} Badge
              </button>
              {isEditing && (
                <button type="button" onClick={() => { setIsEditing(null); setFormData({ name: "", description: "", icon: "Trophy", xp_reward: 100, criteria_type: "lessons_completed", criteria_value: 1 })}} className="px-4 py-3 border border-neutral-700 bg-neutral-800 text-neutral-300 font-black rounded-xl hover:text-white transition-all text-sm cursor-pointer">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Badges List */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {badges.length === 0 ? (
            <div className="col-span-full text-center py-16 text-neutral-500 bg-neutral-900/50 rounded-3xl border-2 border-dashed border-neutral-800">
              <Trophy className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="font-bold text-white mb-2">No badges created yet</h3>
              <p className="text-neutral-500 text-sm max-w-xs mx-auto">Create one on the left to incentivize student learning achievements.</p>
            </div>
          ) : badges.map((badge) => (
            <div key={badge.id} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 flex flex-col items-center text-center relative group hover:border-orange-500/50 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => handleEdit(badge)} className="p-2 text-neutral-400 hover:text-white bg-neutral-800 rounded-xl border border-neutral-700 transition-colors" aria-label="Edit badge" title="Edit badge"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(badge.id)} className="p-2 text-red-400 hover:text-red-300 bg-red-950/30 rounded-xl border border-red-500/20 transition-colors" aria-label="Delete badge" title="Delete badge"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-neutral-950 rounded-full mb-4 border border-neutral-800 shadow-inner">
                {ICON_MAP[badge.icon] || <Trophy className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="font-black text-lg text-white">{badge.name}</h3>
              <p className="text-sm text-neutral-400 my-2 leading-relaxed">{badge.description}</p>
              <div className="mt-auto pt-4 flex items-center justify-center gap-3 w-full border-t border-neutral-850">
                <span className="text-[10px] font-black px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 uppercase tracking-wider">+{badge.xp_reward} XP</span>
                <span className="text-[10px] font-black px-2.5 py-1 bg-neutral-950 text-neutral-400 rounded-full border border-neutral-800 uppercase tracking-wider">
                  {badge.criteria_type === 'lessons_completed' ? `${badge.criteria_value} Lessons` : `${badge.criteria_value} Courses`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`.input-dark{background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;transition:all .2s;width:100%}.input-dark:focus{border-color:#ea580c;box-shadow:0 0 0 2px rgba(234,88,12,0.1)}.label-xs{font-size:11px;font-weight:900;color:#737373;text-transform:uppercase;letter-spacing:.1em}`}</style>
    </div>
  );
}
