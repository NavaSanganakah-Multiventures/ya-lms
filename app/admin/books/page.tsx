"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Pencil, Trash2, ArrowRight, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

interface Book {
  id: string;
  title: string;
  description: string | null;
  price_inr?: number;
  thumbnail_url?: string | null;
  is_standalone?: number;
  self_study_enabled?: number;
  self_study_credit_cost?: number;
  created_at: string;
}

export default function BooksAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", price_inr: 0, thumbnail_url: "", is_standalone: 0, self_study_enabled: 0, self_study_credit_cost: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/books");
      const data = await res.json() as { books: Book[] };
      setBooks(data.books || []);
    } catch (err) {
      console.error("Error fetching books:", err);
      showError("Error loading books.");
    }
  }, [showError]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await fetchBooks();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchBooks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingBook ? `/api/admin/books/${editingBook.id}` : "/api/admin/books";
      const method = editingBook ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingBook(null);
        setFormData({ title: "", description: "", price_inr: 0, thumbnail_url: "", is_standalone: 0, self_study_enabled: 0, self_study_credit_cost: 0 });
        showSuccess(editingBook ? "Book updated successfully!" : "Book created successfully!");
        fetchBooks();
      } else {
        const data: { error?: string } = await res.json();
        showError(data.error || "Failed to save book");
      }
    } catch (err) {
      console.error("Error saving book:", err);
      showError("An error occurred while saving the book");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Book deleted successfully!");
        fetchBooks();
      } else {
        const data: { error?: string } = await res.json();
        showError(data.error || "Failed to delete book");
      }
    } catch (err) {
      console.error("Error deleting book:", err);
      showError("An error occurred while deleting the book");
    }
  };

  const openModal = (book: Book | null = null) => {
    if (book) {
      setEditingBook(book);
      setFormData({ 
        title: book.title, 
        description: book.description || "",
        price_inr: book.price_inr || 0,
        thumbnail_url: book.thumbnail_url || "",
        is_standalone: book.is_standalone || 0,
        self_study_enabled: book.self_study_enabled || 0,
        self_study_credit_cost: book.self_study_credit_cost || 0
      });
    } else {
      setEditingBook(null);
      setFormData({ title: "", description: "", price_inr: 0, thumbnail_url: "", is_standalone: 0, self_study_enabled: 0, self_study_credit_cost: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFormData({ title: "", description: "", price_inr: 0, thumbnail_url: "", is_standalone: 0, self_study_enabled: 0, self_study_credit_cost: 0 });
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <BookOpen className="w-8 h-8 text-amber-500" />
             पुस्तकालय (Library Books)
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">Manage books, chapters, and lessons linked to courses.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="py-3 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          नई पुस्तक जोड़ें
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin h-12 w-12 text-amber-500" />
        </div>
      ) : books.length === 0 ? (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-[40px] bg-neutral-900/20">
          <BookOpen className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-600">No Books Found</h3>
          <p className="text-neutral-500 mt-2">Create your first book to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-sm rounded-3xl p-8 hover:border-amber-500/50 transition-all shadow-xl flex flex-col group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-amber-500/10 rounded-2xl">
                  <BookOpen className="w-8 h-8 text-amber-400" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(book)} className="p-2 text-neutral-400 hover:text-amber-500 bg-neutral-950/50 hover:bg-neutral-900 rounded-xl transition-all" aria-label="Edit Book" title="Edit Book">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(book.id)} className="p-2 text-neutral-400 hover:text-red-500 bg-neutral-950/50 hover:bg-neutral-900 rounded-xl transition-all" aria-label="Delete Book" title="Delete Book">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 line-clamp-1">{book.title}</h3>
              <p className="text-neutral-500 flex-grow line-clamp-3 mb-6 leading-relaxed">
                {book.description || "No description provided."}
              </p>

              <div className="pt-6 border-t border-neutral-800 flex justify-between items-center text-sm font-bold">
                <span className="text-neutral-600 font-mono tracking-wider">{new Date(book.created_at).toLocaleDateString()}</span>
                <button 
                  onClick={() => router.push(`/admin/books/bookid?bookId=${book.id}`)}
                  className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors group/btn"
                >
                  Manage Content <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
               <div>
                  <h3 className="text-2xl font-black text-white">{editingBook ? "Edit Book" : "Create New Book"}</h3>
               </div>
               <button onClick={closeModal} className="p-3 hover:bg-neutral-800 rounded-2xl text-neutral-500 hover:text-white transition-all" aria-label="Close" title="Close">
                 <X className="w-6 h-6" />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Book Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-800"
                    placeholder="e.g. Class 10th Math Part 1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all min-h-[120px] resize-none placeholder:text-neutral-800"
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Price (INR)</label>
                    <input
                      type="number"
                      value={formData.price_inr}
                      onChange={(e) => setFormData({ ...formData, price_inr: parseInt(e.target.value) || 0 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Self-Study Credits</label>
                    <input
                      type="number"
                      value={formData.self_study_credit_cost}
                      onChange={(e) => setFormData({ ...formData, self_study_credit_cost: parseInt(e.target.value) || 0 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest block mb-2">Thumbnail URL</label>
                  <input
                    type="text"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-4 flex-col sm:flex-row">
                  <label className="flex items-center gap-3 cursor-pointer group bg-neutral-950 border border-neutral-800 p-4 rounded-2xl hover:border-amber-500/50 transition-all flex-1">
                    <input 
                      type="checkbox" 
                      checked={formData.is_standalone === 1}
                      onChange={(e) => setFormData({ ...formData, is_standalone: e.target.checked ? 1 : 0 })}
                      className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-neutral-300 group-hover:text-white uppercase tracking-wider">Sell Standalone</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group bg-neutral-950 border border-neutral-800 p-4 rounded-2xl hover:border-amber-500/50 transition-all flex-1">
                    <input 
                      type="checkbox" 
                      checked={formData.self_study_enabled === 1}
                      onChange={(e) => setFormData({ ...formData, self_study_enabled: e.target.checked ? 1 : 0 })}
                      className="w-5 h-5 rounded border-neutral-700 bg-neutral-800 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-neutral-300 group-hover:text-white uppercase tracking-wider">Credit Purchase</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
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
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingBook ? "Update Book" : "Create Book")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
