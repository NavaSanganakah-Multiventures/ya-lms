'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, ArrowLeft, Video, FileText, MonitorPlay, Image as ImageIcon, Upload, Loader2, Link as LinkIcon, Edit3 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LiveClassWindow from '../../components/LiveClassWindow';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

function AdminCourseDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [activeLiveSession, setActiveLiveSession] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingLive, setEditingLive] = useState<any>(null);
  const [formData, setFormData] = useState({ chapter_title: 'General', title: '', type: 'video', content_url: '', text_content: '', order_index: 0 });
  const [liveData, setLiveData] = useState({ title: '', start_time: '', rtc_room_id: '', batch_id: '', status: 'scheduled' });
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const cRes = await fetch(`/api/courses/${id}`);
      if (cRes.ok) {
        const data = await cRes.json() as any;
        setCourse(data.course);
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
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData
      });

      if (res.ok) {
        const data = await res.json() as any;
        setFormData(prev => ({ ...prev, content_url: data.url }));
      } else {
        alert('File upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingLesson 
        ? `/api/admin/courses/${id}/lessons/${editingLesson.id}`
        : `/api/admin/courses/${id}/lessons`;
      const method = editingLesson ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          order_index: parseInt(formData.order_index.toString()) || 0
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert("Failed to save lesson");
      }
    } catch (err) {
      console.error(err);
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

  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingLive 
        ? `/api/admin/live/${editingLive.id}`
        : `/api/admin/courses/${id}/live`;
      const method = editingLive ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liveData)
      });

      if (res.ok) {
        setShowLiveModal(false);
        fetchData();
      } else {
        alert("Failed to save live session");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (lesson?: any) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        chapter_title: lesson.chapter_title,
        title: lesson.title,
        type: lesson.type,
        content_url: lesson.content_url || '',
        text_content: lesson.text_content || '',
        order_index: lesson.order_index
      });
    } else {
      setEditingLesson(null);
      setFormData({ chapter_title: 'General', title: '', type: 'video', content_url: '', text_content: '', order_index: lessons.length * 10 });
    }
    setShowModal(true);
  };

  const openLiveModal = (session?: any) => {
    if (session) {
      setEditingLive(session);
      setLiveData({
        title: session.title || '',
        start_time: session.start_time.split('.')[0], // Format for datetime-local
        rtc_room_id: session.rtc_room_id,
        batch_id: session.batch_id || '',
        status: session.status
      });
    } else {
      setEditingLive(null);
      setLiveData({ title: '', start_time: '', rtc_room_id: `room-${Math.random().toString(36).substr(2, 9)}`, batch_id: '', status: 'scheduled' });
    }
    setShowLiveModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-indigo-400" />;
      case 'recording': return <MonitorPlay className="w-4 h-4 text-purple-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
      case 'live': return <MonitorPlay className="w-4 h-4 text-green-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'article': return <Edit3 className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Group by chapters
  const chapters = lessons.reduce((acc: any, lesson) => {
    const chap = lesson.chapter_title || 'General';
    if (!acc[chap]) acc[chap] = [];
    acc[chap].push(lesson);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-neutral-400">पाठ्यक्रम विवरण लोड हो रहा है...</div>;
  if (!course) return <div className="p-8 text-neutral-400">पाठ्यक्रम नहीं मिला।</div>;

  if (!id) return <div className="p-8 text-neutral-400">पाठ्यक्रम लोड हो रहा है...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses" className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-neutral-400 text-sm">पाठ्यक्रम संरचना प्रबंधन</p>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <h2 className="text-xl font-semibold">कोर्स की सामग्री</h2>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
                <div key={lesson.id} className="flex items-center justify-between p-4 px-6 hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-neutral-800 p-2 rounded-lg">
                      {getTypeIcon(lesson.type)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-200">{lesson.title}</p>
                      <p className="text-xs text-neutral-500">{lesson.type.toUpperCase()} • Index: {lesson.order_index}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openModal(lesson)} className="p-2 text-neutral-400 hover:text-indigo-400 transition-colors">
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
            <h2 className="text-xl font-semibold">लाइव सेशन (Cloudflare Calls)</h2>
            <p className="text-neutral-500 text-sm mt-1">शेड्यूल और रियल-टाइम क्लास मैनेजमेंट</p>
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
                      <button onClick={() => openLiveModal(session)} className="p-2 text-neutral-500 hover:text-indigo-400 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteLive(session.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Room: {session.rtc_room_id}</h4>
                  <p className="text-neutral-400 text-sm mb-4">समय: {new Date(session.start_time).toLocaleString('hi-IN')}</p>
                </div>
                <div className="pt-4 border-t border-neutral-800 flex justify-between items-center">
                   <span className="text-[10px] font-mono text-neutral-500 uppercase">RTC ID: {session.rtc_room_id}</span>
                   {session.status === 'live' ? (
                     <button 
                       onClick={() => setActiveLiveSession(session)}
                       className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                     >
                       <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                       लाइव क्लास में शामिल हों
                     </button>
                   ) : session.status === 'scheduled' && (
                     <button 
                       onClick={async () => {
                         await fetch(`/api/admin/live/${session.id}`, {
                           method: 'PUT',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ ...session, status: 'live' })
                         });
                         fetchData();
                         setActiveLiveSession(session);
                       }}
                       className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                     >
                       क्लास शुरू करें
                     </button>
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">अध्याय / अनुभाग शीर्षक</label>
                <input required type="text" value={formData.chapter_title} onChange={e => setFormData({...formData, chapter_title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">विषय शीर्षक</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">सामग्री का प्रकार (Content Type)</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white">
                    <option value="video">वीडियो लेक्चर (Pre-recorded)</option>
                    <option value="recording">क्लास रिकॉर्डिंग (Class Recording)</option>
                    <option value="pdf">दस्तावेज़ (PDF Document)</option>
                    <option value="image">चित्र (Image)</option>
                    <option value="live">लाइव क्लास रूम ID</option>
                    <option value="article">रिच टेक्स्ट (Rich Text Article)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">क्रम अनुक्रमणिका (Order Index)</label>
                  <input required type="number" value={formData.order_index} onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
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
                           className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all" 
                         />
                         <LinkIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                       </div>
                       <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${uploading ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/20'}`}>
                         {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                         <span>{uploading ? 'अपलोडिंग...' : 'अपलोड'}</span>
                         <input 
                           type="file" 
                           className="hidden" 
                           onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
                           disabled={uploading}
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
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">रद्द करें</button>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${uploading ? 'bg-neutral-800 cursor-not-allowed text-neutral-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {uploading ? 'अपलोड हो रहा है...' : 'विषय सहेजें'}
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
            <form onSubmit={handleLiveSubmit} className="p-6 space-y-4">
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
                <label className="block text-sm font-medium text-neutral-400 mb-1">शुरुआत का समय (Start time)</label>
                <input required type="datetime-local" value={liveData.start_time} onChange={e => setLiveData({...liveData, start_time: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Cloudflare Calls Room ID</label>
                <input required type="text" value={liveData.rtc_room_id} onChange={e => setLiveData({...liveData, rtc_room_id: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white font-mono" />
                <p className="text-[10px] text-neutral-500 mt-1 uppercase">यह ID एक यूनिक टनल बनाती है real-time kit के लिए।</p>
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
                <button type="button" onClick={() => setShowLiveModal(false)} className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors">रद्द करें</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
                  {editingLive ? 'अपडेट करें' : 'शेड्यूल करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeLiveSession && (
        <LiveClassWindow 
          roomId={activeLiveSession.rtc_room_id} 
          sessionId={activeLiveSession.id}
          isAdmin={true}
          onClose={() => setActiveLiveSession(null)} 
        />
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
