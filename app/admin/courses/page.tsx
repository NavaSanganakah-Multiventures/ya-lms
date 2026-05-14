'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Sparkles, X, BookOpen, User, DollarSign, FileText, Edit2, Trash2, Save, ShoppingBag, RefreshCw, Wand2, AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { AnimatePresence } from 'motion/react';
import ContentAI from '@/components/ContentAI';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const { formatPrice } = useCurrency();
  const [categories, setCategories] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'announcement' | 'seo'>('basic');
  const [merchantCourse, setMerchantCourse] = useState<any>(null);
  const [merchantForm, setMerchantForm] = useState<any>(null);
  const [merchantConfigured, setMerchantConfigured] = useState(false);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantSaving, setMerchantSaving] = useState(false);
  const [merchantSyncing, setMerchantSyncing] = useState(false);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [bulkMerchantSyncing, setBulkMerchantSyncing] = useState(false);
  const [bulkMerchantProgress, setBulkMerchantProgress] = useState('');
  const [courseImageUploading, setCourseImageUploading] = useState<'thumbnail_url' | 'merchant_default_image_url' | ''>('');
  const [merchantDataSources, setMerchantDataSources] = useState<any[]>([]);
  const [merchantDataSourcesLoading, setMerchantDataSourcesLoading] = useState(false);
  const [merchantDataSourcesError, setMerchantDataSourcesError] = useState('');
  const [merchantDeveloperEmail, setMerchantDeveloperEmail] = useState('');
  const [merchantSetupLoading, setMerchantSetupLoading] = useState('');
  const [merchantSetupMessage, setMerchantSetupMessage] = useState('');
  const [merchantDataSourceForm, setMerchantDataSourceForm] = useState({ displayName: 'YA Courses API Data Source', contentLanguage: 'en', feedLabel: 'IN', countries: 'IN' });
  const [newCourse, setNewCourse] = useState({
    title: '',
    title_hi: '',
    description: '',
    description_hi: '',
    price_inr: 0,
    price_usd: 0,
    teacher_id: '',
    category_id: '',
    self_study_enabled: false,
    self_study_credit_cost: 0,
    self_study_only: false,
    individual_class_booking_enabled: false,
    individual_class_credit_cost: 0,
    individual_class_duration_minutes: 30,
    seo_title_en: '',
    seo_title_hi: '',
    seo_description_en: '',
    seo_description_hi: '',
    seo_keywords_en: '',
    seo_keywords_hi: '',
    thumbnail_url: '',
    merchant_default_image_url: '',
    send_announcement_email: false,
    announcement_audience: 'both',
    auto_post_social: false,
    social_platforms: ['facebook', 'instagram']
  });
  const router = useRouter();

  const fetchData = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/admin/courses'),
      fetch('/api/admin/categories'),
      fetch('/api/auth/me'),
      fetch('/api/admin/users'),
      fetch('/api/admin/merchant/settings')
    ]).then(async ([courseRes, catRes, userRes, usersRes, merchantSettingsRes]) => {
      if (courseRes.status === 401 || courseRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const courseData = await courseRes.json() as any;
      const catData = await catRes.json() as any;
      const userData = await userRes.json() as any;

      if (courseData && courseData.courses) setCourses(courseData.courses);
      if (catData && catData.categories) setCategories(catData.categories);
      if (userData && userData.user) {
        setCurrentUser(userData.user);
        // Pre-fill teacher_id if user is found
        setNewCourse(prev => ({ ...prev, teacher_id: userData.user.id }));
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json() as any;
        if (usersData && usersData.users) {
          setTeachers(usersData.users.filter((u: any) => u.role === 'teacher' || u.role === 'admin'));
        }
      }

      if (merchantSettingsRes.ok) {
        const merchantData = await merchantSettingsRes.json() as any;
        setMerchantSettings(merchantData);
      }

      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    const doFetch = () => fetchData();
    doFetch();
  }, [fetchData]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });

      if (res.ok) {
        setShowModal(false);
        setNewCourse({
          title: '',
          title_hi: '',
          description: '',
          description_hi: '',
          price_inr: 0,
          price_usd: 0,
          teacher_id: currentUser?.id || '',
          category_id: '',
          self_study_enabled: false,
          self_study_credit_cost: 0,
          self_study_only: false,
          individual_class_booking_enabled: false,
          individual_class_credit_cost: 0,
          individual_class_duration_minutes: 30,
          seo_title_en: '',
          seo_title_hi: '',
          seo_description_en: '',
          seo_description_hi: '',
          seo_keywords_en: '',
          seo_keywords_hi: '',
          thumbnail_url: '',
          merchant_default_image_url: '',
          send_announcement_email: false,
          announcement_audience: 'both',
          auto_post_social: false,
          social_platforms: ['facebook', 'instagram']
        });
        fetchData();
      } else {
        alert("Failed to create course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCourse)
      });
      if (res.ok) {
        setEditingCourse(null);
        fetchData();
      } else {
        alert("Failed to update course");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert("Failed to delete course");
    } catch (err) {
      console.error(err);
    }
  };

  const openMerchantModal = async (course: any) => {
    setMerchantCourse(course);
    setMerchantLoading(true);
    setMerchantForm(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/merchant`);
      if (!res.ok) throw new Error('Failed to load Google Merchant settings');
      const data = await res.json() as any;
      setMerchantConfigured(Boolean(data.configured));
      setMerchantForm(data.listing);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to load Google Merchant settings');
      setMerchantCourse(null);
    } finally {
      setMerchantLoading(false);
    }
  };

  const saveMerchantListing = async () => {
    if (!merchantCourse || !merchantForm) return;
    setMerchantSaving(true);
    try {
      const res = await fetch(`/api/admin/courses/${merchantCourse.id}/merchant`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merchantForm)
      });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Failed to save Google Merchant settings');
      fetchData();
      alert('Google Merchant settings saved');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save Google Merchant settings');
    } finally {
      setMerchantSaving(false);
    }
  };

  const syncMerchantListing = async () => {
    if (!merchantCourse || !merchantForm) return;
    setMerchantSyncing(true);
    try {
      const res = await fetch(`/api/admin/courses/${merchantCourse.id}/merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...merchantForm, sync_enabled: true })
      });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Google Merchant sync failed');
      await openMerchantModal(merchantCourse);
      fetchData();
      alert('Course synced to Google Merchant');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Google Merchant sync failed');
      await openMerchantModal(merchantCourse);
    } finally {
      setMerchantSyncing(false);
    }
  };

  const enabledMerchantCourses = courses.filter(course => Boolean(course.merchant_sync_enabled));
  const merchantStats = {
    enabled: enabledMerchantCourses.length,
    synced: courses.filter(course => course.merchant_sync_status === 'synced').length,
    errors: courses.filter(course => course.merchant_sync_status === 'error').length,
    notSynced: courses.filter(course => !course.merchant_sync_status || course.merchant_sync_status === 'not_synced').length,
  };

  const merchantSecretChecklist = [
    { key: 'GOOGLE_MERCHANT_ACCOUNT_ID', present: merchantSettings?.account_id_present, note: 'Merchant Center account ID' },
    { key: 'GOOGLE_MERCHANT_DATASOURCE_NAME', present: merchantSettings?.data_source_name_present, note: 'accounts/.../dataSources/...' },
    { key: 'GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON', present: merchantSettings?.service_account_json_present, note: 'Recommended: full service account JSON in KV' },
    { key: 'GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL', present: merchantSettings?.service_account_email_present, note: 'Optional fallback if JSON is not saved' },
    { key: 'GOOGLE_MERCHANT_PRIVATE_KEY', present: merchantSettings?.private_key_present, note: 'Optional fallback if JSON is not saved' },
  ];

  const applyMerchantDefaults = () => {
    if (!merchantCourse || !merchantForm) return;
    const categoryName = merchantCourse.category_name && merchantCourse.category_name !== 'Uncategorized' ? merchantCourse.category_name : 'Education';
    setMerchantForm({
      ...merchantForm,
      sync_enabled: true,
      offer_id: merchantForm.offer_id || String(merchantCourse.id || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64),
      brand: merchantForm.brand || 'Adityanveshan',
      availability: merchantForm.availability || 'in_stock',
      condition: merchantForm.condition || 'new',
      content_language: merchantForm.content_language || 'en',
      feed_label: merchantForm.feed_label || 'IN',
      target_country: merchantForm.target_country || 'IN',
      currency: merchantForm.currency || 'INR',
      google_product_category: merchantForm.google_product_category || categoryName,
    });
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

  const uploadCourseImage = async (file: File, field: 'thumbnail_url' | 'merchant_default_image_url') => {
    setCourseImageUploading(field);
    try {
      const optimized = await compressMerchantImage(file);
      const formData = new FormData();
      formData.append('file', optimized);
      formData.append('courseId', editingCourse?.id || 'course-images');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Image upload failed');
      if (editingCourse) setEditingCourse({ ...editingCourse, [field]: data.url });
      else setNewCourse({ ...newCourse, [field]: data.url });
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setCourseImageUploading('');
    }
  };

  const bulkSyncEnabledMerchantCourses = async () => {
    if (enabledMerchantCourses.length === 0) {
      alert('Pehle kisi course me Google Merchant sync enable karke settings save karein.');
      return;
    }

    setBulkMerchantSyncing(true);
    setBulkMerchantProgress(`0/${enabledMerchantCourses.length} synced`);
    const failures: string[] = [];

    for (let index = 0; index < enabledMerchantCourses.length; index += 1) {
      const course = enabledMerchantCourses[index];
      setBulkMerchantProgress(`${index + 1}/${enabledMerchantCourses.length}: ${course.title}`);
      try {
        const res = await fetch(`/api/admin/courses/${course.id}/merchant`, { method: 'POST' });
        const data = await res.json().catch(() => ({})) as any;
        if (!res.ok) throw new Error(data.error || 'Sync failed');
      } catch (err: any) {
        failures.push(`${course.title}: ${err.message || 'Sync failed'}`);
      }
    }

    setBulkMerchantSyncing(false);
    setBulkMerchantProgress('');
    fetchData();
    if (failures.length > 0) {
      alert(`Bulk sync complete with ${failures.length} issue(s):\n${failures.join('\n')}`);
    } else {
      alert('All enabled courses synced to Google Merchant');
    }
  };


  const fetchMerchantDataSources = async () => {
    setMerchantDataSourcesLoading(true);
    setMerchantDataSourcesError('');
    try {
      const res = await fetch('/api/admin/merchant/data-sources');
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || 'Failed to fetch Merchant data sources');
      setMerchantDataSources(data.sources || []);
    } catch (err: any) {
      setMerchantDataSourcesError(err.message || 'Failed to fetch Merchant data sources');
      setMerchantDataSources([]);
    } finally {
      setMerchantDataSourcesLoading(false);
    }
  };

  const copyMerchantDataSourceName = async (name: string) => {
    await navigator.clipboard?.writeText(name);
    alert(`Data source name copied: ${name}`);
  };


  const runMerchantSetupAction = async (action: string, url: string, body: any, method = 'POST') => {
    setMerchantSetupLoading(action);
    setMerchantSetupMessage('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({})) as any;
      if (!res.ok) throw new Error(data.error || `${action} failed`);
      setMerchantSetupMessage(`${action} successful`);
      if (url.includes('data-sources')) {
        await fetchMerchantDataSources();
        fetchData();
      }
    } catch (err: any) {
      setMerchantSetupMessage(err.message || `${action} failed`);
    } finally {
      setMerchantSetupLoading('');
    }
  };

  const registerMerchantDeveloper = () => {
    if (!merchantDeveloperEmail.trim()) {
      setMerchantSetupMessage('Developer email required hai.');
      return;
    }
    runMerchantSetupAction('Developer registration', '/api/admin/merchant/developer-registration', { developerEmail: merchantDeveloperEmail.trim() });
  };

  const createOrPatchMerchantDeveloper = (method: 'POST' | 'PATCH') => {
    if (!merchantDeveloperEmail.trim()) {
      setMerchantSetupMessage('Developer email required hai.');
      return;
    }
    runMerchantSetupAction(
      method === 'POST' ? 'Create developer user' : 'Grant developer permissions',
      '/api/admin/merchant/developer-user',
      { email: merchantDeveloperEmail.trim(), accessRights: ['ADMIN', 'API_DEVELOPER'] },
      method,
    );
  };

  const createMerchantPrimaryDataSource = () => {
    runMerchantSetupAction('Create primary data source', '/api/admin/merchant/data-sources', {
      displayName: merchantDataSourceForm.displayName,
      contentLanguage: merchantDataSourceForm.contentLanguage,
      feedLabel: merchantDataSourceForm.feedLabel,
      countries: merchantDataSourceForm.countries.split(',').map(country => country.trim()).filter(Boolean),
      saveAsDefault: true,
    });
  };

  if (isLoading && courses.length === 0) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">पाठ्यक्रम प्रबंधन (Courses)</h1>
          <p className="text-neutral-400 mt-2 text-sm">सभी पाठ्यक्रमों बनाएं, संपादित करें और प्रबंधित करें।</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button
             onClick={() => router.push('/admin/categories')}
             className="inline-flex py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium transition-all items-center gap-2 border border-neutral-700"
           >
             श्रेणियाँ
           </button>
           <button
             onClick={() => { setShowModal(true); setActiveTab('basic'); }}
             className="inline-flex py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all items-center gap-2 shadow-lg shadow-orange-500/20"
           >
             <Plus className="w-4 h-4" />
             नया पाठ्यक्रम
           </button>
        </div>
      </div>


      <div className="mb-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5 shadow-lg shadow-blue-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-300" />
              <h2 className="text-lg font-black text-white">Google Merchant Automation</h2>
              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${merchantSettings?.configured ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
                {merchantSettings?.configured ? 'API Ready' : 'Secrets Missing'}
              </span>
            </div>
            <p className="text-sm text-neutral-300 max-w-3xl">
              Course list se Google Merchant product inputs ko one-by-one sync karein. Pehle course ke bag icon se defaults fill karke sync enable/save karein, phir yahan se enabled courses bulk sync ho jayenge.
            </p>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Recommended: JSON file ko KV / PLATFORM_SECRETS me GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON ke naam se save karein</p>
              <p className="text-[11px] text-neutral-400 mb-3">R2 ya D1 me private key rakhne ke bajay KV secret better hai. Agar full JSON nahi rakhna hai, tab client_email aur private_key alag keys me save kar sakte hain.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {merchantSecretChecklist.map(secret => (
                  <div key={secret.key} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-black text-neutral-100">{secret.key}</code>
                      <span className={`text-[9px] font-black uppercase ${secret.present ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {secret.present ? 'Saved' : 'Missing'}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1">{secret.note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-neutral-950 border border-neutral-800 px-3 py-1 text-neutral-300">Enabled: {merchantStats.enabled}</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-emerald-300">Synced: {merchantStats.synced}</span>
              <span className="rounded-full bg-pink-500/10 border border-pink-500/20 px-3 py-1 text-pink-300">Errors: {merchantStats.errors}</span>
              <span className="rounded-full bg-neutral-950 border border-neutral-800 px-3 py-1 text-neutral-400">Not synced: {merchantStats.notSynced}</span>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Quickstart setup APIs</p>
                <p className="text-[11px] text-neutral-500 mt-1">Step 1 developer register, Step 2 user permissions, Step 3 primary products data source yahin se run karein.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Developer email</label>
                  <input value={merchantDeveloperEmail} onChange={e => setMerchantDeveloperEmail(e.target.value)} placeholder="developer@gmail.com" className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white" />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <button type="button" onClick={registerMerchantDeveloper} disabled={Boolean(merchantSetupLoading)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black disabled:opacity-50">Register</button>
                  <button type="button" onClick={() => createOrPatchMerchantDeveloper('POST')} disabled={Boolean(merchantSetupLoading)} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black disabled:opacity-50">Invite User</button>
                  <button type="button" onClick={() => createOrPatchMerchantDeveloper('PATCH')} disabled={Boolean(merchantSetupLoading)} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black disabled:opacity-50">Grant Admin</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input value={merchantDataSourceForm.displayName} onChange={e => setMerchantDataSourceForm({ ...merchantDataSourceForm, displayName: e.target.value })} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white md:col-span-2" placeholder="Display name" />
                <input value={merchantDataSourceForm.contentLanguage} onChange={e => setMerchantDataSourceForm({ ...merchantDataSourceForm, contentLanguage: e.target.value })} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white" placeholder="Language" />
                <input value={merchantDataSourceForm.feedLabel} onChange={e => setMerchantDataSourceForm({ ...merchantDataSourceForm, feedLabel: e.target.value })} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white" placeholder="Feed label" />
                <input value={merchantDataSourceForm.countries} onChange={e => setMerchantDataSourceForm({ ...merchantDataSourceForm, countries: e.target.value })} className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white md:col-span-3" placeholder="Countries comma separated" />
                <button type="button" onClick={createMerchantPrimaryDataSource} disabled={Boolean(merchantSetupLoading)} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black disabled:opacity-50">Create Source</button>
              </div>
              {merchantSetupLoading && <div className="text-xs text-blue-200">{merchantSetupLoading} running...</div>}
              {merchantSetupMessage && <div className="text-xs text-neutral-300">{merchantSetupMessage}</div>}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Merchant API se Data Sources fetch karein</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Source name ko GOOGLE_MERCHANT_DATASOURCE_NAME me save karna hota hai.</p>
                </div>
                <button
                  type="button"
                  onClick={fetchMerchantDataSources}
                  disabled={merchantDataSourcesLoading}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {merchantDataSourcesLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Fetch Sources
                </button>
              </div>
              {merchantDataSourcesError && <div className="text-xs text-pink-300">{merchantDataSourcesError}</div>}
              {merchantDataSources.length > 0 && (
                <div className="space-y-2">
                  {merchantDataSources.map(source => (
                    <div key={source.name || source.data_source_id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-xs">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-white truncate">{source.display_name || source.name}</div>
                          <code className="block text-[10px] text-blue-200 break-all mt-1">{source.name}</code>
                          <div className="mt-1 text-[10px] text-neutral-500">ID: {source.data_source_id || '-'} • Input: {source.input || '-'} • Type: {source.type}</div>
                        </div>
                        <button type="button" onClick={() => copyMerchantDataSourceName(source.name)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black">
                          Copy Source Name
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={bulkSyncEnabledMerchantCourses}
            disabled={bulkMerchantSyncing || enabledMerchantCourses.length === 0 || !merchantSettings?.configured}
            className="min-w-56 px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all"
          >
            {bulkMerchantSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {bulkMerchantSyncing ? bulkMerchantProgress || 'Syncing...' : 'Sync Enabled Courses'}
          </button>
        </div>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="px-8 py-5">कोर्स आईडी एवं शीर्षक</th>
                <th className="px-8 py-5">विवरण</th>
                <th className="px-8 py-5 text-right">INR / USD मूल्य</th>
                <th className="px-8 py-5 text-center">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5" onClick={() => router.push(`/admin/course?id=${course.id}`)}>
                    <div className="text-sm font-black text-white group-hover:text-orange-400 transition-colors tracking-tight">{course.title}</div>
                    <div className="text-[10px] font-mono text-orange-400 mt-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 w-fit">
                      ID: {course.id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-[9px] uppercase font-bold rounded border border-neutral-700">
                          {course.category_name || 'Uncategorized'}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-medium italic">
                          By: {course.teacher_email || 'Staff'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 line-clamp-1 max-w-xs">{course.description}</div>
                      <span className={`w-fit px-2 py-0.5 rounded border text-[9px] font-black uppercase ${course.merchant_sync_status === 'synced' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : course.merchant_sync_status === 'error' ? 'border-pink-500/30 bg-pink-500/10 text-pink-400' : 'border-neutral-700 bg-neutral-800 text-neutral-500'}`}>
                        Merchant: {course.merchant_sync_status || 'not synced'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="text-sm font-bold text-emerald-400">₹{course.price_inr?.toLocaleString() || '0'}</div>
                    <div className="text-[10px] font-medium text-orange-400 mt-1">${course.price_usd || '0'}</div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                       <button
                         onClick={(e) => { e.stopPropagation(); setEditingCourse({...course}); setActiveTab('basic'); }}
                         className="p-2.5 bg-neutral-800 hover:bg-orange-600 text-neutral-100 sm:text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         aria-label="Edit course"
                         title="Edit course"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); openMerchantModal(course); }}
                         className="p-2.5 bg-neutral-800 hover:bg-blue-600 text-neutral-100 sm:text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         aria-label="Google Merchant"
                         title="Google Merchant"
                       >
                          <ShoppingBag className="w-4 h-4" />
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                         className="p-2.5 bg-neutral-800 hover:bg-pink-600 text-neutral-100 sm:text-neutral-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                         aria-label="Delete course"
                         title="Delete course"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    कोई पाठ्यक्रम नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {merchantCourse && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  Google Merchant Sync
                </h3>
                <p className="text-xs text-neutral-500 mt-1">{merchantCourse.title}</p>
              </div>
              <button onClick={() => { setMerchantCourse(null); setMerchantForm(null); }} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {merchantLoading || !merchantForm ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
            ) : (
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {!merchantConfigured && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Google Merchant secrets abhi complete configured nahi hain. Recommended setup: KV/PLATFORM_SECRETS me GOOGLE_MERCHANT_ACCOUNT_ID, GOOGLE_MERCHANT_DATASOURCE_NAME, aur full JSON ko GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON me save karein. Fallback me GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL + GOOGLE_MERCHANT_PRIVATE_KEY bhi supported hain.</span>
                  </div>
                )}
                {merchantSettings?.service_account_json_error && (
                  <div className="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 text-sm text-pink-200">
                    GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON parse error: {merchantSettings.service_account_json_error}
                  </div>
                )}

                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2"><Wand2 className="w-4 h-4 text-blue-300" /> Automation defaults</h4>
                    <p className="text-xs text-neutral-400 mt-1">Course ID, category aur Indian feed defaults se required fields quickly fill ho jayenge.</p>
                  </div>
                  <button type="button" onClick={applyMerchantDefaults} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black">Auto-fill</button>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                  <input
                    type="checkbox"
                    checked={Boolean(merchantForm.sync_enabled)}
                    onChange={e => setMerchantForm({ ...merchantForm, sync_enabled: e.target.checked })}
                    className="h-5 w-5 accent-blue-500"
                  />
                  Enable Google Merchant sync for this course
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Offer ID</label>
                    <input value={merchantForm.offer_id || ''} onChange={e => setMerchantForm({ ...merchantForm, offer_id: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Brand</label>
                    <input value={merchantForm.brand || ''} onChange={e => setMerchantForm({ ...merchantForm, brand: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Product Image URL *</label>
                    <input value={merchantForm.image_url || ''} onChange={e => setMerchantForm({ ...merchantForm, image_url: e.target.value })} placeholder="https://example.com/course-image.jpg" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Landing URL</label>
                    <input value={merchantForm.landing_url || ''} onChange={e => setMerchantForm({ ...merchantForm, landing_url: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Availability</label>
                    <select value={merchantForm.availability || 'in_stock'} onChange={e => setMerchantForm({ ...merchantForm, availability: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm">
                      <option value="in_stock">In stock</option>
                      <option value="out_of_stock">Out of stock</option>
                      <option value="preorder">Preorder</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Condition</label>
                    <select value={merchantForm.condition || 'new'} onChange={e => setMerchantForm({ ...merchantForm, condition: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm">
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="refurbished">Refurbished</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Language</label>
                    <input value={merchantForm.content_language || 'en'} onChange={e => setMerchantForm({ ...merchantForm, content_language: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Feed Label / Country</label>
                    <input value={merchantForm.feed_label || 'IN'} onChange={e => setMerchantForm({ ...merchantForm, feed_label: e.target.value, target_country: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Currency</label>
                    <input value={merchantForm.currency || 'INR'} onChange={e => setMerchantForm({ ...merchantForm, currency: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Google Product Category</label>
                    <input value={merchantForm.google_product_category || ''} onChange={e => setMerchantForm({ ...merchantForm, google_product_category: e.target.value })} placeholder="Education" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-400 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-300"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> API payload uses course title, description, price, landing URL, image URL and category.</div>
                  <div>Status: <span className="font-bold text-white">{merchantForm.sync_status || 'not_synced'}</span></div>
                  <div>Last synced: <span className="font-bold text-white">{merchantForm.last_synced_at || 'Never'}</span></div>
                  {merchantForm.sync_error && <div className="text-pink-400">Error: {merchantForm.sync_error}</div>}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={saveMerchantListing} disabled={merchantSaving || merchantSyncing} className="flex-1 py-3 border border-neutral-700 hover:bg-neutral-800 text-white rounded-xl font-bold disabled:opacity-50">
                    {merchantSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button type="button" onClick={syncMerchantListing} disabled={merchantSaving || merchantSyncing} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {merchantSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(showModal || editingCourse) && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                {editingCourse ? 'पाठ्यक्रम संपादित करें' : 'नया पाठ्यक्रम बनाएँ'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingCourse(null); }} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors" aria-label="Close modal" title="Close modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-800/30 p-4 border-b border-neutral-800 flex items-center justify-between">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Bilingual Content AI
              </p>
              <ContentAI
                context="course"
                initialData={{
                  title_en: editingCourse ? editingCourse.title : newCourse.title,
                  description_en: editingCourse ? editingCourse.description : newCourse.description
                }}
                onApply={(data) => {
                  if (editingCourse) {
                    setEditingCourse({ ...editingCourse, ...data });
                  } else {
                    setNewCourse({ ...newCourse, ...data });
                  }
                }}
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/30">
               <button
                 onClick={() => setActiveTab('basic')}
                 className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'basic' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                 बेसिक जानकारी (Basic)
               </button>
               <button
                 onClick={() => setActiveTab('announcement')}
                 className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'announcement' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                 प्रचार (Share)
               </button>
               <button
                 onClick={() => setActiveTab('seo')}
                 className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'seo' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                 SEO सेटिंग्स (Search)
               </button>
            </div>

            <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'basic' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                        English Title
                      </label>
                      <input
                        required
                        type="text"
                        value={editingCourse ? editingCourse.title : newCourse.title}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, title: e.target.value}) : setNewCourse({...newCourse, title: e.target.value})}
                        placeholder="e.g. Vedic Astrology Basics"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-orange-500/70 uppercase tracking-widest flex items-center gap-2">
                        Hindi शीर्षक
                      </label>
                      <input
                        required
                        type="text"
                        value={editingCourse ? editingCourse.title_hi : newCourse.title_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, title_hi: e.target.value}) : setNewCourse({...newCourse, title_hi: e.target.value})}
                        placeholder="जैसे: वैदिक ज्योतिष के मूल सिद्धांत"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">English Description</label>
                      <textarea
                        required
                        rows={3}
                        value={editingCourse ? editingCourse.description : newCourse.description}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, description: e.target.value}) : setNewCourse({...newCourse, description: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-orange-500/70 uppercase tracking-widest">Hindi विवरण</label>
                      <textarea
                        required
                        rows={3}
                        value={editingCourse ? editingCourse.description_hi : newCourse.description_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, description_hi: e.target.value}) : setNewCourse({...newCourse, description_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none resize-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                      <label className="text-sm font-semibold text-neutral-400">श्रेणी (Category)</label>
                      <select
                        value={editingCourse ? editingCourse.category_id : newCourse.category_id}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, category_id: e.target.value}) : setNewCourse({...newCourse, category_id: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                      >
                        <option value="">कोई श्रेणी नहीं</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 col-span-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                      <div>
                        <h4 className="text-sm font-black text-white">Course Thumbnail / Merchant Image</h4>
                        <p className="text-xs text-neutral-500 mt-1">Google Merchant image: minimum 500×500, recommended 1500×1500+, max 16MB. Upload par image WebP me compress/downscale hogi; low-res image upscale nahi hogi.</p>
                      </div>
                      {(['thumbnail_url', 'merchant_default_image_url'] as const).map(field => (
                        <div key={field} className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{field === 'thumbnail_url' ? 'Course thumbnail' : 'Default Merchant listing image'}</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={editingCourse ? editingCourse[field] || '' : newCourse[field] || ''}
                              onChange={e => editingCourse ? setEditingCourse({ ...editingCourse, [field]: e.target.value }) : setNewCourse({ ...newCourse, [field]: e.target.value })}
                              placeholder="/api/media/... or https://..."
                              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-xs font-mono"
                            />
                            <label className="cursor-pointer px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-2">
                              {courseImageUploading === field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              Upload
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadCourseImage(e.target.files[0], field)} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> INR मूल्य (₹)
                      </label>
                      <input
                        required
                        type="number"
                        value={editingCourse ? editingCourse.price_inr : newCourse.price_inr}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, price_inr: parseFloat(e.target.value)}) : setNewCourse({...newCourse, price_inr: parseFloat(e.target.value)})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> USD मूल्य ($)
                      </label>
                      <input
                        required
                        type="number"
                        value={editingCourse ? editingCourse.price_usd : newCourse.price_usd}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, price_usd: parseFloat(e.target.value)}) : setNewCourse({...newCourse, price_usd: parseFloat(e.target.value)})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                      />
                    </div>

                    <div className="col-span-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-violet-200">Self Study Credit Mode</h3>
                        <p className="text-xs text-neutral-400 mt-1">Is course ko credit-based self-study flow me chalane ke liye settings.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.self_study_enabled : newCourse.self_study_enabled)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_enabled: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, self_study_enabled: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          Self Study चालू करें
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.self_study_only : newCourse.self_study_only)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_only: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, self_study_only: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          केवल Self Study plans
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Course unlock credits</label>
                          <input
                            type="number"
                            min={0}
                            value={editingCourse ? (editingCourse.self_study_credit_cost || 0) : newCourse.self_study_credit_cost}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, self_study_credit_cost: parseInt(e.target.value) || 0}) : setNewCourse({...newCourse, self_study_credit_cost: parseInt(e.target.value) || 0})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                        <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm font-bold text-neutral-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCourse ? editingCourse.individual_class_booking_enabled : newCourse.individual_class_booking_enabled)}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_booking_enabled: e.target.checked ? 1 : 0}) : setNewCourse({...newCourse, individual_class_booking_enabled: e.target.checked})}
                            className="h-5 w-5 accent-violet-500"
                          />
                          Individual booking
                        </label>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Individual credits</label>
                          <input
                            type="number"
                            min={0}
                            value={editingCourse ? (editingCourse.individual_class_credit_cost || 0) : newCourse.individual_class_credit_cost}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_credit_cost: parseInt(e.target.value) || 0}) : setNewCourse({...newCourse, individual_class_credit_cost: parseInt(e.target.value) || 0})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Duration min</label>
                          <input
                            type="number"
                            min={1}
                            value={editingCourse ? (editingCourse.individual_class_duration_minutes || 30) : newCourse.individual_class_duration_minutes}
                            onChange={e => editingCourse ? setEditingCourse({...editingCourse, individual_class_duration_minutes: parseInt(e.target.value) || 30}) : setNewCourse({...newCourse, individual_class_duration_minutes: parseInt(e.target.value) || 30})}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                          <User className="w-4 h-4" /> शिक्षक (Teacher)
                        </label>
                        <select
                          value={editingCourse ? editingCourse.teacher_id : newCourse.teacher_id}
                          onChange={e => editingCourse ? setEditingCourse({...editingCourse, teacher_id: e.target.value}) : setNewCourse({...newCourse, teacher_id: e.target.value})}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500/50 outline-none"
                          required
                        >
                          <option value="">शिक्षक चुनें</option>
                          {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.full_name || teacher.email} ({teacher.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === 'announcement' ? (
                <div className="space-y-5">
                  {editingCourse && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                      Announcement options sirf naya course banate waqt bheje jaate hain. Existing course update par ye options apply nahi honge.
                    </div>
                  )}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-4">
                    <label className="flex items-start gap-3 text-sm font-bold text-neutral-100">
                      <input
                        type="checkbox"
                        checked={Boolean((editingCourse || newCourse).send_announcement_email)}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, send_announcement_email: e.target.checked}) : setNewCourse({...newCourse, send_announcement_email: e.target.checked})}
                        className="mt-1 h-5 w-5 accent-emerald-500"
                      />
                      <span>
                        Email bhejna hai
                        <span className="block text-xs font-medium text-neutral-400">Subscribers aur/students ko new course announcement email jayega.</span>
                      </span>
                    </label>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Audience</label>
                      <select
                        value={(editingCourse || newCourse).announcement_audience || 'both'}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, announcement_audience: e.target.value}) : setNewCourse({...newCourse, announcement_audience: e.target.value})}
                        className="mt-2 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none"
                      >
                        <option value="both">Subscribers + Students</option>
                        <option value="subscribers">Only Subscribers</option>
                        <option value="students">Only Students</option>
                      </select>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 space-y-4">
                    <label className="flex items-start gap-3 text-sm font-bold text-neutral-100">
                      <input
                        type="checkbox"
                        checked={Boolean((editingCourse || newCourse).auto_post_social)}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, auto_post_social: e.target.checked}) : setNewCourse({...newCourse, auto_post_social: e.target.checked})}
                        className="mt-1 h-5 w-5 accent-blue-500"
                      />
                      <span>
                        Social media par auto post
                        <span className="block text-xs font-medium text-neutral-400">Facebook/Instagram default hain; LinkedIn, Telegram, X bhi secrets set hone par chalenge.</span>
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['facebook', 'instagram', 'linkedin', 'telegram', 'x'].map(platform => {
                        const selected = ((editingCourse || newCourse).social_platforms || []).includes(platform);
                        return (
                          <label key={platform} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold capitalize ${selected ? 'border-blue-500/60 bg-blue-500/10 text-blue-200' : 'border-neutral-800 bg-neutral-950 text-neutral-500'}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={e => {
                                const current = (editingCourse || newCourse).social_platforms || [];
                                const next = e.target.checked ? [...current, platform] : current.filter((p: string) => p !== platform);
                                editingCourse ? setEditingCourse({...editingCourse, social_platforms: next}) : setNewCourse({...newCourse, social_platforms: next});
                              }}
                              className="accent-blue-500"
                            />
                            {platform === 'x' ? 'X/Twitter' : platform}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* English SEO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="w-8 h-px bg-neutral-800" />
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">English SEO</span>
                       <span className="flex-1 h-px bg-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Title</label>
                      <input
                        type="text"
                        value={editingCourse ? editingCourse.seo_title_en : newCourse.seo_title_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_title_en: e.target.value}) : setNewCourse({...newCourse, seo_title_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="e.g. Learn Vedic Astrology Online"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Description</label>
                      <textarea
                        rows={2}
                        value={editingCourse ? editingCourse.seo_description_en : newCourse.seo_description_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_description_en: e.target.value}) : setNewCourse({...newCourse, seo_description_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO Keywords</label>
                      <input
                        type="text"
                        value={editingCourse ? editingCourse.seo_keywords_en : newCourse.seo_keywords_en}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_keywords_en: e.target.value}) : setNewCourse({...newCourse, seo_keywords_en: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="comma, separated, keywords"
                      />
                    </div>
                  </div>

                  {/* Hindi SEO */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="w-8 h-px bg-neutral-800" />
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Hindi SEO</span>
                       <span className="flex-1 h-px bg-neutral-800" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO शीर्षक</label>
                      <input
                        type="text"
                        value={editingCourse ? editingCourse.seo_title_hi : newCourse.seo_title_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_title_hi: e.target.value}) : setNewCourse({...newCourse, seo_title_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                        placeholder="जैसे: ऑनलाइन वैदिक ज्योतिष सीखें"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO विवरण</label>
                      <textarea
                        rows={2}
                        value={editingCourse ? editingCourse.seo_description_hi : newCourse.seo_description_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_description_hi: e.target.value}) : setNewCourse({...newCourse, seo_description_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">SEO कीवर्ड</label>
                      <input
                        type="text"
                        value={editingCourse ? editingCourse.seo_keywords_hi : newCourse.seo_keywords_hi}
                        onChange={e => editingCourse ? setEditingCourse({...editingCourse, seo_keywords_hi: e.target.value}) : setNewCourse({...newCourse, seo_keywords_hi: e.target.value})}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCourse(null); }}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> सहेजें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
