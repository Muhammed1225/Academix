import { create } from 'zustand';

import { people, posts as initialPosts, tickets as initialTickets } from './data/mock';
import type { Post, Ticket } from './data/types';
import { displayName } from './data/userIdentity';
import { createNotification, markTicketNotificationsRead } from './notificationsService';

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
  verificationStatus: 'pending' | 'unverified' | 'verified';
}

interface AppState {
  posts: Post[];
  tickets: Ticket[];
  savedColleges: string[];
  signedIn: boolean;
  authChecked: boolean;
  user: AuthenticatedUser | null;
  advisorOpen: boolean;
  authOpen: boolean;
  toast: Toast | null;
  miniChatTicketId: string | null;
  miniChatMinimized: boolean;
  miniChatHidden: boolean;
  messageSoundsEnabled: boolean;

  vote: (postId: string, direction: 1 | -1) => void;
  toggleBookmark: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  publish: (input: { title: string; body: string; forum: string; anonymous: boolean; image?: Post['image']; universityId?: string }) => void;

  markRead: (ticketId: string) => void;
  reply: (ticketId: string, text: string) => void;
  toggleResolved: (ticketId: string) => void;

  toggleSavedCollege: (collegeId: string) => void;
  setSignedIn: (value: boolean) => void;
  setAuthenticatedUser: (user: AuthenticatedUser) => void;
  setAdvisorOpen: (value: boolean) => void;
  setAuthOpen: (value: boolean) => void;
  setMiniChatTicketId: (ticketId: string | null) => void;
  setMiniChatMinimized: (minimized: boolean) => void;
  setMiniChatHidden: (hidden: boolean) => void;
  setMessageSoundsEnabled: (enabled: boolean) => void;
  openMiniChatForPerson: (person: { id: string; name: string; subtitle: string; avatar?: string }) => void;
  receiveMessage: (ticketId: string, message: Ticket['messages'][number]) => void;
  showToast: (message: string, icon?: string) => void;
}

const updatePost = (posts: Post[], id: string, change: (p: Post) => Post) =>
  posts.map((p) => (p.id === id ? change(p) : p));

const updateTicket = (tickets: Ticket[], id: string, change: (t: Ticket) => Ticket) =>
  tickets.map((t) => (t.id === id ? change(t) : t));

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
  tickets: initialTickets,
  savedColleges: [],
  signedIn: false,
  authChecked: false,
  user: null,
  advisorOpen: false,
  authOpen: false,
  toast: null,
  miniChatTicketId: null,
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

  markRead: (ticketId) =>
    set((s) => {
      const ticket = s.tickets.find((item) => item.id === ticketId);
      if (ticket?.unread && s.user) {
        void markTicketNotificationsRead(s.user, ticketId).catch(() =>
          get().showToast('Unable to sync notification status', 'error'),
        );
      }
      return { tickets: updateTicket(s.tickets, ticketId, (t) => ({ ...t, unread: false })) };
    }),

  reply: (ticketId, text) =>
    set((s) => ({
      tickets: updateTicket(s.tickets, ticketId, (t) => ({
        ...t,
        messages: [...t.messages, { author: displayName(s.user?.name, s.user?.email), time: 'Just now', text, isMe: true }],
        suggestedReply: undefined,
      })),
    })),

  toggleResolved: (ticketId) =>
    set((s) => ({ tickets: updateTicket(s.tickets, ticketId, (t) => ({ ...t, resolved: !t.resolved })) })),

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
      miniChatTicketId: null,
      miniChatMinimized: false,
      miniChatHidden: false,
      ...(s.user ? { posts: initialPosts, tickets: initialTickets, savedColleges: [] } : {}),
    }),
  })),
  setAuthenticatedUser: (user) => set((s) => ({
    user,
    signedIn: true,
    authChecked: true,
    ...(s.user?.id !== user.id ? { miniChatTicketId: null, miniChatMinimized: false, miniChatHidden: false } : {}),
    ...(s.user?.id !== user.id ? { posts: initialPosts, tickets: initialTickets, savedColleges: [] } : {}),
  })),
  setAdvisorOpen: (advisorOpen) => set({ advisorOpen }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  setMiniChatTicketId: (miniChatTicketId) => set({
    miniChatTicketId,
    ...(!miniChatTicketId ? { miniChatMinimized: false, miniChatHidden: false } : { miniChatHidden: false }),
  }),
  setMiniChatMinimized: (miniChatMinimized) => set({ miniChatMinimized }),
  setMiniChatHidden: (miniChatHidden) => set({ miniChatHidden }),
  setMessageSoundsEnabled: (messageSoundsEnabled) => {
    window.localStorage.setItem('academix.message-sounds', String(messageSoundsEnabled));
    set({ messageSoundsEnabled });
  },
  openMiniChatForPerson: (person) =>
    set((state) => {
      const existing = state.tickets.find((ticket) =>
        ticket.contactId === person.id ||
        (ticket.category === 'Direct message' &&
          (ticket.from === person.name ||
            ticket.messages.some((message) => message.author === person.name && !message.isMe))),
      );
      const ticketId = existing?.id ?? `direct-${person.id}`;
      const tickets = existing ? state.tickets : [
        {
          id: ticketId,
          contactId: person.id,
          ...(person.avatar ? { contactAvatar: person.avatar } : {}),
          category: 'Direct message',
          timeAgo: 'Just now',
          title: `Conversation with ${person.name}`,
          preview: '',
          from: person.name,
          fromMeta: person.subtitle,
          messages: [],
          resolved: false,
          unread: false,
        },
        ...state.tickets,
      ];
      return {
        tickets,
        miniChatTicketId: ticketId,
        miniChatMinimized: false,
        miniChatHidden: false,
      };
    }),
  receiveMessage: (ticketId, message) => {
    const state = get();
    if (!state.tickets.some((item) => item.id === ticketId)) {
      state.showToast('Unable to open this conversation', 'error');
      return;
    }
    const shouldNotify = !message.isMe && state.messageSoundsEnabled &&
      (state.miniChatTicketId !== ticketId || state.miniChatMinimized || state.miniChatHidden ||
        (typeof document !== 'undefined' &&
          (document.visibilityState !== 'visible' || !document.hasFocus())));
    set((current) => ({
        tickets: updateTicket(current.tickets, ticketId, (item) => ({
          ...item,
          messages: [...item.messages, message],
          preview: message.text,
          unread: !message.isMe,
          timeAgo: 'Just now',
        })),
        ...(!message.isMe
          ? {
            miniChatTicketId: ticketId,
            miniChatMinimized: current.miniChatTicketId !== ticketId || current.miniChatMinimized || current.miniChatHidden,
            miniChatHidden: false,
          }
          : {}),
      }));
    if (!message.isMe && state.user) {
      const ticket = state.tickets.find((item) => item.id === ticketId);
      const id = `message-${ticketId}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      void createNotification(state.user, {
        id,
        type: 'message',
        senderName: displayName(message.author),
        ...(ticket?.contactAvatar ? { senderAvatar: ticket.contactAvatar } : {}),
        text: 'sent you a message',
        href: `/inbox/${ticketId}`,
        ticketId,
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

export const useUnreadCount = () => useApp((s) => s.tickets.filter((t) => t.unread && !t.resolved).length);
