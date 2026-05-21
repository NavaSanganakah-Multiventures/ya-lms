'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, ExternalLink, Loader2, Plug, XCircle, RefreshCw } from 'lucide-react';

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [form, setForm] = useState({ client_id: '', client_secret: '' });
  const [message, setMessage] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/integrations');
      const data = await res.json() as any;
      setStatus(data);
    } catch (e: any) {
      setMessage(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const saveCredentials = async () => {
    if (!form.client_id || !form.client_secret) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/integrations/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage('Credentials saved. Click "Connect with Google" to authorize.');
      setForm({ client_id: '', client_secret: '' });
      loadStatus();
    } catch (e: any) {
      setMessage(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getAuthUrl = async () => {
    try {
      const res = await fetch('/api/admin/integrations/google-calendar/auth-url');
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      setMessage(e.message || 'Failed to get auth URL');
    }
  };

  const disconnect = async () => {
    try {
      const res = await fetch('/api/admin/integrations/google-calendar/disconnect', { method: 'POST' });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage('Google Calendar disconnected.');
      loadStatus();
    } catch (e: any) {
      setMessage(e.message || 'Failed to disconnect');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  }

  const connected = status?.googleCalendar?.connected;
  const authEmail = status?.googleCalendar?.authEmail;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-500">System</p>
          <h1 className="mt-2 text-3xl font-black text-white flex items-center gap-3">
            <Plug className="w-7 h-7 text-violet-400" /> Integrations
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Google Calendar aur future APIs ka centralized setup. Credentials securely stored in KV.
          </p>
        </div>
        <button onClick={loadStatus} className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl border border-neutral-700 text-neutral-400 hover:text-white transition-all" aria-label="Refresh"><RefreshCw className="w-4 h-4"/></button>
      </div>

      {message && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm font-medium text-violet-100">
          {message}
        </div>
      )}

      {/* Google Calendar Card */}
      <div className="rounded-[2rem] border border-white/10 bg-neutral-900/70 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white">Google Calendar</h2>
                {connected ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800 text-neutral-500 rounded-full text-xs font-bold">
                    <XCircle className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-neutral-400 max-w-xl">
                Individual class booking ke liye teacher calendar se availability check aur event create karega.
              </p>
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="mt-8 space-y-6">
            {/* Step 1: Enter Credentials */}
            <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
              <h3 className="text-sm font-black text-neutral-200">Step 1: Enter OAuth Credentials</h3>
              <p className="text-xs text-neutral-500">
                Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Client ID</label>
                  <input
                    value={form.client_id}
                    onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                    placeholder="xxx.apps.googleusercontent.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-1.5">Client Secret</label>
                  <input
                    type="password"
                    value={form.client_secret}
                    onChange={e => setForm(p => ({ ...p, client_secret: e.target.value }))}
                    placeholder="GOCSPX-..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                Redirect URI: <code className="text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/api/admin/integrations/google-calendar/callback` : ''}</code>
              </div>
              <button
                onClick={saveCredentials}
                disabled={saving || !form.client_id || !form.client_secret}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Credentials
              </button>
            </div>

            {/* Step 2: Connect */}
            <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-4">
              <h3 className="text-sm font-black text-neutral-200">Step 2: Authorize with Google</h3>
              <p className="text-xs text-neutral-500">
                Google Calendar ko read aur event create karne ki permission deni hogi.
              </p>
              <button
                onClick={getAuthUrl}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-neutral-900 rounded-xl font-bold text-sm"
              >
                <Calendar className="w-4 h-4" /> Connect with Google
              </button>
            </div>

            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300"
            >
              <ExternalLink className="w-3 h-3" /> Google Cloud Console
            </a>
          </div>
        ) : (
          <div className="mt-8 p-5 bg-neutral-950 rounded-2xl border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-400">Connected as <span className="text-white">{authEmail || 'Google Account'}</span></p>
                <p className="text-xs text-neutral-500 mt-1">Calendar API: Read + Event Create</p>
              </div>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Future Integrations Placeholder */}
        <div className="mt-8 p-5 bg-neutral-950/50 rounded-2xl border border-neutral-800 border-dashed opacity-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neutral-800">
              <Loader2 className="w-4 h-4 text-neutral-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-500">Coming Soon</p>
              <p className="text-xs text-neutral-600">Zoom API, Microsoft Teams, WhatsApp Business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
