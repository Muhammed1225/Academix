import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BRAND } from '../data/mock';
import { clearRecentSearches, createSearchCatalog, getRecentSearches, matchesSearch, rememberSearch, relevanceScore, removeRecentSearch, type SearchCategory } from '../data/search';
import { universities } from '../data/educationOptions';
import { signOut as signOutAuth } from '../authService';
import { displayName } from '../data/userIdentity';
import { useApp } from '../store';
import { useNotifications } from '../notificationsStore';
import AdvisorDrawer from './AdvisorDrawer';
import NotificationsPanel from './NotificationsPanel';
import UserAvatar from './UserAvatar';
import { BrandMark, Icon, Tag, cx } from './ui';
import AskMentorModal from './AskMentorModal';

const navItems = [
  { to: '/', label: 'Feed', icon: 'dynamic_feed', end: true },
  { to: '/colleges', label: 'Explore Universities', icon: 'account_balance' },
  { to: '/connections', label: 'Make Connections', icon: 'person_add' },
  { to: '/inbox', label: 'Messages', icon: 'mail' },
];

export interface FeedSearchContext {
  query: string;
  selectedUniversities: string[];
  removeUniversity: (name: string) => void;
}

function Header({
  query,
  setQuery,
  selectedUniversities,
  setSelectedUniversities,
}: {
  query: string;
  setQuery: (value: string) => void;
  selectedUniversities: string[];
  setSelectedUniversities: (value: string[]) => void;
}) {
  const signedIn = useApp((s) => s.signedIn);
  const user = useApp((s) => s.user);
  const unreadMessages = useNotifications((s) => s.unreadMessageCount);
  const unreadNotifications = useNotifications((s) => s.unreadCount);
  const refreshNotifications = useNotifications((s) => s.refresh);
  const authChecked = useApp((s) => s.authChecked);
  const setSignedIn = useApp((s) => s.setSignedIn);
  const messageSoundsEnabled = useApp((s) => s.messageSoundsEnabled);
  const setMessageSoundsEnabled = useApp((s) => s.setMessageSoundsEnabled);
  const showToast = useApp((s) => s.showToast);
  const posts = useApp((s) => s.posts);
  const navigate = useNavigate();
  const location = useLocation();
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchType, setSearchType] = useState<SearchCategory | 'all'>('all');
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const [filterOpen, setFilterOpen] = useState(false);
  const [universityQuery, setUniversityQuery] = useState('');
  const [draftUniversities, setDraftUniversities] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchCatalog = useMemo(() => createSearchCatalog(posts), [posts]);
  const filterRootRef = useRef<HTMLDivElement>(null);
  const filteredUniversities = useMemo(
    () => universities.filter((name) => name.toLocaleLowerCase().includes(universityQuery.trim().toLocaleLowerCase())),
    [universityQuery],
  );
  const suggestionGroups = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const matched = searchCatalog
      .filter((item) => matchesSearch(`${item.title} ${item.subtitle} ${item.content}`, debouncedQuery))
      .sort((first, second) => relevanceScore(second, debouncedQuery) - relevanceScore(first, debouncedQuery));
    return [
      { id: 'people' as const, label: 'People', icon: 'person' },
      { id: 'universities' as const, label: 'Universities', icon: 'account_balance' },
      { id: 'programmes' as const, label: 'Programmes', icon: 'school' },
      { id: 'discussions' as const, label: 'Discussions', icon: 'forum' },
    ].map((category) => ({
      ...category,
      items: matched.filter((item) => item.category === category.id).slice(0, 3),
    })).filter((group) => group.items.length > 0);
  }, [debouncedQuery, searchCatalog]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') ?? '');
    const routeType = params.get('type');
    const availableTypes: (SearchCategory | 'all')[] = ['all', 'universities', 'programmes', 'people', 'discussions'];
    setSearchType(availableTypes.find((type) => type === routeType) ?? 'all');
    setRecentSearches(getRecentSearches());
  }, [location.pathname, location.search, setQuery]);

  useEffect(() => {
    if (!filterOpen) return;
    const closeOnOutsidePointer = (event: Event) => {
      if (!(event.target instanceof Node) || !filterRootRef.current?.contains(event.target)) setFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filterOpen]);

  useEffect(() => {
    void refreshNotifications(signedIn ? user : null);
    if (!signedIn || !user) return;
    const refresh = () => void refreshNotifications(user);
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('academix:notifications-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('academix:notifications-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshNotifications, signedIn, user]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  const openSearchResults = (selectedType = searchType) => {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    if (trimmed) {
      rememberSearch(trimmed);
      setRecentSearches(getRecentSearches());
    }
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (selectedType !== 'all') params.set('type', selectedType);
    setSearchFocused(false);
    const search = params.toString();
    navigate(search ? `/search?${search}` : '/search');
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (location.pathname === '/' || selectedUniversities.length > 0) {
      const trimmed = query.trim().replace(/\s+/g, ' ');
      if (trimmed) rememberSearch(trimmed);
      setSearchFocused(false);
      if (location.pathname !== '/') navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
      return;
    }
    openSearchResults();
  };

  const openSuggestion = (href: string, title: string) => {
    rememberSearch(title);
    setRecentSearches(getRecentSearches());
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
        <div className="flex min-w-0 max-w-md flex-1 items-center gap-2">
          <Link to="/" className="shrink-0" aria-label={`${BRAND} feed`}>
            <BrandMark />
          </Link>
          <form
            onSubmit={onSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false);
            }}
            className="relative hidden min-w-0 flex-1 md:block"
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
              <div role="group" aria-label="Search suggestions" className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-outline-variant/60 bg-white py-2 shadow-float">
                {suggestionGroups.length ? suggestionGroups.map((group) => (
                  <section key={group.id} aria-label={group.label}>
                    <h2 className="px-4 pt-2 text-[10px] font-bold uppercase tracking-wider text-outline">{group.label}</h2>
                    {group.items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => openSuggestion(item.href, item.title)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-container-low"
                      >
                        {item.image
                          ? <UserAvatar src={item.image} name={item.title} size={34} />
                          : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary"><Icon name={group.icon} /></span>}
                        <span className="min-w-0 flex-1">
                        <span title={displayName(item.title)} className="block truncate text-sm font-semibold text-primary">{displayName(item.title)}</span>
                          <span className="block truncate text-xs text-on-surface-variant">{item.subtitle}</span>
                        </span>
                      </button>
                    ))}
                  </section>
                )) : <p className="px-4 py-3 text-sm text-on-surface-variant">No suggestions found.</p>}
                <div className="flex gap-1 overflow-x-auto border-t border-outline-variant/40 px-3 py-2">
                  {[
                    { id: 'all' as const, label: 'All' },
                    { id: 'universities' as const, label: 'Universities' },
                    { id: 'programmes' as const, label: 'Programmes' },
                    { id: 'people' as const, label: 'People' },
                    { id: 'discussions' as const, label: 'Discussions' },
                  ].map((type) => (
                    <button
                      type="button"
                      key={type.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setSearchType(type.id)}
                      aria-pressed={searchType === type.id}
                      className={cx(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        searchType === type.id ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openSearchResults()}
                  className="flex w-full items-center gap-2 border-t border-outline-variant/40 px-4 py-3 text-left text-sm font-semibold text-secondary hover:bg-surface-container-low"
                >
                  <Icon name="search" />See all results for '{query.trim()}'
                </button>
              </div>
            ) : (
              <div role="group" aria-label="Recent searches" className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-outline-variant/60 bg-white py-2 shadow-float">
                {recentSearches.length ? (
                  <>
                    <div className="flex items-center justify-between px-4 pb-1">
                      <h2 className="text-xs font-semibold text-on-surface-variant">Recent searches</h2>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          clearRecentSearches();
                          setRecentSearches([]);
                        }}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    {recentSearches.map((recent) => (
                      <div key={recent} className="flex items-center gap-2 px-3 hover:bg-surface-container-low">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setQuery(recent);
                            rememberSearch(recent);
                            setRecentSearches(getRecentSearches());
                            setSearchFocused(false);
                            navigate(`/search?q=${encodeURIComponent(recent)}`);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left text-sm"
                        >
                          <Icon name="history" className="text-outline" />
                          <span className="truncate">{recent}</span>
                        </button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            removeRecentSearch(recent);
                            setRecentSearches(getRecentSearches());
                          }}
                          aria-label={`Remove recent search ${recent}`}
                          className="rounded-full p-1 text-outline hover:bg-white hover:text-primary"
                        >
                          <Icon name="close" className="!text-[16px]" />
                        </button>
                      </div>
                    ))}
                  </>
                ) : <p className="px-4 py-3 text-sm text-on-surface-variant">Start typing to find people, universities, programmes, and discussions.</p>}
              </div>
            ))}
          </form>
          <button type="button" onClick={() => navigate('/search')} aria-label="Open search" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden">
            <Icon name="search" />
          </button>
          <div ref={filterRootRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!filterOpen) setDraftUniversities(selectedUniversities);
                setFilterOpen((open) => !open);
              }}
              aria-label="Filter universities"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className={cx(
                'relative inline-flex h-10 items-center gap-1.5 rounded-full border px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:px-3',
                selectedUniversities.length ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              <Icon name="filter_list" className="!text-[18px]" />
              <span className="hidden sm:inline">Filter</span>
              {selectedUniversities.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold leading-none text-white">
                  {selectedUniversities.length}
                </span>
              )}
            </button>
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filter by university"
                className="absolute right-0 top-full z-[70] mt-2 flex max-h-[min(70vh,34rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-float"
              >
                <div className="border-b border-outline-variant/40 p-3">
                  <label className="relative block">
                    <span className="sr-only">Search universities</span>
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline !text-[18px]" />
                    <input
                      value={universityQuery}
                      onChange={(event) => setUniversityQuery(event.target.value)}
                      placeholder="Search universities..."
                      className="input !py-2 pl-9"
                    />
                  </label>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2" role="group" aria-label="Universities">
                  {filteredUniversities.length ? filteredUniversities.map((name) => {
                    const checked = draftUniversities.includes(name);
                    return (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-low focus-within:bg-surface-container-low"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setDraftUniversities((current) =>
                            checked ? current.filter((item) => item !== name) : [...current, name],
                          )}
                          className="h-4 w-4 shrink-0 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        />
                        <span>{name}</span>
                      </label>
                    );
                  }) : (
                    <p className="px-2.5 py-4 text-center text-sm text-on-surface-variant">No universities found</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant/40 p-3">
                  <button
                    type="button"
                    onClick={() => setDraftUniversities([])}
                    disabled={draftUniversities.length === 0}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUniversities(draftUniversities);
                      setFilterOpen(false);
                      if (location.pathname !== '/') {
                        const trimmed = query.trim().replace(/\s+/g, ' ');
                        navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
                      }
                    }}
                    className="btn-primary !h-9 !px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
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
              {item.to === '/inbox' && unreadMessages > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-fixed px-1.5 text-[11px] font-bold text-secondary">
                  {unreadMessages}
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
              <UserAvatar src={user?.photo || undefined} name={displayName(user?.name, user?.email)} email={user?.email} size={44} />
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
          <div className="relative">
            <button
              type="button"
              className="relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
              aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              aria-haspopup="dialog"
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Icon name="notifications" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
          </div>
          {!signedIn && authChecked && (
            <Link to="/auth" className="btn-primary">Sign up / Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const unread = useNotifications((s) => s.unreadMessageCount);
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

function Footer({ onAskMentor }: { onAskMentor: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const openCollegeDirectories = () => {
    navigate('/colleges#browse-universities');
    if (location.pathname === '/colleges') {
      window.requestAnimationFrame(() => {
        document.getElementById('browse-universities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };
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
              {col.links.map((label) => (
                <li key={label}>
                  {col.title === 'Network' ? (
                    label === 'Scholars Feed' ? (
                      <button type="button" onClick={() => navigate('/?postsFrom=student-scholar')} className="text-left transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                        {label}
                      </button>
                    ) : label === 'College Directories' ? (
                      <button type="button" onClick={openCollegeDirectories} className="text-left transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                        {label}
                      </button>
                    ) : label === 'Verified Mentors' ? (
                      <Link to="/mentors" className="transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                        {label}
                      </Link>
                    ) : (
                      <button type="button" onClick={onAskMentor} className="text-left transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                        {label}
                      </button>
                    )
                  ) : label}
                </li>
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

  const otherUser = displayName([...ticket.messages].reverse().find((message) => !message.isMe)?.author ?? ticket.from);
  const contactProfile = ticket.contactId ? `/people/${ticket.contactId}` : undefined;
  const messagePerson = ticket.contactId ? {
    id: ticket.contactId,
    name: otherUser,
    subtitle: ticket.contactProfileSubtitle ?? ticket.fromMeta,
    ...(ticket.contactAvatar ? { avatar: ticket.contactAvatar } : {}),
  } : undefined;

  const expandConversation = () => {
    setMinimized(false);
    navigate(`/inbox/${ticket.id}`);
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || resizeRef.current || dragRef.current) return;
    if (event.target instanceof Element && event.target.closest('a, button, textarea, form, [role="menu"]')) return;
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
      <section
        aria-label={`Conversation with ${otherUser}`}
        className="fixed bottom-20 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-full border border-outline-variant/60 bg-white py-2 pl-2 pr-4 text-left shadow-float transition sm:bottom-4 sm:right-4"
      >
        <UserAvatar
          src={ticket.contactAvatar}
          name={otherUser}
          size={40}
          showStatus
          profileHref={contactProfile}
          subtitle={ticket.fromMeta}
          profileSubtitle={ticket.contactProfileSubtitle}
          role={ticket.contactRole}
          messagePerson={messagePerson}
        />
        {ticket.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-error" aria-label="Unread" />}
        <button type="button" onClick={() => setMinimized(false)} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-secondary">
          Conversation minimized<Icon name="chat" className="text-secondary" />
        </button>
      </section>
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
          <UserAvatar
            src={ticket.contactAvatar}
            name={otherUser}
            size={38}
            showStatus
            profileHref={contactProfile}
            subtitle={ticket.fromMeta}
            profileSubtitle={ticket.contactProfileSubtitle}
            subtitleClassName="text-white/80"
            role={ticket.contactRole}
            messagePerson={messagePerson}
            showName
            nameClassName="text-sm text-white"
            className="min-w-0 flex-1"
          />
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
        {ticket.messages.map((message, index) => {
          const firstInGroup = index === 0 || ticket.messages[index - 1].isMe !== message.isMe;
          const senderName = message.isMe ? displayName(user?.name, user?.email) : otherUser;
          const profileHref = message.isMe ? '/profile' : contactProfile;
          const role = message.isMe
            ? user?.role === 'faculty' ? 'Faculty' : user?.role === 'scholar' ? 'Student' : 'Applicant'
            : ticket.contactRole;
          return (
            <div key={`${ticket.id}-${index}`} className={`flex items-start gap-2 ${message.isMe ? 'flex-row-reverse' : 'justify-start'}`}>
              {firstInGroup ? (
                <UserAvatar
                  src={message.isMe ? user?.photo || undefined : ticket.contactAvatar}
                  name={senderName}
                  size={28}
                  email={message.isMe ? user?.email : undefined}
                  profileHref={profileHref}
                  subtitle={message.isMe
                    ? [user?.major, user?.university].filter(Boolean).join(' • ') || 'Academix community member'
                    : ticket.fromMeta}
                  profileSubtitle={message.isMe ? undefined : ticket.contactProfileSubtitle}
                  role={role}
                  messagePerson={message.isMe ? undefined : messagePerson}
                  showName
                  nameClassName="max-w-[90px] text-[11px]"
                  className="max-w-[42%] shrink-0 items-start"
                />
              ) : <span aria-hidden="true" className="w-7 shrink-0" />}
              <div className={`min-w-0 max-w-[88%] rounded-2xl px-3 py-2 ${message.isMe ? 'rounded-br-md bg-secondary text-white' : 'rounded-bl-md border border-outline-variant/50 bg-white text-on-surface'}`}>
                <div className="flex items-center gap-2">
                  {firstInGroup && role && <Tag tone={message.isMe ? 'neutral' : 'blue'} className="!px-1.5 !py-0 text-[10px]">{role}</Tag>}
                  <span className={`ml-auto text-[10px] ${message.isMe ? 'text-white/75' : 'text-on-surface-variant'}`}>{message.time}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
              </div>
            </div>
          );
        })}
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
            <button type="submit" disabled={!draft.trim()} className="mb-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Send reply as ${displayName(user?.name, user?.email)}`}>
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
  const [query, setQuery] = useState('');
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [askMentorOpen, setAskMentorOpen] = useState(false);
  const feedSearchContext = useMemo<FeedSearchContext>(() => ({
    query,
    selectedUniversities,
    removeUniversity: (name) => setSelectedUniversities((current) => current.filter((university) => university !== name)),
  }), [query, selectedUniversities]);

  return (
    <div className="min-h-screen">
      <Header
        query={query}
        setQuery={setQuery}
        selectedUniversities={selectedUniversities}
        setSelectedUniversities={setSelectedUniversities}
      />
      <main className="mx-auto max-w-content px-4 pb-24 pt-24 lg:pb-8">
        <Outlet context={feedSearchContext} />
      </main>
      <Footer onAskMentor={() => setAskMentorOpen(true)} />
      <MobileNav />
      <CommunityLauncher />
      <AdvisorLauncher />
      <AdvisorDrawer />
      <MiniChatDock />
      <ToastHost />
      {askMentorOpen && <AskMentorModal onClose={() => setAskMentorOpen(false)} />}
    </div>
  );
}
