"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { BookOpen, ArrowLeft, Plus, Video, FileText, Headphones, Image as ImageIcon, Trash2, Pencil, X, Loader2, Upload, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { useBackgroundUpload } from '@/components/BackgroundUploadManager';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

export const runtime = 'edge';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Lesson {
  id: string;
  title: string;
  type: string;
  content_url: string | null;
  chapter_title: string | null;
  text_content: string | null;
}

function BookLessonsContent() {
  const { bookid: bookId } = useParams() as { bookid: string };
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "", order_index: 0, is_free: 0 });
  const [bookTitle, setBookTitle] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();
  
  const { addUploadTask } = useBackgroundUpload();
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    setPendingFile(file);
    setFormData(prev => ({ ...prev, content_url: `[Uploading in background: ${file.name}]` }));
  };

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true);
      const [lessonsRes, bookRes] = await Promise.all([
        fetch(`/api/admin/books/${bookId}/lessons`),
        fetch(`/api/admin/books/${bookId}`),
      ]);
      const lessonsData = await lessonsRes.json() as { lessons: Lesson[] };
      setLessons(lessonsData.lessons || []);
      if (bookRes.ok) {
        const bookData = await bookRes.json() as { book?: any };
        if (bookData.book?.title) setBookTitle(bookData.book.title);
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
      showError("Error loading lessons and book info.");
    } finally {
      setLoading(false);
    }
  }, [bookId, showError]);

  useEffect(() => {
    if (bookId) {
      const timer = setTimeout(() => {
        fetchLessons();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [bookId, fetchLessons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showError("Title is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingLesson
        ? `/api/admin/books/${bookId}/lessons/${editingLesson.id}`
        : `/api/admin/books/${bookId}/lessons`;

      const method = editingLesson ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          content_url: pendingFile ? '' : formData.content_url,
          title: formData.title.trim(),
          chapter_title: formData.chapter_title.trim() || "General",
          order_index: parseInt(formData.order_index.toString()) || 0,
          is_free: formData.is_free || 0
        }),
      });

      if (res.ok) {
        const responseData = await res.json() as any;
        const savedLessonId = editingLesson ? editingLesson.id : responseData.id;

        if (pendingFile && savedLessonId) {
          addUploadTask(pendingFile, bookId, savedLessonId, 'book');
        }

        setIsModalOpen(false);
        setEditingLesson(null);
        setPendingFile(null);
        setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "", order_index: 0, is_free: 0 });
        showSuccess(editingLesson ? "Content updated successfully!" : "Content created successfully!");
        fetchLessons();
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to save lesson");
      }
    } catch (err) {
      console.error("Error saving lesson:", err);
      showError("An error occurred while saving the lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetch(`/api/admin/books/${bookId}/lessons/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Content deleted successfully!");
        fetchLessons();
      } else {
        const data = await res.json() as { error?: string };
        showError(data.error || "Failed to delete lesson");
      }
    } catch (err) {
      console.error("Error deleting lesson:", err);
      showError("An error occurred while deleting the lesson");
    }
  };

  const openModal = (lesson: Lesson | null = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        type: lesson.type,
        content_url: lesson.content_url || "",
        chapter_title: lesson.chapter_title || "General",
        text_content: lesson.text_content || "",
        order_index: (lesson as any).order_index || lessons.length * 10,
        is_free: (lesson as any).is_free || 0
      });
    } else {
      setEditingLesson(null);
      setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "", order_index: lessons.length * 10, is_free: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLesson(null);
    setPendingFile(null);
    setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "", order_index: 0, is_free: 0 });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'audio': return <Headphones className="w-5 h-5" />;
      case 'article': return <FileText className="w-5 h-5" />;
      default: return <ImageIcon className="w-5 h-5" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch(type) {
      case 'video': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pdf': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'audio': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'article': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <Link href="/admin/books" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-8 font-bold">
        <ArrowLeft className="w-4 h-4" /> Back to Books
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <BookOpen className="w-8 h-8 text-amber-500" />
             {bookTitle ? bookTitle : "Book Content"}
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">Manage the lessons, chapters, and materials inside this book.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="py-3 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Content
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin h-12 w-12 text-amber-500" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-[40px] bg-neutral-900/20">
          <BookOpen className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-600">No Content Yet</h3>
          <p className="text-neutral-500 mt-2">Add some lessons or materials to this book.</p>
        </div>
      ) : (
        <div className="bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl">
          <div className="divide-y divide-neutral-800/50">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-neutral-800/30 transition-colors gap-4">
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl border ${getTypeBadgeColor(lesson.type)}`}>
                    {getIcon(lesson.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white mb-1">{lesson.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-neutral-500 uppercase tracking-widest bg-neutral-950 px-2 py-0.5 rounded">
                        {lesson.chapter_title || "General"}
                      </span>
                      <span className="text-sm text-neutral-400 capitalize">• {lesson.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(lesson)} className="p-2.5 text-neutral-400 hover:text-amber-500 bg-neutral-950/50 hover:bg-neutral-900 rounded-xl transition-all" aria-label="Edit" title="Edit Lesson">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-2.5 text-neutral-400 hover:text-red-500 bg-neutral-950/50 hover:bg-neutral-900 rounded-xl transition-all" aria-label="Delete" title="Delete Lesson">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[32px] max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
               <div>
                  <h3 className="text-2xl font-black text-white">{editingLesson ? "Edit Content" : "Create New Content"}</h3>
               </div>
               <button onClick={closeModal} className="p-3 hover:bg-neutral-800 rounded-2xl text-neutral-500 hover:text-white transition-all" aria-label="Close" title="Close">
                 <X className="w-6 h-6" />
               </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Title</label>
                    <input
                      type="text" required value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800"
                      placeholder="e.g. Introduction to Algebra"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Content Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                    >
                      <option value="video">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Image</option>
                      <option value="audio">Audio</option>
                      <option value="article">Article</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Chapter Title</label>
                    <input
                      type="text" value={formData.chapter_title}
                      onChange={(e) => setFormData({ ...formData, chapter_title: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800"
                      placeholder="e.g. Chapter 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Order Index</label>
                    <input
                      required type="number" value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-1">
                     <label className="flex items-center gap-3 cursor-pointer group bg-neutral-950 border border-neutral-800 p-4 rounded-2xl hover:border-amber-500/50 transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.is_free === 1}
                          onChange={(e) => setFormData({ ...formData, is_free: e.target.checked ? 1 : 0 })}
                          className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-black text-neutral-300 group-hover:text-white uppercase tracking-wider">Free Demo</span>
                     </label>
                  </div>
                </div>
                
                {formData.type === 'article' ? (
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Text / Article Content</label>
                    <div className="bg-white text-black rounded-2xl overflow-hidden pb-10">
                      <ReactQuill 
                        theme="snow" 
                        value={formData.text_content} 
                        onChange={(val) => setFormData({ ...formData, text_content: val })} 
                        style={{ height: '300px' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Content Selection / Upload</label>
                    <div className="space-y-3">
                       <div className="flex gap-2">
                         <div className="flex-1 relative">
                           <input 
                             type="text" 
                             placeholder="Enter URL here or upload file" 
                             value={formData.content_url} 
                             onChange={(e) => setFormData({ ...formData, content_url: e.target.value })} 
                             className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-12 pr-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800 font-mono text-sm"
                           />
                           <LinkIcon className="w-5 h-5 text-neutral-500 absolute left-4 top-4" />
                         </div>
                         <label className="cursor-pointer flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black transition-all bg-amber-600/10 text-amber-500 border border-amber-500/30 hover:bg-amber-600/20">
                           <Upload className="w-5 h-5" />
                           <span>Upload (Background)</span>
                           <input 
                             type="file" 
                             className="hidden" 
                             onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} 
                           />
                         </label>
                       </div>
                       {formData.content_url && (
                         <div className="text-[10px] font-mono text-emerald-500 flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/20 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready: {formData.content_url.split('/').pop()}
                         </div>
                       )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 text-neutral-400 hover:text-white font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingLesson ? "Update Content" : "Save Content")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookLessonsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div></div>}>
      <BookLessonsContent />
    </Suspense>
  );
}
