import { create } from 'zustand';

import { currentUser, people, posts as initialPosts, tickets as initialTickets } from './data/mock';
import type { Post, Ticket } from './data/types';

interface Toast {
  id: number;
  message: string;
  icon: string;
}

interface AppState {
  posts: Post[];
  tickets: Ticket[];
  savedColleges: string[];
  signedIn: boolean;
  advisorOpen: boolean;
  authOpen: boolean;
  toast: Toast | null;

  vote: (postId: string, direction: 1 | -1) => void;
  toggleBookmark: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  publish: (input: { title: string; body: string; forum: string; anonymous: boolean }) => void;

  markRead: (ticketId: string) => void;
  reply: (ticketId: string, text: string) => void;
  toggleResolved: (ticketId: string) => void;

  toggleSavedCollege: (collegeId: string) => void;
  setSignedIn: (value: boolean) => void;
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
 * Uygulama state'i. Veriler şimdilik `data/mock.ts`'ten gelir; backend bağlandığında
 * yalnızca başlangıç verisi ve aksiyonların içi değişir, bileşenler aynı kalır.
 */
export const useApp = create<AppState>((set) => ({
  posts: initialPosts,
  tickets: initialTickets,
  savedColleges: [],
  signedIn: true,
  advisorOpen: false,
  authOpen: false,
  toast: null,

  // Aynı yöne tekrar basmak oyu geri alır.
  vote: (postId, direction) =>
    set((s) => ({
      posts: updatePost(s.posts, postId, (p) => {
        const next = p.myVote === direction ? 0 : direction;
        return { ...p, votes: p.votes - p.myVote + next, myVote: next };
      }),
    })),

  toggleBookmark: (postId) =>
    set((s) => ({ posts: updatePost(s.posts, postId, (p) => ({ ...p, bookmarked: !p.bookmarked })) })),

  addComment: (postId, text) =>
    set((s) => ({
      posts: updatePost(s.posts, postId, (p) => ({
        ...p,
        comments: [...p.comments, { author: currentUser, timeAgo: 'Just now', text }],
        commentCount: p.commentCount + 1,
      })),
    })),

  publish: ({ title, body, forum, anonymous }) =>
    set((s) => ({
      posts: [
        {
          id: `local-${Date.now()}`,
          author: anonymous ? people.anonymous : currentUser,
          timeAgo: 'Just now',
          title,
          body,
          channelId: channelForForum(forum),
          tabs: ['trending', 'latest'],
          votes: 0,
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
        messages: [...t.messages, { author: 'Maya Patel (You)', time: 'Just now', text, isMe: true }],
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

  setSignedIn: (signedIn) => set({ signedIn }),
  setAdvisorOpen: (advisorOpen) => set({ advisorOpen }),
  setAuthOpen: (authOpen) => set({ authOpen }),

  showToast: (message, icon = 'check_circle') => {
    const id = ++toastId;
    set({ toast: { id, message, icon } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2600);
  },
}));

export const useUnreadCount = () => useApp((s) => s.tickets.filter((t) => t.unread && !t.resolved).length);
