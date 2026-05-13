'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, FileQuestion, Loader2, Trophy, XCircle } from 'lucide-react';
import { formatLocalDate } from '@/lib/time';

export default function StudentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExamLoading, setIsExamLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exams');
      const data = await res.json() as any;
      setExams(data.exams || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchExams();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const startExam = async (examId: string) => {
    setIsExamLoading(true);
    setResult(null);
    setAnswers({});
    try {
      const res = await fetch(`/api/exams/${examId}`);
      const data = await res.json() as any;
      if (!res.ok) {
        alert(data.error || 'Exam load failed');
        return;
      }
      setActiveExam(data.exam);
      setQuestions(data.questions || []);
    } catch (error) {
      console.error(error);
      alert('Exam load failed');
    } finally {
      setIsExamLoading(false);
    }
  };

  const submitExam = async () => {
    if (!activeExam) return;
    if (questions.some((question) => answers[question.id] === undefined)) {
      const proceed = confirm('Some questions are unanswered. Submit anyway?');
      if (!proceed) return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([question_id, selected_index]) => ({ question_id, selected_index })),
        }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        alert(data.error || 'Submit failed');
        return;
      }
      setResult(data);
      fetchExams();
    } catch (error) {
      console.error(error);
      alert('Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeExam = () => {
    setActiveExam(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">मेरे Exams / Quizzes</h1>
        <p className="mt-2 text-sm text-neutral-400">Aapke enrolled courses aur batches ke assigned exams yahan milenge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white">{exam.title}</h2>
                <p className="mt-1 text-sm text-neutral-400">{exam.course_title}</p>
                <p className="mt-1 text-xs text-orange-400 font-bold">{exam.batch_name || 'All batches'}</p>
              </div>
              <FileQuestion className="w-8 h-8 text-orange-400" />
            </div>
            {exam.description && <p className="text-sm text-neutral-500 line-clamp-2">{exam.description}</p>}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-neutral-950 p-3"><div className="font-black text-white">{exam.question_count}</div><div className="text-neutral-500">Questions</div></div>
              <div className="rounded-2xl bg-neutral-950 p-3"><div className="font-black text-white">{exam.passing_score}%</div><div className="text-neutral-500">Pass</div></div>
              <div className="rounded-2xl bg-neutral-950 p-3"><div className="font-black text-white">{exam.duration_minutes || '∞'}</div><div className="text-neutral-500">Min</div></div>
            </div>
            {exam.latest_submitted_at && (
              <div className={`rounded-2xl border p-3 text-sm ${exam.latest_passed === 1 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
                Best score: {exam.best_score || 0}% • Last: {formatLocalDate(exam.latest_submitted_at)}
              </div>
            )}
            <button onClick={() => startExam(exam.id)} className="w-full rounded-2xl bg-orange-600 hover:bg-orange-500 text-white py-3 font-black">
              {exam.latest_submitted_at ? 'Retake Exam' : 'Start Exam'}
            </button>
          </div>
        ))}
        {exams.length === 0 && (
          <div className="lg:col-span-3 rounded-3xl border border-neutral-800 bg-neutral-900 p-12 text-center text-neutral-500">
            <FileQuestion className="w-10 h-10 mx-auto mb-3" />
            Abhi aapke liye koi published exam assigned nahi hai.
          </div>
        )}
      </div>

      {activeExam && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[2rem] my-8 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">{activeExam.title}</h2>
                <p className="text-sm text-neutral-400">{activeExam.course_title} • Passing {activeExam.passing_score}%</p>
              </div>
              <button onClick={closeExam} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold">Close</button>
            </div>

            {isExamLoading ? <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div> : (
              <div className="p-6 space-y-6">
                {result ? (
                  <div className={`rounded-3xl border p-8 text-center ${result.passed === 1 ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                    {result.passed === 1 ? <Trophy className="w-12 h-12 text-emerald-400 mx-auto mb-3" /> : <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />}
                    <h3 className="text-2xl font-black text-white">{result.passed === 1 ? 'Passed!' : 'Try Again'}</h3>
                    <p className="mt-2 text-neutral-300">Score: {result.score_percent}% ({result.score}/{result.total_marks})</p>
                  </div>
                ) : questions.map((question, index) => {
                  const options = JSON.parse(question.options_json || '[]');
                  return (
                    <div key={question.id} className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-white">{index + 1}. {question.question_text}</h3>
                        <span className="text-xs text-neutral-500">{question.marks} mark</span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {options.map((option: string, optionIndex: number) => (
                          <button key={optionIndex} onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })} className={`text-left rounded-2xl border px-4 py-3 text-sm transition-all ${answers[question.id] === optionIndex ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'}`}>
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {!result && (
                  <button disabled={isSubmitting} onClick={submitExam} className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-4 font-black flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit Exam
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
