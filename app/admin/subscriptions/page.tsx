'use client';

import { useEffect, useState } from 'react';
import { Crown, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, IndianRupee, Calendar, Zap } from 'lucide-react';

const INTERVAL_OPTIONS = [
  { value: 'monthly',   label: 'Monthly (मासिक)',       hint: 'Charged every 1 month',    example: '₹499/month' },
  { value: 'quarterly', label: 'Quarterly (त्रैमासिक)', hint: 'Charged every 3 months',   example: '₹1299/quarter' },
  { value: 'yearly',    label: 'Yearly (वार्षिक)',      hint: 'Charged every 12 months',  example: '₹3999/year' },
];

const STATUS_COLORS: Record<string, string> = {
  active:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  inactive: 'text-neutral-400 bg-neutral-500/10 border-neutral-700',
};

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    interval: 'monthly',
    amount_inr: '',
    description: '',
  });

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscription/plans');
      const data = await res.json() as any;
      setPlans(data.plans || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadPlans(); }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.interval || !form.amount_inr) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/subscription/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          interval: form.interval,
          amount_inr: Math.round(parseFloat(form.amount_inr) * 100), // Convert to paise
          description: form.description,
        })
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed to create plan');
      showMsg('success', data.message || 'Plan created!');
      setForm({ name: '', interval: 'monthly', amount_inr: '', description: '' });
      setShowForm(false);
      loadPlans();
    } catch (err: any) { showMsg('error', err.message); }
    finally { setIsSaving(false); }
  };

  const handleToggleActive = async (plan: any) => {
    try {
      const res = await fetch(`/api/admin/subscription/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: plan.is_active === 1 ? 0 : 1 })
      });
      if (!res.ok) throw new Error('Update failed');
      showMsg('success', `Plan ${plan.is_active === 1 ? 'deactivated' : 'activated'}`);
      loadPlans();
    } catch (err: any) { showMsg('error', err.message); }
  };

  const handleDelete = async (plan: any) => {
    if (!confirm(`"${plan.name}" ko delete karna chahte hain? Agar active subscribers hain toh plan sirf deactivate hoga.`)) return;
    try {
      const res = await fetch(`/api/admin/subscription/plans/${plan.id}`, { method: 'DELETE' });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      showMsg('success', data.message || 'Plan deleted');
      loadPlans();
    } catch (err: any) { showMsg('error', err.message); }
  };

  const intervalLabel: Record<string, string> = {
    monthly: '/माह',
    quarterly: '/तिमाही',
    yearly: '/वर्ष',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Crown className="w-7 h-7 text-violet-400" /> Subscription Plans
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Razorpay पर Plans auto-create होते हैं। छात्र इन Plans को Subscribe कर सकते हैं।
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadPlans} className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" /> नया Plan बनाएं
          </button>
        </div>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold ${
          actionMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          {actionMsg.text}
        </div>
      )}

      {/* Create Plan Form */}
      {showForm && (
        <div className="bg-neutral-900 rounded-3xl border border-violet-500/30 shadow-2xl shadow-violet-500/5 p-8">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" /> नया Subscription Plan
          </h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan Name */}
              <div>
                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Plan का नाम *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="जैसे: Monthly, Quarterly, Yearly"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">कीमत (₹ में) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="w-4 h-4 text-neutral-500" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount_inr}
                    onChange={e => setForm({ ...form, amount_inr: e.target.value })}
                    placeholder="499"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Billing Interval */}
            <div>
              <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Billing Interval *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, interval: opt.value })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      form.interval === opt.value
                        ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="font-black text-sm">{opt.label}</span>
                    </div>
                    <p className="text-xs opacity-60">{opt.hint}</p>
                    <p className={`text-xs font-bold mt-1 ${form.interval === opt.value ? 'text-violet-400' : 'text-neutral-500'}`}>
                      e.g. {form.amount_inr ? `₹${form.amount_inr}` : opt.example}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Razorpay पर दिखने वाला description"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
              />
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Zap className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div className="text-sm text-violet-300">
                <p className="font-black">Auto Razorpay Integration</p>
                <p className="text-violet-400 text-xs mt-0.5">
                  Plan create होते ही Razorpay पर automatically Plan create होगा और <code className="bg-violet-500/20 px-1 rounded">plan_XXXX</code> ID DB में save होगी।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSaving ? 'Razorpay पर Create हो रहा है...' : 'Plan Create करें'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold transition-all">
                रद्द करें
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans Table */}
      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="font-black text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-violet-400" /> सभी Subscription Plans
            <span className="ml-2 px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded-full font-bold">{plans.length}</span>
          </h2>
          <a
            href="https://dashboard.razorpay.com/app/subscriptions/plans"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-bold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Razorpay Dashboard
          </a>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <Crown className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">कोई Plan नहीं मिला</p>
            <p className="text-sm mt-1">ऊपर "नया Plan बनाएं" बटन दबाएं।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-neutral-800">
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">Plan</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">कीमत</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">Interval</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">Razorpay Plan ID</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-neutral-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan: any, i: number) => (
                  <tr key={plan.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-neutral-900/30'}`}>
                    <td className="px-6 py-4">
                      <div className="font-black text-white">{plan.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{plan.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-violet-300 font-black text-lg">
                        ₹{Math.round(plan.amount_inr / 100)}
                        <span className="text-xs font-bold text-neutral-500 ml-1">{intervalLabel[plan.interval] || plan.interval}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-xs font-black uppercase tracking-widest">
                        {plan.interval}
                        {plan.interval_count > 1 ? ` × ${plan.interval_count}` : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {plan.razorpay_plan_id ? (
                        <a
                          href={`https://dashboard.razorpay.com/app/subscriptions/plans/${plan.razorpay_plan_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-mono text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          {plan.razorpay_plan_id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                        plan.is_active === 1
                          ? STATUS_COLORS.active
                          : STATUS_COLORS.inactive
                      }`}>
                        {plan.is_active === 1 ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(plan)}
                          title={plan.is_active === 1 ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-lg transition-all ${
                            plan.is_active === 1
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-neutral-500 hover:bg-neutral-800'
                          }`}
                        >
                          {plan.is_active === 1
                            ? <ToggleRight className="w-5 h-5" />
                            : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          title="Delete plan"
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-8">
        <h3 className="font-black text-white text-lg mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> यह कैसे काम करता है?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Admin Plan Create करें', desc: 'यहाँ Name, Amount, Interval भरें — Razorpay पर automatically Plan create होगा और plan_XXXX ID save होगी।', color: 'text-violet-400 bg-violet-500/10' },
            { step: '2', title: 'Student Subscribe करें', desc: 'Course page या Subscription page पर छात्र Plan चुनकर Razorpay Checkout से payment करें।', color: 'text-emerald-400 bg-emerald-500/10' },
            { step: '3', title: 'Webhook Auto-Update', desc: 'Payment success होते ही Webhook DB update करता है। छात्र को सभी courses का access मिल जाता है।', color: 'text-blue-400 bg-blue-500/10' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${item.color}`}>
                {item.step}
              </div>
              <div>
                <p className="font-black text-white text-sm">{item.title}</p>
                <p className="text-neutral-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
