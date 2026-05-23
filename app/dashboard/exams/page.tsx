'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle2, FileQuestion, Loader2, Trophy, XCircle, Clock, Video, AlertTriangle, Maximize, ShieldAlert } from 'lucide-react';
import { formatLocalDate } from '@/lib/time';
import { useProctoring } from '@/hooks/useProctoring';

// ─── Warning Modal ──────────────────────────────────────────────────────────────
function ProctoringWarningModal({
  violation,
  warningCount,
  maxWarnings,
  onDismiss,
}: {
  violation: { type: string; message: string } | null;
  warningCount: number;
  maxWarnings: number;
  onDismiss: () => void;
}) {
  if (!violation) return null;

  const isFinal = warningCount >= maxWarnings;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Red flash overlay */}
      <div className="absolute inset-0 border-8 border-red-500 animate-pulse pointer-events-none rounded-none" />

      <div className="relative bg-neutral-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_0_60px_rgba(239,68,68,0.4)] text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>

        {isFinal ? (
          <>
            <h2 className="text-2xl font-black text-red-400 mb-2">Exam Terminated!</h2>
            <p className="text-neutral-300 text-sm mb-2">You have exceeded the maximum number of violations.</p>
            <p className="text-neutral-500 text-xs">Your exam is being auto-submitted now...</p>
            <div className="mt-6">
              <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-black text-sm uppercase tracking-widest">
                Warning {warningCount} / {maxWarnings}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mb-3">Violation Detected!</h2>
            <p className="text-neutral-300 text-sm mb-6">{violation.message}</p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <p className="text-red-300 text-xs font-bold">
                ⚠️ {maxWarnings - warningCount} more violation{maxWarnings - warningCount !== 1 ? 's' : ''} will auto-submit your exam!
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-2xl transition-all"
            >
              I Understand — Return to Exam
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function StudentExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExamLoading, setIsExamLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const MAX_WARNINGS = 3;

  const fetchExams = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (activeExam) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeExam]);

  const stopVideo = useCallback(() => {
    setStream((prevStream) => {
      if (prevStream) prevStream.getTracks().forEach(track => track.stop());
      return null;
    });
  }, []);

  const submitExam = useCallback(async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      const submissionAnswers = questions.map((q) => {
        const ans = answers[q.id];
        if (q.question_type === 'mcq') {
          return { question_id: q.id, selected_index: ans !== undefined ? ans : null };
        } else {
          return { question_id: q.id, answer_text: ans || '' };
        }
      });
      const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: submissionAnswers }),
      });
      const data = await res.json() as any;
      if (!res.ok) { alert(data.error || 'Submit failed'); return; }
      setResult(data);
      stopVideo();
      fetchExams();
    } catch (error) {
      console.error(error);
      alert('Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeExam, questions, answers, stopVideo, fetchExams]);

  // ── Proctoring Hook ──
  const {
    warningCount,
    latestViolation,
    isFullscreen,
    requestFullscreen,
    clearLatestViolation,
  } = useProctoring({
    enabled: !!activeExam && !result,
    maxWarnings: MAX_WARNINGS,
    examId: activeExam?.id,
    onAutoSubmit: submitExam,
  });

  const startExam = async (examId: string) => {
    setIsExamLoading(true);
    setResult(null);
    setAnswers({});
    setTimeLeft(null);
    try {
      const res = await fetch(`/api/exams/${examId}`);
      const data = await res.json() as any;
      if (!res.ok) { alert(data.error || 'Exam load failed'); return; }
      setActiveExam(data.exam);
      setQuestions(data.questions || []);
      if (data.exam.duration_minutes > 0) setTimeLeft(data.exam.duration_minutes * 60);
      if (data.exam.require_video === 1 || data.exam.type === 'exam') {
        try {
          const mediaStream = await (navigator.mediaDevices?.getUserMedia
            ? navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            : Promise.reject(new Error('mediaDevices API not available')));
          setStream(mediaStream);
        } catch (err) {
          console.error("Camera access denied:", err);
          alert("This test requires camera access for monitoring. Please allow camera access and try again.");
          return;
        }
      }
      // Request fullscreen on exam start
      setTimeout(() => requestFullscreen(), 500);
    } catch (error) {
      console.error(error);
      alert('Exam load failed');
    } finally {
      setIsExamLoading(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!activeExam || timeLeft === null || timeLeft <= 0 || result) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam, timeLeft, result]);

  useEffect(() => {
    if (timeLeft === 0 && activeExam && !result && !isSubmitting) submitExam();
  }, [timeLeft, activeExam, result, isSubmitting, submitExam]);

  const closeExam = () => {
    stopVideo();
    setActiveExam(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setTimeLeft(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  const groupedExams = {
    quiz: exams.filter(e => e.type === 'quiz' || !e.type),
    exam: exams.filter(e => e.type === 'exam'),
    assignment: exams.filter(e => e.type === 'assignment')
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-white">परीक्षा एवं मूल्यांकन</h1>
        <p className="mt-2 text-sm text-neutral-400">Aapke quizzes, exams aur assignments yahan manage hote hain.</p>
      </div>

      {(['exam', 'quiz', 'assignment'] as const).map(type => (
        groupedExams[type].length > 0 && (
          <section key={type} className="space-y-4">
            <h2 className="text-xl font-black text-white capitalize flex items-center gap-2">
              <span className={`w-2 h-6 rounded-full ${type === 'exam' ? 'bg-red-500' : type === 'quiz' ? 'bg-orange-500' : 'bg-blue-500'}`} />
              {type === 'exam' ? 'Exams (Face Monitored)' : type === 'quiz' ? 'Quizzes' : 'Assignments'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedExams[type].map((exam) => {
                const now = new Date();
                const isLocked = exam.scheduled_at && new Date(exam.scheduled_at) > now;
                const isEnded = exam.end_at && new Date(exam.end_at) < now;
                return (
                  <div key={exam.id} className={`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 transition-opacity ${isLocked || isEnded ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-black text-white line-clamp-1">{exam.title}</h3>
                        <p className="text-xs text-neutral-400 mt-1">{exam.course_title}</p>
                      </div>
                      {exam.type === 'exam' ? <Video className="w-6 h-6 text-red-400" /> : <FileQuestion className="w-6 h-6 text-orange-400" />}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
                      {exam.duration_minutes > 0 && <span className="bg-neutral-800 text-neutral-400 px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} Min</span>}
                      {exam.require_video === 1 && <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded-md flex items-center gap-1"><Video className="w-3 h-3" /> Monitored</span>}
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md">{exam.question_count} Qs</span>
                    </div>
                    {exam.scheduled_at && (
                      <div className="text-[10px] text-neutral-500 space-y-0.5">
                        <p>Starts: {new Date(exam.scheduled_at).toLocaleString()}</p>
                        {exam.end_at && <p>Ends: {new Date(exam.end_at).toLocaleString()}</p>}
                      </div>
                    )}
                    {exam.latest_submitted_at && (
                      <div className={`rounded-2xl border p-3 text-[10px] ${exam.latest_passed === 1 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
                        Score: {exam.best_score || 0}% • {formatLocalDate(exam.latest_submitted_at)}
                      </div>
                    )}
                    <button
                      disabled={isLocked || isEnded}
                      onClick={() => startExam(exam.id)}
                      className={`w-full rounded-2xl py-3 font-black text-sm transition-all ${isLocked ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20'}`}
                    >
                      {isLocked ? 'Not Open Yet' : isEnded ? 'Exam Closed' : exam.latest_submitted_at ? 'Retake' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )
      ))}

      {activeExam && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex items-center justify-center p-0 md:p-4">
          {/* Proctoring Warning Modal */}
          <ProctoringWarningModal
            violation={latestViolation}
            warningCount={warningCount}
            maxWarnings={MAX_WARNINGS}
            onDismiss={clearLatestViolation}
          />

          <div className="w-full h-[100dvh] md:h-[90dvh] max-w-5xl bg-neutral-900 border-0 md:border border-neutral-800 rounded-none md:rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl">
            {/* Camera View */}
            {stream && (
              <div className="absolute top-24 right-4 md:top-6 md:right-6 w-24 h-32 md:w-32 md:h-48 bg-black rounded-2xl md:rounded-3xl overflow-hidden border-2 border-orange-500 shadow-2xl z-10 pointer-events-none">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-[8px] font-black text-white animate-pulse">
                  <div className="w-1 h-1 bg-white rounded-full" /> LIVE MONITORING
                </div>
              </div>
            )}

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur-md gap-2">
              <div className="pr-20 md:pr-0 min-w-0">
                <h2 className="text-lg md:text-xl font-black text-white truncate">{activeExam.title}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-neutral-500">{activeExam.course_title}</span>
                  {timeLeft !== null && (
                    <div className={`flex items-center gap-1.5 text-sm font-black px-3 py-1 rounded-full ${timeLeft < 60 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-neutral-800 text-neutral-300'}`}>
                      <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                    </div>
                  )}
                  {/* Warning Counter Badge */}
                  {warningCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      <AlertTriangle className="w-3 h-3" /> {warningCount}/{MAX_WARNINGS} Warnings
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Fullscreen Button */}
                {!isFullscreen && !result && (
                  <button
                    onClick={requestFullscreen}
                    className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition-all"
                    title="Enter Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                )}
                {!result && (
                  <button onClick={() => { if (confirm('Exit test? Progress will be lost.')) closeExam(); }} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs">
                    Quit
                  </button>
                )}
                {result && (
                  <button onClick={closeExam} className="px-6 py-2 rounded-xl bg-orange-600 text-white font-bold">
                    Back to Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              {isExamLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                  <p className="text-neutral-500 animate-pulse">Preparing your test environment...</p>
                </div>
              ) : result ? (
                <div className="max-w-2xl mx-auto py-10 space-y-6">
                  <div className={`rounded-[2.5rem] border p-12 text-center shadow-2xl ${result.passed === 1 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    {result.passed === 1
                      ? <Trophy className="w-20 h-20 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
                      : <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6 opacity-50" />}
                    <h3 className="text-4xl font-black text-white mb-2">{result.passed === 1 ? 'उत्तीर्ण!' : 'प्रयास करें'}</h3>
                    <p className="text-neutral-400 text-lg mb-8">{result.passed === 1 ? 'Congratulations on passing the assessment.' : "You didn't reach the passing score this time."}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800"><div className="text-3xl font-black text-white">{result.score_percent}%</div><div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Score</div></div>
                      <div className="bg-neutral-950 p-6 rounded-3xl border border-neutral-800"><div className="text-3xl font-black text-white">{result.score}/{result.total_marks}</div><div className="text-xs text-neutral-500 uppercase tracking-widest mt-1">Marks</div></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl space-y-10 pb-20">
                  {questions.map((question, index) => {
                    let options: string[] = [];
                    try { options = JSON.parse(question.options_json || '[]'); } catch (_) {}
                    return (
                      <div key={question.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-start gap-4">
                          <span className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400 shrink-0">{index + 1}</span>
                          <div className="flex-1 pt-1">
                            <h3 className="text-lg font-bold text-white leading-relaxed">{question.question_text}</h3>
                            <span className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest mt-2 block">{question.marks} MARKS</span>
                          </div>
                        </div>
                        {question.question_type === 'mcq' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                            {options.map((option: string, optionIndex: number) => (
                              <button
                                key={optionIndex}
                                onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })}
                                className={`text-left rounded-2xl border px-6 py-4 text-sm transition-all duration-300 transform active:scale-[0.98] ${answers[question.id] === optionIndex ? 'border-orange-500 bg-orange-500/10 text-white ring-2 ring-orange-500/20' : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800'}`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="pl-12">
                            <textarea
                              placeholder="Type your answer here..."
                              value={answers[question.id] || ''}
                              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                              className="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-white outline-none focus:border-orange-500 transition-colors resize-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Bar */}
            {!result && !isExamLoading && (
              <div className="p-6 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
                <button
                  disabled={isSubmitting}
                  onClick={() => {
                    const unanswered = questions.filter(q => answers[q.id] === undefined || (q.question_type === 'text' && !String(answers[q.id]).trim()));
                    if (unanswered.length > 0) {
                      if (!confirm(`${unanswered.length} questions are still empty. Submit anyway?`)) return;
                    } else {
                      if (!confirm('Are you sure you want to submit?')) return;
                    }
                    submitExam();
                  }}
                  className="w-full max-w-md mx-auto rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-4 font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-600/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Submit Assessment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
