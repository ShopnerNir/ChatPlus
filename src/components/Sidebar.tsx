import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp, 
  setDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, CLOUDINARY_URL, CLOUDINARY_PRESET } from '../firebase';
import { UserProfile, ChatRoom } from '../types';
import { 
  Search, 
  ShieldAlert, 
  Plus, 
  MessageSquare, 
  Users as UsersIcon, 
  Pin, 
  VolumeX, 
  Star,
  Hash,
  X,
  PlusCircle,
  Sparkles,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import MarqueeAnnouncement from './MarqueeAnnouncement';
import { motion, AnimatePresence } from 'motion/react';

const STOCK_GROUP_PICS = [
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80',
];

interface SidebarProps {
  currentUser: UserProfile;
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export default function Sidebar({
  currentUser,
  activeChatId,
  onSelectChat,
  searchTerm,
  onSearchChange
}: SidebarProps) {
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<'dm' | 'group'>('dm');
  
  // DM states
  const [selectedUserId, setSelectedUserId] = useState('');

  // Group states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // User UIDs
  const [selectedGroupPic, setSelectedGroupPic] = useState(STOCK_GROUP_PICS[0]);
  const [isUploadingGroupPic, setIsUploadingGroupPic] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Listen to chats containing currentUser
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatRoom[];

      // Sort: pinned first, then lastMessageTime desc
      chatRooms.sort((a, b) => {
        const pinA = (currentUser?.uid && a.pinnedUsers?.includes(currentUser.uid)) ? 1 : 0;
        const pinB = (currentUser?.uid && b.pinnedUsers?.includes(currentUser.uid)) ? 1 : 0;

        if (pinA !== pinB) {
          return pinB - pinA; // pinned first
        }

        const tA = a.lastMessageTime?.seconds || 0;
        const tB = b.lastMessageTime?.seconds || 0;
        return tB - tA;
      });

      setChats(chatRooms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    // Listen to all users for DM list
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as UserProfile);
      setUsers(u.filter(user => user.uid !== currentUser.uid && user.activated));
    });
    return () => unsubUsers();
  }, [currentUser.uid]);

  // Handle DM Creation
  const handleCreateDM = async () => {
    if (!selectedUserId) return;
    const partner = users.find(u => u.uid === selectedUserId);
    if (!partner) return;

    // Check if DM room already exists
    const existing = chats.find(c => 
      c.type === 'private' && 
      currentUser?.uid && c.participants?.includes(currentUser.uid) && 
      partner.uid && c.participants?.includes(partner.uid)
    );

    if (existing) {
      onSelectChat(existing.id);
      setShowCreateModal(false);
      return;
    }

    try {
      const roomId = `chat_${Date.now()}`;
      const newRoom: ChatRoom = {
        id: roomId,
        type: 'private',
        participants: [currentUser.uid, partner.uid],
        participantUsernames: [currentUser.username, partner.username],
        unreadCounts: { [currentUser.uid]: 0, [partner.uid]: 0 },
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        pinnedUsers: [],
        archivedUsers: [],
        mutedUsers: [],
        favoriteUsers: []
      };

      await setDoc(doc(db, 'chats', roomId), newRoom);
      onSelectChat(roomId);
      setShowCreateModal(false);
    } catch (e) {
      console.error('Failed to create DM:', e);
    }
  };

  // Handle Group Creation
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    try {
      const roomId = `chat_${Date.now()}`;
      const memberProfiles = users.filter(u => selectedMembers.includes(u.uid));
      const memberNames = [currentUser.username, ...memberProfiles.map(m => m.username)];
      const allParticipantUids = [currentUser.uid, ...selectedMembers];

      const initialUnreads: { [uid: string]: number } = {};
      allParticipantUids.forEach(uid => {
        initialUnreads[uid] = 0;
      });

      const newRoom: ChatRoom = {
        id: roomId,
        type: 'group',
        name: groupName.trim(),
        description: groupDesc.trim() || undefined,
        picture: selectedGroupPic,
        participants: allParticipantUids,
        participantUsernames: memberNames,
        unreadCounts: initialUnreads,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        pinnedUsers: [],
        archivedUsers: [],
        mutedUsers: [],
        favoriteUsers: []
      };

      await setDoc(doc(db, 'chats', roomId), newRoom);
      onSelectChat(roomId);
      setShowCreateModal(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMembers([]);
    } catch (e) {
      console.error('Failed to create group:', e);
    }
  };

  const handleSelectPartner = async (partner: UserProfile) => {
    // Check if DM room already exists
    const existing = chats.find(c => 
      c.type === 'private' && 
      c.participants?.includes(currentUser.uid) && 
      c.participants?.includes(partner.uid)
    );

    if (existing) {
      onSelectChat(existing.id);
      return;
    }

    // Create a new DM room if it doesn't exist
    try {
      const roomId = `chat_${Date.now()}`;
      const newRoom: ChatRoom = {
        id: roomId,
        type: 'private',
        participants: [currentUser.uid, partner.uid],
        participantUsernames: [currentUser.username, partner.username],
        unreadCounts: { [currentUser.uid]: 0, [partner.uid]: 0 },
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        pinnedUsers: [],
        archivedUsers: [],
        mutedUsers: [],
        favoriteUsers: []
      };

      await setDoc(doc(db, 'chats', roomId), newRoom);
      onSelectChat(roomId);
    } catch (e) {
      console.error('Failed to create DM:', e);
    }
  };

  // Restrict partners according to Admin Whitelist System and user search
  const allowedPartners = users.filter(u => {
    if (!currentUser) return true;
    
    // Whitelist check
    let isWhitelisted = true;
    if (currentUser.allowedChatPartners && currentUser.allowedChatPartners !== 'all') {
      if (Array.isArray(currentUser.allowedChatPartners)) {
        isWhitelisted = currentUser.allowedChatPartners.includes(u.username);
      }
    }
    if (!isWhitelisted) return false;

    // Search query check
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query)
    );
  });

  // Filter group chats based on user search
  const filteredGroupChats = chats.filter(c => {
    if (c.type !== 'group') return false;
    if (!searchTerm) return true;
    return (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Toggle group member selection
  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-slate-950/20 select-none">
      
      {/* Search Input Box */}
      <div className="p-4 border-b border-white/5 relative bg-slate-900/40 shrink-0 z-10">
        <div className="relative">
          <Search className="w-4 h-4 text-indigo-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="সার্চ করুন..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-sans transition-all duration-300 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Persistent Marquee Announcement */}
      <MarqueeAnnouncement currentUser={currentUser} activeChatId={activeChatId || undefined} />

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] p-1 pb-24 space-y-4">
        
        {/* SECTION 1: ALLOWED DIRECT CONTACTS */}
        <div className="space-y-1">
          <p className="px-4 py-2 text-[10px] font-sans font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/[0.02]">
            <MessageSquare className="w-3.5 h-3.5" /> মেসেজ দেওয়ার তালিকা (Allowed Contacts)
          </p>
          {allowedPartners.length === 0 ? (
            <p className="p-4 text-center text-slate-500 font-sans text-[11px]">কোনো অনুমোদিত মেসেজ পার্টনার নেই।</p>
          ) : (
            allowedPartners.map((partner) => {
              // Find if there's an existing private chat with this partner
              const chat = chats.find(c => 
                c.type === 'private' && 
                c.participants?.includes(currentUser.uid) && 
                c.participants?.includes(partner.uid)
              );
              
              const isOnline = partner.status === 'online';
              const hasUnread = chat && (currentUser?.uid && chat.unreadCounts?.[currentUser.uid] || 0) > 0;
              const isActive = chat && activeChatId === chat.id;

              return (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={partner.uid}
                  onClick={() => handleSelectPartner(partner)}
                  className={`w-full text-left p-3 flex items-center gap-3 transition rounded-2xl cursor-pointer relative ${
                    isActive 
                      ? 'bg-slate-800/80 border-l-4 border-indigo-500' 
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={partner.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-2xl object-cover border border-white/10 cursor-pointer hover:scale-105 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((window as any).onViewProfile) {
                          (window as any).onViewProfile(partner.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', partner.name || partner.username, partner.username);
                        }
                      }}
                    />
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex justify-between items-baseline">
                      <p className="font-sans font-black text-xs text-slate-100 truncate pr-2">
                        {partner.name || `@${partner.username}`}
                      </p>
                      {chat && chat.lastMessageTime?.seconds && (
                        <span className="text-[9px] font-sans text-slate-500">
                          {new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] font-sans truncate ${hasUnread ? 'text-white font-extrabold' : 'text-slate-400'}`}>
                      {chat?.lastMessage || `@${partner.username} এর সাথে চ্যাট শুরু করুন।`}
                    </p>
                  </div>

                  {hasUnread && chat && (
                    <div className="absolute right-4 bg-indigo-600 text-white font-sans font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(99,102,241,0.4)] font-mono">
                      {chat.unreadCounts?.[currentUser.uid] || 0}
                    </div>
                  )}
                </motion.button>
              );
            })
          )}
        </div>

        {/* SECTION 2: JOINED GROUPS */}
        <div className="space-y-1">
          <p className="px-4 py-2 text-[10px] font-sans font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/[0.02]">
            <UsersIcon className="w-3.5 h-3.5" /> গ্রুপ চ্যাটরুম (Joined Groups)
          </p>
          {filteredGroupChats.length === 0 ? (
            <p className="p-4 text-center text-slate-500 font-sans text-[11px]">
              {searchTerm ? 'কোনো গ্রুপ চ্যাটরুম পাওয়া যায়নি।' : 'আপনি কোনো গ্রুপে যুক্ত নেই।'}
            </p>
          ) : (
            filteredGroupChats.map((chat) => {
              const isActive = activeChatId === chat.id;
              const hasUnread = (currentUser?.uid && chat.unreadCounts?.[currentUser.uid] || 0) > 0;

              return (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full text-left p-3 flex items-center gap-3 transition rounded-2xl cursor-pointer relative ${
                    isActive 
                      ? 'bg-slate-800/80 border-l-4 border-teal-500' 
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={chat.picture || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80'}
                      alt="GroupPic"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-2xl object-cover border border-white/10 cursor-pointer hover:scale-105 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((window as any).onViewProfile) {
                          (window as any).onViewProfile(chat.picture || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=150&q=80', chat.name || 'Group', 'group');
                        }
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-teal-600 text-white rounded-lg p-0.5 border border-slate-950 scale-75">
                      <UsersIcon className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 font-sans">
                    <div className="flex justify-between items-baseline">
                      <p className="font-sans font-black text-xs text-slate-100 truncate pr-2">
                        {chat.name}
                      </p>
                      {chat.lastMessageTime?.seconds && (
                        <span className="text-[9px] font-sans text-slate-500">
                          {new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] font-sans truncate ${hasUnread ? 'text-white font-extrabold' : 'text-slate-400'}`}>
                      {chat.lastMessage || 'কোনো বার্তা আদান-প্রদান হয়নি।'}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="absolute right-4 bg-teal-600 text-white font-sans font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(20,184,166,0.4)] font-mono">
                      {chat.unreadCounts?.[currentUser.uid] || 0}
                    </div>
                  )}
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button for starting conversation (ADMIN ONLY) */}
      {currentUser?.role === 'admin' && (
        <div className="absolute bottom-20 right-4 z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowCreateModal(true); setModalType('group'); }}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer border border-white/10"
            title="নতুন গ্রুপ তৈরি করুন"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </motion.button>
        </div>
      )}

      {/* Dialog for Creating New Chat */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-y-auto max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                <h3 className="text-xs font-sans font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-500" /> নতুন চ্যাট শুরু করুন
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-xl bg-slate-950 border border-white/15 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DM vs Group Selector (Visible to Admin only) */}
              {currentUser.role === 'admin' ? (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setModalType('dm')}
                    className={`py-2 px-1 rounded-xl border font-sans font-extrabold text-[10px] transition cursor-pointer ${
                      modalType === 'dm' 
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40' 
                        : 'bg-slate-950 text-slate-400 border-white/5'
                    }`}
                  >
                    ব্যক্তিগত চ্যাট
                  </button>
                  <button
                    onClick={() => setModalType('group')}
                    className={`py-2 px-1 rounded-xl border font-sans font-extrabold text-[10px] transition cursor-pointer ${
                      modalType === 'group' 
                        ? 'bg-teal-600/20 text-teal-300 border-teal-500/40' 
                        : 'bg-slate-950 text-slate-400 border-white/5'
                    }`}
                  >
                    গ্রুপ চ্যাটরুম (Group)
                  </button>
                </div>
              ) : (
                <div className="mb-4 bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl text-[10px] font-sans text-indigo-300 leading-normal">
                  নিরাপদ ও গতিশীল এন্ড-টু-এন্ড চ্যাটরুম।
                </div>
              )}

              {/* DM Content Panel */}
              {modalType === 'dm' && (
                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">ব্যবহারকারী নির্বাচন</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- সক্রিয় সদস্য নির্বাচন করুন --</option>
                      {allowedPartners.map((u) => (
                        <option key={u.uid} value={u.uid}>@{u.username} ({u.role === 'admin' ? 'এডমিন' : 'মেম্বার'})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleCreateDM}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-black text-xs py-3 rounded-2xl transition cursor-pointer mt-1"
                  >
                    চ্যাট শুরু করুন
                  </button>
                </div>
              )}

              {/* GROUP Content Panel */}
              {modalType === 'group' && (
                <div className="space-y-4 font-sans text-xs">
                  {/* Group Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">গ্রুপের নাম</label>
                    <input
                      type="text"
                      placeholder="যেমন: আড্ডা জোন, ডেভেলপারস"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-white"
                    />
                  </div>

                  {/* Group Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">গ্রুপের বিবরণ (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      placeholder="যেমন: বন্ধুমহল, কাজের বিবরণ"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-white"
                    />
                  </div>

                  {/* Stock group pics selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">গ্রুপ ব্যানার ছবি</label>
                    <div className="flex gap-2.5 items-center">
                      {STOCK_GROUP_PICS.map((pic, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedGroupPic(pic)}
                          className={`w-10 h-10 rounded-xl overflow-hidden border-2 relative cursor-pointer ${
                            selectedGroupPic === pic ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={pic} className="w-full h-full object-cover" />
                        </button>
                      ))}

                      {/* Upload Group Photo */}
                      <input
                        type="file"
                        accept="image/*"
                        id="group-create-pic-upload"
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          setIsUploadingGroupPic(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', files[0]);
                            formData.append('upload_preset', CLOUDINARY_PRESET);
                            const res = await fetch(CLOUDINARY_URL, {
                              method: 'POST',
                              body: formData
                            });
                            if (res.ok) {
                              const resData = await res.json();
                              setSelectedGroupPic(resData.secure_url);
                            } else {
                              alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
                            }
                          } catch (err) {
                            console.error(err);
                            alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
                          } finally {
                            setIsUploadingGroupPic(false);
                          }
                        }}
                      />
                      <label
                        htmlFor="group-create-pic-upload"
                        className="w-10 h-10 rounded-xl border border-dashed border-white/20 hover:border-teal-500 flex flex-col items-center justify-center text-slate-400 hover:text-white transition cursor-pointer relative bg-slate-950"
                        title="কাস্টম ছবি আপলোড করুন"
                      >
                        {isUploadingGroupPic ? (
                          <span className="text-[8px] animate-pulse">...</span>
                        ) : (
                          <Camera className="w-4 h-4 text-teal-400" />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Members checklist */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">সদস্য যুক্ত করুন ({selectedMembers.length} জন নির্বাচিত)</label>
                    <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-950 border border-white/5 rounded-2xl p-2">
                      {allowedPartners.map((u) => {
                        const isSelected = selectedMembers.includes(u.uid);
                        return (
                          <button
                            key={u.uid}
                            type="button"
                            onClick={() => toggleMember(u.uid)}
                            className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between text-[11px] hover:bg-white/5 cursor-pointer ${
                              isSelected ? 'bg-teal-600/15 text-teal-300' : 'text-slate-400'
                            }`}
                          >
                            <span>@{u.username}</span>
                            <PlusCircle className={`w-4 h-4 ${isSelected ? 'text-teal-500' : 'text-slate-600'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedMembers.length === 0}
                    className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-sans font-black text-xs py-3 rounded-2xl transition cursor-pointer mt-1"
                  >
                    গ্রুপ চ্যাটরুম তৈরি করুন
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
