'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, BookOpen, LifeBuoy } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFound() {
  useEffect(() => {
    // Analytics: Send 404 hit event
    // Using a safe no-op fetch block in case we implement an endpoint in the future
    const track404 = async () => {
      try {
        const payload = {
          event: '404_hit',
          path: window.location.pathname,
          referrer: document.referrer || '',
          timestamp: new Date().toISOString(),
        };

        // We use report-error as a fallback or just log it if we don't want to pollute errors.
        // The requirements say: "Use existing analytics mechanism if available; otherwise add safe no-op fallback"
        // Since there is no analytics tracker, we just do a safe console.debug and a no-op fetch wrapper.
        console.debug('Analytics [404_hit]:', payload);

        // Example of non-crashing fetch to a non-existent endpoint, could be handled if added later.
        fetch('/api/analytics/404', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {
          // No-op fallback
        });
      } catch (err) {
        // Safe no-op
      }
    };

    track404();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans p-6 selection:bg-orange-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8 flex flex-col items-center justify-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
            <span className="text-4xl font-bold bg-gradient-to-br from-orange-400 to-orange-600 bg-clip-text text-transparent">
              404
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Page Not Found <br className="hidden md:block"/>
              <span className="text-white/60 text-3xl md:text-4xl mt-2 block">पृष्ठ नहीं मिला</span>
            </h1>
            <p className="text-white/60 text-lg md:text-xl max-w-md mx-auto pt-4">
              We couldn&apos;t find the page you&apos;re looking for. <br className="hidden md:block"/>
              हम वह पृष्ठ नहीं ढूंढ पाए जिसकी आपको तलाश है।
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pt-4"
        >
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#050505]"
          >
            <Home className="w-5 h-5" />
            <span>Go to Home</span>
          </Link>

          <Link
            href="/courses"
            className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#050505]"
          >
            <BookOpen className="w-5 h-5" />
            <span>View Courses</span>
          </Link>

          <Link
            href="/contact"
            className="w-full sm:w-auto px-6 py-3.5 bg-transparent hover:bg-white/5 text-white/70 hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#050505]"
          >
            <LifeBuoy className="w-5 h-5" />
            <span>Contact Support</span>
          </Link>
        </motion.div>

      </main>
    </div>
  );
}