'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Save, Loader2, Shield, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminSecretsPage() {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editKeys, setEditKeys] = useState<Set<string>>(new Set());
  const [compareValues, setCompareValues] = useState<Record<string, string>>({});
  const router = useRouter();
  const mountedRef = useRef(true);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track mounted state for safe setState after async ops
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearMessageTimer = useCallback(() => {
    if (messageTimerRef.current !== null) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/secrets');
        if (!mountedRef.current) return;
        if (res.status === 401 || res.status === 403) {
          setIsLoading(false);
          router.push('/auth/login');
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to load secrets`);
        }
        const data: unknown = await res.json();
        if (!mountedRef.current) return;
        // Validate that data.secrets is a plain object (not array, string, etc.)
        if (data && typeof data === 'object' && !Array.isArray(data) && 'secrets' in data) {
          const secretsObj = (data as Record<string, unknown>).secrets;
          if (secretsObj && typeof secretsObj === 'object' && !Array.isArray(secretsObj)) {
            // Filter out internal __MASKED_KEYS__ meta key
            const filtered: Record<string, string> = {};
            for (const [k, v] of Object.entries(secretsObj)) {
              if (k !== '__MASKED_KEYS__') filtered[k] = String(v);
            }
            setSecrets(filtered);
          } else {
            console.warn('Unexpected secrets format:', secretsObj);
            setSecrets({});
          }
        } else {
          console.warn('Unexpected API response format:', data);
          setSecrets({});
        }
      } catch (e: unknown) {
        if (!mountedRef.current) return;
        console.error(e);
        setMessage({ type: 'error', text: 'सीक्रेट्स लोड करने में समस्या आई।' });
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
  }, [router]);

  const toggleEdit = (key: string) => {
    setEditKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleChange = (key: string, value: string) => {
    setSecrets((prev) => ({ ...(prev as Record<string, string>), [key]: value }));
    setModifiedKeys((prev) => new Set(prev).add(key));
  };

  const handleCompareChange = (key: string, value: string) => {
    setCompareValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    clearMessageTimer();
    setMessage({ type: '', text: '' });
    try {
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
        // Safely parse error response — handle non-JSON bodies
        let errorText = 'सेव करने में समस्या आई।';
        try {
          const errorBody: Record<string, unknown> = await res.json();
          errorText = (typeof errorBody.error === 'string' ? errorBody.error : null) || errorText;
        } catch {
          const textBody = await res.text().catch(() => '');
          if (textBody) errorText = textBody;
        }
        setMessage({ type: 'error', text: errorText });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage({ type: 'error', text: 'सर्वर एरर: ' + msg });
    }
    setIsSaving(false);
    clearMessageTimer();
    messageTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setMessage({ type: '', text: '' });
    }, 3000);
  };

  const isCompareMatch = (key: string) => {
    const compareVal = compareValues[key];
    if (!compareVal || compareVal.trim() === '') return null;
    return secrets[key] === compareVal;
  };

  const secretEntries = useMemo(
    () => Object.entries(secrets).filter(([key]) => key !== 'ALLOWED_CORS_ORIGINS'),
    [secrets]
  );

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
          disabled={isSaving || modifiedKeys.size === 0}
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
        {/* CORS Config */}
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
                onChange={(e) => handleChange('ALLOWED_CORS_ORIGINS', e.target.value)}
                placeholder="https://example.com, https://another.com"
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-2">
                कॉमा (,) से अलग करके डोमेन नाम डालें जिन्हें आप अपनी APIs एक्सेस करने की अनुमति देना चाहते हैं।
              </p>
            </div>
          </div>
        </div>

        {/* Stored Secrets */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" /> संग्रहीत सीक्रेट्स
          </h3>

          {secretEntries.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">कोई सीक्रेट नहीं मिला।</p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {secretEntries.map(([key, value]) => {
              const isEditing = editKeys.has(key);
              const matchResult = isCompareMatch(key);
              const hasCompare = compareValues[key]?.trim() !== '';
              const isModified = modifiedKeys.has(key);

              return (
                <div key={key} className={`bg-neutral-900 border rounded-xl px-4 py-3 space-y-2 transition-all ${isModified ? 'border-orange-500/50' : 'border-neutral-800'}`}>
                  {/* Key Name Row */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider break-all max-w-[80%]">
                      {key}
                      {isModified && <span className="ml-2 text-orange-400 text-[10px] whitespace-nowrap">(modified)</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleEdit(key)}
                        className={`p-1.5 rounded-lg hover:bg-neutral-800 transition-all ${isEditing ? 'text-orange-400 bg-neutral-800' : 'text-neutral-400 hover:text-white'}`}
                        title={isEditing ? 'एडिट बंद करें' : 'एडिट करें'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Value Display / Edit Input */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={(value) || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-orange-500 transition-all"
                      placeholder="नई वैल्यू डालें"
                    />
                  ) : (
                    <div
                      className="font-mono text-sm text-neutral-300 break-all select-all"
                    >
                      {value}
                    </div>
                  )}

                  {/* Compare Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={compareValues[key] || ''}
                        onChange={(e) => handleCompareChange(key, e.target.value)}
                        placeholder="वैल्यू चेक करें — यहाँ डालकर मिलान करें..."
                        className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-400 text-xs font-mono placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    {hasCompare && matchResult === true && (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" /> मिलान
                      </span>
                    )}
                    {hasCompare && matchResult === false && (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-bold shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> बेमेल
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
