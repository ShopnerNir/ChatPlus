import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, ShieldCheck, Sparkles, Radio } from 'lucide-react';

interface LoadingScreenProps {
  onFinished: () => void;
}

export default function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('আলাপন চালু হচ্ছে...');

  useEffect(() => {
    const statuses = [
      'নিরাপদ ডাটাবেজের সাথে সংযোগ স্থাপন হচ্ছে...',
      'সিকিউরিটি চাবি এনক্রিপ্ট করা হচ্ছে...',
      'পছন্দসই মোবাইল থিম সেটআপ করা হচ্ছে...',
      'সেশন লগ যাচাই করা হচ্ছে...',
      'সংযোগ সফল। আলাপন-এ স্বাগতম!',
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 14) + 6;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onFinished();
          }, 500);
          return 100;
        }
        
        const idx = Math.min(Math.floor((next / 100) * statuses.length), statuses.length - 1);
        setStatusText(statuses[idx]);
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between bg-slate-950 text-white overflow-hidden z-50 p-6 select-none">
      {/* Background glowing violet/magenta orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-600/[0.1] rounded-full blur-[110px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/[0.08] rounded-full blur-[100px] animate-pulse pointer-events-none" />

      {/* Invisible flex spacers for mobile centering */}
      <div className="h-6" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative px-6 py-10 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-2xl w-full max-w-sm text-center shadow-[0_12px_40px_rgba(139,92,246,0.15)]"
      >
        {/* Animated Cyber Holographic Logo */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full scale-125 animate-ping" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="w-20 h-20 rounded-full border-2 border-dashed border-violet-500/40 flex items-center justify-center"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="absolute w-14 h-14 rounded-full border border-dotted border-pink-500/50 flex items-center justify-center"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Radio className="w-6 h-6 text-violet-400 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight mb-2 font-sans bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
          আলাপন
        </h1>
        <p className="text-[10px] text-violet-400 font-mono tracking-widest uppercase mb-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-500" /> SECURED SECURE ENGINE
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-4 relative p-[1px]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
          />
        </div>

        {/* Status Text and Percentage */}
        <div className="flex justify-between items-center text-[10px] font-sans text-slate-400 px-0.5">
          <span className="flex items-center gap-1.5 truncate">
            <Database className="w-3 h-3 text-violet-500 animate-pulse" />
            {statusText}
          </span>
          <span className="text-violet-400 font-bold">{progress}%</span>
        </div>
      </motion.div>

      {/* Developed by Footer */}
      <div className="text-center pb-4">
        <p className="text-[10px] font-sans text-slate-600 tracking-wider">
          তৈরি করেছেন: <span className="text-violet-400 font-bold uppercase">উৎসব সরকার</span>
        </p>
      </div>
    </div>
  );
}
