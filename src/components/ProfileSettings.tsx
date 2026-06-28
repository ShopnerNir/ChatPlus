import React, { useState } from 'react';
import { updatePassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { 
  User, 
  Image as ImageIcon, 
  Lock, 
  Wallpaper, 
  LogOut, 
  Palette, 
  Check, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

const WALLPAPER_PRESETS = [
  { name: 'ডিফল্ট ডার্ক', value: 'bg-slate-950' },
  { name: 'মিডনাইট পার্পল', value: 'bg-gradient-to-tr from-slate-950 via-purple-950 to-slate-950' },
  { name: 'নিয়ন সাইবার', value: 'bg-gradient-to-b from-zinc-950 via-[#00b4d8]/10 to-slate-950' },
  { name: 'সবুজ অরণ্য', value: 'bg-gradient-to-r from-teal-950/70 via-slate-950 to-teal-950/40' },
  { name: 'লাল আগ্নেয়গিরি', value: 'bg-gradient-to-bl from-rose-950/40 via-neutral-950 to-slate-950' },
  { name: 'হালকা হাওয়া', value: 'bg-slate-50' },
];

const STOCK_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
];

interface ProfileSettingsProps {
  currentUser: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onClose: () => void;
}

export default function ProfileSettings({ currentUser, onUpdate, onClose }: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'wallpaper' | 'theme'>('profile');
  const [username, setUsername] = useState(currentUser.username);
  const [profilePictureUrl, setProfilePictureUrl] = useState(currentUser.profilePicture);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customWallpaper, setCustomWallpaper] = useState(currentUser.wallpaper || 'bg-slate-950');
  const [selectedTheme, setSelectedTheme] = useState(currentUser.theme || 'dark');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    setError(null);
    setSuccess(null);

    try {
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/zx82me8y/upload";
      const CLOUDINARY_PRESET = "ChatPlus";

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('ছবি আপলোড করা সম্ভব হয়নি।');
      }

      const data = await response.json();
      setProfilePictureUrl(data.secure_url);
      setSuccess('প্রোফাইল ছবি সফলভাবে আপলোড হয়েছে!');
    } catch (err: any) {
      setError(err.message || 'প্রোফাইল ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWallpaper(true);
    setError(null);
    setSuccess(null);

    try {
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/zx82me8y/upload";
      const CLOUDINARY_PRESET = "ChatPlus";

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('ব্যাকগ্রাউন্ড আপলোড করা সম্ভব হয়নি।');
      }

      const data = await response.json();
      await handleSaveWallpaper(data.secure_url);
      setSuccess('ব্যাকগ্রাউন্ড ছবি সফলভাবে সেট করা হয়েছে!');
    } catch (err: any) {
      setError(err.message || 'ব্যাকগ্রাউন্ড ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingWallpaper(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!username.trim()) {
      setError('ব্যবহারকারীর নাম খালি হতে পারে না');
      setLoading(false);
      return;
    }

    try {
      const finalAvatar = profilePictureUrl;
      const userRef = doc(db, 'users', currentUser.uid);

      await setDoc(userRef, {
        username: username.trim(),
        profilePicture: finalAvatar,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: username.trim(),
          photoURL: finalAvatar
        });
      }

      onUpdate({
        ...currentUser,
        username: username.trim(),
        profilePicture: finalAvatar,
      });

      setSuccess('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
    } catch (err: any) {
      setError(err.message || 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মেলেনি');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      setLoading(false);
      return;
    }

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        
        // Write activity log
        const logId = `log_${Date.now()}`;
        await setDoc(doc(db, 'logs', logId), {
          id: logId,
          userId: currentUser.uid,
          username: currentUser.username,
          action: 'User Changed Password',
          deviceInfo: navigator.userAgent,
          timestamp: serverTimestamp(),
          type: 'system'
        });

        setSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError('অনুমোদনহীন সমস্যা। অনুগ্রহ করে আবার লগইন করুন।');
      }
    } catch (err: any) {
      setError(err.message || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার লগআউট করে লগইন করে চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWallpaper = async (value: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { wallpaper: value }, { merge: true });

      onUpdate({
        ...currentUser,
        wallpaper: value,
      });

      setCustomWallpaper(value);
      setSuccess('চ্যাট ব্যাকগ্রাউন্ড আপডেট করা হয়েছে!');
    } catch (err: any) {
      setError('ব্যাকগ্রাউন্ড পরিবর্তন করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTheme = async (theme: 'dark' | 'light' | 'cyberpunk') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { theme }, { merge: true });

      onUpdate({
        ...currentUser,
        theme,
      });

      setSelectedTheme(theme);
      setSuccess("থিম সফলভাবে পরিবর্তন করা হয়েছে!");
    } catch (err: any) {
      setError("থিম পরিবর্তন করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[600px] overflow-hidden"
      >
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 bg-slate-950/50 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400 font-sans">
              সেটিংস প্যানেল
            </h3>
            <div className="space-y-1.5 font-sans text-xs">
              <button
                onClick={() => { setActiveTab('profile'); setError(null); setSuccess(null); }}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-2.5 transition ${activeTab === 'profile' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <User className="w-4 h-4" /> প্রোফাইল তথ্য
              </button>
              <button
                onClick={() => { setActiveTab('password'); setError(null); setSuccess(null); }}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-2.5 transition ${activeTab === 'password' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Lock className="w-4 h-4" /> পাসওয়ার্ড পরিবর্তন
              </button>
              <button
                onClick={() => { setActiveTab('wallpaper'); setError(null); setSuccess(null); }}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-2.5 transition ${activeTab === 'wallpaper' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Wallpaper className="w-4 h-4" /> চ্যাট ব্যাকগ্রাউন্ড
              </button>
              <button
                onClick={() => { setActiveTab('theme'); setError(null); setSuccess(null); }}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-2.5 transition ${activeTab === 'theme' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Palette className="w-4 h-4" /> থিম পরিবর্তন
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-rose-950/40 hover:bg-rose-900/30 text-rose-300 font-sans text-xs py-3 rounded-xl border border-rose-500/20 flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> লগআউট করুন
          </button>
        </div>

        {/* Configurations Body */}
        <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold tracking-tight text-white capitalize font-sans">
                {activeTab === 'profile' ? 'প্রোফাইল' : activeTab === 'password' ? 'পাসওয়ার্ড' : activeTab === 'wallpaper' ? 'ব্যাকগ্রাউন্ড' : 'থিম'} ব্যবস্থাপনা
              </h4>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xs font-sans bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition"
              >
                বন্ধ করুন [ESC]
              </button>
            </div>

            {/* Notifications */}
            {success && (
              <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                {error}
              </div>
            )}

            {/* TAB: Profile Info */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-1.5">
                    Your Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-[#00b4d8] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-2">
                    Profile Picture Upload
                  </label>
                  
                  <div className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/10 rounded-2xl">
                    <img 
                      src={profilePictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-full object-cover border border-white/20"
                    />
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicUpload}
                        className="hidden"
                        id="profile-pic-upload"
                        disabled={uploadingProfilePic}
                      />
                      <label
                        htmlFor="profile-pic-upload"
                        className="cursor-pointer inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs px-4 py-2.5 rounded-xl transition"
                      >
                        {uploadingProfilePic ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                            Uploading...
                          </span>
                        ) : 'Select Image File'}
                      </label>
                      <p className="text-[10px] font-mono text-slate-500 mt-1.5">PNG, JPG or WEBP up to 5MB. Stored securely on Cloudinary.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || uploadingProfilePic}
                  className="bg-gradient-to-r from-[#00b4d8] to-[#ffd700] hover:opacity-90 text-slate-950 font-mono font-extrabold text-xs px-5 py-3 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'SAVING...' : 'SAVE PROFILE'}
                </button>
              </form>
            )}

            {/* TAB: Change Password */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-1.5">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-[#00b4d8] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-[#00b4d8] transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00b4d8] to-[#ffd700] hover:opacity-90 text-slate-950 font-mono font-extrabold text-xs px-5 py-3 rounded-xl transition cursor-pointer"
                >
                  {loading ? 'UPDATING...' : 'UPDATE SECURE PASSWORD'}
                </button>
              </form>
            )}

            {/* TAB: Wallpaper Configurations */}
            {activeTab === 'wallpaper' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-2">
                    Select Preset Theme Wallpaper background
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {WALLPAPER_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSaveWallpaper(p.value)}
                        className={`h-24 rounded-xl flex flex-col justify-end p-3 relative border transition overflow-hidden text-left ${p.value} ${
                          (currentUser.wallpaper || 'bg-slate-950') === p.value
                            ? 'border-[#00b4d8] ring-2 ring-[#00b4d8]/20 shadow-[0_0_15px_rgba(0,180,216,0.25)]'
                            : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* Active indicator */}
                        {(currentUser.wallpaper || 'bg-slate-950') === p.value && (
                          <div className="absolute top-2 right-2 bg-[#00b4d8] text-slate-950 rounded-full p-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-white/5 backdrop-blur-sm self-start truncate">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-2">
                    Or Upload Custom Wallpaper Image
                  </label>
                  <div className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/10 rounded-2xl">
                    {currentUser.wallpaper && currentUser.wallpaper.startsWith('http') ? (
                      <img 
                        src={currentUser.wallpaper} 
                        alt="Wallpaper Preview" 
                        className="w-16 h-12 object-cover rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-slate-850 border border-white/10 flex items-center justify-center font-mono text-[9px] text-slate-500">
                        Preset Active
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWallpaperUpload}
                        className="hidden"
                        id="wallpaper-pic-upload"
                        disabled={uploadingWallpaper}
                      />
                      <label
                        htmlFor="wallpaper-pic-upload"
                        className="cursor-pointer inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs px-4 py-2.5 rounded-xl transition"
                      >
                        {uploadingWallpaper ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                            Uploading...
                          </span>
                        ) : 'Select Wallpaper Image'}
                      </label>
                      <p className="text-[10px] font-mono text-slate-500 mt-1.5">PNG, JPG or WEBP. Set instantly as chat container backdrop.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Theme Selection */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#00b4d8] mb-2">
                  Choose App visual preset
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['dark', 'light', 'cyberpunk'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleSaveTheme(t)}
                      className={`p-4 rounded-xl border text-center font-mono text-xs uppercase tracking-wider font-extrabold transition relative ${
                        selectedTheme === t
                          ? 'bg-[#00b4d8]/10 text-[#00b4d8] border-[#00b4d8]'
                          : 'bg-slate-950 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {t === 'cyberpunk' && <Sparkles className="w-3.5 h-3.5 absolute top-2 right-2 text-fuchsia-400 animate-pulse" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* persistent developer label */}
          <div className="pt-4 border-t border-white/5 text-center shrink-0">
            <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">
              Developed by <span className="text-[#00b4d8] font-bold uppercase">Utsab Sarker</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
