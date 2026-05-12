'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, GitBranch, Loader2, Mail, Newspaper, Rocket, Share2 } from 'lucide-react';

type Campaign = {
  id: string;
  source_branch: string;
  target_branch: string;
  status: string;
  change_summary?: string;
  email_subject?: string;
  social_post?: string;
  article_status?: string;
  social_platforms?: string;
  scheduled_at?: string;
  email_sent_count?: number;
  social_result?: string;
  created_at?: string;
};

type ApiResult = {
  id?: string;
  status?: string;
  articleStatus?: string;
  mergeSha?: string | null;
  compare?: { aheadBy?: number; behindBy?: number; totalCommits?: number; url?: string };
  content?: { changeSummary?: string; subject?: string; body?: string; social?: string };
  email?: { attempted: number; sent: number };
  social?: Record<string, string>;
  error?: string;
};

const platformOptions = ['facebook', 'instagram', 'linkedin', 'telegram', 'x'];

export default function AdminReleaseAutomationPage() {
  const [sourceBranch, setSourceBranch] = useState('main');
  const [targetBranch, setTargetBranch] = useState('verified');
  const [scheduleAt, setScheduleAt] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [postSocial, setPostSocial] = useState(true);
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => sourceBranch.trim() && targetBranch.trim() && sourceBranch.trim() !== targetBranch.trim(), [sourceBranch, targetBranch]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/release-automation');
      const data = await res.json() as { campaigns?: Campaign[] };
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to fetch release campaigns', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/release-automation')
      .then(res => res.json())
      .then((data) => {
        const parsed = data as { campaigns?: Campaign[] };
        if (isMounted) setCampaigns(parsed.campaigns || []);
      })
      .catch(err => console.error('Failed to fetch release campaigns', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePlatform = (platform: string) => {
    setSocialPlatforms(prev => prev.includes(platform) ? prev.filter(item => item !== platform) : [...prev, platform]);
  };

  const runAutomation = async (mode: 'preview' | 'merge') => {
    if (!canSubmit) return;
    setError('');
    setResult(null);
    if (mode === 'preview') setIsPreviewing(true);
    if (mode === 'merge') setIsMerging(true);

    try {
      const res = await fetch('/api/admin/release-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sourceBranch,
          targetBranch,
          scheduleAt: scheduleAt || null,
          sendEmail,
          postSocial,
          socialPlatforms,
        }),
      });
      const data = await res.json() as ApiResult;
      if (!res.ok) {
        setError(data.error || 'Release automation failed.');
        return;
      }
      setResult(data);
      fetchHistory();
    } catch (err: any) {
      setError(err?.message || 'Release automation failed.');
    } finally {
      setIsPreviewing(false);
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-orange-300">
            <Rocket className="h-3.5 w-3.5" /> Verified Branch Strategy
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Release Automation</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-400">
            Admin panel se ek branch ko doosri branch me merge karein, GitHub changes ka summary banayein, subscribers ko email bhejein aur social post ko turant ya scheduled time par queue karein.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl shadow-black/20" onSubmit={(event) => event.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500"><GitBranch className="h-4 w-4" /> Source Branch</span>
              <input value={sourceBranch} onChange={(event) => setSourceBranch(event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-orange-500" placeholder="main" />
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500"><GitBranch className="h-4 w-4" /> Target Branch</span>
              <input value={targetBranch} onChange={(event) => setTargetBranch(event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-orange-500" placeholder="verified" />
            </label>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
              <div>
                <p className="font-black">GitHub setup required</p>
                <p className="mt-1 text-blue-100/80">Backend secrets me <code>GITHUB_TOKEN</code>, <code>GITHUB_OWNER</code>, aur <code>GITHUB_REPO</code> configure hone par live merge chalega.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4 accent-orange-600" />
              <span className="text-sm font-bold text-white"><Mail className="mr-2 inline h-4 w-4 text-orange-300" /> Email subscribers</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <input type="checkbox" checked={postSocial} onChange={(event) => setPostSocial(event.target.checked)} className="h-4 w-4 accent-orange-600" />
              <span className="text-sm font-bold text-white"><Share2 className="mr-2 inline h-4 w-4 text-orange-300" /> Social post</span>
            </label>
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-4 text-sm font-bold text-neutral-300">
              <Newspaper className="mr-2 inline h-4 w-4 text-yellow-300" /> Article API: <span className="text-yellow-300">Coming soon</span>
            </div>
          </div>

          <label className="space-y-2 block">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500"><CalendarClock className="h-4 w-4" /> Social Schedule Time</span>
            <input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-orange-500" />
            <span className="text-xs text-neutral-500">Blank chhodne par social post merge ke baad turant publish hoga; future time par queue status save hoga.</span>
          </label>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Social Platforms</p>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(platform => (
                <button key={platform} type="button" onClick={() => togglePlatform(platform)} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition ${socialPlatforms.includes(platform) ? 'border-orange-500 bg-orange-500 text-white' : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-white'}`}>
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={!canSubmit || isPreviewing || isMerging} onClick={() => runAutomation('preview')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-3 text-sm font-black text-white transition hover:bg-neutral-800 disabled:opacity-50">
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Preview post
            </button>
            <button type="button" disabled={!canSubmit || isPreviewing || isMerging} onClick={() => confirm('Branch merge aur communication automation run karna hai?') && runAutomation('merge')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-500 disabled:opacity-50">
              {isMerging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Merge & send
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
            <h2 className="text-lg font-black text-white">Generated Release Content</h2>
            {!result ? (
              <p className="mt-4 text-sm text-neutral-500">Preview ya merge run karne ke baad changes summary, email body aur social post yahan dikhega.</p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-2xl bg-neutral-950 p-4 text-neutral-300">
                  <p className="font-black text-white">Compare</p>
                  <p className="mt-1">Commits: {result.compare?.totalCommits ?? 0} • Ahead: {result.compare?.aheadBy ?? 0} • Behind: {result.compare?.behindBy ?? 0}</p>
                  {result.compare?.url && <a href={result.compare.url} target="_blank" className="mt-2 inline-block text-orange-300 hover:text-orange-200">Open GitHub compare</a>}
                </div>
                <pre className="max-h-56 overflow-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-neutral-300 whitespace-pre-wrap">{result.content?.changeSummary}</pre>
                <pre className="max-h-56 overflow-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-neutral-300 whitespace-pre-wrap">{result.content?.social}</pre>
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 font-bold text-yellow-200">Article API: {result.articleStatus || 'coming_soon'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-lg font-black text-white">Release History</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {campaigns.length === 0 ? <p className="text-sm text-neutral-500">Abhi koi release campaign saved nahi hai.</p> : campaigns.map(item => (
            <div key={item.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black text-white">{item.source_branch} → {item.target_branch}</p>
                  <p className="mt-1 text-xs text-neutral-500">{item.created_at} • Status: {item.status} • Emails sent: {item.email_sent_count || 0} • Article: {item.article_status || 'coming_soon'}</p>
                </div>
                <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-black uppercase tracking-widest text-neutral-300">{item.status}</span>
              </div>
              {item.change_summary && <pre className="mt-3 whitespace-pre-wrap text-xs text-neutral-400">{item.change_summary}</pre>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
