'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Phone, MapPin, Globe, Save, AlertCircle, Calendar, Heart, MessageSquare } from 'lucide-react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    birth_date: '',
    father_name: '',
    mother_name: '',
    grand_father_name: '',
    district: '',
    state: '',
    country: 'IN',
    pincode: '',
    gender: '',
    bio: '',
    birth_place: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countriesList, setCountriesList] = useState<{name: string, code: string}[]>([{ name: 'India', code: 'IN' }]);
  const [statesList, setStatesList] = useState<{name: string, code: string}[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      .then(res => res.json())
      .then(data => {
        const formatted = (data as any[]).map((c: any) => ({ name: c.name.common, code: c.cca2 })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountriesList(formatted);
      }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const selectedCountryObj = countriesList.find(c => c.code === formData.country);
    if (selectedCountryObj) {
      fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selectedCountryObj.name })
      })
      .then(res => res.json())
      .then((data: any) => {
        const states = (data.data?.states || []).map((s: any) => ({ name: s.name, code: s.state_code || s.name }));
        setStatesList(states.length > 0 ? states : [{ name: 'Other', code: 'OT' }]);
      }).catch(err => { console.error(err); setStatesList([{ name: 'Other', code: 'OT' }]); });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatesList([]);
    }
  }, [formData.country, countriesList]);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then((data: any) => {
        if (data.user) {
          // birth_date may come as UTC ISO string — extract YYYY-MM-DD for date input
          const rawBirthDate = data.user.birth_date || '';
          const birthDateForInput = rawBirthDate
            ? rawBirthDate.includes('T')
              ? rawBirthDate.split('T')[0]
              : rawBirthDate
            : '';
          setFormData({
            email: data.user.email || '',
            full_name: data.user.full_name || '',
            phone: data.user.phone || '',
            birth_date: birthDateForInput,
            father_name: data.user.father_name || '',
            mother_name: data.user.mother_name || '',
            grand_father_name: data.user.grand_father_name || '',
            district: data.user.district || '',
            state: data.user.state || '',
            country: data.user.country || 'IN',
            pincode: data.user.pincode || '',
            gender: data.user.gender || '',
            bio: data.user.bio || '',
            birth_place: data.user.birth_place || '',
          });
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'पार्श्वचित्र अद्यतन करने में विफल');

      setSuccess('प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">प्रोफ़ाइल जानकारी</h1>
        <p className="text-neutral-400 mt-2">सभी सुविधाओं का उपयोग करने के लिए अनिवार्य जानकारी (*) भरना आवश्यक है।</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-400" /> व्यक्तिगत जानकारी
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">ईमेल आईडी *</label>
                <input
                  type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">पूरा नाम *</label>
                <input
                  type="text" required value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">जन्म तिथि *</label>
                <input
                  type="date" required value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">मोबाइल नंबर *</label>
                <input
                  type="tel" required value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">लिंग</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                >
                  <option value="">चयन करें</option>
                  <option value="Male">पुरुष</option>
                  <option value="Female">महिला</option>
                  <option value="Other">अन्य</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Family Info */}
          <div className="pt-8 border-t border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-orange-400" /> पारिवारिक जानकारी
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">पिता का नाम *</label>
                <input
                  type="text" required value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">माता का नाम *</label>
                <input
                  type="text" required value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">दादाजी का नाम *</label>
                <input
                  type="text" required value={formData.grand_father_name}
                  onChange={(e) => setFormData({ ...formData, grand_father_name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Location Info */}
          <div className="pt-8 border-t border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-400" /> पता और स्थान
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">जिला</label>
                <input
                  type="text" value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">देश</label>
                <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all">
                  {countriesList.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">राज्य</label>
                <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all">
                  <option value="">चयन करें</option>
                  {statesList.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">पिनकोड</label>
                <input
                  type="text" value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">जन्म स्थान</label>
                <input
                  type="text" value={formData.birth_place}
                  onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bio */}
          <div className="pt-8 border-t border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" /> परिचय (Bio)
            </h3>
            <div className="space-y-2">
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 text-white focus:border-orange-500 outline-none transition-all min-h-[120px]"
                placeholder="अपने बारे में कुछ लिखें..."
              />
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-800 flex justify-end">
            <button
              type="submit" disabled={isSaving}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              जानकारी सहेजें
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
