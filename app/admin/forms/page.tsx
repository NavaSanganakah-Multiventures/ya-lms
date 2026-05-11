'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Trash2, Layout, Sliders, ChevronRight, Save, Globe, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ContentAI from '@/components/ContentAI';

export default function AdminFormsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [title_hi, setTitleHi] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [description_hi, setDescriptionHi] = useState('');
  const [seo, setSeo] = useState({ title: '', description: '' });
  const [courses, setCourses] = useState<any[]>([]);
  const [linkedCourseId, setLinkedCourseId] = useState('');
  const [autoEnroll, setAutoEnroll] = useState(false);

  const router = useRouter();

  const fetchTemplates = () => {
    setIsLoading(true);
    fetch('/api/admin/form-templates')
      .then(res => res.json())
      .then((data: any) => {
        if (data.templates) setTemplates(data.templates);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const fetchTemplates = () => {
      setIsLoading(true);
      fetch('/api/admin/form-templates')
        .then(res => res.json())
        .then((data: any) => {
          if (data.templates) setTemplates(data.templates);
          setIsLoading(false);
        });
    };
    fetchTemplates();
    fetch('/api/admin/courses')
      .then(res => res.json())
      .then((data: any) => {
        if (data.courses) setCourses(data.courses);
      })
      .catch(() => {});
  }, [router]);

  const addField = () => {
    setFormFields([...formFields, { name: '', label: '', type: 'text', required: true, options: [] }]);
  };

  const removeField = (idx: number) => {
    setFormFields(formFields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, key: string, value: any) => {
    const updated = [...formFields];
    updated[idx][key] = value;
    setFormFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      title, title_hi, slug, description, description_hi,
      fields_json: formFields,
      seo_json: seo,
      linked_course_id: linkedCourseId || null,
      auto_enroll: autoEnroll
    };

    const method = editingTemplate ? 'PUT' : 'POST';
    const url = editingTemplate ? `/api/admin/form-templates/${editingTemplate.id}` : '/api/admin/form-templates';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchTemplates();
      } else {
        const err = await res.json() as any;
        alert(err.error || "Failed to save");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (t: any) => {
    setEditingTemplate(t);
    setTitle(t.title);
    setTitleHi(t.title_hi || '');
    setSlug(t.slug);
    setDescription(t.description);
    setDescriptionHi(t.description_hi || '');
    setFormFields(JSON.parse(t.fields_json || '[]'));
    setSeo(JSON.parse(t.seo_json || '{}'));
    setLinkedCourseId(t.linked_course_id || '');
    setAutoEnroll(!!t.auto_enroll);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the template and all submissions.")) return;
    await fetch(`/api/admin/form-templates/${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <Layout className="w-8 h-8 text-orange-500" />
             डायनामिक फॉर्म बिल्डर
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">प्रवेश और संपर्क के लिए गतिशील फॉर्म और पेज बनाएं।</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={() => router.push('/admin/form-responses')}
            className="flex-1 md:flex-none py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold transition-all border border-neutral-800 flex items-center justify-center gap-2"
          >
            सबमिशन देखें
            <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { setEditingTemplate(null); setTitle(''); setTitleHi(''); setSlug(''); setDescription(''); setDescriptionHi(''); setFormFields([]); setSeo({title:'', description:''}); setLinkedCourseId(''); setAutoEnroll(false); setShowModal(true); }}
            className="flex-1 md:flex-none py-3 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            नया फॉर्म बनाएं
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <div key={t.id} className="bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-sm rounded-3xl p-8 hover:border-orange-500/50 transition-all shadow-xl flex flex-col justify-between group">
            <div>
               <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-orange-500/10 rounded-2xl">
                    <Sliders className="w-6 h-6 text-orange-400" />
                 </div>
                 <button 
                   onClick={() => window.open(`/form?slug=${t.slug}`, '_blank')}
                   className="p-2 opacity-0 group-hover:opacity-100 hover:bg-neutral-800 rounded-xl transition-all text-neutral-500 hover:text-white"
                   title="View Public Page"
                 >
                    <Globe className="w-5 h-5" />
                 </button>
               </div>
               <h3 className="text-xl font-bold text-white mb-2 leading-tight">{t.title}</h3>
               <p className="text-neutral-500 text-sm line-clamp-2 mb-4">{t.description}</p>
               <div className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest bg-neutral-950 px-2 py-1 rounded inline-block">
                 Slug: {t.slug}
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
               <button 
                 onClick={() => openEdit(t)}
                 className="text-orange-400 hover:text-white text-sm font-bold transition-colors"
               >
                 एडिट करें
               </button>
               <button 
                 onClick={() => handleDelete(t.id)}
                 className="text-neutral-600 hover:text-red-500 transition-colors"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-[40px]">
             <Layout className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
             <p className="text-neutral-600 font-bold">कोई फॉर्म टेम्पलेट उपलब्ध नहीं है।</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
               <div>
                  <h3 className="text-2xl font-black text-white">{editingTemplate ? 'टेम्पलेट संपादित करें' : 'नया फॉर्म टेम्पलेट'}</h3>
                  <p className="text-neutral-500 text-sm">फ़ॉर्म के फ़ील्ड और सेटिंग्स कॉन्फ़िगर करें।</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-3 hover:bg-neutral-800 rounded-2xl text-neutral-500 hover:text-white transition-all">
                 <X className="w-6 h-6" />
               </button>
            </div>
            
            <div className="bg-neutral-800/30 p-4 border-b border-neutral-800 flex items-center justify-between">
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Form Content AI
                </p>
                <ContentAI 
                  context="form"
                  initialData={{
                    title_en: title,
                    description_en: description
                  }}
                  onApply={(data) => {
                    if (data.title_hi) setTitleHi(data.title_hi);
                    if (data.description_hi) setDescriptionHi(data.description_hi);
                    if (data.seo_title_en) setSeo(data);
                  }}
                />
             </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">मूल जानकारी (Basic Info)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        required 
                        type="text" 
                        placeholder="Title (EN)"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-neutral-800"
                      />
                      <input 
                        required 
                        type="text" 
                        placeholder="शीर्षक (HI)"
                        value={title_hi}
                        onChange={e => setTitleHi(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-neutral-800"
                      />
                    </div>
                    <input 
                      required 
                      type="text" 
                      placeholder="Slug (url - e.g. admission-2024)"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-mono text-sm focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-neutral-800"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <textarea 
                        placeholder="Description (EN)"
                        rows={3}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none placeholder:text-neutral-800"
                      />
                      <textarea 
                        placeholder="विवरण (HI)"
                        rows={3}
                        value={description_hi}
                        onChange={e => setDescriptionHi(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none placeholder:text-neutral-800"
                      />
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">SEO सेटिंग्स (Dynamic SEO)</label>
                    <input 
                      type="text" 
                      placeholder="Meta Title"
                      value={seo.title}
                      onChange={e => setSeo({...seo, title: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-neutral-800"
                    />
                    <textarea 
                      placeholder="Meta Description"
                      rows={4}
                      value={seo.description}
                      onChange={e => setSeo({...seo, description: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all resize-none placeholder:text-neutral-800"
                    />

                    <div className="pt-4 mt-4 border-t border-neutral-800 space-y-4">
                      <label className="text-xs font-black text-orange-400 uppercase tracking-widest">Course Integration</label>
                      <select
                        value={linkedCourseId}
                        onChange={e => setLinkedCourseId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                      >
                        <option value="">-- No Course Linked --</option>
                        {courses.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {linkedCourseId && (
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="checkbox"
                            checked={autoEnroll}
                            onChange={e => setAutoEnroll(e.target.checked)}
                            className="w-4 h-4 bg-neutral-950 border-neutral-800 rounded"
                            id="autoEnrollCheck"
                          />
                          <label htmlFor="autoEnrollCheck" className="text-sm text-neutral-400 cursor-pointer">
                            Auto-enroll on form submit?
                          </label>
                        </div>
                      )}
                    </div>
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest">फ़ॉर्म फ़ील्ड्स (Form Fields)</label>
                    <button 
                      type="button"
                      onClick={addField}
                      className="text-orange-400 hover:text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> फ़ील्ड जोड़ें
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    {formFields.map((field, idx) => (
                      <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 relative">
                         <button 
                           type="button" 
                           onClick={() => removeField(idx)}
                           className="absolute top-4 right-4 p-2 text-neutral-700 hover:text-red-500 transition-all"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input 
                              placeholder="फ़ील्ड लेबल (Label)"
                              value={field.label}
                              onChange={e => updateField(idx, 'label', e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none"
                            />
                            <input 
                              placeholder="फ़ील्ड नाम (Name - e.g. age)"
                              value={field.name}
                              onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none font-mono"
                            />
                            <select 
                              value={field.type}
                              onChange={e => updateField(idx, 'type', e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-sm outline-none"
                            >
                              <option value="text">Text (एक लाइन)</option>
                              <option value="textarea">Textarea (मल्टीपल लाइन)</option>
                              <option value="email">Email</option>
                              <option value="number">Number</option>
                              <option value="select">Dropdown (चयन करें)</option>
                            </select>
                         </div>
                         
                         {field.type === 'select' && (
                           <div className="mt-4">
                              <input 
                                placeholder="Options (comma separated. e.g. Male, Female, Other)"
                                value={field.options?.join(', ')}
                                onChange={e => updateField(idx, 'options', e.target.value.split(',').map(o => o.trim()))}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white text-xs outline-none"
                              />
                           </div>
                         )}

                         <div className="mt-4 flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={field.required}
                              onChange={e => updateField(idx, 'required', e.target.checked)}
                              className="w-4 h-4 bg-neutral-900 border-neutral-800 rounded"
                            />
                            <span className="text-xs text-neutral-500">आवश्यक है (Required)?</span>
                         </div>
                      </div>
                    ))}
                    {formFields.length === 0 && (
                      <div className="text-center py-10 bg-neutral-950/30 rounded-3xl border border-neutral-800 border-dashed">
                        <p className="text-neutral-700 text-sm italic">कोई फ़ील्ड नहीं। कृपया फ़ील्ड जोड़ें।</p>
                      </div>
                    )}
                 </div>
               </div>
               
               <div className="pt-6 border-t border-neutral-800">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-white text-black rounded-2xl font-black text-xl hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        टेम्पलेट सेव करें
                        <Save className="w-6 h-6" />
                      </>
                    )}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
