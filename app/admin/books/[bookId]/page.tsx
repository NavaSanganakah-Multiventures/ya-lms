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

  const fetchLessonsRef = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/dummy/lessons?book_id=${bookId}`);
      const data = await res.json() as { lessons: any[] };
      setLessons(data.lessons || []);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/courses/dummy/lessons?book_id=${bookId}`);
        const data = await res.json() as { lessons: any[] };
        setLessons(data.lessons || []);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingLesson
        ? `/api/admin/courses/dummy/lessons/${editingLesson.id}`
        : `/api/admin/courses/dummy/lessons`;

      const method = editingLesson ? "PUT" : "POST";

      const payload = { ...formData, book_id: bookId, course_id: null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchLessonsRef();
      } else {
        alert("Failed to save lesson");
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/courses/dummy/lessons/${id}`, { method: "DELETE" });
      if (res.ok) fetchLessonsRef();
    } catch (error) {
      console.error("Error deleting lesson:", error);
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

  const getIcon = (type: string) => {
    switch(type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'audio': return <Headphones className="w-5 h-5" />;
      default: return <ImageIcon className="w-5 h-5" />;
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
            Book Lessons
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
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  {getIcon(lesson.type)}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{lesson.title}</h4>
                  <p className="text-sm text-slate-500 capitalize">{lesson.type}</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Content URL</label>
                <input
                  type="text" value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Text Content</label>
                <textarea
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg h-32"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
