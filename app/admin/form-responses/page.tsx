'use client';

import { useEffect, useState } from 'react';
import { Loader2, FileText, Calendar, User, Search, CheckCircle2, XCircle, Clock, Sparkles, Filter, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminFormResponsesPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();

  const fetchSubmissions = () => {
    setIsLoading(true);
    fetch('/api/admin/form-submissions')
      .then(res => res.json())
      .then((data: any) => {
        if (data.submissions) setSubmissions(data.submissions);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchSubmissions();
  }, [router]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/form-submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSubmissions(submissions.map(s => s.id === id ? { ...s, status } : s));
        if (selectedSubmission?.id === id) {
           setSelectedSubmission({ ...selectedSubmission, status });
        }
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/form-submissions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSubmissions(submissions.filter(s => s.id !== id));
        if (selectedSubmission?.id === id) {
           setSelectedSubmission(null);
        }
      } else {
        alert("Failed to delete submission");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const uniqueForms = Array.from(new Set(submissions.map(s => s.template_title)));
  const uniqueCourses = Array.from(new Set(submissions.map(s => s.course_title).filter(Boolean)));

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.template_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.data_json?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesForm = formFilter ? s.template_title === formFilter : true;
    const matchesCourse = courseFilter ? s.course_title === courseFilter : true;
    return matchesSearch && matchesForm && matchesCourse;
  });

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
             <FileText className="w-8 h-8 text-orange-500" />
             फॉर्म सबमिशन (Submissions)
          </h1>
          <p className="text-neutral-500 mt-2 text-lg">सभी डायनामिक फॉर्म से प्राप्त आवेदनों की समीक्षा करें।</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: List */}
        <div className="lg:col-span-4 space-y-4">
           <div className="relative mb-4">
              <input 
                type="text" 
                placeholder="खोजें (Search email, text)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-12 py-4 text-white placeholder:text-neutral-700 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700 w-5 h-5" />
           </div>

           <div className="flex gap-2 mb-6">
             <select 
               value={formFilter} 
               onChange={e => setFormFilter(e.target.value)}
               className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500/50"
             >
               <option value="">सभी फॉर्म (All Forms)</option>
               {uniqueForms.map((f: any) => <option key={f} value={f}>{f}</option>)}
             </select>
             <select 
               value={courseFilter} 
               onChange={e => setCourseFilter(e.target.value)}
               className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-orange-500/50"
             >
               <option value="">सभी कोर्स (All Courses)</option>
               {uniqueCourses.map((c: any) => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredSubmissions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubmission(s)}
                  className={`w-full text-left p-5 rounded-[24px] border transition-all duration-300 ${
                    selectedSubmission?.id === s.id 
                      ? 'bg-orange-600 border-orange-500 shadow-xl shadow-orange-500/20'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        selectedSubmission?.id === s.id ? 'bg-orange-500 text-white' : 'bg-neutral-950 text-neutral-500'
                     }`}>
                        {s.template_title}
                     </span>
                     <div className="flex items-center gap-1">
                        {s.status === 'pending' && <Clock className="w-3 h-3 text-orange-400" />}
                        {s.status === 'accepted' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                        {s.status === 'rejected' && <XCircle className="w-3 h-3 text-red-400" />}
                     </div>
                  </div>
                  <h4 className={`font-bold mb-1 truncate ${selectedSubmission?.id === s.id ? 'text-white' : 'text-neutral-200'}`}>
                    {s.email || 'अनाम यूज़र'}
                  </h4>
                  <div className={`text-xs flex items-center gap-2 ${selectedSubmission?.id === s.id ? 'text-orange-200' : 'text-neutral-600'}`}>
                    <Calendar className="w-3 h-3" />
                    {new Date(s.created_at).toLocaleDateString('hi-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </button>
              ))}

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-20 bg-neutral-900/50 rounded-3xl border border-neutral-800 border-dashed">
                   <p className="text-neutral-700 font-bold">कोई सबमिशन नहीं मिला।</p>
                </div>
              )}
           </div>
        </div>

        {/* View Content */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {selectedSubmission ? (
               <motion.div 
                 key={selectedSubmission.id}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="bg-neutral-900/50 border border-neutral-800 rounded-[40px] p-8 lg:p-12 shadow-2xl relative overflow-hidden h-full min-h-[600px]"
               >
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                     <FileText className="w-64 h-64" />
                  </div>

                  <div className="relative z-10">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div>
                           <span className="text-orange-400 text-xs font-black uppercase tracking-[0.2em] mb-2 block">विवरण (Application Details)</span>
                           <h2 className="text-3xl font-black text-white">{selectedSubmission.template_title}</h2>
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => handleUpdateStatus(selectedSubmission.id, 'accepted')}
                             disabled={isUpdating || selectedSubmission.status === 'accepted'}
                             className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                                selectedSubmission.status === 'accepted' ? 'bg-green-600 text-white' : 'bg-neutral-800 text-green-500 hover:bg-neutral-700'
                             }`}
                           >
                             <CheckCircle2 className="w-4 h-4" /> स्वीकार करें
                           </button>
                           <button 
                             onClick={() => handleUpdateStatus(selectedSubmission.id, 'rejected')}
                             disabled={isUpdating || selectedSubmission.status === 'rejected'}
                             className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                                selectedSubmission.status === 'rejected' ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-orange-500 hover:bg-neutral-700'
                             }`}
                           >
                             <XCircle className="w-4 h-4" /> अस्वीकृत करें
                           </button>
                           <button 
                             onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                             disabled={isDeleting}
                             className="px-4 py-3 bg-neutral-800 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all flex items-center justify-center"
                             title="Delete Submission"
                           >
                             {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Application Data */}
                        <div className="space-y-8">
                           <h3 className="text-xs font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                              <User className="w-4 h-4" /> सबमिट किया गया डेटा
                           </h3>
                           <div className="space-y-6">
                              {Object.entries(JSON.parse(selectedSubmission.data_json || '{}')).map(([key, val]: any) => (
                                <div key={key} className="group">
                                   <label className="text-[10px] font-black text-neutral-700 uppercase tracking-widest mb-1 block group-hover:text-orange-500 transition-colors">
                                      {key.replace(/_/g, ' ')}
                                   </label>
                                   <p className="text-lg text-neutral-200 font-medium leading-relaxed">
                                      {val}
                                   </p>
                                </div>
                              ))}
                           </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="space-y-8">
                           <h3 className="text-xs font-black text-neutral-600 uppercase tracking-widest flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-orange-400" /> AI विश्लेषण (Analysis)
                           </h3>
                           
                           {selectedSubmission.ai_analysis ? (() => {
                              let analysis: any = {};
                              try { analysis = JSON.parse(selectedSubmission.ai_analysis); } catch(e) { }
                              return (
                                <div className="bg-neutral-950/50 border border-neutral-800 rounded-3xl p-8 relative">
                                   <div className="absolute top-4 right-4 text-orange-500 opacity-20">
                                      <Sparkles className="w-12 h-12" />
                                   </div>
                                   <div className="relative z-10">
                                      {analysis.score !== undefined && (
                                        <div className="flex items-center gap-4 mb-6">
                                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                                              analysis.is_fit ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                                           }`}>
                                              {analysis.score}
                                           </div>
                                           <div>
                                              <p className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">योग्यता स्कोर</p>
                                              <p className="text-sm font-bold text-white">{analysis.is_fit ? 'उपयुक्त (Recommended)' : 'समीक्षा आवश्यक'}</p>
                                           </div>
                                        </div>
                                      )}
                                      <p className="text-neutral-400 leading-relaxed italic text-lg">
                                         &quot;{analysis.feedback || selectedSubmission.ai_analysis}&quot;
                                      </p>
                                   </div>
                                </div>
                              );
                           })() : (
                             <div className="p-8 border border-neutral-800 border-dashed rounded-3xl text-center">
                                <p className="text-neutral-700 text-sm">इस सबमिशन के लिए AI विश्लेषण उपलब्ध नहीं है।</p>
                             </div>
                           )}

                           <div className="pt-10">
                              <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest mb-2">सबमिशन आईडी</p>
                              <code className="text-[10px] text-neutral-800 font-mono bg-neutral-950 p-2 rounded">{selectedSubmission.id}</code>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
             ) : (
               <div className="h-full flex items-center justify-center bg-neutral-900/20 border border-neutral-800 border-dashed rounded-[40px] text-center p-20">
                  <div className="max-w-xs">
                     <Search className="w-12 h-12 text-neutral-800 mx-auto mb-6" />
                     <h3 className="text-xl font-bold text-neutral-700 mb-2">सबमिशन का चयन करें</h3>
                     <p className="text-neutral-800 text-sm">बाएं हाथ की सूची से किसी आवेदन को चुनकर उसका विवरण और AI विश्लेषण देखें।</p>
                  </div>
               </div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
