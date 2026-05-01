'use client';
import { useEffect, useState } from 'react';
import { Crown, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, IndianRupee, ChevronDown, ChevronUp, BookOpen, Layers, Bot, Video, X } from 'lucide-react';

const INTERVAL_OPTS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];
const ACCESS_OPTS = ['none','all','static','user_choice'];
const BATCH_OPTS = ['none','static','user_choice'];
const PERIOD_OPTS = [
  { value: 'none', label: 'No Reset (No AI)' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'plan', label: 'Plan Total (Never resets)' },
];

const EMPTY_FORM = {
  name: '', interval: 'monthly', amount_inr: '', description: '',
  course_access_type: 'none', max_course_selection: 0,
  batch_access_type: 'none', max_batch_selection: 0,
  ai_credits: 0, ai_credits_period: 'none', ai_rate_limit_per_hour: 0,
  live_session_access: false,
};

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [msg, setMsg] = useState<{type:'success'|'error',text:string}|null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string|null>(null);
  const [poolData, setPoolData] = useState<Record<string,any[]>>({});
  const [poolLoading, setPoolLoading] = useState<string|null>(null);

  const showMsg = (type:'success'|'error', text:string) => { setMsg({type,text}); setTimeout(()=>setMsg(null),5000); };

  const load = async () => {
    setLoading(true);
    const [p,c,b] = await Promise.all([
      fetch('/api/admin/subscription/plans').then(r=>r.json() as Promise<any>).catch(()=>({plans:[]})),
      fetch('/api/admin/courses').then(r=>r.json() as Promise<any>).catch(()=>({courses:[]})),
      fetch('/api/admin/batches').then(r=>r.json() as Promise<any>).catch(()=>({batches:[]})),
    ]);
    setPlans(p.plans||[]);
    setCourses(c.courses||[]);
    setBatches(b.batches||[]);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const loadPool = async (planId:string) => {
    if(poolData[planId]) return;
    setPoolLoading(planId);
    const r = await fetch(`/api/admin/subscription/plans/${planId}/pool`).then(d=>d.json() as Promise<any>).catch(()=>({pool:[]}));
    setPoolData(prev=>({...prev,[planId]:r.pool||[]}));
    setPoolLoading(null);
  };

  const toggleExpand = async (planId:string) => {
    if(expandedPlan===planId){ setExpandedPlan(null); return; }
    setExpandedPlan(planId);
    await loadPool(planId);
  };

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!form.name||!form.interval||!form.amount_inr) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/subscription/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,amount_inr:Math.round(parseFloat(form.amount_inr)*100)})});
      const d = await res.json() as any;
      if(!res.ok) throw new Error(d.error||'Failed');
      showMsg('success', d.message||'Plan created!');
      setForm(EMPTY_FORM); setShowForm(false); load();
    } catch(e:any){ showMsg('error',e.message); } finally { setSaving(false); }
  };

  const handleToggle = async (plan:any) => {
    await fetch(`/api/admin/subscription/plans/${plan.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_active:plan.is_active===1?0:1})});
    load();
  };

  const handleDelete = async (plan:any) => {
    if(!confirm(`"${plan.name}" delete karna chahte hain?`)) return;
    const res = await fetch(`/api/admin/subscription/plans/${plan.id}`,{method:'DELETE'});
    const d = await res.json() as any;
    showMsg('success', d.message||'Done'); load();
  };

  const addToPool = async (planId:string, itemType:string, itemId:string, accessMode:string, bonusCredits:number) => {
    await fetch(`/api/admin/subscription/plans/${planId}/pool`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify([{item_type:itemType,item_id:itemId,access_mode:accessMode,bonus_ai_credits:bonusCredits}])});
    setPoolData(prev=>({...prev,[planId]:undefined as any}));
    await loadPool(planId);
  };

  const removeFromPool = async (planId:string, itemType:string, itemId:string) => {
    await fetch(`/api/admin/subscription/plans/${planId}/pool`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({item_type:itemType,item_id:itemId})});
    setPoolData(prev=>({...prev,[planId]:undefined as any}));
    await loadPool(planId);
  };

  const f = (key:string,val:any) => setForm((p:any)=>({...p,[key]:val}));

  const accessLabel:Record<string,string> = {none:'🚫 None',all:'📚 All Courses',static:'📌 Static (Admin picks)',user_choice:'🎯 User Choice (Student picks)'};
  const batchLabel:Record<string,string> = {none:'🚫 None',static:'📌 Static (Admin picks)',user_choice:'🎯 User Choice (Student picks)'};
  const periodLabel:Record<string,string> = {none:'No AI',hourly:'Hourly',daily:'Daily',weekly:'Weekly',monthly:'Monthly',yearly:'Yearly',plan:'Plan Total'};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3"><Crown className="w-7 h-7 text-violet-400"/>Subscription Plans</h1>
          <p className="text-neutral-500 text-sm mt-1">Courses, Batches, AI Credits aur Live Session access control karein</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white transition-all"><RefreshCw className="w-4 h-4"/></button>
          <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm shadow-lg shadow-violet-500/20"><Plus className="w-4 h-4"/>नया Plan</button>
        </div>
      </div>

      {/* Alert */}
      {msg && <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold ${msg.type==='success'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':'bg-red-500/10 border-red-500/20 text-red-400'}`}>
        {msg.type==='success'?<CheckCircle2 className="w-5 h-5 shrink-0"/>:<AlertTriangle className="w-5 h-5 shrink-0"/>}{msg.text}
      </div>}

      {/* Create Form */}
      {showForm && (
        <div className="bg-neutral-900 rounded-3xl border border-violet-500/30 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">नया Subscription Plan</h2>
            <button onClick={()=>setShowForm(false)}><X className="w-5 h-5 text-neutral-400 hover:text-white"/></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-8">
            {/* Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-xs">Plan नाम *</label>
                <input value={form.name} onChange={e=>f('name',e.target.value)} required placeholder="e.g. Monthly Pro" className="input-dark w-full mt-2"/>
              </div>
              <div>
                <label className="label-xs">कीमत (₹) *</label>
                <div className="relative mt-2">
                  <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-neutral-500"/>
                  <input type="number" value={form.amount_inr} onChange={e=>f('amount_inr',e.target.value)} required placeholder="499" className="input-dark w-full pl-9"/>
                </div>
              </div>
              <div>
                <label className="label-xs">Billing Interval *</label>
                <select value={form.interval} onChange={e=>f('interval',e.target.value)} className="input-dark w-full mt-2">
                  {INTERVAL_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-xs">Description</label>
                <input value={form.description} onChange={e=>f('description',e.target.value)} placeholder="Razorpay पर दिखेगा" className="input-dark w-full mt-2"/>
              </div>
            </div>

            {/* Course Access */}
            <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 font-black text-white"><BookOpen className="w-5 h-5 text-blue-400"/>📚 Course Access</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ACCESS_OPTS.map(o=>(
                  <button type="button" key={o} onClick={()=>f('course_access_type',o)} className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${form.course_access_type===o?'border-blue-500 bg-blue-500/10 text-blue-300':'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>{accessLabel[o]}</button>
                ))}
              </div>
              {(form.course_access_type==='user_choice') && (
                <div className="flex items-center gap-4">
                  <label className="text-xs text-neutral-400 font-bold">Student max kitne courses chun sakta hai?</label>
                  <input type="number" min={1} value={form.max_course_selection||''} onChange={e=>f('max_course_selection',+e.target.value)} className="input-dark w-24 text-center"/>
                </div>
              )}
              {form.course_access_type==='all' && <p className="text-xs text-blue-400">सभी courses automatically unlock होंगे।</p>}
              {(form.course_access_type==='static'||form.course_access_type==='user_choice') && <p className="text-xs text-neutral-500">Plan create होने के बाद &quot;Content Pool&quot; section में courses add करें।</p>}
            </div>

            {/* Batch Access */}
            <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 font-black text-white"><Layers className="w-5 h-5 text-emerald-400"/>👥 Batch Access</div>
              <div className="grid grid-cols-3 gap-3">
                {BATCH_OPTS.map(o=>(
                  <button type="button" key={o} onClick={()=>f('batch_access_type',o)} className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${form.batch_access_type===o?'border-emerald-500 bg-emerald-500/10 text-emerald-300':'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>{batchLabel[o]}</button>
                ))}
              </div>
              {(form.batch_access_type==='user_choice') && (
                <div className="flex items-center gap-4">
                  <label className="text-xs text-neutral-400 font-bold">Max Batches (student chun sakta hai)?</label>
                  <input type="number" min={1} value={form.max_batch_selection||''} onChange={e=>f('max_batch_selection',+e.target.value)} className="input-dark w-24 text-center"/>
                </div>
              )}
            </div>

            {/* AI Credits */}
            <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 font-black text-white"><Bot className="w-5 h-5 text-violet-400"/>🤖 AI Credits</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-neutral-400 font-bold">Credits (-1 = Unlimited)</label>
                  <input type="number" min={-1} value={form.ai_credits} onChange={e=>f('ai_credits',+e.target.value)} className="input-dark w-full mt-2"/>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold">Reset Period</label>
                  <select value={form.ai_credits_period} onChange={e=>f('ai_credits_period',e.target.value)} className="input-dark w-full mt-2">
                    {PERIOD_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold">Rate Limit/hour (0=No limit)</label>
                  <input type="number" min={0} value={form.ai_rate_limit_per_hour} onChange={e=>f('ai_rate_limit_per_hour',+e.target.value)} className="input-dark w-full mt-2"/>
                </div>
              </div>
            </div>

            {/* Live Session */}
            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-white"><Video className="w-5 h-5 text-red-400"/>📹 Live Session Access</div>
              <button type="button" onClick={()=>f('live_session_access',!form.live_session_access)} className={`p-2 rounded-lg transition-all ${form.live_session_access?'text-emerald-400':'text-neutral-600'}`}>
                {form.live_session_access?<ToggleRight className="w-8 h-8"/>:<ToggleLeft className="w-8 h-8"/>}
              </button>
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black shadow-lg shadow-violet-500/20 disabled:opacity-50">
                {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}
                {saving?'Razorpay पर Create हो रहा है...':'Plan Create करें'}
              </button>
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-bold">रद्द</button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      <div className="space-y-4">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400"/></div>
        : plans.length===0 ? <div className="text-center py-20 text-neutral-500"><Crown className="w-12 h-12 mx-auto mb-4 opacity-20"/><p className="font-bold">कोई Plan नहीं</p></div>
        : plans.map(plan=>(
          <div key={plan.id} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
            {/* Plan Header Row */}
            <div className="flex items-center gap-4 p-5 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-black text-white text-lg">{plan.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${plan.is_active===1?'text-emerald-400 border-emerald-500/20 bg-emerald-500/10':'text-neutral-500 border-neutral-700 bg-neutral-800'}`}>{plan.is_active===1?'Active':'Inactive'}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-violet-300 font-black">₹{Math.round(plan.amount_inr/100)}/{plan.interval}</span>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold border border-blue-500/20">{accessLabel[plan.course_access_type]||'📚 None'}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">{batchLabel[plan.batch_access_type]||'👥 None'}</span>
                  <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full text-xs font-bold border border-violet-500/20">🤖 {plan.ai_credits===0?'No AI':plan.ai_credits===-1?'∞':plan.ai_credits} {plan.ai_credits!==0?`/ ${periodLabel[plan.ai_credits_period]}`:''}</span>
                  {plan.ai_rate_limit_per_hour>0 && <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-xs font-bold border border-orange-500/20">⚡ {plan.ai_rate_limit_per_hour}/hr</span>}
                  {plan.live_session_access===1 && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-xs font-bold border border-red-500/20">📹 Live</span>}
                  {plan.razorpay_plan_id && <a href={`https://dashboard.razorpay.com/app/subscriptions/plans/${plan.razorpay_plan_id}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded-full text-xs font-mono border border-neutral-700 flex items-center gap-1 hover:text-white">{plan.razorpay_plan_id}<ExternalLink className="w-2.5 h-2.5"/></a>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>handleToggle(plan)} className={`p-2 rounded-lg transition-all ${plan.is_active===1?'text-emerald-400 hover:bg-emerald-500/10':'text-neutral-500 hover:bg-neutral-800'}`}>
                  {plan.is_active===1?<ToggleRight className="w-6 h-6"/>:<ToggleLeft className="w-6 h-6"/>}
                </button>
                <button onClick={()=>handleDelete(plan)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                <button onClick={()=>toggleExpand(plan.id)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all">
                  {expandedPlan===plan.id?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}
                </button>
              </div>
            </div>

            {/* Pool Management Expanded */}
            {expandedPlan===plan.id && (
              <div className="border-t border-neutral-800 p-6 space-y-6">
                <h3 className="font-black text-white text-sm">📦 Content Pool — Courses & Batches</h3>
                {poolLoading===plan.id ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400"/></div> : (
                  <div className="space-y-6">
                    {/* Courses Pool */}
                    {(plan.course_access_type==='static'||plan.course_access_type==='user_choice') && (
                      <div>
                        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">📚 Courses in Pool</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          {(poolData[plan.id]||[]).filter((p:any)=>p.item_type==='course').map((item:any)=>(
                            <div key={item.item_id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                              <div>
                                <p className="text-white text-sm font-bold">{item.course_title||item.item_id}</p>
                                <p className="text-xs text-neutral-500">{item.access_mode==='static'?'📌 Static':'🎯 User Choice'} {item.bonus_ai_credits>0?`• +${item.bonus_ai_credits} AI credits`:''}</p>
                              </div>
                              <button onClick={()=>removeFromPool(plan.id,'course',item.item_id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4"/></button>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                          <p className="text-xs text-neutral-500 font-bold mb-3">Course Add करें:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {courses.filter((c:any)=>!(poolData[plan.id]||[]).find((p:any)=>p.item_type==='course'&&p.item_id===c.id)).map((c:any)=>(
                              <button key={c.id} onClick={()=>addToPool(plan.id,'course',c.id,plan.course_access_type==='user_choice'?'user_choice':'static',0)} className="text-left p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-all">
                                <p className="text-white text-xs font-bold">{c.title}</p>
                                <p className="text-neutral-500 text-[10px]">+ Add to pool</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Batches Pool */}
                    {(plan.batch_access_type==='static'||plan.batch_access_type==='user_choice') && (
                      <div>
                        <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">👥 Batches in Pool</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                          {(poolData[plan.id]||[]).filter((p:any)=>p.item_type==='batch').map((item:any)=>(
                            <div key={item.item_id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                              <div>
                                <p className="text-white text-sm font-bold">{item.batch_name||item.item_id}</p>
                                <p className="text-xs text-neutral-500">{item.access_mode==='static'?'📌 Static':'🎯 User Choice'}</p>
                              </div>
                              <button onClick={()=>removeFromPool(plan.id,'batch',item.item_id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4"/></button>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                          <p className="text-xs text-neutral-500 font-bold mb-3">Batch Add करें:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {batches.filter((b:any)=>!(poolData[plan.id]||[]).find((p:any)=>p.item_type==='batch'&&p.item_id===b.id)).map((b:any)=>(
                              <button key={b.id} onClick={()=>addToPool(plan.id,'batch',b.id,plan.batch_access_type==='user_choice'?'user_choice':'static',0)} className="text-left p-3 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-all">
                                <p className="text-white text-xs font-bold">{b.name}</p>
                                <p className="text-neutral-500 text-[10px]">+ Add to pool</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {plan.course_access_type==='all' && <p className="text-sm text-blue-400 font-bold">📚 All Courses mode — सभी courses automatically accessible हैं। कोई pool नहीं।</p>}
                    {plan.course_access_type==='none' && plan.batch_access_type==='none' && <p className="text-sm text-neutral-500">Course/Batch access &apos;none&apos; है। Plan edit करके access type बदलें।</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`.input-dark{background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;transition:border-color 0.2s}.input-dark:focus{border-color:#8b5cf6}.label-xs{font-size:11px;font-weight:900;color:#737373;text-transform:uppercase;letter-spacing:0.1em}`}</style>
    </div>
  );
}
