import type { Conversation } from './data/types';
import type { AuthenticatedUser } from './store';

export interface NotificationItem {
  id: string;
  type: 'message' | 'system';
  senderName: string;
  senderAvatar?: string;
  text: string;
  href: string;
  conversationId?: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPreferences {
  messages: boolean;
  mentions: boolean;
  updates: boolean;
}

export interface NotificationPage {
  items: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  unreadMessageCount: number;
  hasMore: boolean;
}

export interface NotificationInput {
  id: string;
  type: NotificationItem['type'];
  senderName: string;
  senderAvatar?: string;
  text: string;
  href: string;
  conversationId?: string;
}

function requestHeaders(user: AuthenticatedUser | null, json = false): HeadersInit {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(import.meta.env.DEV && user?.id ? { 'X-Academix-Test-User': user.id } : {}),
  };
}

async function request<T>(
  path: string,
  user: AuthenticatedUser | null,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...requestHeaders(user, init.body !== undefined),
      ...init.headers,
    },
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Unable to load notifications.');
  return result;
}

export function notifyNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('academix:notifications-changed'));
}

export async function listNotifications(
  user: AuthenticatedUser,
  options: { offset?: number; limit?: number; unread?: boolean } = {},
) {
  const params = new URLSearchParams({
    offset: String(options.offset ?? 0),
    limit: String(options.limit ?? 20),
    ...(options.unread ? { unread: 'true' } : {}),
  });
  return request<NotificationPage>(`/api/notifications?${params}`, user);
}

export async function createNotification(
  user: AuthenticatedUser,
  input: NotificationInput,
  announce = true,
) {
  const result = await request<{ notification: NotificationItem | null }>(
    '/api/notifications',
    user,
    { method: 'POST', body: JSON.stringify(input) },
  );
  if (announce) notifyNotificationsChanged();
  return result.notification;
}

export async function seedUnreadConversationNotifications(user: AuthenticatedUser, conversations: Conversation[]) {
  await Promise.all(conversations
    .filter((conversation) => conversation.unread)
    .map((conversation) => createNotification(user, {
      id: `seed-${conversation.id}`,
      type: 'message',
      senderName: conversation.from.includes('@') ? 'Academix member' : conversation.from,
      ...(conversation.contactAvatar ? { senderAvatar: conversation.contactAvatar } : {}),
      text: 'sent you a message',
      href: `/inbox/${conversation.id}`,
      conversationId: conversation.id,
    }, false)));
}

export async function markNotificationRead(user: AuthenticatedUser, notificationId: string) {
  const result = await request<{ unreadCount: number; unreadMessageCount: number; conversationId: string | null }>(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    user,
    { method: 'PATCH' },
  );
  notifyNotificationsChanged();
  return result;
}

export async function markConversationNotificationsRead(user: AuthenticatedUser, conversationId: string) {
  const result = await request<{ unreadCount: number; unreadMessageCount: number }>(
    `/api/notifications/conversation/${encodeURIComponent(conversationId)}/read`,
    user,
    { method: 'PATCH' },
  );
  notifyNotificationsChanged();
  return result;
}

export async function markAllNotificationsRead(user: AuthenticatedUser) {
  const result = await request<{ unreadCount: number; unreadMessageCount: number }>(
    '/api/notifications/read-all',
    user,
    { method: 'PATCH' },
  );
  notifyNotificationsChanged();
  return result;
}

export async function getNotificationPreferences(user: AuthenticatedUser) {
  return request<{ preferences: NotificationPreferences }>('/api/notifications/preferences', user);
}

export async function saveNotificationPreferences(
  user: AuthenticatedUser,
  preferences: NotificationPreferences,
) {
  return request<{ preferences: NotificationPreferences }>(
    '/api/notifications/preferences',
    user,
    { method: 'PUT', body: JSON.stringify(preferences) },
  );
}
