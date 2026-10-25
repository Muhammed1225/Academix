import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BRAND } from '../data/mock';
import { createSearchCatalog, getRecentSearches, matchesSearch, rememberSearch, relevanceScore } from '../data/search';
import { signOut as signOutAuth } from '../authService';
import { useApp, useUnreadCount } from '../store';
import AdvisorDrawer from './AdvisorDrawer';
import { Avatar, BrandMark, Icon, cx } from './ui';

const navItems = [
  { to: '/', label: 'Feed', icon: 'dynamic_feed', end: true },
  { to: '/colleges', label: 'Explore Universities', icon: 'account_balance' },
  { to: '/connections', label: 'Make Connections', icon: 'person_add' },
  { to: '/inbox', label: 'Messages', icon: 'mail' },
];

function Header() {
  const unread = useUnreadCount();
  const signedIn = useApp((s) => s.signedIn);
  const user = useApp((s) => s.user);
  const authChecked = useApp((s) => s.authChecked);
  const setSignedIn = useApp((s) => s.setSignedIn);
  const messageSoundsEnabled = useApp((s) => s.messageSoundsEnabled);
  const setMessageSoundsEnabled = useApp((s) => s.setMessageSoundsEnabled);
  const showToast = useApp((s) => s.showToast);
  const posts = useApp((s) => s.posts);
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchCatalog = useMemo(() => createSearchCatalog(posts), [posts]);
  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const perCategory = new Map<string, number>();
    return searchCatalog
      .filter((item) => matchesSearch(`${item.title} ${item.subtitle} ${item.content}`, debouncedQuery))
      .sort((first, second) => relevanceScore(second, debouncedQuery) - relevanceScore(first, debouncedQuery))
      .filter((item) => {
        const count = perCategory.get(item.category) ?? 0;
        if (count >= 2) return false;
        perCategory.set(item.category, count + 1);
        return true;
      })
      .slice(0, 8);
  }, [debouncedQuery, searchCatalog]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') ?? '');
  }, [location.pathname, location.search]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().replace(/\s+/g, ' ');
    if (trimmed) rememberSearch(trimmed);
    setSearchFocused(false);
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
  };

  const openSuggestion = (href: string, title: string) => {
    rememberSearch(title);
    setSearchFocused(false);
    navigate(href);
  };

  const signOut = async () => {
    try {
      await signOutAuth();
      setSignedIn(false);
      setMenuOpen(false);
      showToast('Signed out', 'logout');
    } catch {
      showToast('Unable to sign out right now. Please try again.', 'error');
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-white shadow-header">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4">
        <div className="flex max-w-md flex-1 items-center gap-4">
          <Link to="/" className="shrink-0" aria-label={`${BRAND} feed`}>
            <BrandMark />
          </Link>
          <form
            onSubmit={onSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false);
            }}
            className="relative hidden w-full md:block"
          >
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search university, major, mentor, or question..."
              aria-label="Search Academix"
              aria-autocomplete="list"
              aria-expanded={searchFocused}
              className="input rounded-full !py-2 pl-10"
            />
            {searchFocused && (query.trim() ? (
              <div role="group" aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-outline-variant/60 bg-white py-2 shadow-float">
                {suggestions.length ? suggestions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSuggestion(item.href, item.title)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container-low"
                  >
                    {item.image
                      ? <Avatar src={item.image} name={item.title} size={34} rounded="rounded-full" />
                      : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary"><Icon name={item.category === 'universities' ? 'account_balance' : item.category === 'programmes' ? 'school' : item.category === 'people' ? 'person' : 'forum'} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-primary">{item.title}</span>
                      <span className="block truncate text-xs text-on-surface-variant">{item.subtitle}</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{item.category}</span>
                  </button>
                )) : <p className="px-4 py-3 text-sm text-on-surface-variant">No suggestions found.</p>}
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 border-t border-outline-variant/40 px-4 py-3 text-left text-sm font-semibold text-secondary hover:bg-surface-container-low"
                >
                  <Icon name="search" />Search all results for “{query.trim()}”
                </button>
              </div>
            ) : (
              <div role="group" aria-label="Recent searches" className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-outline-variant/60 bg-white py-2 shadow-float">
                {getRecentSearches().length ? getRecentSearches().map((recent) => (
                  <button
                    type="button"
                    key={recent}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(recent);
                      rememberSearch(recent);
                      setSearchFocused(false);
                      navigate(`/search?q=${encodeURIComponent(recent)}`);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                  >
                    <Icon name="history" className="text-outline" />{recent}
                  </button>
                )) : <p className="px-4 py-3 text-sm text-on-surface-variant">Start typing to find people, universities, programmes, and discussions.</p>}
              </div>
            ))}
          </form>
          <button type="button" onClick={() => navigate('/search')} aria-label="Open search" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden">
            <Icon name="search" />
          </button>
        </div>

        <nav className="hidden h-full items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex h-full items-center gap-2 border-b-2 px-3.5 text-sm transition-colors',
                  isActive
                    ? 'border-secondary font-semibold text-secondary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface',
                )
              }
            >
              {item.label}
              {item.to === '/inbox' && unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-fixed px-1.5 text-[11px] font-bold text-secondary">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {signedIn && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none"
            >
              <Avatar src={user?.photo || undefined} name={user?.name ?? 'Account'} size={44} rounded="rounded-full" />
              <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-transparent transition-colors group-hover:border-secondary group-focus-visible:border-secondary" />
            </button>
            {menuOpen && (
              <div role="menu" className="animate-slide-up absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-outline-variant/60 bg-white py-1 shadow-float">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                >
                  <Icon name="person" /> View profile
                </Link>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={messageSoundsEnabled}
                  onClick={() => {
                    const enabled = !messageSoundsEnabled;
                    setMessageSoundsEnabled(enabled);
                    showToast(`Message sounds ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'volume_up' : 'volume_off');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                >
                  <Icon name={messageSoundsEnabled ? 'volume_up' : 'volume_off'} />
                  Message sound notifications {messageSoundsEnabled ? 'on' : 'off'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    showToast('Settings are coming soon', 'settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                >
                  <Icon name="settings" /> Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error hover:bg-error-container/50"
                >
                  <Icon name="logout" /> Sign out
                </button>
              </div>
            )}
          </div>
          )}
          <button
            type="button"
            className="relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Notifications"
            onClick={() => showToast('You are all caught up', 'notifications')}
          >
            <Icon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
          </button>
          {!signedIn && authChecked && (
            <Link to="/auth" className="btn-primary">Sign up / Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const unread = useUnreadCount();
  const items = [
    { to: '/', label: 'Feed', icon: 'dynamic_feed', end: true },
    { to: '/colleges', label: 'Universities', icon: 'account_balance' },
    { to: '/compose', label: 'Ask community', icon: 'forum', primary: true },
    { to: '/inbox', label: 'Messages', icon: 'mail' },
    { to: '/connections', label: 'Make Connections', icon: 'person_add' },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/60 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx('flex flex-col items-center gap-1 py-2 text-[11px] font-semibold', isActive && !item.primary ? 'text-secondary' : 'text-on-surface-variant')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    'relative flex h-8 w-12 items-center justify-center rounded-full',
                    item.primary ? 'rounded-lg bg-secondary text-white' : isActive && 'bg-secondary-fixed',
                  )}
                >
                  <Icon name={item.icon} fill={isActive && !item.primary} />
                  {item.to === '/inbox' && unread > 0 && (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] text-white">
                      {unread}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Footer() {
  const columns = [
    { title: 'Network', links: ['Scholars Feed', 'College Directories', 'Verified Mentors', 'Academic Q&A'] },
    { title: 'Institutions', links: ['Carnegie Mellon University', 'Admissions Portals', 'Research Labs', 'Department Chairs'] },
    { title: 'Trust & Rigor', links: ['Credential Verification', 'Academic Honor Code', 'Peer Privacy Protocol', 'Institutional Security'] },
  ];
  return (
    <footer className="mt-16 border-t border-outline-variant/50 bg-white pb-20 lg:pb-0">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <BrandMark size="text-xl" />
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            The verified collegiate network connecting matriculated scholars, distinguished alumni, and prospective
            university applicants across global academia.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 rounded bg-primary-container px-2 py-1 text-[11px] font-semibold text-tertiary-fixed">
            <Icon name="verified_user" className="!text-[14px]" /> Identity Review Protocol
          </span>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="eyebrow">{col.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              {col.links.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 px-4 py-5 text-xs text-on-surface-variant">
        <span>© 2025 {BRAND} Inc. All rights reserved. Peer-to-peer collegiate governance standard.</span>
        <span className="flex gap-5">
          <span>Privacy</span>
          <span>Terms of Research</span>
          <span>Institutional API</span>
        </span>
      </div>
    </footer>
  );
}

function ToastHost() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 lg:bottom-8">
      <div key={toast.id} role="status" className="animate-slide-up flex items-center gap-2.5 rounded-xl bg-primary-container px-4 py-3 text-sm font-semibold text-white shadow-float">
        <Icon name={toast.icon} fill className="text-tertiary-fixed" />
        {toast.message}
      </div>
    </div>
  );
}

function MiniChatDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const signedIn = useApp((state) => state.signedIn);
  const ticketId = useApp((state) => state.miniChatTicketId);
  const ticket = useApp((state) => state.tickets.find((item) => item.id === ticketId));
  const reply = useApp((state) => state.reply);
  const setHidden = useApp((state) => state.setMiniChatHidden);
  const hidden = useApp((state) => state.miniChatHidden);
  const minimized = useApp((state) => state.miniChatMinimized);
  const setMinimized = useApp((state) => state.setMiniChatMinimized);
  const markRead = useApp((state) => state.markRead);
  const user = useApp((state) => state.user);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dockSize, setDockSize] = useState({ width: 340, height: 450 });
  const [dockPosition, setDockPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const pendingDragRef = useRef<{ x: number; y: number } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const resizeRef = useRef<{
    direction: 'top' | 'left' | 'corner';
    pointerId: number;
    pointerX: number;
    pointerY: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  } | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const previousUserSelectRef = useRef<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojis = ['😀', '😂', '😊', '😍', '🥳', '🤔', '👏', '🙌', '👍', '❤️', '🎓', '📚', '✨', '✅', '🎉', '🙏'];

  useEffect(() => {
    setDraft(ticket?.suggestedReply ?? '');
    setEmojiOpen(false);
  }, [ticket?.id, ticket?.suggestedReply]);

  useEffect(() => {
    if (!minimized) messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ticket?.messages.length, minimized]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
      if (previousUserSelectRef.current !== null) {
        document.documentElement.style.userSelect = previousUserSelectRef.current;
      }
    };
  }, []);

  useEffect(() => {
    if (!minimized && !hidden && !pathname.startsWith('/inbox')) return;
    resizeRef.current = null;
    pendingPointerRef.current = null;
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }
    if (previousUserSelectRef.current !== null) {
      document.documentElement.style.userSelect = previousUserSelectRef.current;
      previousUserSelectRef.current = null;
    }
  }, [hidden, minimized, pathname]);

  useEffect(() => {
    if (!ticket || minimized || hidden || pathname.startsWith('/inbox')) return;
    const markFocusedConversationRead = () => {
      if (ticket.unread && document.visibilityState === 'visible' && document.hasFocus()) {
        markRead(ticket.id);
      }
    };
    markFocusedConversationRead();
    window.addEventListener('focus', markFocusedConversationRead);
    document.addEventListener('visibilitychange', markFocusedConversationRead);
    return () => {
      window.removeEventListener('focus', markFocusedConversationRead);
      document.removeEventListener('visibilitychange', markFocusedConversationRead);
    };
  }, [hidden, markRead, minimized, pathname, ticket]);

  if (!signedIn || !ticket || hidden || pathname.startsWith('/inbox')) return null;

  const otherUser = [...ticket.messages].reverse().find((message) => !message.isMe)?.author ?? ticket.from;

  const expandConversation = () => {
    setMinimized(false);
    navigate(`/inbox/${ticket.id}`);
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || resizeRef.current || dragRef.current) return;
    if (event.target instanceof Element && event.target.closest('button, textarea, form, [role="menu"]')) return;
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    previousUserSelectRef.current = document.documentElement.style.userSelect;
    document.documentElement.style.userSelect = 'none';
    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
      moved: false,
    };
    setIsDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) <= 4) return;
    event.preventDefault();
    drag.moved = true;
    pendingDragRef.current = { x: drag.left + deltaX, y: drag.top + deltaY };
    if (dragFrameRef.current === null) {
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const next = pendingDragRef.current;
        if (!next || !dockRef.current) return;
        const bounds = dockRef.current.getBoundingClientRect();
        setDockPosition({
          left: Math.max(0, Math.min(window.innerWidth - bounds.width, next.x)),
          top: Math.max(0, Math.min(window.innerHeight - bounds.height, next.y)),
        });
      });
    }
  };

  const stopDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.moved) {
      const bounds = dockRef.current?.getBoundingClientRect();
      if (bounds) {
        const deltaX = event.clientX - drag.pointerX;
        const deltaY = event.clientY - drag.pointerY;
        setDockPosition({
          left: Math.max(0, Math.min(window.innerWidth - bounds.width, drag.left + deltaX)),
          top: Math.max(0, Math.min(window.innerHeight - bounds.height, drag.top + deltaY)),
        });
      }
    } else {
      setMinimized(!minimized);
    }
    dragRef.current = null;
    setIsDragging(false);
    pendingDragRef.current = null;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    document.documentElement.style.userSelect = previousUserSelectRef.current ?? '';
    previousUserSelectRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    pendingDragRef.current = null;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    document.documentElement.style.userSelect = previousUserSelectRef.current ?? '';
    previousUserSelectRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startResize = (direction: 'top' | 'left' | 'corner', event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (resizeRef.current || dragRef.current) return;
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    previousUserSelectRef.current = document.documentElement.style.userSelect;
    document.documentElement.style.userSelect = 'none';
    resizeRef.current = {
      direction,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: bounds.width,
      height: bounds.height,
      right: bounds.right,
      bottom: bounds.bottom,
    };
  };

  const applyResize = (pointerX: number, pointerY: number) => {
    const start = resizeRef.current;
    if (!start) return;
    const desktop = window.matchMedia('(min-width: 640px)').matches;
    const maxWidth = Math.max(1, Math.min(
      start.right,
      window.innerWidth - (desktop ? 32 : 24),
    ));
    const maxHeight = Math.max(1, Math.min(
      start.bottom,
      window.innerHeight - (desktop ? 32 : 96),
    ));
    const minWidth = Math.min(280, maxWidth);
    const minHeight = Math.min(300, maxHeight);
    const width = start.direction === 'top'
      ? start.width
      : Math.max(minWidth, Math.min(maxWidth, start.width - (pointerX - start.pointerX)));
    const height = start.direction === 'left'
      ? start.height
      : Math.max(minHeight, Math.min(maxHeight, start.height - (pointerY - start.pointerY)));
    setDockSize({ width, height });
    setDockPosition({
      left: Math.max(0, Math.min(window.innerWidth - width, start.right - width)),
      top: Math.max(0, Math.min(window.innerHeight - height, start.bottom - height)),
    });
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    pendingPointerRef.current = { x: event.clientX, y: event.clientY };
    if (resizeFrameRef.current === null) {
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        const pointer = pendingPointerRef.current;
        if (pointer) applyResize(pointer.x, pointer.y);
      });
    }
  };

  const stopResize = (event: PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    applyResize(event.clientX, event.clientY);
    resizeRef.current = null;
    pendingPointerRef.current = null;
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }
    document.documentElement.style.userSelect = previousUserSelectRef.current ?? '';
    previousUserSelectRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const sendReply = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || ticket.resolved) return;
    reply(ticket.id, draft.trim());
    setDraft('');
    setEmojiOpen(false);
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={`Restore conversation with ${otherUser}`}
        className="fixed bottom-20 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-full border border-outline-variant/60 bg-white py-2 pl-2 pr-4 text-left shadow-float transition hover:-translate-y-0.5 hover:shadow-lg sm:bottom-4 sm:right-4"
      >
        <span className="relative">
          <Avatar src={ticket.contactAvatar} name={otherUser} size={40} rounded="rounded-full" />
          <span role="img" aria-label="Presence unavailable" title="Presence unavailable" className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
          {ticket.unread && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-error" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-primary">{otherUser}</span>
          <span className="block text-xs text-on-surface-variant">Conversation minimized</span>
        </span>
        <Icon name="chat" className="text-secondary" />
      </button>
    );
  }

  return (
    <section
      ref={dockRef}
      aria-label={`Conversation with ${otherUser}`}
      style={{
        width: dockSize.width,
        height: dockSize.height,
        ...(dockPosition ? { left: dockPosition.left, top: dockPosition.top } : {}),
      }}
      className={`group fixed z-40 flex max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-t-2xl rounded-b-xl border border-outline-variant/60 bg-white shadow-float sm:max-h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)] ${dockPosition ? '' : 'bottom-20 right-3 sm:bottom-4 sm:right-4'}`}
    >
      <div
        role="separator"
        aria-label="Resize chat height"
        aria-orientation="horizontal"
        onPointerDown={(event) => startResize('top', event)}
        onPointerMove={moveResize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onLostPointerCapture={stopResize}
        className="absolute inset-x-2 top-0 z-20 h-2 cursor-ns-resize touch-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-transparent before:transition-colors hover:before:bg-[#0B5BD3]/70"
      />
      <div
        role="separator"
        aria-label="Resize chat width"
        aria-orientation="vertical"
        onPointerDown={(event) => startResize('left', event)}
        onPointerMove={moveResize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onLostPointerCapture={stopResize}
        className="absolute bottom-2 left-0 top-2 z-20 w-2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-transparent before:transition-colors hover:before:bg-[#0B5BD3]/70"
      />
      <div
        role="separator"
        aria-label="Resize chat width and height"
        aria-orientation="vertical"
        onPointerDown={(event) => startResize('corner', event)}
        onPointerMove={moveResize}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        onLostPointerCapture={stopResize}
        className="group/corner absolute left-0 top-0 z-30 h-3 w-3 cursor-nwse-resize touch-none"
      >
        <span className="pointer-events-none absolute left-1 top-1 flex rotate-45 gap-px opacity-0 transition-opacity group-hover/corner:opacity-100">
          <span className="h-1 w-1 rounded-full bg-[#0B5BD3]" />
          <span className="h-1 w-1 rounded-full bg-[#0B5BD3]" />
          <span className="h-1 w-1 rounded-full bg-[#0B5BD3]" />
        </span>
      </div>
      <header
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        className={`flex touch-none items-center gap-2.5 border-b border-white/15 bg-[#0B5BD3] px-3.5 py-3 text-white ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setMinimized(!minimized);
            }
          }}
          aria-label={`Conversation with ${otherUser}. Drag to move, click to ${minimized ? 'restore' : 'minimize'}.`}
          className="flex min-w-0 flex-1 touch-none items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <span className="relative">
            <Avatar src={ticket.contactAvatar} name={otherUser} size={38} rounded="rounded-full" />
            <span role="img" aria-label="Presence unavailable" title="Presence unavailable" className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0B5BD3] bg-slate-300" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{otherUser}</span>
            <span className="block truncate text-xs text-white/80">{ticket.title}</span>
          </span>
          <span aria-hidden="true" className="flex shrink-0 gap-0.5 opacity-60">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={expandConversation}
            className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Expand conversation to Messages"
            title="Expand"
          >
            <Icon name="open_in_full" />
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Minimize chat"
            title="Minimize"
          >
            <Icon name="minimize" />
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Close mini chat"
            title="Close"
          >
            <Icon name="close" />
          </button>
        </div>
      </header>
      <div role="log" aria-label="Conversation messages" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-surface p-3">
        {ticket.messages.map((message, index) => (
          <div key={`${ticket.id}-${index}`} className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${message.isMe ? 'rounded-br-md bg-secondary text-white' : 'rounded-bl-md border border-outline-variant/50 bg-white text-on-surface'}`}>
              {!message.isMe && <p className="mb-0.5 text-[11px] font-semibold text-on-surface-variant">{message.author}</p>}
              <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              <p className={`mt-1 text-right text-[10px] ${message.isMe ? 'text-white/75' : 'text-on-surface-variant'}`}>{message.time}</p>
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      {ticket.resolved ? (
        <p className="border-t border-outline-variant/50 px-4 py-3 text-center text-xs text-on-surface-variant">This conversation is resolved.</p>
      ) : (
        <div className="relative border-t border-outline-variant/50 bg-white p-2.5">
          {emojiOpen && (
            <div role="group" aria-label="Choose an emoji" className="absolute bottom-full left-2 right-2 mb-2 flex flex-wrap gap-1 rounded-xl border border-outline-variant/60 bg-white p-2 shadow-float">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setDraft((value) => `${value}${emoji}`);
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg p-1.5 text-lg transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={sendReply} className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              className="mb-1 rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-secondary"
            >
              <Icon name="mood" />
            </button>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder="Write a message…"
              aria-label="Write a reply"
              className="input min-h-10 resize-none !rounded-2xl !px-3 !py-2 text-sm"
            />
            <button type="submit" disabled={!draft.trim()} className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Send reply as ${user?.name ?? 'you'}`}>
              <Icon name="send" className="!text-[18px]" />
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function CommunityLauncher() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/compose')) return null;

  return (
    <Link
      to="/compose"
      className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3.5 font-semibold text-white shadow-float transition hover:bg-secondary/90 lg:bottom-8 lg:left-8"
    >
      <Icon name="forum" />
      <span className="hidden sm:inline">Join the discussion</span>
    </Link>
  );
}

function AdvisorLauncher() {
  const setAdvisorOpen = useApp((s) => s.setAdvisorOpen);
  const { pathname } = useLocation();
  // Bölüm sayfasında kendi danışman paneli var; oluşturma ve mesaj ekranlarında yer kaplamasın.
  if (pathname.includes('/majors') || pathname.startsWith('/compose') || pathname.startsWith('/inbox/')) return null;
  return (
    <button
      type="button"
      onClick={() => setAdvisorOpen(true)}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3.5 font-semibold text-white shadow-float transition hover:bg-secondary/90 lg:bottom-8 lg:right-8"
    >
      <Icon name="smart_toy" />
      <span className="hidden sm:inline">AI College Match</span>
      <span className="h-2.5 w-2.5 rounded-full bg-tertiary-fixed" />
    </button>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-content px-4 pb-24 pt-24 lg:pb-8">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <CommunityLauncher />
      <AdvisorLauncher />
      <AdvisorDrawer />
      <MiniChatDock />
      <ToastHost />
    </div>
  );
}
