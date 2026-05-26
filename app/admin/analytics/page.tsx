'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, TrendingUp, Users, BookOpen, DollarSign, Award, 
  Trash2, HardDrive, ShieldAlert, Sparkles, RefreshCw, X, CheckCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [orphanedMedia, setOrphanedMedia] = useState<any[]>([]);
  const [showCleanerModal, setShowCleanerModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // 'all' or key
  const router = useRouter();

  // Load platform analytics stats
  const loadStats = () => {
    setIsLoading(true);
    fetch('/api/admin/analytics')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && !data.error) setStats(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadStats();
  }, [router]);

  // Scan R2 bucket for orphaned video files
  const scanOrphanedMedia = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/admin/analytics/orphaned-media');
      const data = await res.json() as any;
      if (data && data.orphanedMedia) {
        setOrphanedMedia(data.orphanedMedia);
      }
      setShowCleanerModal(true);
    } catch (err) {
      console.error("Failed to scan storage", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Delete specific orphaned file
  const deleteOrphanedFile = async (key: string) => {
    if (!confirm(`Are you sure you want to permanently delete this file?\nKey: ${key}`)) return;
    setIsDeleting(key);
    try {
      const res = await fetch('/api/admin/analytics/orphaned-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [key] })
      });
      const data = await res.json() as any;
      if (data.success) {
        setOrphanedMedia(prev => prev.filter(item => item.key !== key));
      }
    } catch (err) {
      console.error("Failed to delete file", err);
    } finally {
      setIsDeleting(null);
    }
  };

  // Delete all orphaned files
  const deleteAllOrphanedFiles = async () => {
    const count = orphanedMedia.length;
    if (count === 0) return;
    if (!confirm(`⚠️ DANGER ZONE ⚠️\n\nAre you absolutely sure you want to permanently delete ALL ${count} orphaned video files from R2 storage?\nThis operation is irreversible.`)) return;
    if (!confirm(`Confirming once more: Delete all ${count} files?`)) return;

    setIsDeleting('all');
    try {
      const keys = orphanedMedia.map(item => item.key);
      const res = await fetch('/api/admin/analytics/orphaned-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys })
      });
      const data = await res.json() as any;
      if (data.success) {
        setOrphanedMedia([]);
      }
    } catch (err) {
      console.error("Failed to delete all files", err);
    } finally {
      setIsDeleting(null);
    }
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
        <p className="text-neutral-400 font-bold text-sm tracking-wider uppercase animate-pulse">Loading Analytics Data...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-neutral-900/50 border border-red-900/30 rounded-3xl p-8 max-w-lg mx-auto text-center mt-10">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white">System Error</h2>
        <p className="text-neutral-400 mt-2 font-medium">Failed to establish secure handshake with analytics API.</p>
        <button 
          onClick={loadStats} 
          className="mt-6 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-bold transition-all inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Handshake
        </button>
      </div>
    );
  }

  const totalOrphanedSize = orphanedMedia.reduce((acc, curr) => acc + curr.size, 0);

  const overviewCards = [
    { label: 'Total Revenue', value: `₹${Number(stats.revenue || 0).toLocaleString('hi-IN')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/30' },
    { label: 'Total Students', value: stats.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/30' },
    { label: 'Total Courses', value: stats.totalCourses || 0, icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'hover:border-orange-500/30' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header and Storage Scan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-neutral-950/80 to-neutral-900/40 p-8 rounded-[2.5rem] border border-neutral-800/80 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-emerald-500 animate-pulse" /> Platform Analytics
          </h1>
          <p className="text-neutral-500 mt-2 font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Enterprise data insights and storage diagnostics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={scanOrphanedMedia}
            disabled={isScanning}
            className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white rounded-full font-extrabold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Scanning R2 Storage...
              </>
            ) : (
              <>
                <HardDrive className="w-5 h-5" /> R2 Storage Cleaner
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards.map((card, i) => (
          <div key={i} className={`bg-neutral-900/30 backdrop-blur-sm border border-neutral-800/80 rounded-3xl p-6 relative overflow-hidden group ${card.border} transition-all duration-300`}>
            <div className={`absolute -right-6 -top-6 p-12 rounded-full ${card.bg} opacity-15 group-hover:scale-150 transition-transform duration-700`} />
            <div className={`p-3.5 w-max rounded-2xl ${card.bg} mb-5`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">{card.label}</p>
            <p className="text-3xl font-black text-white mt-2 tracking-tighter">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Top Performing Courses */}
        <div className="lg:col-span-2 bg-neutral-900/30 border border-neutral-800/80 rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Award className="w-6 h-6 text-purple-400" /> Top Performing Courses
            </h2>
          </div>

          <div className="space-y-4">
            {stats.topCourses && stats.topCourses.length > 0 ? (
              stats.topCourses.map((course: any, idx: number) => {
                const maxEnrollments = stats.topCourses[0].enrollments || 1;
                const percentage = Math.round((course.enrollments / maxEnrollments) * 100);
                
                return (
                  <div key={course.id} className="group flex items-center gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-800/40 hover:border-purple-500/20 hover:bg-neutral-950/70 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center font-black text-purple-400 text-lg border border-purple-500/20 group-hover:scale-105 transition-transform">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base truncate group-hover:text-purple-400 transition-colors">{course.title}</h3>
                      <div className="flex items-center gap-4 mt-2.5">
                        <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/30">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full group-hover:shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all duration-1000" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-neutral-400 uppercase tracking-widest whitespace-nowrap bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                          {course.enrollments} Enrolled
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-neutral-500 text-sm py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/20">
                No course enrollment data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Storage Diagnostics Card */}
        <div className="bg-neutral-900/30 border border-neutral-800/80 rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute left-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <HardDrive className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Storage Integrity</h2>
            </div>
            
            <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-medium">
              We cross-check all media uploads in your **Cloudflare R2 Bucket** against active video lessons in the database to detect orphaned storage that is safe to clean.
            </p>

            <div className="bg-neutral-950/60 rounded-2xl p-5 border border-neutral-800/60 space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Media Analyzer</span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Ready</span>
              </div>
              <div className="h-px bg-neutral-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Extensions</p>
                  <p className="text-sm font-bold text-neutral-200 mt-1">MP4, WebM, MOV</p>
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Target</p>
                  <p className="text-sm font-bold text-neutral-200 mt-1">Orphaned Media</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={scanOrphanedMedia}
            disabled={isScanning}
            className="w-full py-4 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all text-neutral-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:text-white"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Running Scan...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Trigger Diagnostic Scan
              </>
            )}
          </button>
        </div>

      </div>

      {/* Gorgeous Cleaner Modal Popup */}
      {showCleanerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-800 relative z-10 bg-neutral-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">R2 Storage Cleaner</h3>
                  <p className="text-xs font-semibold text-neutral-400 mt-0.5">Orphaned files found in your R2 bucket</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCleanerModal(false)}
                className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6 relative z-10">
              
              {/* Telemetry Summary Bar */}
              {orphanedMedia.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-950/80 p-5 rounded-2xl border border-neutral-800">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">Orphaned Space Detected</p>
                    <p className="text-2xl font-black text-rose-500 flex items-baseline gap-1.5">
                      {formatBytes(totalOrphanedSize)}
                      <span className="text-xs text-neutral-400 font-bold">across {orphanedMedia.length} files</span>
                    </p>
                  </div>
                  <button
                    onClick={deleteAllOrphanedFiles}
                    disabled={isDeleting !== null}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20"
                  >
                    {isDeleting === 'all' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Purging Storage...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" /> Purge All Orphaned Files
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Media List */}
              <div className="space-y-3">
                {orphanedMedia.length > 0 ? (
                  orphanedMedia.map((file) => (
                    <div 
                      key={file.key} 
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60 hover:bg-neutral-950/70 hover:border-neutral-700/60 transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        {/* Key/Path */}
                        <p className="text-sm font-bold text-neutral-200 truncate group-hover:text-emerald-400 transition-colors" title={file.key}>
                          {file.key.split('/').pop() || file.key}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate mt-1 select-all font-mono" title={file.key}>
                          Path: {file.key}
                        </p>
                        
                        {/* Size / Date metadata */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                            {formatBytes(file.size)}
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">
                            Added: {new Date(file.uploadedAt).toLocaleDateString('hi-IN')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteOrphanedFile(file.key)}
                        disabled={isDeleting !== null}
                        className="self-end sm:self-center p-2.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                        title="Delete permanently from R2"
                      >
                        {isDeleting === file.key ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-neutral-950/20 border border-dashed border-neutral-800 rounded-2xl space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <p className="text-white font-bold text-base">Perfect Integrity</p>
                    <p className="text-neutral-500 text-xs max-w-sm mx-auto font-medium">
                      No orphaned video or media files detected. Every file in your R2 bucket matches a database lesson.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-neutral-800 flex justify-end bg-neutral-950/20 relative z-10">
              <button
                onClick={() => setShowCleanerModal(false)}
                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all text-sm"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
