"use client";

import { useState, useEffect } from "react";
import { BookOpen, ArrowLeft, Plus, Video, FileText, Headphones, Image as ImageIcon, Trash2, Pencil } from "lucide-react";
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

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const [lessonsRes, bookRes] = await Promise.all([
        fetch(`/api/admin/books/lessons?bookId=${bookId}`),
        fetch(`/api/admin/books?bookId=${bookId}`),
      ]);
      const lessonsData = await lessonsRes.json() as { lessons: any[] };
      setLessons(lessonsData.lessons || []);
      if (bookRes.ok) {
        const bookData = await bookRes.json() as { books?: any[]; title?: string };
        // books list endpoint returns array; find matching book
        const books = bookData.books || [];
        const found = books.find((b: any) => b.id === bookId);
        if (found) setBookTitle(found.title);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookId) fetchLessons();
  }, [bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }
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
      case 'video': return 'bg-blue-50 text-blue-600';
      case 'pdf': return 'bg-red-50 text-red-600';
      case 'audio': return 'bg-purple-50 text-purple-600';
      case 'article': return 'bg-green-50 text-green-600';
      default: return 'bg-amber-50 text-amber-600';
    }
  };

  return (
    <div className="p-6">
      <Link href="/admin/books" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Books
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-600" />
            {bookTitle ? bookTitle : "Book Lessons"}
          </h1>
          <p className="text-slate-600 mt-2">Manage the content inside this book.</p>
        </div>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          onClick={() => openModal()}
        >
          <Plus className="w-5 h-5" />
          Add Lesson
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Lessons Yet</h3>
          <p className="text-slate-500 mt-2">Add some content to this book.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getTypeBadgeColor(lesson.type)}`}>
                  {getIcon(lesson.type)}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                  <p className="text-sm text-slate-500 capitalize">{lesson.chapter_title ? `${lesson.chapter_title} · ` : ""}{lesson.type}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(lesson)} className="p-2 text-slate-400 hover:text-amber-600" aria-label="Edit" title="Edit Lesson">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(lesson.id)} className="p-2 text-slate-400 hover:text-red-600" aria-label="Delete" title="Delete Lesson">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingLesson ? "Edit Lesson" : "Create Lesson"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text" required value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Chapter Title</label>
                <input
                  type="text" value={formData.chapter_title}
                  onChange={(e) => setFormData({ ...formData, chapter_title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. Chapter 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content URL</label>
                <input
                  type="text" value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Text Content</label>
                <textarea
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg h-32"
                  placeholder="Optional article/text content"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{editingLesson ? "Update" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
