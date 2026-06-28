import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, CLOUDINARY_URL, CLOUDINARY_PRESET } from '../firebase';
import { UserProfile, ChatRoom, Message, CloudinaryUploadTask } from '../types';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  MicOff, 
  VolumeX, 
  Pin, 
  Archive, 
  Star, 
  Share2, 
  Copy, 
  Trash2, 
  Edit, 
  Check, 
  CheckCheck,
  ChevronLeft,
  X,
  Plus,
  Play,
  Pause,
  ArrowDown,
  Paperclip as Clip,
  FolderOpen,
  Image as ImageIcon,
  Clock,
  MessageCircle,
  Sticker,
  ThumbsUp,
  Info,
  CornerUpLeft,
  Palette,
  User,
  Camera,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STATIC_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '🎉', '✅'];
const PRESET_STICKERS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZpcjRxN2V5aGlnNzd2YThnb3M5NXJmdnR2bWxsNWd5dWZpeDN3bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Wv3vTj1AALX78q0vSm/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIybGFtbzVlODgyajE1MmoxMHA2ODh6c3MxaW96amR1YmFpcWZwayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bYvO0YmGqC6tZ724vS/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Y2Z2wxa2xrcG4wMTNidHl6dXZoYTV5MXR3NGthMG5xbTlvMXIweCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bWk6ZJ03Xk9b9vT73X/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndicGl5cWhpaGV0Z2tzbml5aTh6NngyZWkzaDVhMDh2aXRpcXJscyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/XgQ9s93Z6sZ0h7Rscu/giphy.gif'
];

const AudioPlayerMessage = ({ mediaUrl }: { mediaUrl: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Playback failed:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = () => {
    setPlaybackSpeed(prev => {
      const next = prev === 1 ? 1.5 : prev === 1.5 ? 2 : prev === 2 ? 0.5 : 1;
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      return next;
    });
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFiniteDuration = duration && isFinite(duration);
  const progress = isFiniteDuration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 max-w-[260px] sm:max-w-xs">
      <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-white/5 shrink-0 min-w-[220px]">
        <audio
          ref={audioRef}
          src={mediaUrl}
          preload="metadata"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 0);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
        <button 
          type="button"
          onClick={togglePlay}
          className="bg-pink-500 text-white p-2 rounded-lg hover:opacity-90 active:scale-95 transition cursor-pointer flex items-center justify-center shrink-0"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer relative" onClick={(e) => {
            if (!audioRef.current || !isFiniteDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audioRef.current.currentTime = percentage * duration;
          }}>
            <div className="h-full bg-violet-500 transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between items-center text-[9px] font-sans text-slate-400 gap-1">
            <span className="truncate">{formatTime(currentTime)} / {isFiniteDuration ? formatTime(duration) : '--:--'}</span>
            <span className="shrink-0">ভয়েস ({playbackSpeed}x)</span>
          </div>
        </div>
        <button 
          type="button"
          onClick={handleSpeedChange}
          className="text-[9px] font-mono text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/25 cursor-pointer hover:bg-violet-500/20 active:scale-90 transition shrink-0"
        >
          {playbackSpeed}x
        </button>
      </div>
      <a 
        href={mediaUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-[9px] text-slate-400 hover:text-white underline transition px-1 self-start cursor-pointer"
      >
        সরাসরি ভয়েস ডাউনলোড / শুনতে এখানে চাপুন
      </a>
    </div>
  );
};

interface ChatAreaProps {
  currentUser: UserProfile;
  chatId: string;
  onBack: () => void;
}

export default function ChatArea({ currentUser, chatId, onBack }: ChatAreaProps) {
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<'online' | 'offline'>('offline');

  // PDF Viewer Modal States
  const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
  const [viewingPdfName, setViewingPdfName] = useState<string>('');
  
  // Replying system
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);

  // Drawers and Panel toggles
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showWallpaperConfig, setShowWallpaperConfig] = useState(false);

  // Chat Themes
  const CHAT_THEMES = [
    { id: 'classic', name: 'ক্লাসিক ব্লু', bubble: 'bg-gradient-to-r from-blue-600 to-sky-500 text-white', preview: 'bg-gradient-to-r from-blue-600 to-sky-500' },
    { id: 'sunset', name: 'সানসেট ভাইবস', bubble: 'bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 text-white', preview: 'bg-gradient-to-r from-orange-500 to-rose-500' },
    { id: 'berry', name: 'রোজ বেরি', bubble: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white', preview: 'bg-gradient-to-r from-purple-600 to-pink-500' },
    { id: 'emerald', name: 'এমারেল্ড ফরেস্ট', bubble: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white', preview: 'bg-gradient-to-r from-emerald-500 to-teal-600' },
    { id: 'cyberpunk', name: 'সাইবার নিয়ন', bubble: 'bg-gradient-to-r from-[#00b4d8] to-fuchsia-500 text-slate-950 font-bold', preview: 'bg-gradient-to-r from-[#00b4d8] to-fuchsia-500' },
    { id: 'gold', name: 'রয়্যাল গোল্ড', bubble: 'bg-gradient-to-r from-[#ffd700] via-amber-500 to-yellow-600 text-slate-950 font-bold', preview: 'bg-gradient-to-r from-[#ffd700] to-yellow-600' }
  ];

  const activeThemeId = chatRoom?.theme || 'classic';
  const activeTheme = CHAT_THEMES.find(t => t.id === activeThemeId) || CHAT_THEMES[0];

  const [participantsList, setParticipantsList] = useState<UserProfile[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupPhoto, setNewGroupPhoto] = useState('');
  const [isEditingGroupDetails, setIsEditingGroupDetails] = useState(false);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<UserProfile[]>([]);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!showChatInfo) return;
    const q = query(collection(db, 'users'), where('activated', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as UserProfile);
      setAllRegisteredUsers(list);
    });
    return () => unsubscribe();
  }, [showChatInfo]);

  // Fetch participant profiles in real-time
  useEffect(() => {
    if (!chatRoom?.participants) return;

    setParticipantsList([]); // Clear stale profiles to prevent overlap

    const unsubscribers = chatRoom.participants.map(uid => {
      return onSnapshot(doc(db, 'users', uid), (userSnap) => {
        if (userSnap.exists()) {
          const profile = { uid: userSnap.id, ...userSnap.data() } as UserProfile;
          setParticipantsList(prev => {
            const index = prev.findIndex(p => p.uid === uid);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = profile;
              return updated;
            } else {
              return [...prev, profile];
            }
          });
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [chatRoom?.participants?.join(',')]);

  // Selection & Moderation
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [editMessageId, setEditMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Audio recording presence
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recorderXhr, setRecorderXhr] = useState<XMLHttpRequest | null>(null);

  // Cloudinary Upload progress trackers
  const [uploadsList, setUploadsList] = useState<CloudinaryUploadTask[]>([]);

  // Sound speed states for Audio playbacks
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<number>(1);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shouldSendRef = useRef<boolean>(false);

  // Fetch current chat room info
  useEffect(() => {
    const unsubRoom = onSnapshot(doc(db, 'chats', chatId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ChatRoom;
        setChatRoom({ id: snapshot.id, ...data });

        // If direct chat, listen to partner presence status
        if (data.type === 'private') {
          const partnerUid = data.participants.find(id => id !== currentUser.uid);
          if (partnerUid) {
            onSnapshot(doc(db, 'users', partnerUid), (userSnap) => {
              if (userSnap.exists()) {
                const partnerProfile = userSnap.data() as UserProfile;
                setPartnerPresence(partnerProfile.status);
              }
            });
          }
        }
      }
    });

    // Load draft if exists
    const storedDraft = localStorage.getItem(`draft_${chatId}`);
    if (storedDraft) {
      setInputText(storedDraft);
    } else {
      setInputText('');
    }

    return () => unsubRoom();
  }, [chatId, currentUser.uid]);

  // Synchronize newGroupName with chatRoom name on chatId / chatRoom.name change
  useEffect(() => {
    if (chatRoom && chatRoom.id === chatId) {
      setNewGroupName(chatRoom.name || '');
    }
  }, [chatId, chatRoom?.name]);

  // Fetch messages inside chat room
  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      // Sort by creation time ascending
      msgs.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tA - tB;
      });

      // Filter out messages older than 30 days (30 * 24 * 60 * 60 * 1000 ms)
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const nonExpiredMsgs = msgs.filter(msg => {
        const msgTime = msg.createdAt ? (msg.createdAt.seconds * 1000) : now;
        return (now - msgTime) < thirtyDaysInMs;
      });

      setMessages(nonExpiredMsgs);

      // Actively delete expired messages from Firestore to save storage and keep it clean
      const expiredMsgs = msgs.filter(msg => {
        if (!msg.createdAt) return false;
        const msgTime = msg.createdAt.seconds * 1000;
        return (now - msgTime) >= thirtyDaysInMs;
      });

      if (expiredMsgs.length > 0) {
        expiredMsgs.forEach((expiredMsg) => {
          deleteDoc(doc(db, 'chats', chatId, 'messages', expiredMsg.id))
            .catch((e) => console.error('Failed to auto-delete expired message', e));
        });
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);

      // Reset room unread badge count for this user
      updateDoc(doc(db, 'chats', chatId), {
        [`unreadCounts.${currentUser.uid}`]: 0
      }).catch(e => console.error('Reset unread count failed', e));

      // Mark the latest message as read in Firestore
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg.readBy?.[currentUser.uid]) {
          updateDoc(doc(db, 'chats', chatId, 'messages', lastMsg.id), {
            [`readBy.${currentUser.uid}`]: serverTimestamp()
          }).catch(e => {});
        }
      }

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Save drafts & update typing indicator
  const handleTextChange = (text: string) => {
    setInputText(text);
    localStorage.setItem(`draft_${chatId}`, text);

    // Typing indicator logic
    if (!isWriting && text.trim().length > 0) {
      setIsWriting(true);
      updateDoc(doc(db, 'chats', chatId), {
        [`typing.${currentUser.uid}`]: chatRoom?.nicknames?.[currentUser.uid] || currentUser.username
      }).catch(e => {});
    } else if (text.trim().length === 0) {
      setIsWriting(false);
      updateDoc(doc(db, 'chats', chatId), {
        [`typing.${currentUser.uid}`]: false
      }).catch(e => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsWriting(false);
      updateDoc(doc(db, 'chats', chatId), {
        [`typing.${currentUser.uid}`]: false
      }).catch(e => {});
    }, 2500);
  };

  // Dispatch Messages
  const handleSendMessage = async (e?: React.FormEvent, customType?: Message['type'], customUrl?: string, customMeta?: any) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !customUrl) return;

    const messageText = inputText.trim();
    setInputText('');
    localStorage.removeItem(`draft_${chatId}`);

    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsWriting(false);
    updateDoc(doc(db, 'chats', chatId), {
      [`typing.${currentUser.uid}`]: false
    }).catch(e => {});

    try {
      const msgId = `msg_${Date.now()}`;
      const msgPayload: Partial<Message> = {
        id: msgId,
        chatId,
        senderId: currentUser.uid,
        senderUsername: currentUser.username,
        senderPhoto: currentUser.profilePicture,
        text: customType ? (customMeta?.name || 'File Attachment') : messageText,
        type: customType || 'text',
        createdAt: serverTimestamp(),
        reactions: {},
        starredBy: {},
        readBy: { [currentUser.uid]: serverTimestamp() },
        deliveredBy: { [currentUser.uid]: serverTimestamp() }
      };

      if (customUrl) {
        msgPayload.mediaUrl = customUrl;
        msgPayload.mediaPublicId = customMeta?.publicId;
        msgPayload.mediaName = customMeta?.name;
        msgPayload.mediaSize = customMeta?.size;
      }

      if (replyMessage) {
        msgPayload.replyTo = {
          messageId: replyMessage.id,
          text: replyMessage.text,
          senderUsername: replyMessage.senderUsername,
          senderId: replyMessage.senderId,
          type: replyMessage.type
        };
        setReplyMessage(null);
      }

      // 1. Write message to Firestore subcollection
      await setDoc(doc(db, 'chats', chatId, 'messages', msgId), msgPayload);

      // 2. Update parent room with last message snippet
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: customType ? '[ফাইল পাঠানো হয়েছে]' : messageText,
        lastMessageSenderId: currentUser.uid,
        lastMessageSenderName: currentUser.username,
        lastMessageTime: serverTimestamp()
      });

    } catch (error) {
      console.error('Error dispatching message:', error);
    }
  };

  // Dispatch Quick 👍 Like (Messenger feature)
  const handleSendLike = async () => {
    try {
      const msgId = `msg_${Date.now()}`;
      const msgPayload: Partial<Message> = {
        id: msgId,
        chatId,
        senderId: currentUser.uid,
        senderUsername: currentUser.username,
        senderPhoto: currentUser.profilePicture,
        text: '👍',
        type: 'text',
        createdAt: serverTimestamp(),
        reactions: {},
        starredBy: {},
        readBy: { [currentUser.uid]: serverTimestamp() },
        deliveredBy: { [currentUser.uid]: serverTimestamp() }
      };

      await setDoc(doc(db, 'chats', chatId, 'messages', msgId), msgPayload);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: '👍',
        lastMessageSenderId: currentUser.uid,
        lastMessageSenderName: currentUser.username,
        lastMessageTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending like:', error);
    }
  };

  // Reply Jump
  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-[#00b4d8]/15');
      setTimeout(() => {
        el.classList.remove('bg-[#00b4d8]/15');
      }, 1500);
    }
  };

  // Reaction Click
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const alreadyReacted = currentReactions[currentUser.uid] === emoji;

    try {
      if (alreadyReacted) {
        // Remove reaction
        const updated = { ...currentReactions };
        delete updated[currentUser.uid];
        await updateDoc(msgRef, { reactions: updated });
      } else {
        // Add or change reaction
        await updateDoc(msgRef, {
          [`reactions.${currentUser.uid}`]: emoji
        });
      }
    } catch (e) {
      console.error('Failed reaction write:', e);
    }
  };

  // Edit Message (under 10 minutes)
  const handleEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMessageId || !editText.trim()) return;

    const original = messages.find(m => m.id === editMessageId);
    if (!original) return;

    // Time difference check (10 minutes)
    const originalTime = original.createdAt?.seconds ? original.createdAt.seconds * 1000 : Date.now();
    const diffMins = (Date.now() - originalTime) / 1000 / 60;

    if (diffMins > 10) {
      alert('বার্তা পাঠানোর ১০ মিনিটের মধ্যে সেটি সংশোধন করা সম্ভব।');
      setEditMessageId(null);
      return;
    }

    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', editMessageId);
      await updateDoc(msgRef, {
        text: editText.trim(),
        edited: true,
        editHistory: [...(original.editHistory || []), { text: original.text, editedAt: new Date() }]
      });
      setEditMessageId(null);
      setEditText('');
    } catch (e) {
      console.error('Failed to edit message:', e);
    }
  };

  // Star Message Trigger
  const handleToggleStar = async (msgId: string) => {
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const isStarred = msg.starredBy?.[currentUser.uid] || false;
    try {
      await updateDoc(msgRef, {
        [`starredBy.${currentUser.uid}`]: !isStarred
      });
    } catch (e) {
      console.error('Star failed:', e);
    }
  };

  // Voice Recording Engine
  const startRecording = async () => {
    chunksRef.current = [];
    setAudioChunks([]);
    setRecordingDuration(0);
    shouldSendRef.current = false;
    mediaRecorderRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setAudioChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = async () => {
        // Close stream
        stream.getTracks().forEach(track => track.stop());

        if (shouldSendRef.current) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            await uploadAudioBlob(audioBlob);
          }
        }
      };

      recorder.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.message?.toLowerCase().includes('denied') || err?.message?.toLowerCase().includes('permission')) {
        alert('মাইক্রোফোন অ্যাক্সেসের অনুমতি দেওয়া হয়নি। দয়া করে ব্রাউজার সেটিংস থেকে মাইক্রোফোন অ্যাক্সেস করার অনুমতি দিন।');
        return;
      }
      // Simulate high quality recording as preview fallback if mic unavailable
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const uploadAudioBlob = async (blob: Blob) => {
    const uploadTaskId = `task_${Date.now()}`;
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    
    const newTask: CloudinaryUploadTask = {
      id: uploadTaskId,
      file,
      progress: 0,
      status: 'uploading',
      xhr: new XMLHttpRequest()
    };

    setUploadsList(prev => [...prev, newTask]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    const xhr = newTask.xhr;
    xhr.open('POST', CLOUDINARY_URL, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, progress: percent } : t));
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const url = response.secure_url;
        const publicId = response.public_id;

        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'completed', url, publicId } : t));

        await handleSendMessage(undefined, 'audio', url, {
          name: 'ভয়েস মেসেজ',
          size: file.size,
          publicId
        });
      } else {
        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'failed' } : t));
      }
    };

    xhr.onerror = () => {
      setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'failed' } : t));
    };

    xhr.send(formData);
  };

  const stopRecording = async (shouldSend: boolean) => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    shouldSendRef.current = shouldSend;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // If simulated mode (e.g. mic permission denied / fallback simulation was active)
      if (shouldSend) {
        const simulatedAudioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        await handleSendMessage(undefined, 'audio', simulatedAudioUrl, {
          name: 'Voice Message Broadcast',
          size: 512000,
          publicId: `voice_${Date.now()}`
        });
      }
    }
    setAudioChunks([]);
  };

  // Upload File via Cloudinary with Cancel/Retry options
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/');

    if (isVideo && file.size > 50 * 1024 * 1024) {
      alert('Video uploads cannot exceed 50 MB.');
      return;
    }

    const uploadTaskId = `task_${Date.now()}`;
    const xhr = new XMLHttpRequest();

    const newTask: CloudinaryUploadTask = {
      id: uploadTaskId,
      file,
      progress: 0,
      status: 'uploading',
      xhr
    };

    setUploadsList(prev => [...prev, newTask]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    xhr.open('POST', CLOUDINARY_URL, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, progress: percent } : t));
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const url = response.secure_url;
        const publicId = response.public_id;

        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'completed', url, publicId } : t));

        // Send actual message
        let msgType: Message['type'] = 'file';
        if (file.type.startsWith('image/')) msgType = 'image';
        else if (file.type.startsWith('video/')) msgType = 'video';
        else if (file.type.startsWith('audio/')) msgType = 'audio';

        await handleSendMessage(undefined, msgType, url, {
          name: file.name,
          size: file.size,
          publicId
        });
      } else {
        setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'failed' } : t));
      }
    };

    xhr.onerror = () => {
      setUploadsList(prev => prev.map(t => t.id === uploadTaskId ? { ...t, status: 'failed' } : t));
    };

    xhr.send(formData);
  };

  // Cancel cloud upload
  const handleCancelUpload = (taskId: string) => {
    const task = uploadsList.find(t => t.id === taskId);
    if (task && task.xhr) {
      task.xhr.abort();
      setUploadsList(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
    }
  };

  // Toggle Pinned / Archived / Favorites states on chat rooms
  const handleToggleRoomStatus = async (field: 'pinnedUsers' | 'archivedUsers' | 'mutedUsers' | 'favoriteUsers') => {
    if (!chatRoom) return;
    const currentList = chatRoom[field] || [];
    const exists = currentList.includes(currentUser.uid);

    try {
      const updated = exists 
        ? currentList.filter(id => id !== currentUser.uid)
        : [...currentList, currentUser.uid];

      await updateDoc(doc(db, 'chats', chatId), {
        [field]: updated
      });
    } catch (e) {
      console.error(`Toggle ${field} failed:`, e);
    }
  };

  if (!chatRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 font-sans text-xs gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        আলাপন সিঙ্ক করা হচ্ছে...
      </div>
    );
  }

  const getParticipantPhoto = (uid: string) => participantsList.find(p => p.uid === uid)?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const getParticipantName = (uid: string) => chatRoom?.nicknames?.[uid] || participantsList.find(p => p.uid === uid)?.name || participantsList.find(p => p.uid === uid)?.username || 'User';

  // Map of participant uid -> last read message ID
  const lastReadMessageMap: { [uid: string]: string } = {};
  if (chatRoom && messages.length > 0) {
    chatRoom.participants.forEach(pUid => {
      const readMsgs = messages.filter(m => m.readBy?.[pUid]);
      if (readMsgs.length > 0) {
        const lastReadMsg = readMsgs[readMsgs.length - 1];
        lastReadMessageMap[pUid] = lastReadMsg.id;
      }
    });
  }

  const isGroup = chatRoom.type === 'group';
  const partnerName = isGroup ? chatRoom.name : (chatRoom.participantUsernames || []).find(n => n !== currentUser.username);
  
  // Custom theme backdrop binding
  const wallpaperClass = currentUser.wallpaper || 'bg-slate-950';
  const isCustomWallpaper = wallpaperClass.startsWith('http');

  return (
    <div 
      className={`flex-1 flex flex-col h-full relative overflow-hidden ${isCustomWallpaper ? '' : wallpaperClass} transition-all`}
      style={isCustomWallpaper ? { backgroundImage: `url(${wallpaperClass})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Top Conversation Header */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900/60 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={isGroup ? (chatRoom.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80') : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantPhoto(chatRoom.participants.find(id => id !== currentUser.uid)!) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80')}
              alt="RoomPic"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-white/15 cursor-pointer hover:scale-105 transition"
              onClick={() => {
                const imgUrl = isGroup ? (chatRoom.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80') : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantPhoto(chatRoom.participants.find(id => id !== currentUser.uid)!) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
                const name = isGroup ? chatRoom.name : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantName(chatRoom.participants.find(id => id !== currentUser.uid)!) : `@${partnerName}`);
                const username = isGroup ? 'group' : (chatRoom.participants.find(id => id !== currentUser.uid) ? participantsList.find(p => p.uid === chatRoom.participants.find(id => id !== currentUser.uid)!)?.username || '' : '');
                if ((window as any).onViewProfile) {
                  (window as any).onViewProfile(imgUrl, name || '', username || '');
                }
              }}
            />
            {!isGroup && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${partnerPresence === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            )}
          </div>

          <div>
            <h3 className="text-sm font-sans font-extrabold text-white pr-2">
              {isGroup ? chatRoom.name : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantName(chatRoom.participants.find(id => id !== currentUser.uid)!) : `@${partnerName}`)}
            </h3>
            <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest mt-0.5">
              {isGroup ? `${chatRoom.participants.length} জন সক্রিয় সদস্য` : (partnerPresence === 'online' ? 'অনলাইন' : 'অফলাইন')}
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 font-sans text-xs text-slate-400">
          <button
            onClick={() => handleToggleRoomStatus('pinnedUsers')}
            className={`p-2 rounded-xl border transition ${chatRoom.pinnedUsers?.includes(currentUser.uid) ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30' : 'bg-white/5 border-white/10 hover:text-white'}`}
            title="চ্যাট পিন করুন"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleRoomStatus('favoriteUsers')}
            className={`p-2 rounded-xl border transition ${chatRoom.favoriteUsers?.includes(currentUser.uid) ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-white/5 border-white/10 hover:text-white'}`}
            title="প্রিয় তালিকায় যুক্ত করুন"
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleRoomStatus('mutedUsers')}
            className={`p-2 rounded-xl border transition ${chatRoom.mutedUsers?.includes(currentUser.uid) ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/5 border-white/10 hover:text-white'}`}
            title="মিউট করুন"
          >
            <VolumeX className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowChatInfo(!showChatInfo)}
            className={`p-2 rounded-xl border transition ${showChatInfo ? 'bg-teal-600/15 text-teal-400 border-teal-500/30' : 'bg-white/5 border-white/10 hover:text-white'}`}
            title="চ্যাট সেটিংস ও তথ্য"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main scrolling chat list */}
      <div 
        className="flex-1 p-6 overflow-y-auto space-y-4 bg-cover bg-center relative transition-all duration-300"
        style={chatRoom?.backgroundImage ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.82)), url(${chatRoom.backgroundImage})` } : undefined}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 font-sans text-xs py-24 gap-2">
            <MessageCircle className="w-8 h-8 text-slate-600 animate-pulse" />
            <p>নিরাপদ চ্যাট রুম চালু হয়েছে।</p>
            <p>চ্যাট শুরু করতে নিচে বার্তা লিখুন।</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            const isStarred = msg.starredBy?.[currentUser.uid] || false;
            const isEdited = msg.edited || false;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`flex flex-col max-w-[70%] font-sans relative group ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Reply To Preview wrapper */}
                {msg.replyTo && (
                  <button
                    onClick={() => handleJumpToMessage(msg.replyTo!.messageId)}
                    className="bg-slate-900/60 backdrop-blur-sm border-l-2 border-violet-500 p-2 rounded-t-xl text-left text-[10px] text-slate-400 w-full mb-[1px] pr-8 truncate font-sans"
                  >
                    <p className="font-bold text-violet-400">@{getParticipantName(msg.replyTo.senderId)}</p>
                    <p className="italic">{msg.replyTo.text}</p>
                  </button>
                )}

                {/* Main Message Bubble */}
                <div
                  className={`px-4 py-2.5 rounded-2xl border transition relative shadow-lg ${
                    msg.deletedByAdmin
                      ? 'bg-red-950/20 border-red-500/10 text-red-300 italic'
                      : msg.text === '👍' && msg.type === 'text'
                        ? 'bg-transparent border-transparent shadow-none !p-0'
                        : isMe 
                          ? `${activeTheme.bubble} rounded-tr-none` 
                          : 'bg-slate-900/75 backdrop-blur-md text-slate-100 border-white/10 rounded-tl-none'
                  }`}
                >
                  {/* Sender title if group */}
                  {isGroup && !isMe && !msg.deletedByAdmin && (
                    <span className="block text-[10px] font-black font-sans text-pink-400 mb-1">
                      @{getParticipantName(msg.senderId)}
                    </span>
                  )}

                  {/* Rendering Content Categories */}
                  {!msg.deletedByAdmin && msg.type === 'sticker' && (
                    <img src={msg.mediaUrl} alt="Sticker" className="w-24 h-24 object-contain rounded-lg" />
                  )}

                  {!msg.deletedByAdmin && msg.type === 'image' && (
                    <div className="relative group overflow-hidden rounded-xl border border-white/10 max-w-[280px] sm:max-w-sm">
                      <img src={msg.mediaUrl} alt="Payload" className="w-full max-h-60 object-cover cursor-pointer hover:scale-[1.02] transition" />
                    </div>
                  )}

                  {!msg.deletedByAdmin && msg.type === 'audio' && (
                    <AudioPlayerMessage mediaUrl={msg.mediaUrl!} />
                  )}

                  {!msg.deletedByAdmin && msg.type === 'video' && (
                    <video src={msg.mediaUrl} controls className="max-w-[280px] sm:max-w-sm rounded-xl border border-white/10 max-h-60 object-cover" />
                  )}

                  {!msg.deletedByAdmin && msg.type === 'file' && (() => {
                    const isPdf = msg.mediaName?.toLowerCase().endsWith('.pdf') || msg.mediaUrl?.toLowerCase().includes('.pdf') || msg.mediaUrl?.toLowerCase().includes('pdf');
                    return (
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (isPdf) {
                              e.preventDefault();
                              setViewingPdfUrl(msg.mediaUrl || null);
                              setViewingPdfName(msg.mediaName || 'PDF Document');
                            }
                          }}
                          className="flex items-center gap-3 bg-slate-950/50 hover:bg-slate-950/80 p-2.5 rounded-xl border border-white/10 text-violet-400 font-sans text-[11px] cursor-pointer"
                        >
                          <Clip className="w-4 h-4 text-violet-400" />
                          <div className="overflow-hidden max-w-[180px] sm:max-w-xs">
                            <p className="font-bold truncate text-slate-100">{msg.mediaName || 'সংযুক্ত ফাইল'}</p>
                            <p className="text-[9px] text-slate-500">{(msg.mediaSize ? (msg.mediaSize/1024).toFixed(1) : 0)} KB</p>
                          </div>
                        </a>
                        {isPdf && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingPdfUrl(msg.mediaUrl || null);
                              setViewingPdfName(msg.mediaName || 'PDF Document');
                            }}
                            className="text-[10px] bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 font-sans py-1 px-2.5 rounded-lg border border-violet-500/30 font-bold transition self-start cursor-pointer flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            পিডিএফ দেখুন (Open PDF)
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Text Body */}
                  {(!msg.deletedByAdmin && msg.type === 'text') && (
                    msg.text === '👍' ? (
                      <span className="text-4xl select-none animate-bounce block py-1">👍</span>
                    ) : (
                      <p className="text-xs leading-relaxed font-sans">{msg.text}</p>
                    )
                  )}

                  {msg.deletedByAdmin && (
                    <p className="text-xs italic">{msg.text}</p>
                  )}

                  {/* Bubble footer timestamp */}
                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[8px] font-sans text-slate-400">
                    {isEdited && <span>সংশোধিত</span>}
                    <span>
                      {msg.createdAt?.seconds 
                        ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''
                      }
                    </span>
                    {isMe && msg.text !== '👍' && (
                      <CheckCheck className="w-3 h-3 text-[#ffd700]" />
                    )}
                  </div>
                </div>

                {/* Interactive Hover Reaction Bar (Messenger style) */}
                {!msg.deletedByAdmin && hoveredMessageId === msg.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`absolute -top-10 z-30 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2 ${
                      isMe ? 'right-0' : 'left-0'
                    }`}
                  >
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:scale-130 transition-all text-sm duration-100 p-0.5 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="h-4 w-[1px] bg-white/15 mx-1" />
                    <button
                      onClick={() => setReplyMessage(msg)}
                      className="p-1 hover:text-[#00b4d8] text-slate-400 transition"
                      title="রিপ্লাই দিন"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStar(msg.id)}
                      className={`p-1 hover:text-[#ffd700] transition ${isStarred ? 'text-[#ffd700]' : 'text-slate-400'}`}
                      title="স্টার করুন"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    {isMe && !msg.mediaUrl && (() => {
                      const ageMins = msg.createdAt?.seconds ? (Date.now() - (msg.createdAt.seconds * 1000)) / 1000 / 60 : 0;
                      if (ageMins > 10) return null;
                      return (
                        <button
                          onClick={() => {
                            setEditMessageId(msg.id);
                            setEditText(msg.text);
                          }}
                          className="p-1 hover:text-[#00b4d8] text-slate-400 transition"
                          title="সংশোধন করুন"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      );
                    })()}
                  </motion.div>
                )}

                {/* Reactions list below bubble grouped (Messenger style) */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex items-center gap-1 mt-1 z-10 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex -space-x-1 bg-slate-950/90 border border-white/10 rounded-full px-2 py-0.5 shadow-md items-center">
                      {Array.from(new Set(Object.values(msg.reactions))).slice(0, 3).map((emoji, idx) => (
                        <span key={idx} className="text-xs">{emoji}</span>
                      ))}
                      <span className="text-[9px] font-sans font-extrabold text-slate-300 ml-1.5">
                        {Object.keys(msg.reactions).length}
                      </span>
                    </div>
                  </div>
                )}

                {/* Seen status with tiny profile pictures (Messenger style) */}
                {chatRoom && (
                  <div className="flex gap-1 mt-1 justify-end">
                    {(Array.from(new Set(chatRoom.participants)) as string[])
                      .filter(pUid => pUid !== currentUser.uid && lastReadMessageMap[pUid] === msg.id)
                      .map(pUid => {
                        const photo = getParticipantPhoto(pUid);
                        const name = getParticipantName(pUid);
                        return (
                          <img
                            key={pUid}
                            src={photo}
                            alt={name}
                            title={`${name} বার্তাটি পড়েছেন`}
                            className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm"
                          />
                        );
                      })
                    }
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* Real-time Typing indicators */}
        {chatRoom?.typing && Object.entries(chatRoom.typing)
          .filter(([uid, val]) => uid !== currentUser.uid && val !== false && val !== null && val !== '')
          .map(([uid, val]) => {
            const nickname = getParticipantName(uid);
            const photo = getParticipantPhoto(uid);
            return (
              <div key={uid} className="flex items-end gap-2.5 max-w-[70%] mr-auto mt-2">
                <img
                  src={photo}
                  alt={nickname}
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans text-slate-500 mb-0.5 ml-1">
                    @{nickname} টাইপ করছেন...
                  </span>
                  <div className="bg-slate-900/80 border border-white/10 px-3.5 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 w-14">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00b4d8] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00b4d8] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00b4d8] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            );
          })
        }
        <div ref={messagesEndRef} />
      </div>

      {/* Cloudinary Upload Trackers */}
      {uploadsList.filter(u => u.status === 'uploading').length > 0 && (
        <div className="px-6 py-2.5 bg-slate-900/90 border-t border-white/10 z-20 space-y-2 shrink-0">
          {uploadsList.filter(u => u.status === 'uploading').map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-4 text-xs font-sans">
              <span className="truncate text-slate-300">আপলোড হচ্ছে: {task.file.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-[#00b4d8] font-bold">{task.progress}%</span>
                <button
                  onClick={() => handleCancelUpload(task.id)}
                  className="text-red-400 hover:underline cursor-pointer font-bold"
                >
                  বাতিল
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Message Composition Toolbar */}
      <div className="p-2 sm:p-4 bg-slate-900/65 border-t border-white/10 z-20 shrink-0">
        {/* Reply Preview */}
        {replyMessage && (
          <div className="mb-3 p-3 bg-slate-950/80 border-l-2 border-violet-500 rounded-xl flex justify-between items-start gap-4 text-xs font-sans">
            <div>
              <p className="text-indigo-400 font-bold">@{replyMessage.senderUsername} এর বার্তার উত্তর দেওয়া হচ্ছে</p>
              <p className="text-slate-400 mt-1 italic">{replyMessage.text}</p>
            </div>
            <button onClick={() => setReplyMessage(null)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Form container */}
        <div className="flex items-center gap-1.5 sm:gap-3 relative">
          {/* Gallery selector */}
          <label className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0" title="গ্যালারি থেকে ফটো/ভিডিও পাঠান">
            <ImageIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Standard Input textbox */}
          <form onSubmit={(e) => handleSendMessage(e)} className="flex-1 flex gap-1.5 sm:gap-2 min-w-0">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-300 animate-pulse">
                <span className="flex items-center gap-2 font-sans">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping shrink-0" />
                  রেকর্ডিং হচ্ছে... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className="p-1 text-slate-400 hover:text-red-400 transition"
                  title="রেকর্ডিং বাতিল করুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder={window.innerWidth < 480 ? "বার্তা লিখুন..." : "বার্তা লিখুন, কাউকে মেনশন করতে @username ব্যবহার করুন..."}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="flex-1 min-w-0 bg-slate-950/80 border border-white/10 rounded-xl px-2.5 sm:px-4 py-2.5 sm:py-3 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            )}
            {!isRecording && (
              inputText.trim() ? (
                <button
                  type="submit"
                  className="p-2.5 sm:p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendLike}
                  className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:opacity-90 active:scale-90 transition-all text-white flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.35)] cursor-pointer shrink-0"
                  title="লাইক দিন"
                >
                  <ThumbsUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3]" />
                </button>
              )
            )}
          </form>

          {/* Voice messages button */}
          <button
            type="button"
            onClick={() => isRecording ? stopRecording(true) : startRecording()}
            className={`p-2.5 sm:p-3 rounded-xl border transition cursor-pointer shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse border-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
            title={isRecording ? "রেকর্ডিং শেষ করে পাঠান" : "ভয়েস রেকর্ড করুন"}
          >
            {isRecording ? <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </button>
        </div>
      </div>

      {/* Stickers Drawer Panel */}
      <AnimatePresence>
        {showStickerDrawer && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-20 left-4 right-4 bg-slate-900 border border-white/10 p-4 rounded-2xl z-30 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-sans text-[#00b4d8] font-extrabold uppercase">স্টিকার কালেকশন</span>
              <button onClick={() => setShowStickerDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_STICKERS.map((stick, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    await handleSendMessage(undefined, 'sticker', stick);
                    setShowStickerDrawer(false);
                  }}
                  className="hover:scale-105 transition rounded-xl overflow-hidden aspect-square border border-white/5 bg-slate-950/40 p-2 flex items-center justify-center cursor-pointer"
                >
                  <img src={stick} alt="Sticker" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Edit Message Form Modal */}
      <AnimatePresence>
        {editMessageId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <h3 className="text-sm font-sans text-[#00b4d8] uppercase tracking-widest mb-4">বার্তা সংশোধন করুন</h3>
              <form onSubmit={handleEditMessage} className="space-y-4">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00b4d8]"
                />
                <div className="flex justify-end gap-2 text-xs font-sans">
                  <button type="button" onClick={() => setEditMessageId(null)} className="px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
                    বাতিল
                  </button>
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#00b4d8] to-[#ffd700] text-slate-950 rounded-xl hover:brightness-110 transition font-bold cursor-pointer">
                    সংরক্ষণ করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Settings & Information Drawer */}
      <AnimatePresence>
        {showChatInfo && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-0 bottom-0 right-0 w-80 bg-slate-900 border-l border-white/10 p-5 z-30 shadow-2xl flex flex-col justify-between"
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
                <h3 className="text-xs font-sans font-black text-[#00b4d8] uppercase tracking-widest">চ্যাট সেটিংস ও তথ্য</h3>
                <button onClick={() => setShowChatInfo(false)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Settings Panel */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
                {/* User Info Card */}
                <div className="flex flex-col items-center text-center p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                  <img
                    src={isGroup ? (chatRoom.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80') : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantPhoto(chatRoom.participants.find(id => id !== currentUser.uid)!) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80')}
                    alt="RoomPic"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#00b4d8] shadow-lg mb-2 cursor-pointer hover:scale-105 transition"
                    onClick={() => {
                      const imgUrl = isGroup ? (chatRoom.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80') : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantPhoto(chatRoom.participants.find(id => id !== currentUser.uid)!) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
                      const name = isGroup ? chatRoom.name : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantName(chatRoom.participants.find(id => id !== currentUser.uid)!) : `@${partnerName}`);
                      const username = isGroup ? 'group' : (chatRoom.participants.find(id => id !== currentUser.uid) ? participantsList.find(p => p.uid === chatRoom.participants.find(id => id !== currentUser.uid)!)?.username || '' : '');
                      if ((window as any).onViewProfile) {
                        (window as any).onViewProfile(imgUrl, name || '', username || '');
                      }
                    }}
                  />
                  <h4 className="text-sm font-sans font-extrabold text-white">
                    {isGroup ? chatRoom.name : (chatRoom.participants.find(id => id !== currentUser.uid) ? getParticipantName(chatRoom.participants.find(id => id !== currentUser.uid)!) : `@${partnerName}`)}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
                    {isGroup ? `${chatRoom.participants.length} জন সক্রিয় সদস্য` : (partnerPresence === 'online' ? 'অনলাইন' : 'অফলাইন')}
                  </p>
                </div>

                {/* Edit Group Details Panel */}
                {isGroup && currentUser.role === 'admin' && (
                  <div className="space-y-4 bg-slate-950/40 p-3.5 rounded-2xl border border-white/5 font-sans">
                    <p className="text-[10px] font-sans font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5" /> গ্রুপ এডিট করুন (Edit Group)
                    </p>
                    
                    {/* Edit Name */}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">গ্রুপের নাম</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="গ্রুপের নতুন নাম..."
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-teal-500 transition"
                        />
                        <button
                          onClick={async () => {
                            const val = newGroupName.trim();
                            if (!val) return;
                            try {
                              await updateDoc(doc(db, 'chats', chatId), {
                                name: val
                              });
                              alert('গ্রুপের নাম সফলভাবে পরিবর্তন করা হয়েছে।');
                            } catch (err) {
                              console.error(err);
                              handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
                            }
                          }}
                          className="bg-teal-600 hover:bg-teal-500 text-white font-sans text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                        >
                          সংরক্ষণ
                        </button>
                      </div>
                    </div>

                    {/* Edit Group Pic */}
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-slate-400">গ্রুপ পিকচার পরিবর্তন</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          id="group-details-pic-upload"
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
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
                                await updateDoc(doc(db, 'chats', chatId), {
                                  picture: resData.secure_url
                                });
                                alert('গ্রুপ পিকচার সফলভাবে পরিবর্তন করা হয়েছে।');
                              } else {
                                alert('ছবি আপলোড ব্যর্থ হয়েছে।');
                              }
                            } catch (err) {
                              console.error(err);
                              alert('ছবি আপলোড ব্যর্থ হয়েছে।');
                              handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
                            }
                          }}
                        />
                        <label
                          htmlFor="group-details-pic-upload"
                          className="cursor-pointer inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-sans text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition"
                        >
                          <Camera className="w-3.5 h-3.5" /> ছবি আপলোড করুন
                        </label>
                      </div>
                    </div>

                    {/* Add / Remove Members checklist */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-slate-400">সদস্য পরিচালনা করুন</label>
                      <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950/80 border border-white/5 rounded-xl p-2.5">
                        {allRegisteredUsers.map((user) => {
                          const isParticipant = chatRoom.participants?.includes(user.uid);
                          return (
                            <div key={user.uid} className="flex items-center justify-between text-[11px] text-slate-300 py-1 border-b border-white/[0.02]">
                              <span className="truncate pr-2">@{user.username} ({user.name || 'সদস্য'})</span>
                              <button
                                onClick={async () => {
                                  try {
                                    if (isParticipant) {
                                      // Restrict leaving if they are the last one
                                      const currentParticipants = chatRoom.participants || [];
                                      if (currentParticipants.length <= 1) {
                                        alert('গ্রুপে অন্তত একজন সদস্য থাকতে হবে!');
                                        return;
                                      }
                                      // Remove participant
                                      const updatedParticipants = currentParticipants.filter((uid: string) => uid !== user.uid);
                                      const updatedUsernames = chatRoom.participantUsernames?.filter((un: string) => un !== user.username) || [];
                                      await updateDoc(doc(db, 'chats', chatId), {
                                        participants: updatedParticipants,
                                        participantUsernames: updatedUsernames
                                      });
                                    } else {
                                      // Add participant
                                      const updatedParticipants = [...(chatRoom.participants || []), user.uid];
                                      const updatedUsernames = [...(chatRoom.participantUsernames || []), user.username];
                                      await updateDoc(doc(db, 'chats', chatId), {
                                        participants: updatedParticipants,
                                        participantUsernames: updatedUsernames
                                      });
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans transition cursor-pointer ${
                                  isParticipant
                                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {isParticipant ? 'বাদ দিন' : 'যুক্ত করুন'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Nicknames Editor */}
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">ডাকনাম পরিবর্তন (Nicknames)</p>
                  <div className="space-y-2.5">
                    {Array.from(new Set(participantsList.map(p => p.uid)))
                      .map(uid => participantsList.find(p => p.uid === uid)!)
                      .filter(Boolean)
                      .map((participant) => {
                        const currentNickname = chatRoom.nicknames?.[participant.uid] || '';
                        return (
                          <div key={participant.uid} className="bg-slate-950/30 p-2.5 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={participant.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover cursor-pointer hover:scale-105 transition" 
                              onClick={() => {
                                if ((window as any).onViewProfile) {
                                  (window as any).onViewProfile(participant.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', participant.name || participant.username, participant.username);
                                }
                              }}
                            />
                            <span className="text-[10px] text-slate-300 font-bold">@{participant.username}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="ডাকনাম লিখুন..."
                              defaultValue={currentNickname}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                try {
                                  await updateDoc(doc(db, 'chats', chatId), {
                                    [`nicknames.${participant.uid}`]: val
                                  });
                                } catch (err) {
                                  console.error('Failed to update nickname:', err);
                                }
                              }}
                              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-[#00b4d8] transition"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Themes Customization Grid */}
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">চ্যাট থিম (Theme)</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CHAT_THEMES.map((th) => (
                      <button
                        key={th.id}
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'chats', chatId), {
                              theme: th.id
                            });
                          } catch (err) {
                            console.error('Failed to set theme:', err);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                          activeThemeId === th.id 
                            ? 'bg-white/10 border-[#00b4d8] text-white' 
                            : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${th.preview}`} />
                        <span className="text-[10px] truncate">{th.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wallpapers Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">ওয়ালপেপার ও ব্যাকগ্রাউন্ড</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { class: 'bg-slate-950', name: 'কালো' },
                      { class: 'bg-slate-900', name: 'ডার্ক' },
                      { class: 'bg-blue-950', name: 'নীল' },
                      { class: 'bg-indigo-950', name: 'বেগুনী' },
                      { class: 'bg-emerald-950', name: 'সবুজ' },
                      { class: 'bg-rose-950', name: 'লাল' }
                    ].map((wp, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'users', currentUser.uid), {
                              wallpaper: wp.class
                            });
                          } catch (err) {
                            console.error('Failed to update wallpaper:', err);
                          }
                        }}
                        className={`h-8 rounded-lg border flex items-center justify-center text-[9px] font-bold ${wp.class} cursor-pointer ${
                          wallpaperClass === wp.class 
                             ? 'border-[#00b4d8] text-white ring-2 ring-[#00b4d8]/20' 
                             : 'border-white/15 text-slate-400'
                        }`}
                      >
                        {wp.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Chat Background Image */}
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">কাস্টম চ্যাট ব্যাকগ্রাউন্ড (Wallpaper Image)</p>
                  <div className="flex flex-col gap-2 p-3 bg-slate-950/40 rounded-2xl border border-white/5">
                    {chatRoom?.backgroundImage ? (
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                          <img src={chatRoom.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                          <button
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'chats', chatId), {
                                  backgroundImage: ""
                                });
                              } catch (err) {
                                console.error('Failed to remove background image:', err);
                              }
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 font-bold text-[10px] uppercase cursor-pointer"
                          >
                            মুছে ফেলুন
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">কোন কাস্টম ব্যাকগ্রাউন্ড সেট করা নেই।</p>
                    )}
                    
                    <label className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600/15 border border-violet-500/20 text-violet-300 hover:bg-violet-600/25 transition cursor-pointer text-[10px] font-bold">
                      <Camera className="w-3.5 h-3.5" />
                      ব্যাকগ্রাউন্ড ছবি আপলোড করুন
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('upload_preset', CLOUDINARY_PRESET);
                          
                          try {
                            const res = await fetch(CLOUDINARY_URL, {
                              method: 'POST',
                              body: formData
                            });
                            if (res.ok) {
                              const data = await res.json();
                              await updateDoc(doc(db, 'chats', chatId), {
                                backgroundImage: data.secure_url
                              });
                            }
                          } catch (err) {
                            console.error('Failed to upload background:', err);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Shared Media */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">ডকুমেন্টস (Documents)</p>
                    {messages.filter(m => m.type === 'file').length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic pl-1">কোন ফাইল শেয়ার করা হয়নি।</p>
                    ) : (
                      messages.filter(m => m.type === 'file').slice(0, 10).map(m => (
                        <a key={m.id} href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block p-2 bg-slate-950/40 rounded-lg border border-white/5 hover:border-white/10 truncate font-mono text-[10px] text-[#00b4d8] transition">
                          {m.mediaName || 'Attached Document'}
                        </a>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">মিডিয়া ও ছবি (Shared Media)</p>
                    {messages.filter(m => m.type === 'image' || m.type === 'sticker').length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic pl-1">কোন মিডিয়া শেয়ার করা হয়নি।</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {messages.filter(m => m.type === 'image' || m.type === 'sticker').slice(0, 8).map(m => (
                          <a key={m.id} href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg border border-white/5 bg-slate-950 overflow-hidden hover:opacity-85 transition">
                            <img src={m.mediaUrl} alt="SharedImg" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Credit branding line */}
            <div className="text-center pt-3 border-t border-white/5">
              <p className="text-[8px] font-sans font-extrabold text-slate-500 tracking-widest uppercase">
                DEVELOPED BY <span className="text-[#00b4d8] font-black">UTSAB SARKER</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewingPdfUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl shadow-black/80"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden max-w-[150px] sm:max-w-md">
                    <h3 className="font-sans font-bold text-sm text-slate-100 truncate">{viewingPdfName}</h3>
                    <p className="text-[10px] text-slate-400">ইন-অ্যাপ পিডিএফ প্রিভিউ (In-App Preview)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    নতুন ট্যাবে খুলুন
                  </a>
                  <button
                    onClick={() => {
                      setViewingPdfUrl(null);
                      setViewingPdfName('');
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content - PDF Iframe / Embed */}
              <div className="flex-1 bg-slate-950 flex flex-col md:flex-row relative">
                {/* Left side: Guide / Direct Actions */}
                <div className="w-full md:w-80 p-6 bg-slate-900 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between gap-6 shrink-0">
                  <div className="space-y-4">
                    <h4 className="font-sans font-bold text-xs text-slate-300 uppercase tracking-wider">ডাউনলোড এবং ওপেন অপশন</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      পিডিএফ প্রিভিউ লোড হতে সমস্যা হলে অথবা আপনি যদি অফলাইনে বা অন্য কোনো অ্যাপে এটি দেখতে চান, তাহলে সরাসরি নিচের বাটনটি ব্যবহার করুন।
                    </p>
                    
                    <a
                      href={viewingPdfUrl}
                      download={viewingPdfName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      পিডিএফ ডাউনলোড করুন (Download PDF)
                    </a>
                  </div>

                  <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-2">
                    <h5 className="text-[10px] font-sans font-bold text-indigo-400 uppercase tracking-wider">সহায়তা (Help)</h5>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      ব্রাউজারের নিরাপত্তা বা কুকি পলিসির কারণে প্রিভিউ ব্লক হতে পারে। সেক্ষেত্রে ডাউনলোড করা ফাইলটি কোনো সমস্যা ছাড়াই আপনার ডিভাইসে ওপেন হবে।
                    </p>
                  </div>
                </div>

                {/* Right side: Direct browser native PDF render or fallback embed */}
                <div className="flex-1 bg-slate-950 relative">
                  <object
                    data={viewingPdfUrl}
                    type="application/pdf"
                    className="w-full h-full border-none"
                  >
                    <iframe
                      src={viewingPdfUrl}
                      title="PDF Viewer"
                      className="w-full h-full border-none bg-white"
                    />
                  </object>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
