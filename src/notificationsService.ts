import type { Ticket } from './data/types';
import type { AuthenticatedUser } from './store';

export interface NotificationItem {
  id: string;
  type: 'message' | 'system';
  senderName: string;
  senderAvatar?: string;
  text: string;
  href: string;
  ticketId?: string;
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
  ticketId?: string;
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

export async function seedUnreadTicketNotifications(user: AuthenticatedUser, tickets: Ticket[]) {
  await Promise.all(tickets
    .filter((ticket) => ticket.unread && !ticket.resolved)
    .map((ticket) => createNotification(user, {
      id: `seed-${ticket.id}`,
      type: 'message',
      senderName: ticket.from.includes('@') ? 'Academix member' : ticket.from,
      ...(ticket.contactAvatar ? { senderAvatar: ticket.contactAvatar } : {}),
      text: 'sent you a message',
      href: `/inbox/${ticket.id}`,
      ticketId: ticket.id,
    }, false)));
}

export async function markNotificationRead(user: AuthenticatedUser, notificationId: string) {
  const result = await request<{ unreadCount: number; unreadMessageCount: number; ticketId: string | null }>(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    user,
    { method: 'PATCH' },
  );
  notifyNotificationsChanged();
  return result;
}

export async function markTicketNotificationsRead(user: AuthenticatedUser, ticketId: string) {
  const result = await request<{ unreadCount: number; unreadMessageCount: number }>(
    `/api/notifications/ticket/${encodeURIComponent(ticketId)}/read`,
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
