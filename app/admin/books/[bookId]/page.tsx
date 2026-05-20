"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, ArrowLeft, Plus, Video, FileText, Headphones, Image as ImageIcon, Trash2, Pencil, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function BookLessonsPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "" });
  const [bookTitle, setBookTitle] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true);
      const [lessonsRes, bookRes] = await Promise.all([
        fetch(`/api/admin/books/lessons?bookId=${bookId}`),
        fetch(`/api/admin/books?bookId=${bookId}`),
      ]);
      const lessonsData = await lessonsRes.json() as { lessons: any[] };
      setLessons(lessonsData.lessons || []);
      if (bookRes.ok) {
        const bookData = await bookRes.json() as { book?: any };
        if (bookData.book?.title) setBookTitle(bookData.book.title);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (bookId) {
      Promise.resolve().then(() => {
        fetchLessons();
      });
    }
  }, [bookId, fetchLessons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingLesson
        ? `/api/admin/books/lessons?bookId=${bookId}&lessonId=${editingLesson.id}`
        : `/api/admin/books/lessons?bookId=${bookId}`;

      const method = editingLesson ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          title: formData.title.trim(),
          chapter_title: formData.chapter_title.trim() || "General",
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingLesson(null);
        setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "" });
        fetchLessons();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "Failed to save lesson");
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("An error occurred while saving the lesson");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetch(`/api/admin/books/lessons?bookId=${bookId}&lessonId=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLessons();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "Failed to delete lesson");
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("An error occurred while deleting the lesson");
    }
  };

  const openModal = (lesson: any = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        type: lesson.type,
        content_url: lesson.content_url || "",
        chapter_title: lesson.chapter_title || "General",
        text_content: lesson.text_content || ""
      });
    } else {
      setEditingLesson(null);
      setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLesson(null);
    setFormData({ title: "", type: "video", content_url: "", chapter_title: "General", text_content: "" });
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
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Content URL (Media / PDF)</label>
                  <input
                    type="text" value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800"
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Text / Article Content</label>
                  <textarea
                    value={formData.text_content}
                    onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all min-h-[160px] resize-none placeholder:text-neutral-800"
                    placeholder="Optional article/text content"
                  />
                </div>
                
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
