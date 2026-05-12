'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, EyeOff, Loader2, Save, Share2, ShieldCheck, XCircle } from 'lucide-react';

const PLATFORM_DEFINITIONS = [
  {
    id: 'facebook',
    label: 'Facebook Page',
    description: 'Course/batch announcement ko Facebook Page feed par publish karega.',
    loginUrl: 'https://developers.facebook.com/tools/explorer/',
    fields: [
      { key: 'FACEBOOK_PAGE_ID', label: 'Facebook Page ID', secret: false, placeholder: 'Page ID' },
      { key: 'FACEBOOK_PAGE_ACCESS_TOKEN', label: 'Page Access Token', secret: true, placeholder: 'Long-lived page access token' },
    ],
  },
  {
    id: 'instagram',
    label: 'Instagram Business',
    description: 'Instagram Business account par image + caption ke saath announcement publish karega.',
    loginUrl: 'https://developers.facebook.com/tools/explorer/',
    fields: [
      { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', label: 'Instagram Business Account ID', secret: false, placeholder: 'IG business account ID' },
      { key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Instagram Access Token', secret: true, placeholder: 'Instagram graph access token' },
      { key: 'ANNOUNCEMENT_IMAGE_URL', label: 'Default Announcement Image URL', secret: false, placeholder: 'https://.../announcement.jpg' },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'LinkedIn profile/organization URN se text announcement publish karega.',
    loginUrl: 'https://www.linkedin.com/developers/apps',
    fields: [
      { key: 'LINKEDIN_AUTHOR_URN', label: 'Author URN', secret: false, placeholder: 'urn:li:person:... or urn:li:organization:...' },
      { key: 'LINKEDIN_ACCESS_TOKEN', label: 'Access Token', secret: true, placeholder: 'LinkedIn access token' },
    ],
  },
  {
    id: 'telegram',
    label: 'Telegram Channel/Group',
    description: 'Telegram bot ke through channel/group me announcement bhejega.',
    loginUrl: 'https://core.telegram.org/bots#botfather',
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', secret: true, placeholder: 'BotFather token' },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat / Channel ID', secret: false, placeholder: '@channelname or numeric chat id' },
    ],
  },
  {
    id: 'x',
    label: 'X / Twitter',
    description: 'X API se short announcement tweet publish karega.',
    loginUrl: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { key: 'X_BEARER_TOKEN', label: 'Bearer Token', secret: true, placeholder: 'X API bearer token' },
    ],
  },
];

export default function SocialIntegrationsPage() {
  const [platforms, setPlatforms] = useState<any>({});
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const configuredCount = useMemo(() => {
    return PLATFORM_DEFINITIONS.filter(platform => platforms[platform.id]?.configured).length;
  }, [platforms]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social-integrations');
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed to load integrations');
      setPlatforms(data.platforms || {});
      const nextForm: any = {};
      PLATFORM_DEFINITIONS.forEach(platform => {
        nextForm[platform.id] = {
          enabled: data.platforms?.[platform.id]?.enabled ?? true,
          fields: {},
        };
      });
      setForm(nextForm);
    } catch (error: any) {
      setMessage(error.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadIntegrations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveIntegrations = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/social-integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: form }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed to save integrations');
      setPlatforms(data.platforms || {});
      const cleared: any = {};
      PLATFORM_DEFINITIONS.forEach(platform => {
        cleared[platform.id] = {
          enabled: data.platforms?.[platform.id]?.enabled ?? true,
          fields: {},
        };
      });
      setForm(cleared);
      setMessage('Social integrations save ho gaye. Ab course/batch announcement in credentials ka use karega.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to save integrations');
    } finally {
      setSaving(false);
    }
  };

  const updateEnabled = (platformId: string, enabled: boolean) => {
    setForm((prev: any) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || {}),
        enabled,
        fields: prev[platformId]?.fields || {},
      },
    }));
  };

  const updateField = (platformId: string, key: string, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || {}),
        fields: {
          ...(prev[platformId]?.fields || {}),
          [key]: value,
        },
      },
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">Marketing Setup</p>
          <h1 className="mt-2 text-3xl font-black text-white">Social Integrations</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Yahan admin login ke baad Facebook, Instagram, LinkedIn, Telegram aur X ke credentials save kar sakta hai. Secret values masked rahengi; blank input existing value ko change nahi karta.
          </p>
        </div>
        <button
          type="button"
          onClick={saveIntegrations}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save Credentials
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-medium text-orange-100">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/70 p-5">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-orange-400" />
            <span className="text-sm font-bold text-neutral-300">Configured Platforms</span>
          </div>
          <p className="mt-3 text-3xl font-black text-white">{configuredCount}/{PLATFORM_DEFINITIONS.length}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-neutral-900/70 p-5 md:col-span-2">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
            <p className="text-sm text-neutral-300">
              Credentials Cloudflare KV <strong>PLATFORM_SECRETS</strong> me save hote hain. Course/batch create karte waqt selected channels isi page ke saved credentials use karenge.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {PLATFORM_DEFINITIONS.map(platform => {
          const status = platforms[platform.id] || {};
          const platformForm = form[platform.id] || { enabled: true, fields: {} };
          return (
            <div key={platform.id} className="rounded-[2rem] border border-white/10 bg-neutral-900/70 p-6 shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {status.configured ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-neutral-600" />}
                    <h2 className="text-xl font-black text-white">{platform.label}</h2>
                  </div>
                  <p className="mt-2 text-sm text-neutral-400">{platform.description}</p>
                </div>
                <a
                  href={platform.loginUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-xs font-bold text-neutral-300 transition hover:border-orange-500/60 hover:text-white"
                >
                  Login / Token <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <label className="mt-5 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 text-sm font-bold text-neutral-200">
                <input
                  type="checkbox"
                  checked={Boolean(platformForm.enabled)}
                  onChange={(e) => updateEnabled(platform.id, e.target.checked)}
                  className="h-5 w-5 accent-orange-500"
                />
                Integration enabled
              </label>

              <div className="mt-5 space-y-4">
                {platform.fields.map(field => {
                  const fieldStatus = status.fields?.[field.key];
                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-black uppercase tracking-widest text-neutral-500">{field.label}</label>
                        {fieldStatus?.hasValue && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                            <EyeOff className="h-3 w-3" /> Saved: {fieldStatus.masked}
                          </span>
                        )}
                      </div>
                      <input
                        type={field.secret ? 'password' : 'text'}
                        value={platformForm.fields?.[field.key] || ''}
                        onChange={(e) => updateField(platform.id, field.key, e.target.value)}
                        placeholder={fieldStatus?.hasValue ? 'Leave blank to keep saved value' : field.placeholder}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
