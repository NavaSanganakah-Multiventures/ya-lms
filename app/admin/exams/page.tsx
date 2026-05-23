'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Loader2, Plus, Save, Trash2, BarChart2, X, Users, CheckCircle, XCircle, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

type QuestionDraft = {
  question_text: string;
  options: string[];
  correct_option_index: number;
  marks: number;
  question_type: 'mcq' | 'text';
};

const emptyQuestion = (type: 'mcq' | 'text' = 'mcq'): QuestionDraft => ({
  question_text: '',
  options: type === 'mcq' ? ['', '', '', ''] : [],
  correct_option_index: 0,
  marks: 1,
  question_type: type,
});

const emptyForm = {
  title: '',
  description: '',
  course_id: '',
  book_id: '',
  batch_id: '',
  type: 'quiz', // quiz, exam, assignment
  scheduled_at: '',
  end_at: '',
  require_video: false,
  passing_score: 50,
  duration_minutes: 0,
  is_published: false,
  questions: [emptyQuestion()],
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scopeType, setScopeType] = useState<'course' | 'book'>('course');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Analytics State
  const [analyticsExamId, setAnalyticsExamId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [examRes, courseRes, batchRes, bookRes] = await Promise.all([
        fetch('/api/admin/exams'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/batches'),
        fetch('/api/admin/books'),
      ]);
      if (examRes.status === 401 || examRes.status === 403) {
        router.push('/auth/login');
        return;
      }
      const examData = await examRes.json() as any;
      const courseData = await courseRes.json() as any;
      const batchData = await batchRes.json() as any;
      const bookData = await bookRes.json() as any;
      setExams(examData.exams || []);
      setCourses(courseData.courses || []);
      setBatches(batchData.batches || []);
      setBooks(bookData.books || []);
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
      showError(data.error || 'Exam load failed');
      return;
    }
    setEditingId(examId);
    setScopeType(data.exam.book_id ? 'book' : 'course');
    setForm({
      title: data.exam.title || '',
      description: data.exam.description || '',
      course_id: data.exam.course_id || '',
      book_id: data.exam.book_id || '',
      batch_id: data.exam.batch_id || '',
      type: data.exam.type || 'quiz',
      scheduled_at: data.exam.scheduled_at ? data.exam.scheduled_at.substring(0, 16) : '',
      end_at: data.exam.end_at ? data.exam.end_at.substring(0, 16) : '',
      require_video: data.exam.require_video === 1,
      passing_score: data.exam.passing_score || 50,
      duration_minutes: data.exam.duration_minutes || 0,
      is_published: data.exam.is_published === 1,
      questions: (data.questions || []).map((question: any) => ({
        question_text: question.question_text || '',
        options: (() => { try { return JSON.parse(question.options_json || '[]'); } catch(e) { return []; } })(),
        correct_option_index: Number(question.correct_option_index || 0),
        marks: Number(question.marks || 1),
        question_type: question.question_type || 'mcq',
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
        showError(data.error || 'Exam save failed');
        return;
      }
      showSuccess(editingId ? 'Exam updated successfully!' : 'Exam created successfully!');
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      showError('Exam save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Delete this exam?')) return;
    const res = await fetch(`/api/admin/exams/${examId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
      showSuccess('Exam deleted successfully!');
    }
    else showError('Exam delete failed');
  };

  const handleOpenAnalytics = async (examId: string) => {
    setAnalyticsExamId(examId);
    setIsLoadingAnalytics(true);
    // Mock analytics data fetch - in reality this would hit an API endpoint
    try {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 1000));
      setAnalyticsData({
        totalAttempts: 45,
        averageScore: 78,
        passRate: 85,
        topStudents: [
          { name: "Rahul Sharma", score: 95 },
          { name: "Priya Singh", score: 92 },
          { name: "Amit Kumar", score: 88 },
        ],
        recentAttempts: [
          { name: "Sneha G", score: 75, passed: true },
          { name: "Ravi V", score: 45, passed: false },
          { name: "Pooja M", score: 82, passed: true },
        ]
      });
    } catch (err) {
      showError('Failed to load analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Test Title" className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam (Face Monitoring)</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none min-h-20" />

          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button type="button" onClick={() => { setScopeType('course'); setForm({ ...form, book_id: '' }); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scopeType === 'course' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>Course Exam</button>
            <button type="button" onClick={() => { setScopeType('book'); setForm({ ...form, course_id: '', batch_id: '' }); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${scopeType === 'book' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>Book Exam</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scopeType === 'course' ? (
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value, batch_id: '' })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required>
                <option value="">Course चुनें</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
            ) : (
              <select value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none" required>
                <option value="">Book चुनें</option>
                {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
              </select>
            )}
            {scopeType === 'course' && (
              <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none">
                <option value="">All batches</option>
                {filteredBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-neutral-400">Scheduled From
              <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">Deadline (End)
              <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs text-neutral-400">Passing %
              <input type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
            <label className="space-y-1 text-xs text-neutral-400">Duration (Min)
              <input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" />
            </label>
            <label className="flex items-center gap-2 pt-5 text-[10px] text-neutral-300">
              <input type="checkbox" checked={form.require_video || form.type === 'exam'} onChange={(e) => setForm({ ...form, require_video: e.target.checked })} /> {form.type === 'exam' ? 'Video REQ' : 'Monitor Face'}
            </label>
            <label className="flex items-center gap-2 pt-5 text-[10px] text-neutral-300">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Questions</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion('mcq')] })} className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 border border-orange-400/20 px-2 py-1 rounded-lg"><Plus className="w-3 h-3" /> MCQ</button>
                <button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQuestion('text')] })} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-blue-400/20 px-2 py-1 rounded-lg"><Plus className="w-3 h-3" /> Text</button>
              </div>
            </div>
            {form.questions.map((question: QuestionDraft, qIndex: number) => (
              <div key={qIndex} className={`rounded-2xl border ${question.question_type === 'text' ? 'border-blue-500/20 bg-blue-500/5' : 'border-neutral-800 bg-neutral-950/60'} p-4 space-y-3`}>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black text-neutral-500">{question.question_type} Question {qIndex + 1}</span>
                      <input type="number" value={question.marks} onChange={(e) => updateQuestion(qIndex, { marks: Number(e.target.value) })} className="w-12 bg-transparent text-right text-xs text-orange-400 outline-none" />
                    </div>
                    <input value={question.question_text} onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })} placeholder="सवाल यहाँ लिखें..." className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none" required />
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, questions: form.questions.filter((_: QuestionDraft, i: number) => i !== qIndex) })} className="text-red-400 disabled:opacity-40 self-start pt-6" disabled={form.questions.length === 1} aria-label="Delete question" title="Delete question"><Trash2 className="w-4 h-4" /></button>
                </div>
                {question.question_type === 'mcq' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center gap-2 text-xs text-neutral-400">
                        <input type="radio" checked={question.correct_option_index === optionIndex} onChange={() => updateQuestion(qIndex, { correct_option_index: optionIndex })} />
                        <input value={option} onChange={(e) => updateOption(qIndex, optionIndex, e.target.value)} placeholder={`विकल्प ${optionIndex + 1}`} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none" required />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-500 italic">Student will provide a written answer for this question.</div>
                )}
              </div>
            ))}
          </div>

          <button disabled={isSaving} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-2xl py-3 font-black flex items-center justify-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Exam
          </button>
        </form>

        <div className="xl:col-span-3 bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
          {isLoading ? <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div> : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <table className="w-full text-left">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-500">
                  <tr><th className="px-6 py-4">Exam</th><th className="px-6 py-4">Scope</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-neutral-800/40">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{exam.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${exam.type === 'exam' ? 'bg-red-500/10 text-red-400' : exam.type === 'assignment' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {exam.type?.toUpperCase()}
                          </span>
                          <div className="text-[10px] text-neutral-500">{exam.question_count || 0} Qs • {exam.attempt_count || 0} attempts</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-300">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${exam.book_id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {exam.book_id ? 'BOOK' : 'COURSE'}
                          </span>
                        </div>
                        <div className="truncate max-w-[150px]">{exam.book_title || exam.course_title}</div>
                        <div className="text-[10px] text-orange-400">{exam.book_id ? 'All batches' : (exam.batch_name || 'All batches')}</div>
                        {exam.scheduled_at && <div className="text-[9px] text-neutral-500 mt-1">Starts: {new Date(exam.scheduled_at).toLocaleString()}</div>}
                      </td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-black ${exam.is_published === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>{exam.is_published === 1 ? 'PUBLISHED' : 'DRAFT'}</span></td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleOpenAnalytics(exam.id)} className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold" title="View Analytics"><BarChart2 className="w-4 h-4 inline-block" /></button>
                        <button onClick={() => handleEdit(exam.id)} className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold">Edit</button>
                        <button onClick={() => handleDelete(exam.id)} className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500"><Award className="w-8 h-8 mx-auto mb-2" />No exams yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Modal */}
      {analyticsExamId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <BarChart2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Exam Analytics</h3>
                  <p className="text-xs text-neutral-400">Student performance overview</p>
                </div>
              </div>
              <button onClick={() => setAnalyticsExamId(null)} className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto">
              {isLoadingAnalytics ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-neutral-500 text-sm">Loading analytics data...</p>
                </div>
              ) : analyticsData ? (
                <div className="space-y-8">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
                      <div className="p-4 bg-orange-500/10 rounded-xl"><Users className="w-8 h-8 text-orange-500" /></div>
                      <div>
                        <div className="text-3xl font-black text-white">{analyticsData.totalAttempts}</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-1">Total Attempts</div>
                      </div>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
                      <div className="p-4 bg-blue-500/10 rounded-xl"><Award className="w-8 h-8 text-blue-500" /></div>
                      <div>
                        <div className="text-3xl font-black text-white">{analyticsData.averageScore}%</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-1">Average Score</div>
                      </div>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl flex items-center gap-4">
                      <div className="p-4 bg-emerald-500/10 rounded-xl"><CheckCircle className="w-8 h-8 text-emerald-500" /></div>
                      <div>
                        <div className="text-3xl font-black text-white">{analyticsData.passRate}%</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold mt-1">Pass Rate</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Top Performers */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Top Performers</h4>
                      <div className="space-y-3">
                        {analyticsData.topStudents.map((student: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="text-neutral-500 font-bold w-4">{i + 1}.</span>
                              <span className="text-sm font-bold text-neutral-200">{student.name}</span>
                            </div>
                            <span className="text-emerald-400 font-black text-sm">{student.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Attempts */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Timer className="w-4 h-4 text-blue-400" /> Recent Attempts</h4>
                      <div className="space-y-3">
                        {analyticsData.recentAttempts.map((attempt: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-neutral-900 rounded-xl">
                            <span className="text-sm font-bold text-neutral-200">{attempt.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-black text-sm">{attempt.score}%</span>
                              {attempt.passed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
