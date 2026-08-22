'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Save, Tag, Trash2 } from 'lucide-react';

const EMPTY = {
  code: '',
  name: '',
  discount_type: 'percent',
  discount_value: 10,
  max_discount_paise: '',
  min_order_paise: '',
  applies_to: ['all'],
  target_ids: '',
  allowed_emails: '',
  excluded_emails: '',
  usage_limit: '',
  per_user_limit: 1,
  starts_at: '',
  ends_at: '',
  is_active: 1,
};

const APPLY_OPTIONS = [
  { value: 'all', label: 'All purchases' },
  { value: 'course', label: 'Courses' },
  { value: 'batch', label: 'Batches' },
  { value: 'subscription', label: 'Subscribers / Plans' },
  { value: 'form', label: 'Forms' },
];

const paise = (rupees: any) => rupees === '' || rupees == null ? 0 : Math.round(Number(rupees) * 100);
const rupees = (paiseValue: any) => paiseValue ? Math.round(Number(paiseValue) / 100) : '';
const parseJson = (value: any) => { try { return JSON.parse(value || '[]'); } catch { return []; } };

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [message, setMessage] = useState('');

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json() as any;
      setCoupons(data.coupons || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCoupons();
  }, [loadCoupons]);

  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const toggleApply = (value: string) => {
    setForm((prev: any) => {
      const current = new Set(prev.applies_to || []);
      if (value === 'all') return { ...prev, applies_to: ['all'] };
      current.delete('all');
      current.has(value) ? current.delete(value) : current.add(value);
      return { ...prev, applies_to: Array.from(current) };
    });
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const body = {
        ...form,
        code: form.code.toUpperCase(),
        max_discount_paise: paise(form.max_discount_paise),
        min_order_paise: paise(form.min_order_paise),
        target_ids: form.target_ids,
        allowed_emails: form.allowed_emails,
        excluded_emails: form.excluded_emails,
      };
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Coupon save nahi hua');
      setMessage('Coupon create ho gaya. Checkout par turant apply ho sakta hai.');
      setForm(EMPTY);
      await loadCoupons();
    } catch (err: any) {
      setMessage(err.message || 'Coupon save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon: any) => {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: coupon.is_active === 1 ? 0 : 1 }),
    });
    await loadCoupons();
  };

  const deleteCoupon = async (coupon: any) => {
    if (!confirm(`${coupon.code} delete karna hai?`)) return;
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' });
    await loadCoupons();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-white"><Tag className="h-7 w-7 text-orange-400" /> Coupon Codes</h1>
          <p className="mt-1 text-sm text-neutral-500">Course, batch, AI credits, subscribers, forms aur custom emails ke liye coupon eligibility manage karein.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadCoupons} className="rounded-xl border border-neutral-700 bg-neutral-800 p-3 text-neutral-300 hover:text-white" aria-label="Refresh coupons" title="Refresh coupons"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" /> नया Coupon</button>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm font-bold text-orange-100">{message}</div>}

      {showForm && (
        <form onSubmit={saveCoupon} className="rounded-3xl border border-orange-500/20 bg-neutral-900 p-6 shadow-xl space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="label-xs">Coupon Code *</label><input required value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} className="input-dark mt-2 w-full" placeholder="WELCOME50" /></div>
            <div><label className="label-xs">Internal Name</label><input value={form.name} onChange={e => update('name', e.target.value)} className="input-dark mt-2 w-full" placeholder="Launch offer" /></div>
            <div><label className="label-xs">Discount Type</label><select value={form.discount_type} onChange={e => update('discount_type', e.target.value)} className="input-dark mt-2 w-full"><option value="percent">Percent %</option><option value="fixed">Fixed ₹</option></select></div>
            <div><label className="label-xs">Discount Value *</label><input type="number" min={1} required value={form.discount_value} onChange={e => update('discount_value', Number(e.target.value))} className="input-dark mt-2 w-full" /></div>
            <div><label className="label-xs">Max Discount ₹</label><input type="number" min={0} value={form.max_discount_paise} onChange={e => update('max_discount_paise', e.target.value)} className="input-dark mt-2 w-full" /></div>
            <div><label className="label-xs">Min Order ₹</label><input type="number" min={0} value={form.min_order_paise} onChange={e => update('min_order_paise', e.target.value)} className="input-dark mt-2 w-full" /></div>
          </div>

          <div>
            <label className="label-xs">Apply hoga kis par?</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {APPLY_OPTIONS.map(option => (
                <button key={option.value} type="button" onClick={() => toggleApply(option.value)} className={`rounded-full px-4 py-2 text-xs font-black border ${form.applies_to.includes(option.value) ? 'border-orange-500 bg-orange-500/20 text-orange-100' : 'border-neutral-700 bg-neutral-950 text-neutral-400'}`}>{option.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="label-xs">Specific IDs (course/batch/form/plan IDs, comma/new line)</label><textarea value={form.target_ids} onChange={e => update('target_ids', e.target.value)} className="input-dark mt-2 h-24 w-full" /></div>
            <div><label className="label-xs">Allowed Emails (blank = all)</label><textarea value={form.allowed_emails} onChange={e => update('allowed_emails', e.target.value)} className="input-dark mt-2 h-24 w-full" /></div>
            <div><label className="label-xs">Excluded Emails</label><textarea value={form.excluded_emails} onChange={e => update('excluded_emails', e.target.value)} className="input-dark mt-2 h-24 w-full" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label-xs">Total Limit</label><input type="number" min={0} value={form.usage_limit} onChange={e => update('usage_limit', e.target.value)} className="input-dark mt-2 w-full" /></div>
              <div><label className="label-xs">Per User Limit</label><input type="number" min={1} value={form.per_user_limit} onChange={e => update('per_user_limit', Number(e.target.value))} className="input-dark mt-2 w-full" /></div>
              <div><label className="label-xs">Starts At</label><input type="datetime-local" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} className="input-dark mt-2 w-full" /></div>
              <div><label className="label-xs">Ends At</label><input type="datetime-local" value={form.ends_at} onChange={e => update('ends_at', e.target.value)} className="input-dark mt-2 w-full" /></div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Coupon Save करें'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? <p className="text-neutral-500">Loading...</p> : coupons.map(coupon => {
          const applies = parseJson(coupon.applies_to_json);
          return (
            <div key={coupon.id} className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-white">{coupon.code}</div>
                  <div className="text-sm text-neutral-500">{coupon.name || 'Coupon'} • {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `₹${rupees(coupon.discount_value)}`} off</div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-black ${coupon.is_active === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-500'}`}>{coupon.is_active === 1 ? 'Active' : 'Inactive'}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-neutral-300">{applies.map((item: string) => <span key={item} className="rounded-full bg-neutral-800 px-3 py-1">{item}</span>)}</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-500">
                <div>Min: ₹{rupees(coupon.min_order_paise) || 0}</div>
                <div>Max: ₹{rupees(coupon.max_discount_paise) || 'No cap'}</div>
                <div>Total limit: {coupon.usage_limit || 'Unlimited'}</div>
                <div>User limit: {coupon.per_user_limit || 1}</div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => toggleCoupon(coupon)} className="rounded-xl bg-neutral-800 px-4 py-2 text-xs font-black text-white">{coupon.is_active === 1 ? 'Disable' : 'Enable'}</button>
                <button onClick={() => deleteCoupon(coupon)} className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-black text-red-300"><Trash2 className="inline h-3 w-3" /> Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`.input-dark{background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;transition:border-color .2s}.input-dark:focus{border-color:#f97316}.label-xs{font-size:11px;font-weight:900;color:#737373;text-transform:uppercase;letter-spacing:.1em}`}</style>
    </div>
  );
}
