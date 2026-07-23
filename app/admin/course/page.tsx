'use client';

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, ArrowLeft, Video, FileText, MonitorPlay, Image as ImageIcon, Upload, Loader2, Link as LinkIcon, Edit3, CheckCircle, BookOpen, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import 'react-quill-new/dist/quill.snow.css';
import { useBackgroundUpload } from '@/components/BackgroundUploadManager';
import { formatLocalTime, utcToLocalInput, toUTCForDB, getTimezoneLabel, getUserTimezone } from '@/lib/time';
import { useToast } from '@/contexts/ToastContext';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

function AdminCourseDetailsContent() {
  const { success: showSuccess, error: showError } = useToast();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookToAdd, setSelectedBookToAdd] = useState("");
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingLive, setIsSubmittingLive] = useState(false);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const { startSession } = useLiveSession();
  const [processingRecording, setProcessingRecording] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingLive, setEditingLive] = useState<any>(null);
  const [formData, setFormData] = useState({ book_id: '', chapter_title: 'General', title: '', type: 'video', content_url: '', text_content: '', order_index: 0, is_free: 0, exam_id: '' });
  const [liveData, setLiveData] = useState({ title: '', start_time: '', rtc_room_id: '', batch_id: '', book_id: '', status: 'scheduled', is_free: 0 });
  const [error, setError] = useState('');
  const { addUploadTask } = useBackgroundUpload();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [isCreatingNewBook, setIsCreatingNewBook] = useState(false);
  const [isCreatingBook, setIsCreatingBook] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const cRes = await fetch(`/api/courses/${id}`);
      if (!cRes.ok) throw new Error('Load failed');
      const data = await cRes.json() as any;
      setCourse(data.course);


      const bRes = await fetch(`/api/admin/courses/${id}/books`);
      if (bRes.ok) {
        const data = await bRes.json() as { books: any[] };
        setBooks(data.books || []);
      }

      const allBRes = await fetch(`/api/admin/books`);
      if (allBRes.ok) {
        const data = await allBRes.json() as { books: any[] };
        setAllBooks(data.books || []);
      }

      const lRes = await fetch(`/api/courses/${id}/lessons`);
      if (lRes.ok) {
        const data = await lRes.json() as any;
        setLessons(data.lessons || []);
      }
      const liveRes = await fetch(`/api/courses/${id}/live`);
      if (liveRes.ok) {
        const data = await liveRes.json() as any;
        setLiveSessions(data.sessions || []);
      }
      const batchRes = await fetch('/api/admin/batches');
      if (batchRes.ok) {
        const data = await batchRes.json() as any;
        setBatches((data.batches || []).filter((b: any) => b.course_id === id));
      }
      const examsRes = await fetch('/api/admin/exams');
      if (examsRes.ok) {
        const data = await examsRes.json() as any;
        setExams((data.exams || []).filter((e: any) => e.course_id === id));
      }
    } catch (err: any) {
      console.error('Error fetching course details:', err);
      setError(err.message || 'लोड विफल रहा (Load failed). कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLiveSession = useMemo(() => liveSessions.some(s => s.status === 'live'), [liveSessions]);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) fetchData();
  }, [id, fetchData]);

  // Poll live session data every 12 seconds when at least one session is live
  useEffect(() => {
    if (!hasLiveSession) return;
    const interval = setInterval(async () => {
      if (isFetchingRef.current) return; // skip if a fetch is already running
      try {
        isFetchingRef.current = true;
        await fetchData(); // wait for fresh data
        setLastUpdated(new Date());
      } finally {
        isFetchingRef.current = false;
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [hasLiveSession, fetchData]);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setPendingFile(file);
    setFormData(prev => ({ ...prev, content_url: `[Uploading in background: ${file.name}]` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLesson) return;
    if (!id) {
      showError("Error: Course ID is missing. Please refresh the page.");
      return;
    }

    setIsSubmittingLesson(true);
    try {
      let effectiveBookId = selectedBookId;

      // Step 1: If creating a new book, create it and link to course
      if (isCreatingNewBook) {
        if (!newBookTitle.trim()) {
          showError("कृपया नई पुस्तक का शीर्षक दर्ज करें।");
          setIsSubmittingLesson(false);
          return;
        }
        setIsCreatingBook(true);
        const bookRes = await fetch('/api/admin/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newBookTitle.trim() })
        });
        if (!bookRes.ok) {
          const err = await bookRes.json() as any;
          showError(`पुस्तक बनाने में त्रुटि: ${err.error || 'Unknown error'}`);
          setIsSubmittingLesson(false);
          return;
        }
        const bookData = await bookRes.json() as any;
        effectiveBookId = bookData.id;
        await fetch(`/api/admin/courses/${id}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book_id: effectiveBookId, order_index: books.length })
        });
        setIsCreatingBook(false);
      }

      if (!effectiveBookId) {
        showError("कृपया एक पुस्तक चुनें या नई पुस्तक बनाएँ।");
        setIsSubmittingLesson(false);
        return;
      }

      // Step 2: Save lesson under the selected/new book
      const url = editingLesson 
        ? `/api/admin/courses/${id}/lessons/${editingLesson.id}`
        : `/api/admin/courses/${id}/lessons`;
      const method = editingLesson ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          content_url: pendingFile ? '' : formData.content_url,
          book_id: effectiveBookId,
          order_index: parseInt(formData.order_index.toString()) || 0,
          is_free: formData.is_free || 0
        })
      });

      if (res.ok) {
        const responseData = await res.json() as any;
        const savedLessonId = editingLesson ? editingLesson.id : responseData.id;
        
        if (pendingFile && savedLessonId && effectiveBookId) {
          addUploadTask(pendingFile, effectiveBookId, savedLessonId, 'book');
        }

        setShowModal(false);
        setPendingFile(null);
        setSelectedBookId('');
        setNewBookTitle('');
        setIsCreatingNewBook(false);
        fetchData();
      } else {
        const errData = await res.json() as any;
        showError(`Failed to save lesson: ${errData.error || 'Unknown Error'}`);
      }
    } catch (err: any) {
      showError(`Network Error: ${err.message}`);
    } finally {
      setIsSubmittingLesson(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("क्या आप सुनिश्चित हैं कि आप इसे हटाना चाहते हैं?")) return;
    try {
      await fetch(`/api/admin/courses/${id}/lessons/${lessonId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {}
  };

  const handleDeleteLive = async (sessionId: string) => {
    if (!confirm("क्या आप इस लाइव सेशन को हटाना चाहते हैं?")) return;
    try {
      await fetch(`/api/admin/live/${sessionId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {}
  };


  const handleProcessRecording = async (sessionId: string) => {
    setProcessingRecording(sessionId);
    try {
      const res = await fetch(`/api/admin/live/${sessionId}/process-recording`, {
        method: 'POST'
      });
      if (res.ok) {
        showSuccess("Recording processing triggered successfully.");
        fetchData();
      } else {
        const err = await res.json() as any;
        showError(`Failed: ${err.error}`);
      }
    } catch (e) {
      showError("Error triggering recording processing.");
    } finally {
      setProcessingRecording(null);
    }
  };

  const handleDownloadRecording = async (sessionId: string) => {
    try {
      // Session auth is handled automatically by the browser via the HttpOnly cookie;
      // no manual token header is needed.
      const res = await fetch(`/api/admin/live/${sessionId}/download-recording`);
      if (res.ok) {
         const blob = await res.blob();
         const url = window.URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.style.display = 'none';
         a.href = url;
         a.download = `recording_${sessionId}.mp4`;
         document.body.appendChild(a);
         a.click();
         window.URL.revokeObjectURL(url);
      } else {
         const err = await res.json() as any;
         showError(`Failed to download: ${err.error}`);
      }
    } catch (e) {
      showError("Error triggering download.");
    }
  };

  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLive) return;
    setIsSubmittingLive(true);
    try {
      const url = editingLive 
        ? `/api/admin/live/${editingLive.id}`
        : `/api/admin/courses/${id}/live`;
      const method = editingLive ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        // Convert start_time from local timezone to UTC before storing
        body: JSON.stringify({ ...liveData, start_time: toUTCForDB(liveData.start_time) })
      });

      if (res.ok) {
        setShowLiveModal(false);
        fetchData();
      } else {
        showError("Failed to save live session");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingLive(false);
    }
  }

  const handleLinkBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookToAdd) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: selectedBookToAdd, order_index: books.length })
      });
      if (res.ok) {
        setIsBookModalOpen(false);
        setSelectedBookToAdd("");
        fetchData();
      } else {
        const err = await res.json() as any;
        showError(`Failed to link book: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showError(`Error linking book: ${err.message}`);
    }
  };

  const handleUnlinkBook = async (bookId: string) => {
    if (!confirm("क्या आप इस पुस्तक को इस कोर्स से हटाना चाहते हैं? (पुस्तक डिलीट नहीं होगी, केवल कोर्स से अनलिंक होगी)")) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}/books/${bookId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json() as any;
        showError(`Failed to unlink book: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      showError(`Error unlinking book: ${err.message}`);
    }
  };

  const openModal = (lesson?: any) => {
    setEditingLesson(lesson || null);
    const defaultBookId = books.length === 1 ? books[0].id : (lesson?.book_id || '');
    setSelectedBookId(lesson ? lesson.book_id || '' : defaultBookId);
    setNewBookTitle('');
    setIsCreatingNewBook(false);
    setFormData({
      book_id: lesson ? lesson.book_id || '' : '',
      chapter_title: lesson ? lesson.chapter_title : 'General',
      title: lesson ? lesson.title : '',
      type: lesson ? lesson.type : 'video',
      content_url: lesson ? lesson.content_url || '' : '',
      text_content: lesson ? lesson.text_content || '' : '',
      order_index: lesson ? lesson.order_index : lessons.length * 10,
      is_free: lesson ? (lesson.is_free || 0) : 0,
      exam_id: lesson ? (lesson.exam_id || '') : ''
    });
    setShowModal(true);
  };

  const openLiveModal = (session?: any) => {
    if (session) {
      setEditingLive(session);
      setLiveData({
        title: session.title || '',
        start_time: utcToLocalInput(session.start_time), // Convert UTC from DB to local time for input
        rtc_room_id: session.rtc_room_id,
        batch_id: session.batch_id || '',
        book_id: session.book_id || '',
        status: session.status,
        is_free: session.is_free || 0
      });
    } else {
      setEditingLive(null);
      setLiveData({ title: '', start_time: '', rtc_room_id: '', batch_id: '', book_id: '', status: 'scheduled', is_free: 0 });
    }
    setShowLiveModal(true);
  };

  const renderLessonIcon = (type: string, isFree: number) => {
    const iconClass = `w-5 h-5 ${isFree === 1 ? 'text-emerald-400' : 'text-amber-400'}`;
    switch (type) {
      case 'video': return <Video className={iconClass} />;
      case 'recording': return <MonitorPlay className={iconClass} />;
      case 'pdf': return <FileText className={iconClass} />;
      case 'live': return <MonitorPlay className={iconClass} />;
      case 'image': return <ImageIcon className={iconClass} />;
      case 'article': return <Edit3 className={iconClass} />;
      default: return <FileText className={iconClass} />;
    }
  };

  // Group by chapters
  const chapters = useMemo(() => {
    return lessons.reduce((acc: any, lesson) => {
      const chap = lesson.chapter_title || 'General';
      if (!acc[chap]) acc[chap] = [];
      acc[chap].push(lesson);
      return acc;
    }, {});
  }, [lessons]);

  if (loading) return <div className="p-8 text-neutral-400">पाठ्यक्रम विवरण लोड हो रहा है...</div>;
  if (error) return <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl m-8">{error}</div>;
  if (!course) return <div className="p-8 text-neutral-400">पाठ्यक्रम नहीं मिला।</div>;

  if (!id) return <div className="p-8 text-neutral-400">पाठ्यक्रम लोड हो रहा है...</div>;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-6 bg-neutral-900/50 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
        <Link href="/admin/courses" className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl text-neutral-400 transition-all shadow-lg active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">{course.title}</h1>
            <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-[10px] font-mono font-bold rounded-lg border border-orange-500/20">
              ID: {course.id}
            </span>
          </div>
          <p className="text-neutral-500 text-sm mt-1 font-medium italic">शिक्षक: {course.teacher_email || 'Staff'}</p>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <h2 className="text-xl font-semibold">कोर्स की सामग्री</h2>
        <button 
          onClick={() => openModal()}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> विषय जोड़ें
        </button>
      </div>

      {Object.keys(chapters).length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
          अभी तक कोई पाठ नहीं जोड़ा गया है। एक विषय जोड़कर प्रारंभ करें।
        </div>
      ) : (
        Object.keys(chapters).map((chapterTitle) => (
          <div key={chapterTitle} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="bg-neutral-800/50 px-6 py-4 border-b border-neutral-800">
              <h3 className="font-medium text-white">अध्याय: {chapterTitle}</h3>
            </div>
            <div className="divide-y divide-neutral-800">
              {chapters[chapterTitle].sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any) => (
                <div key={lesson.id} className="flex items-center justify-between p-5 px-6 hover:bg-neutral-800/40 transition-all border-b border-neutral-800 last:border-0 group">
                  <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-2xl border shadow-inner transition-colors ${lesson.is_free === 1 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      {renderLessonIcon(lesson.type, lesson.is_free)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-white tracking-tight text-lg">{lesson.title}</p>
                        {lesson.is_free === 1 ? (
                          <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">FREE PREVIEW</span>
                        ) : (
                          <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/20">PREMIUM</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          {lesson.type}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
                          {lesson.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(lesson)} className="p-2 text-neutral-400 hover:text-orange-400 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(lesson.id)} className="p-2 text-neutral-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="pt-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-3">लाइव सेशन (Cloudflare Calls)
              {hasLiveSession && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-neutral-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Auto-refreshing
                </span>
              )}
            </h2>
            <p className="text-neutral-500 text-sm mt-1">शेड्यूल और रियल-टाइम क्लास मैनेजमेंट</p>
            {lastUpdated && (
              <p className="text-[10px] text-neutral-600 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button 
            onClick={() => openLiveModal()}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <MonitorPlay className="w-4 h-4" /> लाइव क्लास शेड्यूल करें
          </button>
        </div>

        {liveSessions.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
            कोई लाइव सेशन शेड्यूल नहीं किया गया है।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveSessions.map((session: any) => (
              <div key={session.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${session.status === 'live' ? 'bg-red-500 text-white animate-pulse' : session.status === 'ended' ? 'bg-neutral-800 text-neutral-500' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                      {session.status}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openLiveModal(session)} className="p-2 text-neutral-500 hover:text-orange-400 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteLive(session.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Room: {session.rtc_room_id}</h4>
                  <p className="text-neutral-400 text-sm mb-1">समय: {formatLocalTime(session.start_time)}</p>
                  <div className="flex items-center gap-3">
                    {session.status === 'live' && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {session.active_student_count ?? 0} Students
                      </span>
                    )}
                    {session.is_free === 1 && (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Free Demo</span>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
                   <span className="text-[10px] font-mono text-neutral-500 uppercase">RTC ID: {session.rtc_room_id}</span>
                   {session.status === 'live' ? (
                     <button 
                       onClick={() => startSession(session.rtc_room_id, session.id, true)}
                       className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                     >
                       <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                       लाइव क्लास में शामिल हों
                     </button>
                   ) : session.status === 'scheduled' ? (
                     <button 
                       onClick={async () => {
                         await fetch(`/api/admin/live/${session.id}`, {
                           method: 'PUT',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ ...session, status: 'live' })
                         });
                         fetchData();
                           startSession(session.rtc_room_id, session.id, true);
                       }}
                       className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                     >
                       क्लास शुरू करें
                     </button>
                   ) : session.status === 'ended' && session.recording_status === 'pending' ? (
                     <button
                       onClick={() => handleProcessRecording(session.id)}
                       disabled={processingRecording === session.id}
                       className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                     >
                       {processingRecording === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MonitorPlay className="w-3 h-3" />}
                       {processingRecording === session.id ? 'Processing...' : 'Fetch Recording Info'}
                     </button>
                   ) : session.status === 'ended' && session.recording_status === 'success' && (
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                         <CheckCircle className="w-3 h-3" /> READY
                       </span>
                       <button
                         onClick={() => handleDownloadRecording(session.id)}
                         className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                       >
                         <MonitorPlay className="w-3 h-3" /> Download Recording
                       </button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl w-full ${formData.type === 'article' ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden shadow-2xl transition-all duration-300`}>
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold">{editingLesson ? 'विषय संपादित करें' : 'नया विषय जोड़ें'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Book Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">पुस्तक चुनें (Select Book)</label>
                {isCreatingNewBook ? (
                  <div className="space-y-2">
                    <input
                      required
                      type="text"
                      placeholder="नई पुस्तक का शीर्षक"
                      value={newBookTitle}
                      onChange={e => setNewBookTitle(e.target.value)}
                      className="w-full bg-neutral-950 border border-orange-500/50 rounded-lg px-4 py-2.5 text-white"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setIsCreatingNewBook(false); setNewBookTitle(''); }} className="text-xs text-neutral-400 hover:text-white transition-colors">
                        वापस जाएँ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      required={!isCreatingNewBook && !selectedBookId}
                      value={selectedBookId}
                      onChange={e => setSelectedBookId(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white"
                    >
                      <option value="">-- पुस्तक चुनें --</option>
                      {books.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBook(true)}
                      className="px-3 py-2 text-xs font-medium text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-600/10 transition-colors whitespace-nowrap"
                    >
                      + नई पुस्तक
                    </button>
                  </div>
                )}
                {books.length === 0 && !isCreatingNewBook && (
                  <p className="text-[10px] text-amber-500 mt-1">कोई पुस्तक लिंक नहीं है। कृपया पहले कोई पुस्तक लिंक करें या नई पुस्तक बनाएँ।</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">अध्याय / अनुभाग शीर्षक</label>
                <input required type="text" value={formData.chapter_title} onChange={e => setFormData({...formData, chapter_title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">विषय शीर्षक</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">प्रकार</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white">
                    <option value="video">वीडियो</option>
                    <option value="recording">रिकॉर्डिंग</option>
                    <option value="pdf">PDF</option>
                    <option value="image">चित्र</option>
                    <option value="live">लाइव</option>
                    <option value="article">लेख</option>
                    <option value="quiz">क्विज़ (Quiz)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">क्रम (Index)</label>
                  <input required type="number" value={formData.order_index} onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
                </div>
                <div className="flex flex-col justify-end pb-1">
                   <label className="flex items-center gap-3 cursor-pointer group bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg hover:border-orange-500/50 transition-all">
                      <input 
                        type="checkbox" 
                        checked={formData.is_free === 1}
                        onChange={(e) => setFormData({ ...formData, is_free: e.target.checked ? 1 : 0 })}
                        className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white uppercase tracking-wider">Free Demo</span>
                   </label>
                </div>
              </div>
              {formData.type === 'article' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">लेख सामग्री (Article Content)</label>
                  <div className="bg-white text-black rounded-lg overflow-hidden pb-10">
                    <ReactQuill 
                      theme="snow" 
                      value={formData.text_content} 
                      onChange={(val) => setFormData({...formData, text_content: val})} 
                      style={{ height: '300px' }}
                    />
                  </div>
                </div>
              ) : formData.type === 'quiz' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">क्विज़ का चयन करें (Select Quiz)</label>
                  <select 
                    value={formData.exam_id} 
                    onChange={e => setFormData({...formData, exam_id: e.target.value})} 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white"
                  >
                    <option value="">-- क्विज़ चुनें --</option>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>{exam.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">सामग्री का चयन / अपलोड (Media Selection)</label>
                  <div className="space-y-3">
                     <div className="flex gap-2">
                       <div className="flex-1 relative">
                         <input 
                           type="text" 
                           placeholder="URL यहाँ डालें या फाइल अपलोड करें" 
                           value={formData.content_url} 
                           onChange={e => setFormData({...formData, content_url: e.target.value})} 
                           className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 transition-all"
                         />
                         <LinkIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                       </div>
                       <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all bg-orange-600/10 text-orange-400 border border-orange-500/30 hover:bg-orange-600/20">
                         <Upload className="w-4 h-4" />
                         <span>अपलोड (Background)</span>
                         <input 
                           type="file" 
                           className="hidden" 
                           onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
                         />
                       </label>
                     </div>
                     {formData.content_url && (
                       <div className="text-[10px] font-mono text-green-500 flex items-center gap-1 bg-green-500/5 px-2 py-1 rounded border border-green-500/20 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          तैयार: {formData.content_url.split('/').pop()}
                       </div>
                     )}
                  </div>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                <button type="button" onClick={() => { setShowModal(false); setPendingFile(null); setSelectedBookId(''); setNewBookTitle(''); setIsCreatingNewBook(false); }} disabled={isSubmittingLesson || isCreatingBook} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-50">रद्द करें</button>
                <button 
                  type="submit" 
                  disabled={isSubmittingLesson || isCreatingBook}
                  className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 flex items-center justify-center min-w-[120px] gap-2"
                >
                  {isSubmittingLesson || isCreatingBook ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      {isCreatingBook ? 'पुस्तक बन रही है...' : 'सहेज रहे हैं...'}
                    </>
                  ) : (
                    'विषय सहेजें'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLiveModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold">{editingLive ? 'लाइव क्लास एडिट करें' : 'नई लाइव क्लास शेड्यूल करें'}</h3>
            </div>
            <form onSubmit={handleLiveSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">सेशन का नाम (Session Title)</label>
                <input required type="text" value={liveData.title} onChange={e => setLiveData({...liveData, title: e.target.value})} placeholder="जैसे: प्राणायाम परिचय" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">बैच (Select Batch)</label>
                <select value={liveData.batch_id} onChange={e => setLiveData({...liveData, batch_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white">
                  <option value="">सभी बैच के लिए (All Batches)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">बुक (Select Book)</label>
                <select value={liveData.book_id} onChange={e => setLiveData({...liveData, book_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white">
                  <option value="">बुक चुनें (Optional)</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  शुरुआत का समय (Start time) — <span className="text-orange-400 text-xs font-mono">{getTimezoneLabel(getUserTimezone())}</span>
                </label>
                <input required type="datetime-local" value={liveData.start_time} onChange={e => setLiveData({...liveData, start_time: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
                <p className="text-[10px] text-neutral-500 mt-1">आपके timezone में समय दर्ज करें — save होने पर UTC में convert होगा।</p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer group bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg hover:border-orange-500/50 transition-all w-fit">
                   <input
                     type="checkbox"
                     checked={liveData.is_free === 1}
                     onChange={(e) => setLiveData({ ...liveData, is_free: e.target.checked ? 1 : 0 })}
                     className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-orange-600 focus:ring-orange-500"
                   />
                   <span className="text-xs font-bold text-neutral-300 group-hover:text-white uppercase tracking-wider">Free Demo Live Class</span>
                </label>
              </div>
              {editingLive && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">स्थिति (Status)</label>
                  <select value={liveData.status} onChange={e => setLiveData({...liveData, status: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white">
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live Now</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                <button type="button" onClick={() => setShowLiveModal(false)} disabled={isSubmittingLive} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-50">रद्द करें</button>
                <button type="submit" disabled={isSubmittingLive} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[120px] gap-2 disabled:bg-orange-600/50">
                  {isSubmittingLive ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      प्रोसेसिंग...
                    </>
                  ) : editingLive ? 'अपडेट करें' : 'शेड्यूल करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Linked Books Section ── */}
      <div className="pt-10 border-t border-neutral-800">
        <div className="flex justify-between items-end mb-6">
          <div>
             <h2 className="text-xl font-semibold flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-orange-500" />
               संबंधित पुस्तकें (Linked Books)
             </h2>
             <p className="text-neutral-500 text-sm mt-1">इस कोर्स से जुड़ी लाइब्रेरी पुस्तकें। इन पुस्तकों के सभी पाठ इस कोर्स के पाठ्यक्रम में शामिल हो जाएंगे।</p>
          </div>
          <button 
            onClick={() => setIsBookModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> पुस्तक लिंक करें
          </button>
        </div>

        {books.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">
            कोई पुस्तक इस कोर्स से नहीं जुड़ी है।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book: any) => (
              <div key={book.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex justify-between items-center group hover:border-orange-500/30 transition-all shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{book.title}</h4>
                    <p className="text-neutral-500 text-xs line-clamp-1">{book.description || 'कोई विवरण नहीं।'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Link 
                        href={`/admin/books/bookid?bookId=${book.id}`}
                        className="text-[10px] font-black text-orange-400 uppercase tracking-widest hover:text-orange-300 transition-colors"
                      >
                        पाठ प्रबंधित करें (Manage Lessons) &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnlinkBook(book.id)}
                  className="text-neutral-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-xl transition-all"
                  title="पुस्तक अनलिंक करें"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Link Book Modal ── */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold">पुस्तक लिंक करें (Link Library Book)</h3>
            </div>
            <form onSubmit={handleLinkBook} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">पुस्तक का चयन करें</label>
                <select 
                  required 
                  value={selectedBookToAdd} 
                  onChange={e => setSelectedBookToAdd(e.target.value)} 
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white"
                >
                  <option value="">-- पुस्तक चुनें (Select Book) --</option>
                  {allBooks
                    .filter((b: any) => !books.some((linkedBook: any) => linkedBook.id === b.id))
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))
                  }
                </select>
                {allBooks.filter((b: any) => !books.some((linkedBook: any) => linkedBook.id === b.id)).length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">सभी उपलब्ध पुस्तकें पहले से ही लिंक हैं, या कोई पुस्तक उपलब्ध नहीं है।</p>
                )}
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                <button type="button" onClick={() => { setIsBookModalOpen(false); setSelectedBookToAdd(""); }} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">रद्द करें</button>
                <button 
                  type="submit" 
                  disabled={!selectedBookToAdd}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:bg-neutral-800"
                >
                  लिंक करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminCourseDetails() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400 animate-pulse">संपादक लोड हो रहा है...</div>}>
      <AdminCourseDetailsContent />
    </Suspense>
  );
}
