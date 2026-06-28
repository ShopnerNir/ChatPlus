import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { ShieldAlert, LogIn, Eye, EyeOff, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onSuccess: (profile: UserProfile) => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('সবগুলো ঘর সঠিকভাবে পূরণ করুন।');
      setLoading(false);
      return;
    }

    const email = `${username.toLowerCase().replace(/\s+/g, '')}@chatplus.com`;

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('আপনার প্রোফাইল ডাটাবেজে পাওয়া যায়নি।');
        setLoading(false);
        return;
      }

      const profileData = userDoc.data() as UserProfile;

      if (!profileData.activated) {
        setError('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।');
        setLoading(false);
        return;
      }

      await setDoc(userDocRef, { 
        status: 'online', 
        lastSeen: serverTimestamp(),
        deviceInfo: 'Mobile Web App Client'
      }, { merge: true });

      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: uid,
        username: profileData.username,
        action: 'User signed in via Alapon Mobile UI',
        deviceInfo: 'Alapon Mobile App Client',
        timestamp: serverTimestamp(),
        type: 'login'
      });

      onSuccess({
        ...profileData,
        status: 'online',
      });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('ভুল ব্যবহারকারীর নাম অথবা পাসওয়ার্ড। অনুগ্রহ করে আবার চেষ্টা করুন।');
      } else {
        setError('সংযোগ স্থাপন করা যাচ্ছে না। দয়া করে আপনার ইন্টারনেট চেক করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col justify-between p-6 bg-slate-950 text-white relative overflow-hidden select-none">
      {/* Absolute Ambient Background Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600/[0.12] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-pink-500/[0.08] rounded-full blur-[80px] pointer-events-none" />
      
      {/* Mobile-styled Header Top Bar */}
      <div className="flex justify-between items-center pt-2 pb-6">
        <div className="flex items-center gap-1.5 text-xs text-violet-400 font-mono">
          <Smartphone className="w-4 h-4 text-violet-500 animate-pulse" />
          <span>ALAPON MOBILE SECURE v2.0</span>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      </div>

      {/* Main Interactive Form Card */}
      <div className="my-auto space-y-7 z-10">
        {/* Sleek Amethyst & Rose Frost Logo Area */}
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-16 h-16 bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(139,92,246,0.35)] border border-white/20 relative"
          >
            <Sparkles className="w-8 h-8 text-white stroke-[2.5]" />
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-600 blur opacity-45 -z-10" />
          </motion.div>
          
          <div className="space-y-1.5">
            <h2 className="text-2xl font-sans font-black tracking-tight text-white bg-clip-text">
              আলাপন (Alapon)
            </h2>
            <p className="text-[11px] font-sans text-slate-400 leading-relaxed">
              একটি সম্পূর্ণ গতিশীল ও সুরক্ষিত যোগাযোগের মাধ্যম
            </p>
          </div>
        </div>

        {/* Input Form with interactive modern items */}
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-violet-400 uppercase tracking-widest ml-1">
              ব্যবহারকারীর নাম (Username)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="যেমন: utsab, rahim"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                className="w-full bg-slate-900/60 border border-violet-500/10 hover:border-violet-500/25 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 font-sans focus:outline-none transition-all duration-300"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-violet-400 uppercase tracking-widest ml-1">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-violet-500/10 hover:border-violet-500/25 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 font-sans focus:outline-none transition-all duration-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition duration-200"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Feedback message display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-pink-950/40 border border-pink-500/20 text-pink-200 rounded-2xl p-3 flex gap-2 items-start text-[11px] leading-relaxed font-sans"
            >
              <ShieldAlert className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-extrabold text-pink-300">ত্রুটি: </span>
                {error}
              </div>
            </motion.div>
          )}

          {/* Options (Remember Me) */}
          <div className="flex items-center justify-between text-[11px] font-sans pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-white transition duration-200 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded-md border-violet-500/20 bg-slate-900 text-violet-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-violet-600"
              />
              লগইন মনে রাখুন
            </label>
            <div className="flex items-center gap-1 text-violet-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
              <span>নিরাপদ সংযোগ</span>
            </div>
          </div>

          {/* Action Trigger Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 active:scale-[0.99] transition-all text-white font-sans font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(139,92,246,0.3)] mt-4 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 text-white" /> প্রবেশ করুন
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modern Notice on Bottom */}
      <div className="pt-6 border-t border-white/5 text-center flex flex-col items-center gap-1">
        <p className="text-[10px] text-slate-500 font-sans">
          নতুন প্রোফাইল খোলার জন্য আপনার এডমিনের সাহায্য নিন।
        </p>
        <p className="text-[9px] text-slate-600 tracking-wider font-sans uppercase">
          তৈরি করেছেন: <span className="text-violet-400 font-bold">উৎসব সরকার</span>
        </p>
      </div>
    </div>
  );
}
