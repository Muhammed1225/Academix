import { create } from 'zustand';

import { people, posts as initialPosts, tickets as initialTickets } from './data/mock';
import type { Post, Ticket } from './data/types';

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

export interface AuthenticatedUser extends OnboardingProfile {
  id: string;
  email: string;
  role: 'scholar' | 'prospective' | 'faculty';
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

/**
 * Community content is seeded locally; authenticated account data comes from the API.
 */
export const useApp = create<AppState>((set) => ({
  posts: initialPosts,
  tickets: initialTickets,
  savedColleges: [],
  signedIn: false,
  authChecked: false,
  user: null,
  advisorOpen: false,
  authOpen: false,
  toast: null,

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
          name: s.user.name,
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
            name: s.user.name,
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
    set((s) => ({ tickets: updateTicket(s.tickets, ticketId, (t) => ({ ...t, unread: false })) })),

  reply: (ticketId, text) =>
    set((s) => ({
      tickets: updateTicket(s.tickets, ticketId, (t) => ({
        ...t,
        messages: [...t.messages, { author: s.user?.name ?? 'You', time: 'Just now', text, isMe: true }],
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
      ...(s.user ? { posts: initialPosts, tickets: initialTickets, savedColleges: [] } : {}),
    }),
  })),
  setAuthenticatedUser: (user) => set((s) => ({
    user,
    signedIn: true,
    authChecked: true,
    ...(s.user?.id !== user.id ? { posts: initialPosts, tickets: initialTickets, savedColleges: [] } : {}),
  })),
  setAdvisorOpen: (advisorOpen) => set({ advisorOpen }),
  setAuthOpen: (authOpen) => set({ authOpen }),

  showToast: (message, icon = 'check_circle') => {
    const id = ++toastId;
    set({ toast: { id, message, icon } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2600);
  },
}));

export const useUnreadCount = () => useApp((s) => s.tickets.filter((t) => t.unread && !t.resolved).length);
