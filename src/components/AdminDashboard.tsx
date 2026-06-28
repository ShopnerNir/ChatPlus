import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  serverTimestamp,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db, handleFirestoreError, OperationType, firebaseConfig } from '../firebase';
import { UserProfile, ChatRoom, Announcement, ActivityLog, Message } from '../types';
import { 
  BarChart3, 
  Users, 
  Megaphone, 
  FolderLock, 
  Settings, 
  UserPlus, 
  UserCheck,
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Send, 
  History,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Search,
  MessageCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  currentUser: UserProfile;
  onClose: () => void;
}

export default function AdminDashboard({ currentUser, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'announcements' | 'groups' | 'moderation'>('analytics');
  
  // States for database collections
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [chatsList, setChatsList] = useState<ChatRoom[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [logsList, setLogsList] = useState<ActivityLog[]>([]);
  const [totalMessagesCount, setTotalMessagesCount] = useState(0);

  // States for forms
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserPicture, setNewUserPicture] = useState('');
  const [uploadingUserPic, setUploadingUserPic] = useState(false);

  // States for editing users
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPicture, setEditPicture] = useState('');
  const [uploadingEditPic, setUploadingEditPic] = useState(false);
  const [editAllowedPartners, setEditAllowedPartners] = useState<'all' | string[]>('all');
  const [newAnnouncementText, setNewAnnouncementText] = useState('');
  const [newAnnouncementLink, setNewAnnouncementLink] = useState('');
  const [newAnnouncementIcon, setNewAnnouncementIcon] = useState('📢');
  const [newAnnouncementPriority, setNewAnnouncementPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [newAnnouncementTargetType, setNewAnnouncementTargetType] = useState<'all' | 'user' | 'group'>('all');
  const [newAnnouncementTargetId, setNewAnnouncementTargetId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatForMod, setSelectedChatForMod] = useState<string | null>(null);
  const [modMessages, setModMessages] = useState<Message[]>([]);

  // Feedback notifications
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as UserProfile);
      setUsersList(u);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // 2. Subscribe to Chats
    const unsubChats = onSnapshot(collection(db, 'chats'), (snapshot) => {
      const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChatRoom);
      setChatsList(c);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chats'));

    // 3. Subscribe to Announcements
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const a = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Announcement);
      a.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      setAnnouncementsList(a);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'announcements'));

    // 4. Subscribe to Logs
    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      const l = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ActivityLog);
      l.sort((x, y) => (y.timestamp?.seconds || 0) - (x.timestamp?.seconds || 0));
      setLogsList(l.slice(0, 50)); // Keep latest 50 logs
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'logs'));

    return () => {
      unsubUsers();
      unsubChats();
      unsubAnn();
      unsubLogs();
    };
  }, []);

  // Fetch approximate global message counts
  useEffect(() => {
    const fetchTotalMessages = async () => {
      try {
        let count = 0;
        for (const chat of chatsList) {
          const msgSnap = await getDocs(collection(db, 'chats', chat.id, 'messages'));
          count += msgSnap.size;
        }
        setTotalMessagesCount(count);
      } catch (e) {
        console.error('Error fetching total message count:', e);
      }
    };
    if (chatsList.length > 0) {
      fetchTotalMessages();
    }
  }, [chatsList]);

  // Handle selected chat messages for moderation
  useEffect(() => {
    if (!selectedChatForMod) {
      setModMessages([]);
      return;
    }
    const unsubMsgs = onSnapshot(collection(db, 'chats', selectedChatForMod, 'messages'), (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message);
      m.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
      setModMessages(m);
    });
    return () => unsubMsgs();
  }, [selectedChatForMod]);

  // Cloudinary Upload Handler for User Creation & Editing
  const handleUserPicUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isEditMode) {
      setUploadingEditPic(true);
    } else {
      setUploadingUserPic(true);
    }
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
        throw new Error('Cloudinary upload failed');
      }

      const data = await response.json();
      if (isEditMode) {
        setEditPicture(data.secure_url);
      } else {
        setNewUserPicture(data.secure_url);
      }
      setSuccess('Image uploaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      if (isEditMode) {
        setUploadingEditPic(false);
      } else {
        setUploadingUserPic(false);
      }
    }
  };

  // Create User Handler using secondary Firebase app instance
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoading(true);

    if (!newUsername.trim() || !newUserPassword.trim() || !newName.trim()) {
      setError('Please fill in Name, Username and Password fields');
      setLoading(false);
      return;
    }

    const email = `${newUsername.toLowerCase().replace(/\s+/g, '')}@chatplus.com`;

    try {
      // Create user in Firebase Auth using secondary app to avoid logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newUserPassword.trim());
      const userId = userCredential.user.uid;
      await deleteApp(secondaryApp);

      // Create user document in Firestore with full name
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        name: newName.trim(),
        username: newUsername.trim(),
        email: email,
        role: newUserRole,
        profilePicture: newUserPicture || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`,
        status: 'offline',
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
        activated: true,
        allowedChatPartners: 'all',
        theme: 'dark'
      });

      // Save Log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: currentUser.uid,
        username: currentUser.username,
        action: `Created new user profile and Auth: ${newUsername}`,
        deviceInfo: navigator.userAgent,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });

      setSuccess(`User profile and secure account for "${newUsername}" created successfully!`);
      setNewName('');
      setNewUsername('');
      setNewUserPassword('');
      setNewUserPicture('');
    } catch (err: any) {
      setError(err.message || 'Failed to create user in Auth and Firestore');
    } finally {
      setLoading(false);
    }
  };

  // Edit User Handler
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSuccess(null);
    setError(null);
    setLoading(true);

    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        name: editName.trim(),
        username: editUsername.trim(),
        role: editRole,
        profilePicture: editPicture || editingUser.profilePicture,
        allowedChatPartners: editAllowedPartners
      });

      // Save Log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: currentUser.uid,
        username: currentUser.username,
        action: `Edited user: ${editUsername.trim()} (UID: ${editingUser.uid})`,
        deviceInfo: navigator.userAgent,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });

      setSuccess(`User profile for "${editUsername.trim()}" updated successfully!`);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  // Toggle User Activation
  const handleToggleActivation = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        activated: !currentStatus
      });

      // Save Log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: currentUser.uid,
        username: currentUser.username,
        action: `Toggled user activation for UID: ${userId} to ${!currentStatus}`,
        deviceInfo: navigator.userAgent,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });

      setSuccess('User activation status updated!');
    } catch (err) {
      setError('Failed to update activation status');
    }
  };

  // Publish Announcement
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoading(true);

    if (!newAnnouncementText.trim()) {
      setError('Announcement content is required');
      setLoading(false);
      return;
    }

    try {
      // Deactivate other announcements if we want to replace, or keep multiple
      // The user specified: "নতুন Notification Publish করলে পুরনো Notification স্বয়ংক্রিয়ভাবে Replace হবে (অথবা Admin চাইলে একাধিক Active Notification পরিচালনা করতে পারবে)।"
      // Let's replace by setting all other active announcements to inactive!
      const activeQuery = query(collection(db, 'announcements'), where('active', '==', true));
      const activeSnap = await getDocs(activeQuery);
      for (const docSnap of activeSnap.docs) {
        await updateDoc(doc(db, 'announcements', docSnap.id), { active: false });
      }

      // Create new
      const announcementId = `ann_${Date.now()}`;
      const newAnn: Announcement = {
        id: announcementId,
        text: newAnnouncementText.trim(),
        icon: newAnnouncementIcon,
        priority: newAnnouncementPriority,
        targetType: newAnnouncementTargetType,
        active: true,
        createdAt: serverTimestamp(),
        publishedBy: currentUser.username
      };

      if (newAnnouncementLink.trim()) {
        newAnn.link = newAnnouncementLink.trim();
      }
      if (newAnnouncementTargetId.trim()) {
        newAnn.targetId = newAnnouncementTargetId.trim();
      }

      await setDoc(doc(db, 'announcements', announcementId), newAnn);

      // Save Log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: currentUser.uid,
        username: currentUser.username,
        action: `Published announcement: ${newAnnouncementText.substring(0, 30)}...`,
        deviceInfo: navigator.userAgent,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });

      setSuccess('New announcement published & old ones replaced!');
      setNewAnnouncementText('');
      setNewAnnouncementLink('');
      setNewAnnouncementTargetId('');
    } catch (err: any) {
      console.error('Publish announcement error:', err);
      setError(`Failed to publish announcement: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setSuccess('Announcement deleted successfully!');
    } catch (e) {
      setError('Failed to delete announcement');
    }
  };

  // Delete Message (Moderation)
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedChatForMod) return;
    try {
      // Instead of physical deletion, we can mark it as deleted by Admin:
      // "Admin Delete করলে 'This message was deleted by Admin.' দেখাবে।"
      await updateDoc(doc(db, 'chats', selectedChatForMod, 'messages', msgId), {
        text: 'This message was deleted by Admin.',
        type: 'text',
        deletedByAdmin: true,
        mediaUrl: null,
        mediaPublicId: null
      });

      // Save Log
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        userId: currentUser.uid,
        username: currentUser.username,
        action: `Deleted message ${msgId} in Chat Room: ${selectedChatForMod}`,
        deviceInfo: navigator.userAgent,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });

      setSuccess('Message redacted successfully!');
    } catch (err) {
      setError('Failed to redact message');
    }
  };

  // Filter lists based on search query
  const filteredUsers = usersList.filter(u => 
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col font-sans text-slate-100 overflow-hidden">
      {/* Admin Top Header */}
      <div className="bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600/10 p-2 rounded-xl border border-violet-500/20">
            <FolderLock className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-black font-sans bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              ALAPON MASTER CONSOLE
            </h1>
            <p className="text-xs font-sans text-slate-400">
              অ্যাডমিন ড্যাশবোর্ড • সেশন অপারেটর: <span className="text-pink-400 font-bold">@{currentUser.username}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="bg-white/5 hover:bg-white/10 text-white font-mono text-xs px-4 py-2 rounded-xl border border-white/10 transition"
        >
          EXIT SYSTEM [ESC]
        </button>
      </div>

      {/* Main Admin Workspace Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Rail */}
        <div className="w-full md:w-64 bg-slate-900/60 p-4 md:p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0">
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 md:gap-1.5 md:space-y-1.5 font-mono text-[10px] md:text-xs py-2 md:py-0 shrink-0 scrollbar-none">
            <button
              onClick={() => { setActiveTab('analytics'); setError(null); setSuccess(null); }}
              className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-1.5 md:gap-2.5 transition shrink-0 ${activeTab === 'analytics' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> এনালাইটিক্স
            </button>
            <button
              onClick={() => { setActiveTab('users'); setError(null); setSuccess(null); }}
              className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-1.5 md:gap-2.5 transition shrink-0 ${activeTab === 'users' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Users className="w-3.5 h-3.5" /> মেম্বারস
            </button>
            <button
              onClick={() => { setActiveTab('announcements'); setError(null); setSuccess(null); }}
              className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-1.5 md:gap-2.5 transition shrink-0 ${activeTab === 'announcements' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Megaphone className="w-3.5 h-3.5" /> নোটিশবোর্ড
            </button>
            <button
              onClick={() => { setActiveTab('groups'); setError(null); setSuccess(null); }}
              className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-1.5 md:gap-2.5 transition shrink-0 ${activeTab === 'groups' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> গ্রুপসমূহ
            </button>
            <button
              onClick={() => { setActiveTab('moderation'); setError(null); setSuccess(null); }}
              className={`whitespace-nowrap px-3 md:px-4 py-2 md:py-3 rounded-xl flex items-center gap-1.5 md:gap-2.5 transition shrink-0 ${activeTab === 'moderation' ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> মডারেশন
            </button>
          </div>

          <div className="hidden md:block bg-slate-950/50 rounded-2xl p-4 border border-white/5 font-mono text-[10px] text-slate-500 space-y-1">
            <p>DATABASE: FIRESTORE</p>
            <p>STORAGE: CLOUDINARY</p>
            <p>SECURE SESSION: ACTIVE</p>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-950 relative">
          {/* Status Notifications */}
          {success && (
            <div className="mb-6 bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-500/30 text-red-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              {error}
            </div>
          )}

          {/* TAB: Realtime Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Core Users</p>
                  <p className="text-3xl font-extrabold text-white mt-1.5">{usersList.length}</p>
                  <div className="absolute top-4 right-4 bg-[#00b4d8]/10 p-2 rounded-xl border border-[#00b4d8]/20">
                    <Users className="w-5 h-5 text-[#00b4d8]" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Online Presence</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-1.5">
                    {usersList.filter(u => u.status === 'online').length}
                  </p>
                  <div className="absolute top-4 right-4 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping absolute" />
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Group Channels</p>
                  <p className="text-3xl font-extrabold text-[#ffd700] mt-1.5">
                    {chatsList.filter(c => c.type === 'group').length}
                  </p>
                  <div className="absolute top-4 right-4 bg-[#ffd700]/10 p-2 rounded-xl border border-[#ffd700]/20">
                    <MessageCircle className="w-5 h-5 text-[#ffd700]" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Logged Messages</p>
                  <p className="text-3xl font-extrabold text-[#00b4d8] mt-1.5">{totalMessagesCount}</p>
                  <div className="absolute top-4 right-4 bg-[#00b4d8]/10 p-2 rounded-xl border border-[#00b4d8]/20">
                    <FileSpreadsheet className="w-5 h-5 text-[#00b4d8]" />
                  </div>
                </div>
              </div>

              {/* Action Log Entries */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 animate-spin-slow" /> SYSTEM & COMPLIANCE ACTIVITY LOGS (LATEST 50)
                </h3>
                <div className="border border-white/5 bg-slate-950/80 rounded-xl divide-y divide-white/5 max-h-[250px] overflow-y-auto">
                  {logsList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-mono text-xs">
                      No system events logged yet.
                    </div>
                  ) : (
                    logsList.map((log) => (
                      <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 text-xs font-mono">
                        <div className="space-y-1">
                          <p className="text-slate-200">
                            <span className="text-cyan-400 font-bold">@{log.username}</span>: {log.action}
                          </p>
                          <p className="text-[10px] text-slate-500">{log.deviceInfo}</p>
                        </div>
                        <span className="text-slate-500 text-[10px] whitespace-nowrap shrink-0">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just Now'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: User Management */}
          {activeTab === 'users' && (
            <div className="space-y-8 animate-fade-in">
              {/* Create User Form */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> PRE-REGISTER COMPLIANCE USER PROFILE
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Utsab Sarker"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Username</label>
                      <input
                        type="text"
                        placeholder="e.g. utsab"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ''))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="Set secure password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Privilege Level</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                      >
                        <option value="user">USER (STANDARD)</option>
                        <option value="admin">ADMIN (MASTER CONSOLE ACCESS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-950/50 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <img
                        src={newUserPicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt="New User Preview"
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUserPicUpload(e, false)}
                          className="hidden"
                          id="new-user-pic-upload"
                          disabled={uploadingUserPic}
                        />
                        <label
                          htmlFor="new-user-pic-upload"
                          className="cursor-pointer inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs px-4 py-2 rounded-lg transition"
                        >
                          {uploadingUserPic ? 'Uploading Image...' : 'Upload Profile Photo'}
                        </label>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">PNG, JPG, WEBP stored directly in Cloudinary.</p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || uploadingUserPic}
                      className="w-full md:w-auto bg-gradient-to-r from-[#00b4d8] to-[#ffd700] hover:opacity-90 disabled:opacity-50 text-slate-950 font-mono font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
                    >
                      {loading ? 'CREATING...' : 'PRE-CREATE USER PROFILE'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit User Modal Overlay */}
              {editingUser && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-55 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
                    <h4 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> EDIT USER INFORMATION
                    </h4>
                    <form onSubmit={handleEditUser} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Username</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, ''))}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Role Privilege</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-slate-950/50 border border-white/5 rounded-xl">
                        <img
                          src={editPicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt="Edit Preview"
                          className="w-12 h-12 rounded-full object-cover border border-white/10"
                        />
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUserPicUpload(e, true)}
                            className="hidden"
                            id="edit-user-pic-upload"
                            disabled={uploadingEditPic}
                          />
                          <label
                            htmlFor="edit-user-pic-upload"
                            className="cursor-pointer inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs px-4 py-2 rounded-lg transition"
                          >
                            {uploadingEditPic ? 'Uploading...' : 'Upload New Photo'}
                          </label>
                        </div>
                      </div>

                      {/* Whitelisted Chat Partners */}
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                          Allowed to Message (যাদের মেসেজ দিতে পারবে)
                        </label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditAllowedPartners('all')}
                              className={`flex-1 py-2 px-3 border rounded-xl font-mono text-[10px] transition cursor-pointer ${
                                editAllowedPartners === 'all'
                                  ? 'bg-violet-600/15 text-violet-300 border-violet-500'
                                  : 'bg-slate-950 text-slate-400 border-white/5'
                              }`}
                            >
                              EVERYONE (সবাইকে)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditAllowedPartners([])}
                              className={`flex-1 py-2 px-3 border rounded-xl font-mono text-[10px] transition cursor-pointer ${
                                Array.isArray(editAllowedPartners)
                                  ? 'bg-pink-600/15 text-pink-300 border-pink-500'
                                  : 'bg-slate-950 text-slate-400 border-white/5'
                              }`}
                            >
                              RESTRICTED LIST (নির্দিষ্ট তালিকা)
                            </button>
                          </div>

                          {Array.isArray(editAllowedPartners) && (
                            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-white/5">
                              <p className="text-[10px] text-slate-400">অনুমোদিত মেম্বারদের সিলেক্ট করুন:</p>
                              <div className="max-h-28 overflow-y-auto space-y-1">
                                {usersList
                                  .filter((user) => user.uid !== editingUser.uid)
                                  .map((user) => {
                                    const isSelected = editAllowedPartners.includes(user.username);
                                    return (
                                      <button
                                        type="button"
                                        key={user.uid}
                                        onClick={() => {
                                          setEditAllowedPartners((prev) => {
                                            if (!Array.isArray(prev)) return [user.username];
                                            return prev.includes(user.username)
                                              ? prev.filter((u) => u !== user.username)
                                              : [...prev, user.username];
                                          });
                                        }}
                                        className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between text-[11px] hover:bg-white/5 cursor-pointer ${
                                          isSelected ? 'bg-violet-600/15 text-violet-300' : 'text-slate-400'
                                        }`}
                                      >
                                        <span>@{user.username} ({user.name || 'সদস্য'})</span>
                                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-violet-500' : 'bg-slate-700'}`} />
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingUser(null)}
                          className="bg-white/5 hover:bg-white/10 text-white font-mono text-xs px-4 py-2 rounded-xl border border-white/10 transition"
                        >
                          CANCEL
                        </button>
                        <button
                          type="submit"
                          disabled={loading || uploadingEditPic}
                          className="bg-gradient-to-r from-[#00b4d8] to-[#ffd700] hover:opacity-90 disabled:opacity-50 text-slate-950 font-mono font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                        >
                          {loading ? 'SAVING...' : 'SAVE CHANGES'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Blacklisted Users Section (Deactivated Users, showing names not usernames) */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-mono text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> SYSTEM BLACKLIST (DEACTIVATED MEMBERS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usersList.filter(u => !u.activated).length === 0 ? (
                    <div className="p-6 text-center text-slate-500 border border-white/5 bg-slate-950/40 rounded-xl font-mono text-xs col-span-2">
                      Clean compliance record. No accounts blacklisted.
                    </div>
                  ) : (
                    usersList.filter(u => !u.activated).map((u) => (
                      <div key={u.uid} className="flex items-center justify-between p-4 bg-red-950/15 border border-red-500/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img src={u.profilePicture} alt="Banned" className="w-10 h-10 rounded-full object-cover border border-red-500/20" />
                          <div>
                            <p className="text-xs font-sans font-black text-red-200 uppercase tracking-wide">
                              {/* STRICT REQUIREMENT: "ব্ল্যাক লিস্টে ইউজারদের নাম দেখাবে। ইউজার নেম নয়।" */}
                              {u.name || 'Anonymous User'}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500">@{u.username} • Blacklisted</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleActivation(u.uid, u.activated)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition"
                        >
                          UNBAN / ACTIVATE
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Registered Users List */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest">
                    REGISTERED DIRECTORY LISTING
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-mono focus:outline-none focus:border-[#00b4d8] text-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-mono">
                        <th className="py-3 px-4">AVATAR</th>
                        <th className="py-3 px-4">FULL NAME</th>
                        <th className="py-3 px-4">USERNAME</th>
                        <th className="py-3 px-4">ROLE</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4">
                            <img src={u.profilePicture} alt="User" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                          </td>
                          <td className="py-3 px-4 font-sans font-bold text-slate-200">{u.name || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">@{u.username}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${u.role === 'admin' ? 'bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/25' : 'bg-slate-800 text-slate-400'}`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className={u.status === 'online' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right flex items-center justify-end gap-3">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditName(u.name || '');
                                setEditUsername(u.username);
                                setEditRole(u.role);
                                setEditPicture(u.profilePicture);
                                setEditAllowedPartners(u.allowedChatPartners || 'all');
                              }}
                              className="text-[#00b4d8] hover:text-[#00b4d8]/80 transition text-[11px] font-mono border border-[#00b4d8]/20 hover:bg-[#00b4d8]/10 px-2.5 py-1 rounded-lg cursor-pointer"
                              title="Edit User Info"
                            >
                              EDIT INFO
                            </button>

                            <button
                              onClick={() => handleToggleActivation(u.uid, u.activated)}
                              className="text-slate-400 hover:text-white transition"
                              title={u.activated ? 'Deactivate User' : 'Activate User'}
                            >
                              {u.activated ? (
                                <ToggleRight className="w-7 h-7 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-slate-500" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Announcements Publishing Console */}
          {activeTab === 'announcements' && (
            <div className="space-y-8">
              {/* Publish Form */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 animate-bounce" /> PUBLISH SYSTEM-WIDE MARQUEE NOTIFICATION
                </h3>
                <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Message Content</label>
                      <input
                        type="text"
                        placeholder="📢 System maintenance scheduled for 10 PM. Please save documents."
                        value={newAnnouncementText}
                        onChange={(e) => setNewAnnouncementText(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Attachable Action Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/details"
                        value={newAnnouncementLink}
                        onChange={(e) => setNewAnnouncementLink(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Notification Icon</label>
                      <select
                        value={newAnnouncementIcon}
                        onChange={(e) => setNewAnnouncementIcon(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white"
                      >
                        <option value="📢">📢 Broadcast Megaphone</option>
                        <option value="🔔">🔔 Ringing Bell</option>
                        <option value="⚠️">⚠️ Warning Symbol</option>
                        <option value="✅">✅ Verification Mark</option>
                        <option value="📌">📌 Pinned Memo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Urgency Priority</label>
                      <select
                        value={newAnnouncementPriority}
                        onChange={(e) => setNewAnnouncementPriority(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white"
                      >
                        <option value="normal">NORMAL (CYAN GLOW)</option>
                        <option value="important">IMPORTANT (AMBER GLOW)</option>
                        <option value="urgent">URGENT (RED BLINKING GLOW)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Target Audience</label>
                      <select
                        value={newAnnouncementTargetType}
                        onChange={(e) => setNewAnnouncementTargetType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white"
                      >
                        <option value="all">ALL REGISTRANTS</option>
                        <option value="user">SPECIFIC USER</option>
                        <option value="group">SPECIFIC GROUP ROOM</option>
                      </select>
                    </div>

                    {newAnnouncementTargetType !== 'all' && (
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                          {newAnnouncementTargetType === 'user' ? 'Target Username' : 'Group Chat ID'}
                        </label>
                        <input
                          type="text"
                          placeholder={newAnnouncementTargetType === 'user' ? 'e.g. jamil' : 'e.g. chat_1234'}
                          value={newAnnouncementTargetId}
                          onChange={(e) => setNewAnnouncementTargetId(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#00b4d8] text-white font-mono"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-[#00b4d8] to-[#ffd700] hover:opacity-90 text-slate-950 font-mono font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
                  >
                    PUBLISH & REPLACE OLD MARQUEE
                  </button>
                </form>
              </div>

              {/* Announcement publication history */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest mb-4">
                  ANNOUNCEMENTS ARCHIVE & CONTROLS
                </h3>
                <div className="space-y-3">
                  {announcementsList.length === 0 ? (
                    <p className="text-xs text-slate-500 font-mono py-4 text-center">No announcements published yet.</p>
                  ) : (
                    announcementsList.map((ann) => (
                      <div key={ann.id} className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase font-bold text-slate-300">
                              {ann.priority.toUpperCase()}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">By: @{ann.publishedBy}</span>
                          </div>
                          <p className="text-slate-200 mt-1 font-mono">{ann.icon} {ann.text}</p>
                          {ann.link && <p className="text-[10px] text-[#00b4d8] underline">{ann.link}</p>}
                        </div>

                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/20 transition"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Group Supervisor */}
          {activeTab === 'groups' && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-mono text-[#00b4d8] uppercase tracking-widest mb-4">
                ACTIVE GROUP CONVERSATION OVERSEER
              </h3>
              <div className="space-y-3">
                {chatsList.filter(c => c.type === 'group').length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">No group channels created yet.</p>
                ) : (
                  chatsList.filter(c => c.type === 'group').map((chat) => (
                    <div key={chat.id} className="p-4 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={chat.picture || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80'} alt="Group" className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <p className="font-sans font-bold text-slate-200 text-sm">{chat.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Participants: {(chat.participantUsernames || []).join(', ')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#00b4d8] bg-[#00b4d8]/10 px-2 py-0.5 rounded border border-[#00b4d8]/20">
                          ID: {chat.id}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: Message Moderation */}
          {activeTab === 'moderation' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[420px]">
              {/* Select Conversational Room */}
              <div className="border border-white/10 bg-slate-900 rounded-2xl p-4 overflow-y-auto">
                <h3 className="text-xs font-mono text-[#00b4d8] uppercase tracking-widest mb-3">SELECT CONVERSATION</h3>
                <div className="space-y-2">
                  {chatsList.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatForMod(chat.id)}
                      className={`w-full text-left p-3 rounded-xl border transition ${selectedChatForMod === chat.id ? 'bg-[#00b4d8]/10 border-[#00b4d8]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}
                    >
                      <p className="font-sans font-bold text-slate-200 text-xs truncate">
                        {chat.type === 'group' ? `[GROUP] ${chat.name}` : `[1-to-1] ${(chat.participantUsernames || []).join(' & ')}`}
                      </p>
                      <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{chat.lastMessage || 'No messages'}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Moderation Live Chat Feed */}
              <div className="md:col-span-2 border border-white/10 bg-slate-900 rounded-2xl p-5 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-3">
                  <h3 className="text-xs font-mono text-[#00b4d8] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                    {selectedChatForMod ? `MODERATING FEED FOR ROOM: ${selectedChatForMod}` : 'PLEASE SELECT A ROOM ON THE LEFT'}
                  </h3>

                  {selectedChatForMod && modMessages.length === 0 && (
                    <p className="text-xs text-slate-500 font-mono py-12 text-center">No logs recorded in this room.</p>
                  )}

                  {modMessages.map((msg) => (
                    <div key={msg.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-start justify-between gap-4 text-xs font-mono">
                      <div>
                        <p className="text-[10px] text-slate-500">Sender: @{msg.senderUsername}</p>
                        <p className="text-slate-200 mt-1">{msg.text}</p>
                        {msg.edited && (
                          <span className="text-[9px] text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-500/10 mt-1.5 inline-block">
                            EDITED HISTORY ACTIVE
                          </span>
                        )}
                      </div>

                      {!msg.deletedByAdmin && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 rounded bg-red-950/30 hover:bg-red-900/30 text-red-400 border border-red-500/20 transition shrink-0"
                          title="Redact Message Content"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developed by Footer */}
      <div className="bg-slate-900 border-t border-white/10 px-6 py-3 text-center shrink-0">
        <p className="text-[10px] font-mono text-slate-500 tracking-wider">
          DEVELOPED BY <span className="text-[#00b4d8] font-bold uppercase">UTSAB SARKER</span>
        </p>
      </div>
    </div>
  );
}
