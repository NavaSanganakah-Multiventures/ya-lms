'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type QuestionDraft = {
  question_text: string;
  options: string[];
  correct_option_index: number;
  marks: number;
};

const emptyQuestion = (): QuestionDraft => ({
  question_text: '',
  options: ['', '', '', ''],
  correct_option_index: 0,
  marks: 1,
});

const emptyForm = {
  title: '',
  description: '',
  course_id: '',
  batch_id: '',
  passing_score: 50,
  duration_minutes: 0,
  is_published: false,
  questions: [emptyQuestion()],
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [examRes, courseRes, batchRes] = await Promise.all([
        fetch('/api/admin/exams'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/batches'),
      ]);
      if (examRes.status === 401 || examRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const examData = await examRes.json() as any;
      const courseData = await courseRes.json() as any;
      const batchData = await batchRes.json() as any;
      setExams(examData.exams || []);
      setCourses(courseData.courses || []);
      setBatches(batchData.batches || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) => {
    setForm((current: any) => ({
      ...current,
      questions: current.questions.map((question: QuestionDraft, qIndex: number) => qIndex === index ? { ...question, ...patch } : question),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setForm((current: any) => ({
      ...current,
      questions: current.questions.map((question: QuestionDraft, qIndex: number) => {
        if (qIndex !== questionIndex) return question;
        const options = [...question.options];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = async (examId: string) => {
    const res = await fetch(`/api/admin/exams/${examId}`);
    const data = await res.json() as any;
    if (!res.ok) {
      alert(data.error || 'Exam load failed');
      return;
    }
    setEditingId(examId);
    setForm({
      title: data.exam.title || '',
      description: data.exam.description || '',
      course_id: data.exam.course_id || '',
      batch_id: data.exam.batch_id || '',
      passing_score: data.exam.passing_score || 50,
      duration_minutes: data.exam.duration_minutes || 0,
      is_published: data.exam.is_published === 1,
      questions: (data.questions || []).map((question: any) => ({
        question_text: question.question_text || '',
        options: JSON.parse(question.options_json || '[]'),
        correct_option_index: Number(question.correct_option_index || 0),
        marks: Number(question.marks || 1),
      })),
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(editingId ? `/api/admin/exams/${editingId}` : '/api/admin/exams', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        alert(data.error || 'Exam save failed');
        return;
      }
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Exam save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Delete this exam?')) return;
    const res = await fetch(`/api/admin/exams/${examId}`, { method: 'DELETE' });
    if (res.ok) fetchData();
    else alert('Exam delete failed');
  };

  const filteredBatches = batches.filter((batch) => batch.course_id === form.course_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">परीक्षा / Quiz Management</h1>
        <p className="mt-2 text-sm text-neutral-400">Course-wise ya batch-wise quiz/exam बनाएं और publish करें।</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <form onSubmit={handleSave} className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-black text-white">{editingId ? 'Exam Edit करें' : 'नया Exam'}</h2>
            {editingId && <button type="button" onClick={resetForm} className="text-xs text-neutral-400 hover:text-white">Cancel edit</button>}
          </div>

          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Exam title" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none min-h-20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, batch_id: '' })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required>
              <option value="">Course चुनें</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none">
              <option value="">All batches</option>
              {filteredBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 text-xs text-neutral-400">Passing %
              <input type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">Minutes
              <input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
            <label className="flex items-center gap-2 pt-5 text-xs text-neutral-300">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Questions</h3>
              <button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion()] })} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            {form.questions.map((question: QuestionDraft, qIndex: number) => (
              <div key={qIndex} className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
                <div className="flex gap-2">
                  <input value={question.question_text} onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })} placeholder={`Question ${qIndex + 1}`} className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" required />
                  <button type="button" onClick={() => setForm({ ...form, questions: form.questions.filter((_: QuestionDraft, i: number) => i !== qIndex) })} className="text-red-400 disabled:opacity-40" disabled={form.questions.length === 1}><Trash2 className="w-4 h-4" /></button>
                </div>
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="flex items-center gap-2 text-xs text-neutral-400">
                    <input type="radio" checked={question.correct_option_index === optionIndex} onChange={() => updateQuestion(qIndex, { correct_option_index: optionIndex })} />
                    <input value={option} onChange={(e) => updateOption(qIndex, optionIndex, e.target.value)} placeholder={`Option ${optionIndex + 1}`} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none" required />
                  </label>
                ))}
              </div>
            ))}
          </div>

          <button disabled={isSaving} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-2xl py-3 font-black flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Exam
          </button>
        </form>

        <div className="xl:col-span-3 bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
          {isLoading ? <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500">
                  <tr><th className="px-6 py-4">Exam</th><th className="px-6 py-4">Scope</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-neutral-800/40">
                      <td className="px-6 py-4"><div className="font-bold text-white">{exam.title}</div><div className="text-xs text-neutral-500">{exam.question_count || 0} questions • {exam.attempt_count || 0} attempts</div></td>
                      <td className="px-6 py-4 text-sm text-neutral-300">{exam.course_title}<div className="text-xs text-orange-400">{exam.batch_name || 'All batches'}</div></td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-black ${exam.is_published === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>{exam.is_published === 1 ? 'PUBLISHED' : 'DRAFT'}</span></td>
                      <td className="px-6 py-4 text-right space-x-2"><button onClick={() => handleEdit(exam.id)} className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-200 text-xs font-bold">Edit</button><button onClick={() => handleDelete(exam.id)} className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold">Delete</button></td>
                    </tr>
                  ))}
                  {exams.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500"><Award className="w-8 h-8 mx-auto mb-2" />No exams yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
