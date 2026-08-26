'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Edit2, Trash2, ArrowLeft, Bot, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function AdminAiModelsPage() {
  const { success: showSuccess, error: showError } = useToast();
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [newModel, setNewModel] = useState({
    id: '',
    name: '',
    provider: 'workers-ai',
    endpoint: 'chat/completions',
    system_prompt: '',
    fallback_model_ids: '[]',
    is_active: 1,
    is_default: 0
  });
  const router = useRouter();

  const fetchModels = useCallback((showLoading = true) => {
    if (showLoading) setIsLoading(true);
    fetch('/api/admin/ai-models')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json().catch(() => null) as { error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || `Request failed with status ${res.status}`);
        }
        return data;
      })
      .then((data: any) => {
        if (Array.isArray(data)) setModels(data);
        else if (data?.models) setModels(data.models);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        showError(err.message || 'Failed to load AI models');
        setIsLoading(false);
      });
  }, [router, showError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModels(false);
  }, [fetchModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const method = editingModel ? 'PUT' : 'POST';
    const url = editingModel ? `/api/admin/ai-models/${editingModel.id}` : '/api/admin/ai-models';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel)
      });

      if (res.ok) {
        showSuccess(`AI Model ${editingModel ? 'updated' : 'created'} successfully`);
        setShowModal(false);
        setEditingModel(null);
        setNewModel({
          id: '', name: '', provider: 'workers-ai', endpoint: 'chat/completions',
          system_prompt: '', fallback_model_ids: '[]', is_active: 1, is_default: 0
        });

        fetchModels();
      } else {
        const errorData = await res.json().catch(() => null) as { error?: string } | null;
        showError(errorData?.error || "Failed to save AI model");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this AI model?")) return;
    try {
      const res = await fetch(`/api/admin/ai-models/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess("Model deleted successfully");

        fetchModels();
      } else {
        const errorData = await res.json().catch(() => null) as { error?: string } | null;
        showError(errorData?.error || "Failed to delete model");
      }
    } catch (err) {
      console.error(err);
      showError("An error occurred while deleting.");
    }
  };

  const openEdit = (model: any) => {
    setEditingModel(model);
    setNewModel({
      id: model.id,
      name: model.name,
      provider: model.provider,
      endpoint: model.endpoint,
      system_prompt: model.system_prompt || '',
      fallback_model_ids: model.fallback_model_ids || '[]',
      is_active: model.is_active,
      is_default: model.is_default
    });
    setShowModal(true);
  };

  if (isLoading && models.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-orange-500" /> AI मॉडल्स (AI Models)
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">मॉडल्स Workers AI binding (env.AI) से सीधे चलते हैं — तैयार करने की जरूरत नहीं है। Model ID अपने <strong>@cf/...</strong> वाला होना चाहिए (उपलब्ध: 5 रुपये/रिक्वेस्ट)।</p>
        </div>
        <button
          onClick={() => {
            setEditingModel(null);
            setNewModel({
              id: '', name: '', provider: 'workers-ai', endpoint: 'chat/completions',
              system_prompt: '', fallback_model_ids: '[]', is_active: 1, is_default: 0
            });
            setShowModal(true);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-500/25 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> नया मॉडल जोड़ें
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => (
          <div key={model.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all relative group shadow-sm">
            {model.is_default === 1 && (
              <span className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                Default
              </span>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{model.name}</h3>
                <div className="flex items-center text-xs text-neutral-500 mt-1 space-x-2">
                  <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{model.provider}</span>
                  {model.is_active === 1 ? (
                    <span className="text-green-500">● Active</span>
                  ) : (
                    <span className="text-red-500">● Inactive</span>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-sm text-neutral-400 mb-4 line-clamp-2" title={model.id}>
              <span className="text-neutral-500 text-xs uppercase tracking-wider block mb-1">Model ID</span>
              {model.id}
            </p>

            <div className="bg-neutral-950 rounded-lg p-3 mb-4">
              <span className="text-neutral-500 text-xs uppercase tracking-wider block mb-1">System Prompt</span>
              <p className="text-xs text-neutral-300 line-clamp-3 italic">
                {model.system_prompt || 'No custom prompt...'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEdit(model)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex justify-center items-center"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </button>
              <button
                onClick={() => handleDelete(model.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>कोई AI मॉडल नहीं मिला। कृपया एक नया मॉडल जोड़ें।</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingModel ? 'AI मॉडल अपडेट करें' : 'नया AI मॉडल'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Model Name</label>
                  <input
                    required
                    value={newModel.name}
                    onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="e.g. Meta Llama 4 Scout 17B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Model ID</label>
                  <input
                    required
                    disabled={!!editingModel}
                    value={newModel.id}
                    onChange={e => setNewModel({ ...newModel, id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    placeholder="e.g. @cf/meta/llama-4-scout-17b-16e-instruct"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Provider <span className="text-neutral-500 font-normal">(Workers AI binding)</span></label>
                  <select
                    value={newModel.provider}
                    onChange={e => setNewModel({ ...newModel, provider: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="workers-ai">Cloudflare Workers AI (Binding)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Endpoint</label>
                  <input
                    required
                    value={newModel.endpoint}
                    onChange={e => setNewModel({ ...newModel, endpoint: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">System Prompt (Optional)</label>
                <textarea
                  value={newModel.system_prompt}
                  onChange={e => setNewModel({ ...newModel, system_prompt: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 h-24"
                  placeholder="You are an expert teacher..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Fallback Model IDs (JSON Array)</label>
                <input
                  value={newModel.fallback_model_ids}
                  onChange={e => setNewModel({ ...newModel, fallback_model_ids: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 font-mono text-sm"
                  placeholder='["@cf/meta/llama-4-scout-17b-16e-instruct"]'
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newModel.is_active === 1}
                    onChange={e => setNewModel({ ...newModel, is_active: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-orange-500 rounded bg-neutral-900 border-neutral-700"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newModel.is_default === 1}
                    onChange={e => setNewModel({ ...newModel, is_default: e.target.checked ? 1 : 0 })}
                    className="w-5 h-5 accent-orange-500 rounded bg-neutral-900 border-neutral-700"
                  />
                  Default Model
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
