import { create } from 'zustand';

import { people, posts as initialPosts, conversations as initialConversations } from './data/mock';
import type { GroupMember, Post, Conversation } from './data/types';
import { displayName } from './data/userIdentity';
import { createNotification, markConversationNotificationsRead } from './notificationsService';

interface Toast {
  id: number;
  message: string;
  icon: string;
}

export interface OnboardingProfile {
  name: string;
  photo: string;
  biography: string;
  interests: string[];
  purpose: string;
}

export type ProfileBannerBackground =
  | 'academix'
  | 'deep-blue'
  | 'ocean-teal'
  | 'purple'
  | 'sunset-orange'
  | 'emerald-green'
  | 'rose-pink'
  | 'slate-gray'
  | 'midnight-dark'
  | 'sky-blue'
  | 'indigo'
  | 'lavender'
  | 'coral'
  | 'amber'
  | 'forest-green'
  | 'mint'
  | 'berry'
  | 'copper'
  | `#${string}`;

export interface AuthenticatedUser extends OnboardingProfile {
  id: string;
  email: string;
  role: 'scholar' | 'prospective' | 'faculty';
  bannerBackground?: ProfileBannerBackground;
  bannerImage?: string;
  bannerImagePosition?: string;
  bannerImageZoom?: number;
  location?: string;
  university?: string;
  major?: string;
  graduationYear?: number;
  verificationStatus: 'pending' | 'unverified' | 'verified' | 'rejected';
}

interface AppState {
  posts: Post[];
  conversations: Conversation[];
  mentorQuestions: { question: string; mentorId: string; createdAt: string }[];
  savedColleges: string[];
  signedIn: boolean;
  authChecked: boolean;
  user: AuthenticatedUser | null;
  advisorOpen: boolean;
  authOpen: boolean;
  toast: Toast | null;
  miniChatConversationId: string | null;
  miniChatMinimized: boolean;
  miniChatHidden: boolean;
  messageSoundsEnabled: boolean;

  vote: (postId: string, direction: 1 | -1) => void;
  toggleBookmark: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  publish: (input: { title: string; body: string; forum: string; anonymous: boolean; image?: Post['image']; universityId?: string }) => void;
  createGroup: (input: { name: string; bio: string; picture?: string; members: GroupMember[] }) => string | null;
  saveMentorQuestion: (input: { question: string; mentorId: string }) => void;

  markRead: (conversationId: string) => void;
  reply: (conversationId: string, text: string) => void;

  toggleSavedCollege: (collegeId: string) => void;
  setSignedIn: (value: boolean) => void;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  setAdvisorOpen: (value: boolean) => void;
  setAuthOpen: (value: boolean) => void;
  setMiniChatConversationId: (conversationId: string | null) => void;
  setMiniChatMinimized: (minimized: boolean) => void;
  setMiniChatHidden: (hidden: boolean) => void;
  setMessageSoundsEnabled: (enabled: boolean) => void;
  openMiniChatForPerson: (person: { id: string; name: string; subtitle: string; avatar?: string }) => string;
  receiveMessage: (conversationId: string, message: Conversation['messages'][number]) => void;
  showToast: (message: string, icon?: string) => void;
}

const updatePost = (posts: Post[], id: string, change: (p: Post) => Post) =>
  posts.map((p) => (p.id === id ? change(p) : p));

const updateConversation = (conversations: Conversation[], id: string, change: (t: Conversation) => Conversation) =>
  conversations.map((t) => (t.id === id ? change(t) : t));

/** Composer'daki forum adını feed kanal filtresine eşler. */
const channelForForum = (forum: string) =>
  forum.includes('Admissions') ? 'admissions' : forum.includes('Research') ? 'research' : 'all';

let toastId = 0;

const playMessageNotification = () => {
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 720;
  volume.gain.value = 0.035;
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.onended = () => void context.close();
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
};

/**
 * Community content is seeded locally; authenticated account data comes from the API.
 */
export const useApp = create<AppState>((set, get) => ({
  posts: initialPosts,
  conversations: initialConversations,
  mentorQuestions: [],
  savedColleges: [],
  signedIn: false,
  authChecked: false,
  user: null,
  advisorOpen: false,
  authOpen: false,
  toast: null,
  miniChatConversationId: null,
  miniChatMinimized: false,
  miniChatHidden: false,
  messageSoundsEnabled: typeof window !== 'undefined' && window.localStorage.getItem('academix.message-sounds') === 'true',

  // Aynı yöne tekrar basmak oyu geri alır.
  vote: (postId, direction) =>
    set((s) => ({
      posts: updatePost(s.posts, postId, (p) => {
        const next = p.myVote === direction ? 0 : direction;
        const likes = p.likes + (next === 1 ? 1 : 0) - (p.myVote === 1 ? 1 : 0);
        const dislikes = p.dislikes + (next === -1 ? 1 : 0) - (p.myVote === -1 ? 1 : 0);
        return { ...p, likes, dislikes, votes: likes - dislikes, myVote: next };
      }),
    })),

  toggleBookmark: (postId) =>
    set((s) => ({ posts: updatePost(s.posts, postId, (p) => ({ ...p, bookmarked: !p.bookmarked })) })),

  addComment: (postId, text) =>
    set((s) => ({
      posts: updatePost(s.posts, postId, (p) => ({
        ...p,
        comments: [...p.comments, { author: s.user ? {
          id: s.user.id,
          name: displayName(s.user.name, s.user.email),
          subtitle: s.user.university && s.user.major ? `${s.user.major} • ${s.user.university}` : 'Academix community member',
          verification: s.user.verificationStatus === 'verified' ? 'edu' : s.user.role === 'prospective' ? 'prospective' : 'unverified',
          ...(s.user.photo ? { avatar: s.user.photo } : {}),
          interests: s.user.interests,
          about: s.user.biography,
          education: s.user.university && s.user.major
            ? `${s.user.university} • ${s.user.major}${s.user.graduationYear ? ` • Class of ${s.user.graduationYear}` : ''}`
            : undefined,
        } : people.anonymous, timeAgo: 'Just now', text }],
        commentCount: p.commentCount + 1,
      })),
    })),

  publish: ({ title, body, forum, anonymous, image, universityId }) =>
    set((s) => ({
      posts: [
        {
          id: `local-${Date.now()}`,
          author: anonymous || !s.user ? people.anonymous : {
            id: s.user.id,
            name: displayName(s.user.name, s.user.email),
            subtitle: s.user.university && s.user.major ? `${s.user.major} • ${s.user.university}` : 'Academix community member',
            verification: s.user.verificationStatus === 'verified' ? 'edu' : s.user.role === 'prospective' ? 'prospective' : 'unverified',
            ...(s.user.photo ? { avatar: s.user.photo } : {}),
            interests: s.user.interests,
            about: s.user.biography,
            education: s.user.university && s.user.major
              ? `${s.user.university} • ${s.user.major}${s.user.graduationYear ? ` • Class of ${s.user.graduationYear}` : ''}`
              : undefined,
          },
          authorType: anonymous || !s.user
              ? 'Prospective'
              : s.user.role === 'faculty'
                ? 'Faculty Representative'
                : s.user.role === 'scholar'
                  ? 'Student Scholar'
                  : 'Prospective',
          timeAgo: 'Just now',
          title,
          body,
          ...(image ? { image } : {}),
          channelId: channelForForum(forum),
          ...(universityId ? { universityId } : {}),
          tabs: ['trending', 'latest'],
          votes: 0,
          likes: 0,
          dislikes: 0,
          myVote: 0,
          commentCount: 0,
          comments: [],
          bookmarked: false,
        },
        ...s.posts,
      ],
    })),

  createGroup: ({ name, bio, picture, members }) => {
    const state = get();
    const selectedMembers = members.filter((member) => member.id !== state.user?.id);
    const selectedIds = [...new Set(selectedMembers.map((member) => member.id))];
    if (selectedIds.length < 2) {
      get().showToast('A group needs at least 2 other members.', 'error');
      return null;
    }

    const groupName = name.trim();
    if (!groupName) {
      get().showToast('Enter a group name.', 'error');
      return null;
    }

    const currentUserName = state.user
      ? displayName(state.user.name, state.user.email)
      : 'You';
    const currentUserId = state.user?.id ?? 'current-user';
    const currentUser: GroupMember = {
      id: currentUserId,
      name: currentUserName,
      ...(state.user?.photo ? { avatar: state.user.photo } : {}),
      universityOrRole: [state.user?.university, state.user?.role === 'faculty' ? 'Faculty' : state.user?.role === 'scholar' ? 'Student' : 'Applicant']
        .filter(Boolean)
        .join(' · ') || 'Group admin',
      isAdmin: true,
      isCurrentUser: true,
    };
    const groupMembers = [
      currentUser,
      ...selectedMembers.map((member) => ({ ...member, isAdmin: false, isCurrentUser: false })),
    ];
    const createdAt = new Date().toISOString();
    const conversationId = `group-${Date.now()}`;
    const conversation: Conversation = {
      id: conversationId,
      groupBio: bio.trim(),
      groupPicture: picture,
      groupCreatedAt: createdAt,
      groupAdminId: currentUserId,
      groupMembers,
      groupSharedPosts: [
        {
          id: 'p4',
          title: 'ADA University to Host International Conference on Digital Innovation 2026',
          author: 'Leyla Hasanli',
          time: 'Today',
          href: '/search?q=ADA%20University%20to%20Host%20International%20Conference%20on%20Digital%20Innovation%202026&type=discussions',
        },
      ],
      groupSharedLinks: [
        { url: 'https://www.ada.edu.az/en', sender: currentUserName, date: createdAt },
      ],
      groupSharedDocuments: [
        {
          id: 'welcome-note',
          fileName: 'Group-welcome-note.txt',
          size: '1 KB',
          sender: currentUserName,
          date: createdAt,
          downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(`Welcome to ${groupName.trim()}!`)}`,
        },
      ],
      category: 'Group',
      timeAgo: 'Just now',
      title: groupName,
      preview: 'Group created',
      from: groupName,
      fromMeta: `${groupMembers.length} members`,
      messages: [],
      unread: false,
    };

    set((current) => ({
      conversations: [conversation, ...current.conversations],
      miniChatConversationId: conversationId,
      miniChatMinimized: false,
      miniChatHidden: false,
    }));
    return conversationId;
  },

  saveMentorQuestion: (input) =>
    set((state) => ({
      mentorQuestions: [...state.mentorQuestions, { ...input, createdAt: new Date().toISOString() }],
    })),

  markRead: (conversationId) =>
    set((s) => {
      const conversation = s.conversations.find((item) => item.id === conversationId);
      if (conversation?.unread && s.user) {
        void markConversationNotificationsRead(s.user, conversationId).catch(() =>
          get().showToast('Unable to sync notification status', 'error'),
        );
      }
      return { conversations: updateConversation(s.conversations, conversationId, (t) => ({ ...t, unread: false })) };
    }),

  reply: (conversationId, text) => {
    const state = get();
    const sender = displayName(state.user?.name, state.user?.email);
    const sentAt = new Date().toISOString();
    const links = [...text.matchAll(/https?:\/\/[^\s]+/gi)]
      .map(([url]) => url.replace(/[.,!?;:)\]}]+$/, ''))
      .filter((url): url is string => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      });

    set((s) => ({
      conversations: updateConversation(s.conversations, conversationId, (t) => ({
        ...t,
        messages: [...t.messages, { author: sender, time: 'Just now', text, isMe: true }],
        ...(t.category === 'Group' && links.length
          ? {
            groupSharedLinks: [
              ...(t.groupSharedLinks ?? []),
              ...links.map((url) => ({ url, sender, date: sentAt })),
            ],
          }
          : {}),
        suggestedReply: undefined,
      })),
    }));
  },


  toggleSavedCollege: (collegeId) =>
    set((s) => ({
      savedColleges: s.savedColleges.includes(collegeId)
        ? s.savedColleges.filter((id) => id !== collegeId)
        : [...s.savedColleges, collegeId],
    })),

  setSignedIn: (signedIn) => set((s) => ({
    signedIn,
    authChecked: true,
    ...(signedIn ? {} : {
      user: null,
      miniChatConversationId: null,
      miniChatMinimized: false,
      miniChatHidden: false,
      ...(s.user ? { posts: initialPosts, conversations: initialConversations, savedColleges: [] } : {}),
    }),
  })),
  setAuthenticatedUser: (user) => set((s) => ({
    user,
    signedIn: true,
    authChecked: true,
    ...(s.user?.id !== user.id ? { miniChatConversationId: null, miniChatMinimized: false, miniChatHidden: false } : {}),
    ...(s.user?.id !== user.id ? { posts: initialPosts, conversations: initialConversations, savedColleges: [] } : {}),
  })),
  setAdvisorOpen: (advisorOpen) => set({ advisorOpen }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  setMiniChatConversationId: (miniChatConversationId) => set({
    miniChatConversationId,
    ...(!miniChatConversationId ? { miniChatMinimized: false, miniChatHidden: false } : { miniChatHidden: false }),
  }),
  setMiniChatMinimized: (miniChatMinimized) => set({ miniChatMinimized }),
  setMiniChatHidden: (miniChatHidden) => set({ miniChatHidden }),
  setMessageSoundsEnabled: (messageSoundsEnabled) => {
    window.localStorage.setItem('academix.message-sounds', String(messageSoundsEnabled));
    set({ messageSoundsEnabled });
  },
  openMiniChatForPerson: (person) => {
    const state = get();
    const existing = state.conversations.find((conversation) =>
        conversation.contactId === person.id ||
        (conversation.category === 'Direct message' &&
          (conversation.from === person.name ||
            conversation.messages.some((message) => message.author === person.name && !message.isMe))),
      );
    const conversationId = existing?.id ?? `direct-${person.id}`;
    set((current) => {
      const conversations = existing ? current.conversations : [
        {
          id: conversationId,
          contactId: person.id,
          ...(person.avatar ? { contactAvatar: person.avatar } : {}),
          category: 'Direct message',
          timeAgo: 'Just now',
          title: `Conversation with ${person.name}`,
          preview: '',
          from: person.name,
          fromMeta: person.subtitle,
          messages: [],
          unread: false,
        },
        ...state.conversations,
      ];
      return {
        conversations,
        miniChatConversationId: conversationId,
        miniChatMinimized: false,
        miniChatHidden: false,
      };
    });
    return conversationId;
  },
  receiveMessage: (conversationId, message) => {
    const state = get();
    if (!state.conversations.some((item) => item.id === conversationId)) {
      state.showToast('Unable to open this conversation', 'error');
      return;
    }
    const shouldNotify = !message.isMe && state.messageSoundsEnabled &&
      (state.miniChatConversationId !== conversationId || state.miniChatMinimized || state.miniChatHidden ||
        (typeof document !== 'undefined' &&
          (document.visibilityState !== 'visible' || !document.hasFocus())));
    set((current) => ({
        conversations: updateConversation(current.conversations, conversationId, (item) => ({
          ...item,
          messages: [...item.messages, message],
          preview: message.text,
          unread: !message.isMe,
          timeAgo: 'Just now',
        })),
        ...(!message.isMe
          ? {
            miniChatConversationId: conversationId,
            miniChatMinimized: current.miniChatConversationId !== conversationId || current.miniChatMinimized || current.miniChatHidden,
            miniChatHidden: false,
          }
          : {}),
      }));
    if (!message.isMe && state.user) {
      const conversation = state.conversations.find((item) => item.id === conversationId);
      const id = `message-${conversationId}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      void createNotification(state.user, {
        id,
        type: 'message',
        senderName: displayName(message.author),
        ...(conversation?.contactAvatar ? { senderAvatar: conversation.contactAvatar } : {}),
        text: 'sent you a message',
        href: `/inbox/${conversationId}`,
        conversationId,
      }).catch(() => get().showToast('Unable to save the new notification', 'error'));
    }
    if (shouldNotify && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        playMessageNotification();
      } catch {
        get().showToast('Unable to play the message notification sound', 'error');
      }
    }
  },

  showToast: (message, icon = 'check_circle') => {
    const id = ++toastId;
    set({ toast: { id, message, icon } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2600);
  },
}));

export const useUnreadCount = () => useApp((s) => s.conversations.filter((conversation) => conversation.unread).length);
