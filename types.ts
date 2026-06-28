export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  name?: string;
  username: string;
  email: string;
  role: UserRole;
  profilePicture: string;
  status: 'online' | 'offline';
  lastSeen: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  activated: boolean;
  allowedChatPartners: 'all' | string[]; // Array of usernames or 'all'
  wallpaper?: string;
  theme?: 'dark' | 'light' | 'cyberpunk';
  deviceInfo?: string;
}

export interface ChatRoom {
  id: string;
  type: 'private' | 'group';
  name?: string;
  picture?: string;
  description?: string;
  participants: string[]; // User UIDs
  participantUsernames: string[]; // List of usernames
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageTime?: any; // Firestore Timestamp
  unreadCounts: { [uid: string]: number };
  pinnedUsers?: string[]; // list of UIDs who pinned this chat
  archivedUsers?: string[]; // list of UIDs who archived this chat
  mutedUsers?: string[]; // list of UIDs who muted this chat
  favoriteUsers?: string[]; // list of UIDs who favorited this chat
  theme?: string; // Group custom theme
  wallpaper?: string; // Group custom wallpaper
  createdBy: string;
  createdAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderPhoto?: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'gif';
  mediaUrl?: string;
  mediaPublicId?: string;
  mediaName?: string;
  mediaSize?: number;
  createdAt: any; // Firestore Timestamp
  reactions?: { [uid: string]: string }; // uid -> emoji
  replyTo?: {
    messageId: string;
    text: string;
    senderUsername: string;
    senderId: string;
    type?: string;
  };
  edited?: boolean;
  editHistory?: { text: string; editedAt: any }[];
  deletedByAdmin?: boolean;
  starredBy?: { [uid: string]: boolean }; // uid -> true
  readBy?: { [uid: string]: any }; // uid -> Timestamp
  deliveredBy?: { [uid: string]: any }; // uid -> Timestamp
  mentions?: string[]; // list of usernames mentioned
}

export interface Announcement {
  id: string;
  text: string;
  link?: string;
  icon: string; // 📢 🔔 ⚠️ ✅ 📌
  priority: 'normal' | 'important' | 'urgent';
  targetType: 'all' | 'user' | 'group';
  targetId?: string; // target username or chatRoom id
  active: boolean;
  createdAt: any;
  publishedBy: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  deviceInfo: string;
  timestamp: any;
  type: 'login' | 'admin_action' | 'system';
}

export interface CloudinaryUploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
  url?: string;
  publicId?: string;
  xhr?: XMLHttpRequest;
}
