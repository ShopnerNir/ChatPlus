import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Announcement, UserProfile } from '../types';
import { Megaphone, AlertCircle, Sparkles } from 'lucide-react';

interface MarqueeAnnouncementProps {
  currentUser: UserProfile;
  activeChatId?: string;
}

export default function MarqueeAnnouncement({ currentUser, activeChatId }: MarqueeAnnouncementProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Read only active announcements
    const q = query(
      collection(db, 'announcements'),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAnnouncements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];

      // Filter announcements relevant to this user
      const filtered = allAnnouncements.filter(ann => {
        if (ann.targetType === 'all') return true;
        if (ann.targetType === 'user' && ann.targetId === currentUser.username) return true;
        if (ann.targetType === 'group' && activeChatId && ann.targetId === activeChatId) return true;
        return false;
      });

      // Sort by priority and date
      filtered.sort((a, b) => {
        const priorityWeight = { urgent: 3, important: 2, normal: 1 };
        const weightA = priorityWeight[a.priority] || 1;
        const weightB = priorityWeight[b.priority] || 1;
        
        if (weightA !== weightB) {
          return weightB - weightA; // High priority first
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });

      setAnnouncements(filtered);
    });

    return () => unsubscribe();
  }, [currentUser.username, activeChatId]);

  if (announcements.length === 0) return null;

  const currentAnn = announcements[0]; // Display top priority announcement

  const priorityStyles = {
    urgent: 'border-rose-500/30 bg-rose-950/40 text-rose-300',
    important: 'border-fuchsia-500/30 bg-fuchsia-950/40 text-fuchsia-300',
    normal: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  };

  const badgeTexts = {
    urgent: 'জরুরী',
    important: 'গুরুত্বপূর্ণ',
    normal: 'ঘোষণা',
  };

  return (
    <div className={`px-4 py-2 border-y flex items-center gap-3 transition-colors duration-300 backdrop-blur-md z-10 shrink-0 select-none ${priorityStyles[currentAnn.priority] || priorityStyles.normal}`}>
      {/* Icon with ping effect if urgent */}
      <div className="relative shrink-0 flex items-center justify-center">
        {currentAnn.priority === 'urgent' && (
          <span className="absolute w-3 h-3 rounded-full bg-rose-400 animate-ping opacity-75" />
        )}
        <Megaphone className="w-4 h-4 text-inherit" />
      </div>

      {/* Label Badge */}
      <span className="text-[9px] font-sans font-black uppercase px-1.5 py-0.5 rounded bg-white/15 tracking-wider border border-white/5">
        {badgeTexts[currentAnn.priority] || badgeTexts.normal}
      </span>

      {/* Text Marquee Box */}
      <div className="flex-1 overflow-hidden relative h-4 flex items-center">
        <div className="whitespace-nowrap absolute animate-marquee text-[10px] font-sans font-medium hover:text-white transition-colors">
          {currentAnn.text}
          {currentAnn.link && (
            <a 
              href={currentAnn.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 underline text-violet-400 font-bold hover:text-white"
            >
              বিস্তারিত দেখুন →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
