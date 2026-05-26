'use client';

import { useEffect, useState } from 'react';
import { Loader2, FileText, ClipboardList, CheckCircle, Clock, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

interface FormTemplate {
  id: string;
  slug: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  description_hi: string | null;
}

interface FormSubmission {
  id: string;
  template_id: string;
  template_title: string;
  template_title_hi: string | null;
  template_slug: string;
  status: string;
  created_at: string;
}

export default function DashboardFormsPage() {
  const { error: showError } = useToast();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'submissions'>('available');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formsRes, subsRes] = await Promise.all([
          fetch('/api/user/forms'),
          fetch('/api/user/form-submissions'),
        ]);
        if (formsRes.ok) {
          const data = await formsRes.json();
          setForms(data.forms || []);
        }
        if (subsRes.ok) {
          const data = await subsRes.json();
          setSubmissions(data.submissions || []);
        }
      } catch {
        showError('Failed to load forms');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  const submittedTemplateIds = new Set(submissions.map((s) => s.template_id));

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-orange-500" /> Forms
          </h1>
          <p className="text-neutral-400 mt-1">View and submit registration forms</p>
        </div>
      </div>

      <div className="flex gap-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 w-fit">
        <button onClick={() => setActiveTab('available')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'available' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-white'}`}>
          Available Forms
        </button>
        <button onClick={() => setActiveTab('submissions')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'submissions' ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-white'}`}>
          My Submissions ({submissions.length})
        </button>
      </div>

      {activeTab === 'available' && (
        forms.length === 0 ? (
          <div className="bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-3xl p-16 text-center">
            <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No forms available</h3>
            <p className="text-neutral-500">Check back later for new registration forms.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {forms.map((form) => {
              const alreadySubmitted = submittedTemplateIds.has(form.id);
              return (
                <div key={form.id} className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 flex items-center justify-between gap-4 hover:border-neutral-700 transition-colors">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{form.title || form.title_hi}</h3>
                    {(form.description || form.description_hi) && (
                      <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{form.description_hi || form.description}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {alreadySubmitted ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-bold">
                        <CheckCircle className="w-4 h-4" /> Submitted
                      </span>
                    ) : (
                      <Link href={`/form?slug=${form.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-colors">
                        Fill Form <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'submissions' && (
        submissions.length === 0 ? (
          <div className="bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-3xl p-16 text-center">
            <ClipboardList className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No submissions yet</h3>
            <p className="text-neutral-500">Fill a form from the Available Forms tab to see it here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-white truncate">{sub.template_title || sub.template_title_hi}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                    {sub.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                    {sub.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
