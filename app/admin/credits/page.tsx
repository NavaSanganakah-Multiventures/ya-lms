'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, ToggleLeft, ToggleRight, Wallet } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  description: '',
  amount_inr: '',
  credits: 0,
  credit_type: 'self_study',
  is_active: 1,
};

export default function AdminCreditsPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadPacks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/credit-packs');
      const data = await res.json() as any;
      setPacks(data.packs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadInitialPacks = async () => {
      try {
        const res = await fetch('/api/admin/credit-packs');
        const data = await res.json() as any;
        if (mounted) setPacks(data.packs || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadInitialPacks();
    return () => { mounted = false; };
  }, []);

  const updateForm = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const amountPaise = Math.round(parseFloat(form.amount_inr || '0') * 100);
      const res = await fetch('/api/admin/credit-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount_inr: amountPaise, credits: parseInt(form.credits, 10) || 0 }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Credit pack create nahi hua');
      setMessage('Credit pack create ho gaya.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadPacks();
    } catch (err: any) {
      setMessage(err.message || 'Kuch galat ho gaya');
    } finally {
      setSaving(false);
    }
  };

  const togglePack = async (pack: any) => {
    await fetch(`/api/admin/credit-packs/${pack.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: pack.is_active === 1 ? 0 : 1 }),
    });
    await loadPacks();
  };

  const deletePack = async (pack: any) => {
    if (!confirm(`"${pack.name}" credit pack delete karna hai?`)) return;
    await fetch(`/api/admin/credit-packs/${pack.id}`, { method: 'DELETE' });
    await loadPacks();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white">
            <Wallet className="h-7 w-7 text-violet-400" /> Self Study Credit Packs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Student ke self-study credits purchase packs yahan manage karein.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadPacks} className="rounded-xl border border-neutral-700 bg-neutral-800 p-3 text-neutral-300 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> नया Pack
          </button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm font-bold text-violet-200">{message}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-3xl border border-violet-500/30 bg-neutral-900 p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label-xs">Pack naam *</label>
              <input value={form.name} onChange={e => updateForm('name', e.target.value)} required className="input-dark mt-2 w-full" placeholder="Starter Self Study" />
            </div>
            <div>
              <label className="label-xs">Price ₹ *</label>
              <input type="number" min={1} value={form.amount_inr} onChange={e => updateForm('amount_inr', e.target.value)} required className="input-dark mt-2 w-full" placeholder="499" />
            </div>
            <div>
              <label className="label-xs">Credits *</label>
              <input type="number" min={1} value={form.credits} onChange={e => updateForm('credits', e.target.value)} required className="input-dark mt-2 w-full" />
            </div>
            <div>
              <label className="label-xs">Credit Type</label>
              <select value={form.credit_type} onChange={e => updateForm('credit_type', e.target.value)} className="input-dark mt-2 w-full">
                <option value="self_study">Self Study</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label-xs">Description</label>
              <input value={form.description} onChange={e => updateForm('description', e.target.value)} className="input-dark mt-2 w-full" placeholder="Group/individual self-study classes ke liye" />
            </div>
          </div>
          <button disabled={saving} className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Pack Create करें'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <div className="text-neutral-500">Loading...</div>
        ) : packs.length === 0 ? (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-500 md:col-span-2">Abhi koi credit pack nahi hai.</div>
        ) : packs.map(pack => (
          <div key={pack.id} className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-neutral-500">{pack.credit_type}</div>
                <h2 className="mt-1 text-xl font-black text-white">{pack.name}</h2>
                <p className="mt-2 text-sm text-neutral-400">{pack.description || '—'}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${pack.is_active === 1 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-neutral-800 text-neutral-500'}`}>
                {pack.is_active === 1 ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-neutral-950 p-4">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600">Price</div>
                <div className="mt-1 text-lg font-black text-white">₹{Math.round((pack.amount_inr || 0) / 100)}</div>
              </div>
              <div className="rounded-2xl bg-neutral-950 p-4">
                <div className="text-xs font-black uppercase tracking-widest text-neutral-600">Credits</div>
                <div className="mt-1 text-lg font-black text-violet-300">{pack.credits}</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => togglePack(pack)} className="rounded-xl bg-neutral-800 p-3 text-neutral-300 hover:text-white">
                {pack.is_active === 1 ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => deletePack(pack)} className="rounded-xl bg-red-500/10 p-3 text-red-300 hover:bg-red-500/20">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`.input-dark{background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;transition:border-color .2s}.input-dark:focus{border-color:#8b5cf6}.label-xs{font-size:11px;font-weight:900;color:#737373;text-transform:uppercase;letter-spacing:.1em}`}</style>
    </div>
  );
}
