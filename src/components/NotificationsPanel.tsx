import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useApp } from '../store';
import { useNotifications } from '../notificationsStore';
import type { NotificationItem, NotificationPreferences } from '../notificationsService';
import UserAvatar from './UserAvatar';
import { Icon, cx } from './ui';

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}

function groupedItems(items: NotificationItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: Record<string, NotificationItem[]> = { New: [], Today: [], Earlier: [] };
  for (const item of items) {
    const created = Date.parse(item.createdAt);
    const key = !item.readAt ? 'New' : created >= today ? 'Today' : 'Earlier';
    groups[key].push(item);
  }
  return Object.entries(groups).filter(([, group]) => group.length > 0);
}

function NotificationRows({
  items,
  onItemClick,
}: {
  items: NotificationItem[];
  onItemClick: (item: NotificationItem) => void;
}) {
  return (
    <div>
      {groupedItems(items).map(([group, groupItems]) => (
        <section key={group} aria-label={group}>
          <h3 className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{group}</h3>
          <div>
            {groupItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => onItemClick(item)}
                className={cx(
                  'flex items-start gap-3 px-4 py-3 transition hover:bg-surface-container-low',
                  !item.readAt && 'bg-secondary-fixed/40',
                )}
              >
                {item.type === 'message'
                  ? <UserAvatar src={item.senderAvatar} name={item.senderName} size={40} />
                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-secondary"><Icon name="notifications" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5 text-on-surface">
                    <strong className="font-semibold">{item.senderName}</strong> {item.text}
                  </span>
                  <span className="mt-1 block text-xs text-on-surface-variant">{relativeTime(item.createdAt)}</span>
                </span>
                {!item.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Loading notifications">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="h-10 w-10 animate-pulse rounded-full bg-surface-container" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-4/5 animate-pulse rounded bg-surface-container" />
            <span className="block h-2.5 w-1/4 animate-pulse rounded bg-surface-container" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Preferences({
  onBack,
}: {
  onBack: () => void;
}) {
  const user = useApp((state) => state.user);
  const preferences = useNotifications((state) => state.preferences);
  const loading = useNotifications((state) => state.preferencesLoading);
  const error = useNotifications((state) => state.preferencesError);
  const loadPreferences = useNotifications((state) => state.loadPreferences);
  const updatePreferences = useNotifications((state) => state.updatePreferences);

  useEffect(() => {
    if (user) void loadPreferences(user);
  }, [loadPreferences, user]);

  const options: { key: keyof NotificationPreferences; label: string; detail: string }[] = [
    { key: 'messages', label: 'Messages', detail: 'New messages and replies' },
    { key: 'mentions', label: 'Mentions', detail: 'When someone mentions you' },
    { key: 'updates', label: 'Community updates', detail: 'Important Academix announcements' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-outline-variant/50 px-4 py-3">
        <button type="button" onClick={onBack} aria-label="Back to notifications" className="rounded-full p-1 hover:bg-surface-container-low">
          <Icon name="arrow_back" />
        </button>
        <h2 className="flex-1 font-semibold text-primary">Notification preferences</h2>
      </div>
      {error ? (
        <div className="p-5 text-sm text-error">
          <p>{error}</p>
          <button type="button" onClick={() => user && void loadPreferences(user)} className="mt-2 font-semibold underline">Retry</button>
        </div>
      ) : loading ? <NotificationSkeleton /> : (
        <div className="divide-y divide-outline-variant/40">
          {options.map((option) => (
            <label key={option.key} className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-on-surface">{option.label}</span>
                <span className="block text-xs text-on-surface-variant">{option.detail}</span>
              </span>
              <input
                type="checkbox"
                checked={preferences[option.key]}
                onChange={(event) => user && void updatePreferences(user, {
                  ...preferences,
                  [option.key]: event.currentTarget.checked,
                }).catch(() => undefined)}
                className="h-4 w-4 accent-secondary"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationFeed({
  fullPage = false,
  onClose,
}: {
  fullPage?: boolean;
  onClose?: () => void;
}) {
  const user = useApp((state) => state.user);
  const showToast = useApp((state) => state.showToast);
  const items = useNotifications((state) => state.items);
  const totalCount = useNotifications((state) => state.totalCount);
  const unreadCount = useNotifications((state) => state.unreadCount);
  const loading = useNotifications((state) => state.loading);
  const loadingMore = useNotifications((state) => state.loadingMore);
  const hasMore = useNotifications((state) => state.hasMore);
  const error = useNotifications((state) => state.error);
  const refresh = useNotifications((state) => state.refresh);
  const loadMore = useNotifications((state) => state.loadMore);
  const markRead = useNotifications((state) => state.markRead);
  const markAllRead = useNotifications((state) => state.markAllRead);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [showPreferences, setShowPreferences] = useState(false);
  const groups = useMemo(() => groupedItems(items), [items]);

  useEffect(() => {
    if (user) void refresh(user, tab === 'unread');
  }, [refresh, tab, user]);

  const handleItemClick = (item: NotificationItem) => {
    if (user && !item.readAt) {
      void markRead(user, item)
        .then(() => {
          if (item.conversationId) useApp.getState().markRead(item.conversationId);
        })
        .catch(() => showToast('Unable to update notification status', 'error'));
    }
    onClose?.();
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    void markAllRead(user)
      .then(() => {
        for (const item of items) if (item.conversationId) useApp.getState().markRead(item.conversationId);
      })
      .catch(() => showToast('Unable to mark notifications as read', 'error'));
  };

  return (
    <div className={cx('flex min-h-0 flex-col bg-white', fullPage ? 'rounded-2xl border border-outline-variant/50 shadow-card' : 'h-full')}>
      {!fullPage && showPreferences ? (
        <Preferences onBack={() => setShowPreferences(false)} />
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-outline-variant/50 px-4 py-3">
            <h2 className="flex-1 font-headline text-lg font-semibold text-primary">Notifications</h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-secondary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
            {!fullPage && (
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                aria-label="Notification settings"
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-low"
              >
                <Icon name="settings" className="!text-[20px]" />
              </button>
            )}
          </div>
          <div className="flex border-b border-outline-variant/50 px-4">
            {(['all', 'unread'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cx(
                  'border-b-2 px-3 py-2.5 text-sm font-semibold capitalize',
                  tab === value ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <div className={cx('min-h-0 flex-1 overflow-y-auto', fullPage ? 'max-h-[65vh]' : 'max-h-[calc(100dvh-150px)] lg:max-h-[calc(70vh-150px)]')}>
            {!user ? (
              <div className="p-7 text-center">
                <p className="text-sm text-on-surface-variant">Sign in to see your notifications.</p>
                <Link to="/auth" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline">Sign in</Link>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <p className="text-sm text-error">{error}</p>
                <button type="button" onClick={() => user && void refresh(user, tab === 'unread')} className="btn-secondary text-sm">Retry</button>
              </div>
            ) : loading ? <NotificationSkeleton /> : items.length > 0 ? (
              <>
                <NotificationRows items={items} onItemClick={handleItemClick} />
                {hasMore && (
                  <div className="p-3 text-center">
                    <button type="button" disabled={loadingMore} onClick={() => user && void loadMore(user, tab === 'unread')} className="text-sm font-semibold text-secondary hover:underline disabled:opacity-50">
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            ) : tab === 'unread' && totalCount > 0 ? (
              <p className="p-6 text-center text-sm text-on-surface-variant">No unread notifications on this page.</p>
            ) : totalCount === 0 && groups.length === 0 ? (
              <div className="flex flex-col items-center px-8 py-10 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-fixed text-secondary"><Icon name="done_all" /></span>
                <p className="font-semibold text-primary">You’re all caught up</p>
                <p className="mt-1 text-sm text-on-surface-variant">We’ll let you know when something new comes in.</p>
              </div>
            ) : <p className="p-6 text-center text-sm text-on-surface-variant">No unread notifications.</p>}
          </div>
          {!fullPage && (
            <Link to="/notifications" onClick={onClose} className="border-t border-outline-variant/50 px-4 py-3 text-center text-sm font-semibold text-secondary hover:bg-surface-container-low">
              View all notifications
            </Link>
          )}
        </>
      )}
    </div>
  );
}

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-primary/35 lg:absolute lg:inset-auto lg:right-0 lg:top-12 lg:w-[380px] lg:rounded-2xl lg:bg-transparent" onMouseDown={onClose}>
      <div
        className="absolute inset-0 flex flex-col bg-white lg:static lg:max-h-[70vh] lg:overflow-visible lg:rounded-2xl lg:border lg:border-outline-variant/50 lg:shadow-float"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="absolute -top-2 right-5 hidden h-4 w-4 rotate-45 border-l border-t border-outline-variant/50 bg-white lg:block" />
        <NotificationFeed onClose={onClose} />
      </div>
    </div>
  );
}
