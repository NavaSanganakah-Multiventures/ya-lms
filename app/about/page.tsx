'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { ArrowRight, BookOpen, Heart, Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      {/* Header Space */}
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
         >
            <span className="text-orange-400 text-xs font-black uppercase tracking-[0.2em] mb-4 block">हमारी कहानी</span>
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-12">
               यज्ञ आश्रम : <br/><span className="text-neutral-500 italic">एक आध्यात्मिक यात्रा</span>
            </h1>
         </motion.div>
      </div>

      {/* Main Content */}
      <section className="py-20 px-6 border-y border-neutral-900 bg-neutral-950/50">
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative aspect-square rounded-[60px] overflow-hidden grayscale">
               <Image src="https://picsum.photos/seed/spirit/800/800" alt="Tradition" fill className="object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="space-y-8">
               <h2 className="text-4xl font-black leading-tight">परंपरा और आधुनिकता का मिलन</h2>
               <p className="text-neutral-400 text-lg leading-relaxed">
                  यज्ञ आश्रम की स्थापना प्राचीन भारतीय ऋषियों के ज्ञान को संरक्षित करने और उसे आधुनिक दुनिया के लिए प्रासंगिक बनाने के उद्देश्य से की गई थी। हमारा मानना है कि आत्म-ज्ञान ही सर्वोच्च ज्ञान है।
               </p>
               <p className="text-neutral-400 text-lg leading-relaxed">
                  हम तकनीक का उपयोग करके दुनिया भर के छात्रों को एक समर्पित वातावरण प्रदान करते हैं जहाँ वे योग, ध्यान, दर्शन और वैदिक अनुष्ठानों का गहराई से अध्ययन कर सकें।
               </p>
               <div className="grid grid-cols-2 gap-8 pt-8">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">10+ वर्ष</h3>
                    <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest">अनुभव</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">50k+</h3>
                    <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest">वैश्विक छात्र</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Values */}
      <section className="py-40 px-6 max-w-7xl mx-auto">
         <div className="grid md:grid-cols-3 gap-16">
            <div className="group">
               <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-orange-500 group-hover:border-orange-400 transition-all duration-500">
                  <Shield className="w-8 h-8 group-hover:text-black transition-colors" />
               </div>
               <h4 className="text-2xl font-black mb-4">शुद्धता (Purity)</h4>
               <p className="text-neutral-500 leading-relaxed">हम ज्ञान की शुद्धता और प्राचीन ग्रंथों की प्रमाणिकता को बनाए रखते हैं।</p>
            </div>
            <div className="group">
               <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-orange-500 group-hover:border-orange-400 transition-all duration-500">
                  <Heart className="w-8 h-8 group-hover:text-black transition-colors" />
               </div>
               <h4 className="text-2xl font-black mb-4">करुणा (Compassion)</h4>
               <p className="text-neutral-500 leading-relaxed">हमारा उद्देश्य एक ऐसा समुदाय बनाना है जो परस्पर प्रेम और करुणा पर आधारित हो।</p>
            </div>
            <div className="group">
               <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <Users className="w-8 h-8 group-hover:text-black transition-colors" />
               </div>
               <h4 className="text-2xl font-black mb-4">समुदाय (Community)</h4>
               <p className="text-neutral-500 leading-relaxed">विश्व भर के साधकों को जोड़ना और एक सहायक वातावरण प्रदान करना।</p>
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
         <div className="max-w-4xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[60px] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <BookOpen className="w-64 h-64" />
            </div>
            <div className="relative z-10">
               <h2 className="text-4xl md:text-5xl font-black mb-8">अपनी यात्रा आज ही शुरू करें</h2>
               <p className="text-neutral-400 text-lg mb-12 max-w-xl mx-auto">यज्ञ आश्रम के साथ जुड़कर एक नई चेतना और शांति का अनुभव करें।</p>
               <Link href="/auth/login" className="px-12 py-5 bg-white text-black rounded-2xl font-black text-xl hover:bg-neutral-200 transition-all inline-flex items-center gap-4">
                  साइन अप करें
                  <ArrowRight className="w-6 h-6" />
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
}
