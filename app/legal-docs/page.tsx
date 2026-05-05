'use client';

import { Suspense } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, RefreshCcw, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const legalContent: any = {
  privacy: {
    title: "गोपनीयता नीति (Privacy Policy)",
    icon: <ShieldCheck className="w-12 h-12 text-orange-500" />,
    content: `
      यज्ञ आश्रम ("हम", "हमें", "हमारा") आपकी गोपनीयता का सम्मान करता है और आपकी व्यक्तिगत जानकारी की सुरक्षा के लिए प्रतिबद्ध है। यह नीति बताती है कि हम आपकी जानकारी कैसे एकत्र करते हैं और उसका उपयोग कैसे करते हैं।

      1. जानकारी का संग्रहण: हम आपका नाम, ईमेल और भुगतान संबंधी जानकारी एकत्र करते हैं जब आप हमारे पाठ्यक्रमों में नामांकन करते हैं।
      2. डेटा उपयोग: हम आपके डेटा का उपयोग आपको शैक्षिक सामग्री प्रदान करने और आपके अनुभव को बेहतर बनाने के लिए करते हैं।
      3. सुरक्षा: आपके डेटा को सुरक्षित रखने के लिए हम आधुनिक एन्क्रिप्शन तकनीकों का उपयोग करते हैं।
    `
  },
  terms: {
    title: "सेवा की शर्तें (Terms of Service)",
    icon: <FileText className="w-12 h-12 text-orange-500" />,
    content: `
      यज्ञ आश्रम की वेबसाइट और सेवाओं का उपयोग करके, आप निम्नलिखित शर्तों से सहमत होते हैं:

      1. खाता पंजीकरण: आपको सटीक जानकारी प्रदान करनी होगी और अपना पासवर्ड सुरक्षित रखना होगा।
      2. पाठ्यक्रम सामग्री: सभी सामग्री यज्ञ आश्रम की संपत्ति है और इसे बिना अनुमति के साझा या डाउनलोड नहीं किया जा सकता।
      3. आचरण: सभी छात्रों से पोर्टल पर सम्मानजनक व्यवहार की अपेक्षा की जाती है।
    `
  },
  refund: {
    title: "रिफंड पॉलिसी (Refund Policy)",
    icon: <RefreshCcw className="w-12 h-12 text-orange-500" />,
    content: `
      हम चाहते हैं कि आपका आध्यात्मिक यात्रा संतोषजनक हो।

      1. पात्रता: यदि आप पाठ्यक्रम से संतुष्ट नहीं हैं, तो आप खरीद के 14 दिनों के भीतर रिफंड का अनुरोध कर सकते हैं।
      2. प्रक्रिया: रिफंड प्राप्त करने के लिए कृपया सपोर्ट टीम को ईमेल करें।
      3. शर्तें: यदि आपने 25% से अधिक पाठ्यक्रम पूरा कर लिया है, तो रिफंड देय नहीं होगा।
    `
  }
};

function LegalContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || 'terms';
  const data = legalContent[slug] || legalContent.terms;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      <div className="max-w-4xl mx-auto py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-12">
             <div className="mb-6">{data.icon}</div>
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">
               {data.title}
             </h1>
             <div className="h-1 w-20 bg-orange-500 rounded-full mb-12" />
             
             <div className="space-y-8 text-neutral-400 text-lg leading-relaxed whitespace-pre-wrap font-medium">
               {data.content}
             </div>
          </div>
          
          <div className="pt-20 border-t border-neutral-900">
             <p className="text-neutral-600 text-sm italic font-mono uppercase tracking-widest">
                अंतिम अपडेट: 17 अप्रैल 2026
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <LegalContent />
    </Suspense>
  );
}
