'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminSecretsPage() {
  const [secrets, setSecrets] = useState<any>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/secrets')
      .then(async res => {
        if (res.status === 401 || res.status === 403) {
          setIsLoading(false);
          router.push('/auth/login');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load secrets');
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.secrets) {
          setSecrets(data.secrets);
        }
      })
      .catch((e) => {
        console.error(e);
        setMessage({ type: 'error', text: 'सर्वर से सेटिंग्स लोड करने में समस्या आई।' });
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecrets((prev: any) => ({ ...prev, [name]: value }));
    setModifiedKeys((prev) => new Set(prev).add(name));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      // Only send keys that the admin actually modified. This prevents
      // accidental overwrite of any values returned by the backend.
      const payload: Record<string, string> = {};
      modifiedKeys.forEach((key) => {
        payload[key] = secrets[key] ?? '';
      });
      const res = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets: payload }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'सीक्रेट्स सफलतापूर्वक सेव हो गए हैं!' });
        setModifiedKeys(new Set());
      } else {
        const error: any = await res.json();
        setMessage({ type: 'error', text: error.error || 'सेव करने में समस्या आई।' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'सर्वर एरर: ' + e.message });
    }
    setIsSaving(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">सुरक्षा सेटिंग्स</h1>
          <p className="text-neutral-500 mt-1">प्लेटफ़ॉर्म सीक्रेट्स और CORS कॉन्फ़िगरेशन</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          सेव करें
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} font-bold text-sm`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" /> CORS कॉन्फ़िगरेशन
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">
                Allowed CORS Origins
              </label>
              <input
                type="text"
                name="ALLOWED_CORS_ORIGINS"
                value={secrets.ALLOWED_CORS_ORIGINS || ''}
                onChange={handleChange}
                placeholder="https://example.com, https://another.com"
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-2">
                कॉमा (,) से अलग करके डोमेन नाम डालें जिन्हें आप अपनी APIs एक्सेस करने की अनुमति देना चाहते हैं।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
