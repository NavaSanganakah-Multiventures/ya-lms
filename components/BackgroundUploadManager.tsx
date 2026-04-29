'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type UploadTask = {
  id: string;
  file: File;
  courseId: string;
  lessonId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
};

interface UploadContextType {
  tasks: UploadTask[];
  addUploadTask: (file: File, courseId: string, lessonId: string) => void;
  removeTask: (id: string) => void;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType | null>(null);

export const useBackgroundUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useBackgroundUpload must be used within BackgroundUploadProvider');
  return ctx;
};

export const BackgroundUploadProvider = ({ children }: { children: React.ReactNode }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const addUploadTask = useCallback((file: File, courseId: string, lessonId: string) => {
    const newTask: UploadTask = {
      id: Math.random().toString(36).substring(2, 9),
      file,
      courseId,
      lessonId,
      progress: 0,
      status: 'pending'
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      const nextTask = tasks.find(t => t.status === 'pending');
      if (!nextTask) return;

      // Mark as uploading
      setTasks(prev => prev.map(t => t.id === nextTask.id ? { ...t, status: 'uploading' } : t));

      try {
        // Upload File using XMLHttpRequest to track progress
        const formData = new FormData();
        formData.append('file', nextTask.file);

        const uploadPromise = new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/admin/upload', true);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setTasks(prev => prev.map(t => t.id === nextTask.id ? { ...t, progress } : t));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              resolve(res.url);
            } else {
              reject(new Error('Upload failed'));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        });

        const fileUrl = await uploadPromise;

        // Update the lesson with the new URL
        const updateRes = await fetch(`/api/admin/courses/${nextTask.courseId}/lessons/${nextTask.lessonId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_url: fileUrl })
        });

        if (!updateRes.ok) throw new Error('Failed to update lesson with file URL');

        setTasks(prev => prev.map(t => t.id === nextTask.id ? { ...t, status: 'completed', progress: 100 } : t));

        // Auto remove completed tasks after 5 seconds
        setTimeout(() => removeTask(nextTask.id), 5000);

      } catch (error: any) {
        console.error('Background upload failed:', error);
        setTasks(prev => prev.map(t => t.id === nextTask.id ? { ...t, status: 'error', errorMessage: error.message } : t));
      }
    };

    processQueue();
  }, [tasks, removeTask]);

  const isUploading = tasks.some(t => t.status === 'uploading');

  return (
    <UploadContext.Provider value={{ tasks, addUploadTask, removeTask, isUploading }}>
      {children}
      <UploadWidget />
    </UploadContext.Provider>
  );
};

const UploadWidget = () => {
  const { tasks, removeTask } = useBackgroundUpload();
  const [isOpen, setIsOpen] = useState(true);

  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'pending');

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-2">
      {!isOpen && activeTasks.length > 0 && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 font-bold animate-pulse"
        >
          <UploadCloud className="w-5 h-5" />
          <span>{activeTasks.length} Uploading...</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                Background Uploads ({tasks.length})
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-4 space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start">
                    <p className="text-xs text-neutral-300 font-medium truncate pr-4" title={task.file.name}>
                      {task.file.name}
                    </p>
                    <button onClick={() => removeTask(task.id)} className="text-neutral-600 hover:text-red-400 absolute right-3 top-3">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${task.status === 'error' ? 'bg-red-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 font-bold min-w-[2.5rem]">
                      {task.status === 'error' ? 'Error' : `${task.progress}%`}
                    </span>
                  </div>

                  {task.status === 'completed' && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded & Saved
                    </p>
                  )}
                  {task.status === 'error' && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3 h-3" /> {task.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
