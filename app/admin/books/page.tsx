"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";

export default function BooksAdminPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });


  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/books");
      const data = await res.json() as { books: any[] };
      setBooks(data.books || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchBooks();
      } else {
        alert("Failed to save book");
      }
    } catch (error) {
      console.error("Error saving book:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBooks();
      } else {
        alert("Failed to delete book");
      }
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const openModal = (book: any = null) => {
    if (book) {
      setEditingBook(book);
      setFormData({ title: book.title, description: book.description || "" });
    } else {
      setEditingBook(null);
      setFormData({ title: "", description: "" });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-600" />
            Library Books
          </h1>
          <p className="text-slate-600 mt-2">Manage books that can be attached to any course.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Book
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Books Found</h3>
          <p className="text-slate-500 mt-2">Create your first book to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(book)} className="p-2 text-slate-400 hover:text-amber-600 transition-colors" aria-label="Edit Book" title="Edit Book">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" aria-label="Delete Book" title="Delete Book">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{book.title}</h3>
              <p className="text-slate-500 flex-grow line-clamp-3 mb-4">{book.description || "No description"}</p>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                <span>Created {new Date(book.created_at).toLocaleDateString()}</span>
                <a href={`/admin/books/${book.id}`} className="flex items-center gap-1 text-amber-600 font-medium hover:text-amber-700">
                  Manage Lessons <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingBook ? "Edit Book" : "Create New Book"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g. Class 10th Math Part 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[100px]"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  {editingBook ? "Update" : "Create"} Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
