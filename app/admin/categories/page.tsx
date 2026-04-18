'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, X, Tag, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const router = useRouter();

  const fetchCategories = useCallback(() => {
    setIsLoading(true);
    fetch('/api/admin/categories')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.categories) setCategories(data.categories);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const method = editingCategory ? 'PUT' : 'POST';
    const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        setShowModal(false);
        setEditingCategory(null);
        setNewCategory({ name: '', description: '' });
        fetchCategories();
      } else {
        alert("Failed to save category");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? Courses in this category will be marked as 'Uncategorized'.")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (cat: any) => {
    setEditingCategory(cat);
    setNewCategory({ name: cat.name, description: cat.description || '' });
    setShowModal(true);
  };

  if (isLoading && categories.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/courses" className="inline-flex items-center text-sm font-medium text-neutral-400 hover:text-indigo-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> पाठ्यक्रमों पर वापस जाएं
      </Link>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">श्रेणी प्रबंधन (Categories)</h1>
          <p className="text-neutral-400 mt-2 text-sm">पाठ्यक्रमों को व्यवस्थित करने के लिए श्रेणियां बनाएं।</p>
        </div>
        <button 
          onClick={() => { setEditingCategory(null); setNewCategory({ name: '', description: '' }); setShowModal(true); }}
          className="inline-flex py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          नई श्रेणी
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg group">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Tag className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{cat.name}</h3>
              </div>
              <p className="text-neutral-400 text-sm line-clamp-2">{cat.description || 'कोई विवरण नहीं'}</p>
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-neutral-800">
              <button 
                onClick={() => openEdit(cat)}
                className="p-2 text-neutral-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
            <Tag className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">अभी तक कोई श्रेणी नहीं बनाई गई है।</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-500" />
                {editingCategory ? 'श्रेणी संपादित करें' : 'नई श्रेणी बनाएँ'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">नाम (Name)</label>
                <input 
                  required 
                  type="text" 
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="उदा. योग, आयुर्वेद, दर्शन" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400">विवरण (Description)</label>
                <textarea 
                  rows={3}
                  value={newCategory.description}
                  onChange={e => setNewCategory({...newCategory, description: e.target.value})}
                  placeholder="इस श्रेणी के बारे में संक्षेप में बताएं" 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none" 
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl font-bold transition-all"
                >
                  रद्द करें
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'सहेजें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
