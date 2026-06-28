import { motion } from 'motion/react';
import { MessageSquare, ShieldCheck, Sparkles, Share2, Users, Flame } from 'lucide-react';

export default function WelcomePlaceholder() {
  const features = [
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />, title: 'সম্পূর্ণ নিরাপদ', desc: 'এন্ড-টু-এন্ড এনক্রিপ্ট চ্যাট এনভায়রনমেন্ট' },
    { icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />, title: 'স্মার্ট থিমিং', desc: 'আপনার মুড অনুযায়ী চ্যাট ব্যাকগ্রাউন্ড ও কাস্টম থিম' },
    { icon: <Share2 className="w-5 h-5 text-violet-400" />, title: 'ফাইল শেয়ারিং', desc: 'স্টিকার, ছবি, অডিও এবং ডকুমেন্টস মুহূর্তেই আদানপ্রদান' },
    { icon: <Users className="w-5 h-5 text-pink-400" />, title: 'গ্রুপ চ্যাটিং', desc: 'বন্ধুদের সাথে গ্রুপ তৈরি ও ডাকনাম কাস্টমাইজেশন' },
  ];

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-950/40 backdrop-blur-2xl relative overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-violet-600/[0.04] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/3 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-pink-500/[0.03] rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-md text-center space-y-8 z-10">
        {/* Animated Main Logo Accent */}
        <div className="relative flex justify-center">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-20 h-20 bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(139,92,246,0.25)] border border-white/10"
          >
            <MessageSquare className="w-10 h-10 text-white stroke-[2.5]" />
          </motion.div>
          
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-500 animate-ping opacity-75" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
        </div>

        {/* Heading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-sans font-black text-white tracking-tight sm:text-2xl">
            আলাপন-এ আপনাকে স্বাগতম
          </h2>
          <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto leading-relaxed">
            যোগাযোগের এক নতুন ও গতিশীল অভিজ্ঞতা। চ্যাট করতে যেকোনো সক্রিয় চ্যাটরুম বা ব্যবহারকারী নির্বাচন করুন।
          </p>
        </div>

        {/* Divider line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Features list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-3 bg-slate-900/30 border border-violet-500/5 hover:border-violet-500/15 rounded-2xl flex gap-3 items-start hover:bg-slate-900/50 transition duration-300 group"
            >
              <div className="p-2 bg-slate-950/80 rounded-xl border border-white/5 group-hover:scale-105 transition-transform shrink-0">
                {feat.icon}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-sans font-extrabold text-slate-200">
                  {feat.title}
                </h4>
                <p className="text-[9px] font-sans text-slate-500 leading-normal">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Security Info */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-500 tracking-wider">
          <Flame className="w-3.5 h-3.5 text-pink-500" />
          <span>POWERED BY SECURE ALAPON V2 ENGINE</span>
        </div>
      </div>
    </div>
  );
}
