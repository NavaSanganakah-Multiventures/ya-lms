'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, Loader2, RefreshCw, Save, ShoppingBag, Upload } from 'lucide-react';

const merchantImageNotes = [
  'Required for every Merchant product listing.',
  'URL must be public, crawlable, and start with http/https; relative /api/media URLs become public during sync using APP_URL.',
  'Minimum 500×500 px; recommended 1500×1500 px or above; max 64MP and 16MB.',
  'Use JPEG/WebP/PNG/GIF/BMP/TIFF. Upload here compresses/downscales to WebP up to 1500px; it will not upscale low-res images.',
  'Avoid placeholders, logos, borders, watermarks, price text, offers, or other promotional overlays.',
];

export default function AdminMerchantPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [syncingId, setSyncingId] = useState('');
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, settingsRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/merchant/settings'),
      ]);
      const courseData = await courseRes.json() as any;
      const settingsData = await settingsRes.json().catch(() => ({})) as any;
      setCourses(courseData.courses || []);
      setSettings(settingsData);
    } catch (err: any) {
      setMessage(err.message || 'Failed to load Merchant data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const updateCourseField = (courseId: string, field: string, value: string) => {
    setCourses(prev => prev.map(course => course.id === courseId ? { ...course, [field]: value } : course));
  };

  const compressMerchantImage = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const maxSize = 1500;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image compression failed');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Image compression failed'));
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-merchant.webp`, { type: 'image/webp' }));
      }, 'image/webp', 0.9);
    });
  };

  const uploadImage = async (course: any, field: 'thumbnail_url' | 'merchant_default_image_url', file: File) => {
    const key = `${course.id}:${field}`;
    setUploading(key);
    try {
      const optimized = await compressMerchantImage(file);
      const formData = new FormData();
      formData.append('file', optimized);
      formData.append('courseId', course.id || 'course-images');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Image upload failed');
      updateCourseField(course.id, field, data.url);
      setMessage('Image optimized and uploaded. Save course to persist it.');
    } catch (err: any) {
      setMessage(err.message || 'Image upload failed');
    } finally {
      setUploading('');
    }
  };

  const saveCourseImages = async (course: any) => {
    setSavingId(course.id);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thumbnail_url: course.thumbnail_url || '',
          merchant_default_image_url: course.merchant_default_image_url || '',
        }),
      });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Failed to save images');
      setMessage('Course Merchant images saved.');
      fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Failed to save images');
    } finally {
      setSavingId('');
    }
  };

  const syncCourse = async (course: any) => {
    setSyncingId(course.id);
    setMessage('');
    try {
      await saveCourseImages(course);
      const res = await fetch(`/api/admin/courses/${course.id}/merchant`, { method: 'POST' });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Google Merchant sync failed');
      setMessage(`${course.title} synced to Google Merchant.`);
      fetchData();
    } catch (err: any) {
      setMessage(err.message || 'Google Merchant sync failed');
    } finally {
      setSyncingId('');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3"><ShoppingBag className="h-7 w-7 text-blue-400" /> Google Merchant Management</h1>
          <p className="mt-2 text-sm text-neutral-400">Course thumbnails, Merchant fallback images, and listing sync management.</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {message && <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm font-bold text-blue-100">{message}</div>}

      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          {settings?.configured ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          <h2 className="text-lg font-black text-white">Merchant readiness: {settings?.configured ? 'Ready' : 'Missing setup'}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          {[
            ['Account ID', settings?.account_id_present],
            ['Data source name', settings?.data_source_name_present],
            ['Service account JSON', settings?.service_account_json_present],
            ['Private key fallback', settings?.private_key_present],
          ].map(([label, ok]) => (
            <div key={String(label)} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 flex justify-between gap-3">
              <span className="text-neutral-400">{label}</span>
              <span className={ok ? 'text-emerald-300 font-black' : 'text-amber-300 font-black'}>{ok ? 'Saved' : 'Missing'}</span>
            </div>
          ))}
        </div>
        {settings?.service_account_json_error && <div className="text-sm text-pink-300">JSON parse error: {settings.service_account_json_error}</div>}
      </div>

      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6">
        <h2 className="text-lg font-black text-amber-100 mb-3 flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Merchant image notes</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-amber-50/90 list-disc pl-5">
          {merchantImageNotes.map(note => <li key={note}>{note}</li>)}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {courses.map(course => {
          const imageUrl = course.merchant_default_image_url || course.thumbnail_url || '';
          return (
            <div key={course.id} className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 grid grid-cols-1 xl:grid-cols-[220px_1fr_auto] gap-5">
              <div className="aspect-video overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={course.title} className="h-full w-full object-cover" />
                ) : <ImageIcon className="h-10 w-10 text-neutral-700" />}
              </div>
              <div className="space-y-4 min-w-0">
                <div>
                  <h3 className="text-lg font-black text-white truncate">{course.title}</h3>
                  <p className="text-xs text-neutral-500">ID: {course.id} • Merchant: {course.merchant_sync_status || 'not_synced'}</p>
                </div>
                {(['thumbnail_url', 'merchant_default_image_url'] as const).map(field => (
                  <div key={field} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{field === 'thumbnail_url' ? 'Course thumbnail' : 'Default Merchant listing image'}</label>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        value={course[field] || ''}
                        onChange={e => updateCourseField(course.id, field, e.target.value)}
                        placeholder="/api/media/... or https://..."
                        className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs font-mono text-white"
                      />
                      <label className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-xs font-black text-white flex items-center justify-center gap-2">
                        {uploading === `${course.id}:${field}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload + compress
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(course, field, e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex xl:flex-col gap-2">
                <button onClick={() => saveCourseImages(course)} disabled={savingId === course.id || syncingId === course.id} className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button onClick={() => syncCourse(course)} disabled={syncingId === course.id || savingId === course.id || !settings?.configured} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                  {syncingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
