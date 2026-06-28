import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Announcement } from './types';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ProfileSettings from './components/ProfileSettings';
import AdminDashboard from './components/AdminDashboard';
import { 
  MessageSquare, 
  Wifi, 
  Signal, 
  Battery, 
  Megaphone, 
  User, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  Heart,
  ExternalLink,
  Lock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profilePreview, setProfilePreview] = useState<{
    imageUrl: string;
    name: string;
    username: string;
  } | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'chats' | 'notices' | 'settings' | 'admin'>('chats');
  
  // Search state inside sidebar
  const [searchTerm, setSearchTerm] = useState('');

  // Track Firebase connection state
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');

  // Track live digital clock for status bar
  const [phoneTime, setPhoneTime] = useState('');

  // List of announcements for notices feed
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    (window as any).onViewProfile = (imageUrl: string, name: string, username: string) => {
      setProfilePreview({ imageUrl, name, username });
    };
    return () => {
      delete (window as any).onViewProfile;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhoneTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch announcements for notices feed
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'announcements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Announcement);
      // Sort notices: latest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAnnouncements(list);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Handle Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const profile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
          
          if (profile.activated) {
            setCurrentUser(profile);
            
            // Mark online status
            await setDoc(userDocRef, {
              status: 'online',
              lastSeen: serverTimestamp()
            }, { merge: true });
          } else {
            alert('আপনার অ্যাকাউন্টটি অ্যাডমিন দ্বারা সাময়িকভাবে নিষ্ক্রিয় করা হয়েছে।');
            await auth.signOut();
            setCurrentUser(null);
          }
        } else {
          // Fallback auto-create user document if missing
          const defaultProfile: UserProfile = {
            uid: user.uid,
            username: user.email?.split('@')[0] || 'user',
            email: user.email || '',
            role: 'user',
            profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            status: 'online',
            lastSeen: serverTimestamp(),
            createdAt: serverTimestamp(),
            activated: true,
            allowedChatPartners: 'all',
            theme: 'dark'
          };
          await setDoc(userDocRef, defaultProfile);
          setCurrentUser(defaultProfile);
        }
      } else {
        setCurrentUser(null);
      }
    });

    // Offline connection tracker
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update profile status locally when modified inside Settings tab
  const handleUpdateProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
  };

  if (showSplash) {
    return <LoadingScreen onFinished={() => setShowSplash(false)} />;
  }

  if (!currentUser) {
    return <LoginScreen onSuccess={(profile) => setCurrentUser(profile)} />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center font-sans overflow-hidden bg-slate-950 p-0 sm:p-4 md:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black">
      
      {/* Dynamic ambient indigo background glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-indigo-600/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[35rem] h-[35rem] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* 
        Sleek Physical Smartphone Casing Simulator
        On desktop: shows a beautiful bezel container.
        On mobile: collapses margins and shows full screen.
      */}
      <div className={`${
        isMobile 
          ? 'fixed inset-0 w-full h-full' 
          : 'relative w-[410px] h-[840px] rounded-[50px] border-[12px] border-slate-900 shadow-[0_24px_80px_rgba(99,102,241,0.08)] outline outline-2 outline-white/5 ring-1 ring-white/10'
      } flex flex-col overflow-hidden bg-slate-950 transition-all duration-300`}>
        
        {/* Mock Top Smartphone Status Bar (Always visible in mobile layout) */}
        <div className="px-6 pt-3.5 pb-2.5 flex items-center justify-between text-[11px] font-sans text-slate-400 select-none bg-slate-950 shrink-0 z-30">
          <span className="font-extrabold text-white/95">{phoneTime}</span>
          
          {/* Dynamic Island Notch Pill */}
          {!isMobile && (
            <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center relative -top-0.5 border border-white/5 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-slate-950 border border-white/5 ml-auto mr-2" />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3 text-slate-300" />
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <div className="flex items-center gap-0.5">
              <Battery className="w-4 h-4 text-slate-300" />
              <span className="text-[9px] font-bold text-slate-400 font-mono">88%</span>
            </div>
          </div>
        </div>

        {/* Top Offline Connection Banner */}
        {connectionStatus === 'offline' && (
          <div className="bg-rose-600 text-white font-sans text-[9px] text-center py-1 flex items-center justify-center gap-1.5 animate-pulse z-40 shrink-0">
            <Wifi className="w-3 h-3 animate-bounce" /> অফলাইন মোড সক্রিয় - পুনরায় সিঙ্ক করা হচ্ছে...
          </div>
        )}

        {/* 
          Core Application Views Panel (inside simulated screen)
        */}
        <div className="flex-1 flex flex-col relative overflow-hidden w-full bg-slate-950">
          <AnimatePresence initial={false} mode="wait">
            {/* If a conversation chat is selected, slide ChatArea over the entire screen */}
            {activeChatId ? (
              <motion.div
                key="active-chat"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 z-40 w-full h-full bg-slate-950"
              >
                <ChatArea
                  currentUser={currentUser}
                  chatId={activeChatId}
                  onBack={() => setActiveChatId(null)}
                />
              </motion.div>
            ) : (
              /* Otherwise, show standard Bottom Tabs view */
              <motion.div
                key="tabs-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col"
              >
                {/* Active Tab rendering router */}
                <div className="flex-1 overflow-hidden relative">
                  
                  {/* TAB 1: Chats (আলাপ) */}
                  {activeTab === 'chats' && (
                    <div className="w-full h-full">
                      <Sidebar
                        currentUser={currentUser}
                        activeChatId={activeChatId}
                        onSelectChat={(id) => setActiveChatId(id)}
                        searchTerm={searchTerm}
                        onSearchChange={(val) => setSearchTerm(val)}
                      />
                    </div>
                  )}

                  {/* TAB 2: Notices Feed (নোটিশবোর্ড) */}
                  {activeTab === 'notices' && (
                    <div className="w-full h-full flex flex-col bg-slate-950/20">
                      <div className="p-4 border-b border-white/5 bg-slate-900/30 shrink-0 select-none">
                        <h2 className="text-xs font-sans font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-violet-500" /> নোটিশ ও ঘোষণাসমূহ
                        </h2>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {announcements.length === 0 ? (
                          <div className="p-10 text-center text-slate-500 font-sans text-xs flex flex-col items-center justify-center h-64 gap-2">
                            <Megaphone className="w-8 h-8 text-slate-600" />
                            <p>কোনো সক্রিয় নোটিশ বা ঘোষণা নেই।</p>
                          </div>
                        ) : (
                          announcements.map((ann) => {
                            const isUrgent = ann.priority === 'urgent';
                            const isImportant = ann.priority === 'important';
                            return (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={ann.id}
                                className={`p-4 rounded-2xl border text-xs leading-relaxed relative overflow-hidden backdrop-blur-md ${
                                  isUrgent 
                                    ? 'bg-rose-950/20 border-rose-500/20 text-rose-200' 
                                    : isImportant 
                                      ? 'bg-fuchsia-950/20 border-fuchsia-500/20 text-fuchsia-200' 
                                      : 'bg-slate-900/40 border-violet-500/10 text-slate-300'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-sans font-black uppercase border ${
                                    isUrgent 
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                                      : isImportant 
                                        ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400' 
                                        : 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                                  }`}>
                                    {isUrgent ? 'জরুরী' : isImportant ? 'গুরুত্বপূর্ণ' : 'ঘোষণা'}
                                  </span>
                                  <span className="text-[9px] font-sans text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {ann.createdAt?.seconds 
                                      ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString()
                                      : ''
                                    }
                                  </span>
                                </div>
                                <p className="font-sans font-medium text-[11px] whitespace-pre-line leading-normal">
                                  {ann.text}
                                </p>
                                {ann.link && (
                                  <a
                                    href={ann.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-white mt-2.5 font-sans font-extrabold underline transition"
                                  >
                                    বিস্তারিত দেখুন <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Settings (সেটিংস) */}
                  {activeTab === 'settings' && (
                    <div className="w-full h-full flex flex-col bg-slate-950">
                      <div className="flex-1 overflow-y-auto p-4">
                        <ProfileSettings
                          currentUser={currentUser}
                          onUpdate={handleUpdateProfile}
                          onClose={() => setActiveTab('chats')}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Admin Workspace (অ্যাডমিন) */}
                  {activeTab === 'admin' && currentUser.role === 'admin' && (
                    <div className="w-full h-full flex flex-col bg-slate-950">
                      <div className="flex-1 overflow-y-auto">
                        <AdminDashboard
                          currentUser={currentUser}
                          onClose={() => setActiveTab('chats')}
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* 
                  Sleek Frosted Bottom Navigation Tab Bar 
                  Designed beautifully for quick finger reach inside the phone shell.
                */}
                <div className="px-3.5 py-3.5 bg-slate-900/90 border-t border-white/5 backdrop-blur-xl shrink-0 z-30 flex justify-around items-center gap-1 select-none">
                  {/* Chats button */}
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition cursor-pointer ${
                      activeTab === 'chats' 
                        ? 'text-violet-400 scale-105 font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[9px] font-sans">আলাপ</span>
                  </button>

                  {/* Notices button */}
                  <button
                    onClick={() => setActiveTab('notices')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition cursor-pointer ${
                      activeTab === 'notices' 
                        ? 'text-violet-400 scale-105 font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Megaphone className="w-5 h-5" />
                    <span className="text-[9px] font-sans">নোটিশ</span>
                  </button>

                  {/* Settings button */}
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition cursor-pointer ${
                      activeTab === 'settings' 
                        ? 'text-violet-400 scale-105 font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-sans">সেটিংস</span>
                  </button>

                  {/* Admin button (Only shown if user is admin) */}
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition cursor-pointer ${
                        activeTab === 'admin' 
                          ? 'text-pink-400 scale-105 font-bold' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span className="text-[9px] font-sans">কোর</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Smartphone Bezel bottom home bar simulator indicator */}
        {!isMobile && (
          <div className="w-full bg-slate-950 pb-3 flex justify-center shrink-0">
            <div className="w-32 h-1 bg-white/20 rounded-full" />
          </div>
        )}

      </div>

      {/* Enlarged Profile Picture Modal */}
      <AnimatePresence>
        {profilePreview && (
          <div 
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-60 flex flex-col items-center justify-center p-4 cursor-pointer"
            onClick={() => setProfilePreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-sm w-full bg-slate-900 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl gap-4 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setProfilePreview(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-950 border border-white/15 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <img 
                src={profilePreview.imageUrl} 
                alt={profilePreview.name}
                referrerPolicy="no-referrer"
                className="w-64 h-64 rounded-2xl object-cover border-2 border-violet-500 shadow-2xl"
              />
              
              <div className="space-y-1">
                <h3 className="text-base font-sans font-black text-white">{profilePreview.name}</h3>
                {profilePreview.username !== 'group' && (
                  <p className="text-xs font-mono text-violet-400">@{profilePreview.username}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
