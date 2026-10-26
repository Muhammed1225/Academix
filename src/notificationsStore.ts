import { create } from 'zustand';

import type { AuthenticatedUser } from './store';
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationPreferences,
  seedUnreadTicketNotifications,
  type NotificationItem,
  type NotificationPreferences,
} from './notificationsService';
import { tickets } from './data/mock';

interface NotificationsState {
  userId: string | null;
  filterUnread: boolean;
  items: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  unreadMessageCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  preferences: NotificationPreferences;
  preferencesLoading: boolean;
  preferencesError: string | null;
  refresh: (user: AuthenticatedUser | null, unreadOnly?: boolean) => Promise<void>;
  loadMore: (user: AuthenticatedUser, unreadOnly: boolean) => Promise<void>;
  markRead: (user: AuthenticatedUser, notification: NotificationItem) => Promise<void>;
  markAllRead: (user: AuthenticatedUser) => Promise<void>;
  loadPreferences: (user: AuthenticatedUser) => Promise<void>;
  updatePreferences: (user: AuthenticatedUser, preferences: NotificationPreferences) => Promise<void>;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  userId: null,
  filterUnread: false,
  items: [],
  totalCount: 0,
  unreadCount: 0,
  unreadMessageCount: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  preferences: { messages: true, mentions: true, updates: true },
  preferencesLoading: false,
  preferencesError: null,

  refresh: async (user, unreadOnly) => {
    if (!user) {
      set({
        userId: null,
        filterUnread: false,
        items: [],
        totalCount: 0,
        unreadCount: 0,
        unreadMessageCount: 0,
        hasMore: false,
        loading: false,
        error: null,
      });
      return;
    }
    const changingUser = get().userId !== user.id;
    const selectedUnreadOnly = unreadOnly ?? (changingUser ? false : get().filterUnread);
    set({
      userId: user.id,
      filterUnread: selectedUnreadOnly,
      ...(changingUser ? { items: [], totalCount: 0, unreadCount: 0, unreadMessageCount: 0 } : {}),
      loading: true,
      error: null,
    });
    try {
      if (changingUser) await seedUnreadTicketNotifications(user, tickets);
      const page = await listNotifications(user, { limit: 20, unread: selectedUnreadOnly });
      set({
        items: page.items,
        totalCount: page.totalCount,
        unreadCount: page.unreadCount,
        unreadMessageCount: page.unreadMessageCount,
        hasMore: page.hasMore,
        loading: false,
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Unable to load notifications.' });
    }
  },

  loadMore: async (user, unreadOnly) => {
    if (get().loadingMore || !get().hasMore) return;
    set({ loadingMore: true, error: null });
    try {
      const page = await listNotifications(user, {
        offset: get().items.length,
        limit: 20,
        unread: unreadOnly,
      });
      set((state) => ({
        items: [...state.items, ...page.items],
        totalCount: page.totalCount,
        unreadCount: page.unreadCount,
        unreadMessageCount: page.unreadMessageCount,
        hasMore: page.hasMore,
        loadingMore: false,
      }));
    } catch (error) {
      set({ loadingMore: false, error: error instanceof Error ? error.message : 'Unable to load more notifications.' });
    }
  },

  markRead: async (user, notification) => {
    try {
      const summary = await markNotificationRead(user, notification.id);
      set((state) => {
        const items = state.filterUnread
          ? state.items.filter((item) => item.id !== notification.id)
          : state.items.map((item) =>
            item.id === notification.id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
          );
        return {
          items,
          ...(state.filterUnread && items.length === 0 ? { hasMore: false } : {}),
          unreadCount: summary.unreadCount,
          unreadMessageCount: summary.unreadMessageCount,
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to update this notification.' });
      throw error;
    }
  },

  markAllRead: async (user) => {
    try {
      const summary = await markAllNotificationsRead(user);
      const now = new Date().toISOString();
      set((state) => ({
        items: state.filterUnread ? [] : state.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
        ...(state.filterUnread ? { hasMore: false } : {}),
        unreadCount: summary.unreadCount,
        unreadMessageCount: summary.unreadMessageCount,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to mark notifications as read.' });
      throw error;
    }
  },

  loadPreferences: async (user) => {
    set({ preferencesLoading: true, preferencesError: null });
    try {
      const result = await getNotificationPreferences(user);
      set({ preferences: result.preferences, preferencesLoading: false });
    } catch (error) {
      set({
        preferencesLoading: false,
        preferencesError: error instanceof Error ? error.message : 'Unable to load notification preferences.',
      });
    }
  },

  updatePreferences: async (user, preferences) => {
    set({ preferencesError: null });
    try {
      const result = await saveNotificationPreferences(user, preferences);
      set({ preferences: result.preferences });
    } catch (error) {
      set({ preferencesError: error instanceof Error ? error.message : 'Unable to save notification preferences.' });
      throw error;
    }
  },
}));
