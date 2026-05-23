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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gamification (Badges & XP)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Badge" : "Create New Badge"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Badge Name</label>
              <input required type="text" className="w-full p-2 border rounded" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea required className="w-full p-2 border rounded" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <select className="w-full p-2 border rounded" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})}>
                <option value="Trophy">Trophy</option>
                <option value="Star">Star</option>
                <option value="Medal">Medal</option>
                <option value="Crown">Crown</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Reward</label>
              <input required type="number" min="0" className="w-full p-2 border rounded" value={formData.xp_reward} onChange={(e) => setFormData({...formData, xp_reward: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Criteria Type</label>
              <select className="w-full p-2 border rounded" value={formData.criteria_type} onChange={(e) => setFormData({...formData, criteria_type: e.target.value})}>
                <option value="lessons_completed">Lessons Completed</option>
                <option value="course_completed">Courses Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Criteria Value</label>
              <input required type="number" min="1" className="w-full p-2 border rounded" value={formData.criteria_value} onChange={(e) => setFormData({...formData, criteria_value: parseInt(e.target.value)})} />
            </div>
            <div className="flex gap-2 pt-4">
              <button type="submit" className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                {isEditing ? "Update" : "Create"} Badge
              </button>
              {isEditing && (
                <button type="button" onClick={() => { setIsEditing(null); setFormData({ name: "", description: "", icon: "Trophy", xp_reward: 100, criteria_type: "lessons_completed", criteria_value: 1 })}} className="px-4 py-2 border rounded hover:bg-slate-50">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200">
              No badges created yet. Create one to get started!
            </div>
          ) : badges.map((badge) => (
            <div key={badge.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center text-center relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => handleEdit(badge)} className="p-2 text-slate-500 hover:text-black bg-slate-100 rounded-full"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(badge.id)} className="p-2 text-red-500 hover:text-red-700 bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                {ICON_MAP[badge.icon] || <Trophy className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="font-bold text-lg">{badge.name}</h3>
              <p className="text-sm text-slate-500 my-2">{badge.description}</p>
              <div className="mt-auto pt-4 flex items-center justify-center gap-4 w-full">
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">+{badge.xp_reward} XP</span>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                  {badge.criteria_type === 'lessons_completed' ? `${badge.criteria_value} Lessons` : `${badge.criteria_value} Courses`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
