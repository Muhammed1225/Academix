import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type RefObject } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BRAND, colleges } from '../data/mock';
import { clearRecentSearches, createSearchCatalog, getRecentSearches, matchesSearch, rememberSearch, relevanceScore, removeRecentSearch, type SearchCategory } from '../data/search';
import { majors as majorOptions, universities } from '../data/educationOptions';
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
  selectedMajors: string[];
  removeUniversity: (name: string) => void;
  removeMajor: (name: string) => void;
}

function Header({
  query,
  setQuery,
  selectedUniversities,
  setSelectedUniversities,
  selectedMajors,
  setSelectedMajors,
}: {
  query: string;
  setQuery: (value: string) => void;
  selectedUniversities: string[];
  setSelectedUniversities: (value: string[]) => void;
  selectedMajors: string[];
  setSelectedMajors: (value: string[]) => void;
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
  const [filterSection, setFilterSection] = useState<'universities' | 'majors'>('universities');
  const [universityQuery, setUniversityQuery] = useState('');
  const [majorQuery, setMajorQuery] = useState('');
  const [draftUniversities, setDraftUniversities] = useState<string[]>([]);
  const [draftMajors, setDraftMajors] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchCatalog = useMemo(() => createSearchCatalog(posts), [posts]);
  const filterRootRef = useRef<HTMLDivElement>(null);
  const filteredUniversities = useMemo(
    () => universities.filter((name) => name.toLocaleLowerCase().includes(universityQuery.trim().toLocaleLowerCase())),
    [universityQuery],
  );
  const availableMajors = useMemo(() => [...new Set([
    ...majorOptions,
    ...colleges.flatMap((college) => [
      ...college.majorCategories.filter((category) => category !== 'All Disciplines'),
      ...college.majors.map((major) => major.name),
    ]),
  ])].sort((first, second) => first.localeCompare(second)), []);
  const filteredMajors = useMemo(
    () => availableMajors.filter((name) => name.toLocaleLowerCase().includes(majorQuery.trim().toLocaleLowerCase())),
    [availableMajors, majorQuery],
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
    if (location.pathname === '/' || selectedUniversities.length > 0 || selectedMajors.length > 0) {
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
                if (!filterOpen) {
                  setDraftUniversities(selectedUniversities);
                  setDraftMajors(selectedMajors);
                }
                setFilterOpen((open) => !open);
              }}
              aria-label="Filter universities and majors"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className={cx(
                'relative inline-flex h-10 items-center gap-1.5 rounded-full border px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:px-3',
                selectedUniversities.length + selectedMajors.length ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              <Icon name="filter_list" className="!text-[18px]" />
              <span className="hidden sm:inline">Filter</span>
              {selectedUniversities.length + selectedMajors.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold leading-none text-white">
                  {selectedUniversities.length + selectedMajors.length}
                </span>
              )}
            </button>
            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filter by university and major"
                className="absolute right-0 top-full z-[70] mt-2 flex max-h-[min(70vh,34rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-float"
              >
                <div className="grid grid-cols-2 border-b border-outline-variant/40 p-2" role="tablist" aria-label="Filter categories">
                  <button
                    type="button"
                    role="tab"
                    id="university-filter-tab"
                    aria-selected={filterSection === 'universities'}
                    aria-controls="university-filter-panel"
                    onClick={() => setFilterSection('universities')}
                    className={cx('flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors', filterSection === 'universities' ? 'bg-secondary-fixed text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low')}
                  >
                    Universities
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-xs">{draftUniversities.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="major-filter-tab"
                    aria-selected={filterSection === 'majors'}
                    aria-controls="major-filter-panel"
                    onClick={() => setFilterSection('majors')}
                    className={cx('flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors', filterSection === 'majors' ? 'bg-secondary-fixed text-secondary' : 'text-on-surface-variant hover:bg-surface-container-low')}
                  >
                    Majors
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-xs">{draftMajors.length}</span>
                  </button>
                </div>
                {filterSection === 'universities' ? (
                  <div id="university-filter-panel" role="tabpanel" aria-labelledby="university-filter-tab" className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 p-3">
                      <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Search universities</span>
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline !text-[18px]" />
                        <input
                          value={universityQuery}
                          onChange={(event) => setUniversityQuery(event.target.value)}
                          placeholder="Search universities..."
                          className="input !py-2 pl-9"
                        />
                      </label>
                      <button type="button" onClick={() => setDraftUniversities([])} disabled={draftUniversities.length === 0} className="shrink-0 rounded px-1 py-2 text-xs font-semibold text-secondary hover:bg-surface-container-low disabled:opacity-50">Clear</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2" role="group" aria-label="Universities">
                      {filteredUniversities.length ? filteredUniversities.map((name) => {
                        const checked = draftUniversities.includes(name);
                        return (
                          <label key={name} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-low focus-within:bg-surface-container-low">
                            <input type="checkbox" checked={checked} onChange={() => setDraftUniversities((current) => checked ? current.filter((item) => item !== name) : [...current, name])} className="h-4 w-4 shrink-0 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" />
                            <span>{name}</span>
                          </label>
                        );
                      }) : <p className="px-2.5 py-4 text-center text-sm text-on-surface-variant">No universities found</p>}
                    </div>
                  </div>
                ) : (
                  <div id="major-filter-panel" role="tabpanel" aria-labelledby="major-filter-tab" className="flex min-h-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2 border-b border-outline-variant/40 p-3">
                      <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Search majors and fields of study</span>
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline !text-[18px]" />
                        <input
                          value={majorQuery}
                          onChange={(event) => setMajorQuery(event.target.value)}
                          placeholder="Search majors..."
                          className="input !py-2 pl-9"
                        />
                      </label>
                      <button type="button" onClick={() => setDraftMajors([])} disabled={draftMajors.length === 0} className="shrink-0 rounded px-1 py-2 text-xs font-semibold text-secondary hover:bg-surface-container-low disabled:opacity-50">Clear</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2" role="group" aria-label="Majors and fields of study">
                      {filteredMajors.length ? filteredMajors.map((name) => {
                        const checked = draftMajors.includes(name);
                        return (
                          <label key={name} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-low focus-within:bg-surface-container-low">
                            <input type="checkbox" checked={checked} onChange={() => setDraftMajors((current) => checked ? current.filter((item) => item !== name) : [...current, name])} className="h-4 w-4 shrink-0 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" />
                            <span>{name}</span>
                          </label>
                        );
                      }) : <p className="px-2.5 py-4 text-center text-sm text-on-surface-variant">No majors found</p>}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant/40 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftUniversities([]);
                      setDraftMajors([]);
                    }}
                    disabled={draftUniversities.length === 0 && draftMajors.length === 0}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUniversities(draftUniversities);
                      setSelectedMajors(draftMajors);
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
  const conversationId = useApp((state) => state.miniChatConversationId);
  const conversation = useApp((state) => state.conversations.find((item) => item.id === conversationId));
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
  const dockRef = useRef<HTMLElement>(null);
  const suppressHeaderClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const resizeRef = useRef<{
    direction: 'top' | 'left' | 'corner';
    pointerId: number;
    pointerX: number;
    pointerY: number;
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const previousUserSelectRef = useRef<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojis = ['😀', '😂', '😊', '😍', '🥳', '🤔', '👏', '🙌', '👍', '❤️', '🎓', '📚', '✨', '✅', '🎉', '🙏'];

  useEffect(() => {
    setDraft(conversation?.suggestedReply ?? '');
    setEmojiOpen(false);
  }, [conversation?.id, conversation?.suggestedReply]);

  useEffect(() => {
    if (!minimized) messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages.length, minimized]);

  useEffect(() => {
    return () => {
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
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
    if (!conversation || minimized || hidden || pathname.startsWith('/inbox')) return;
    const markFocusedConversationRead = () => {
      if (conversation.unread && document.visibilityState === 'visible' && document.hasFocus()) {
        markRead(conversation.id);
      }
    };
    markFocusedConversationRead();
    window.addEventListener('focus', markFocusedConversationRead);
    document.addEventListener('visibilitychange', markFocusedConversationRead);
    return () => {
      window.removeEventListener('focus', markFocusedConversationRead);
      document.removeEventListener('visibilitychange', markFocusedConversationRead);
    };
  }, [hidden, markRead, minimized, pathname, conversation]);

  useEffect(() => {
    if (!dockPosition) return;
    const keepDockInViewport = () => {
      const bounds = dockRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setDockPosition((position) => position ? {
        left: Math.max(0, Math.min(window.innerWidth - bounds.width, position.left)),
        top: Math.max(0, Math.min(window.innerHeight - bounds.height, position.top)),
      } : null);
    };
    window.addEventListener('resize', keepDockInViewport);
    return () => window.removeEventListener('resize', keepDockInViewport);
  }, [dockPosition]);

  if (!signedIn || !conversation || hidden || pathname.startsWith('/inbox')) return null;

  const otherUser = displayName([...conversation.messages].reverse().find((message) => !message.isMe)?.author ?? conversation.from);
  const contactProfile = conversation.contactId ? `/people/${conversation.contactId}` : undefined;
  const messagePerson = conversation.contactId ? {
    id: conversation.contactId,
    name: otherUser,
    subtitle: conversation.contactProfileSubtitle ?? conversation.fromMeta,
    ...(conversation.contactAvatar ? { avatar: conversation.contactAvatar } : {}),
  } : undefined;

  const expandConversation = () => {
    setMinimized(false);
    navigate(`/inbox/${conversation.id}`);
  };

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || resizeRef.current || dragRef.current) return;
    if (event.target instanceof Element && event.target.closest('a, button, textarea, form, [role="menu"]')) return;
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
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
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) <= 4) return;
    event.preventDefault();
    drag.moved = true;
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setDockPosition({
      left: Math.max(0, Math.min(window.innerWidth - bounds.width, drag.left + deltaX)),
      top: Math.max(0, Math.min(window.innerHeight - bounds.height, drag.top + deltaY)),
    });
  };

  const stopDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.moved) {
      suppressHeaderClickRef.current = true;
      window.setTimeout(() => {
        suppressHeaderClickRef.current = false;
      }, 0);
      const bounds = dockRef.current?.getBoundingClientRect();
      if (bounds) {
        const left = Math.max(0, Math.min(window.innerWidth - bounds.width, drag.left + event.clientX - drag.pointerX));
        const top = Math.max(0, Math.min(window.innerHeight - bounds.height, drag.top + event.clientY - drag.pointerY));
        const dockBottom = window.matchMedia('(min-width: 1024px)').matches ? 32 : 96;
        const dockRight = window.matchMedia('(min-width: 1024px)').matches ? 32 : 16;
        const atDock = Math.abs(window.innerHeight - top - bounds.height - dockBottom) < 48
          && Math.abs(window.innerWidth - left - bounds.width - dockRight) < 48;
        if (atDock) {
          setDockPosition(null);
        } else {
          const collisions = ['ai-college-match-launcher', 'community-launcher']
            .map((id) => document.getElementById(id)?.getBoundingClientRect())
            .filter((rect): rect is DOMRect => !!rect);
          const overlaps = (x: number, y: number) => collisions.some((rect) =>
            x < rect.right + 12 && x + bounds.width > rect.left - 12
            && y < rect.bottom + 12 && y + bounds.height > rect.top - 12);
          const candidates = [
            { left: left, top: top - bounds.height - 12 },
            { left: left, top: top + bounds.height + 12 },
            { left: left - bounds.width - 12, top },
            { left: left + bounds.width + 12, top },
          ].map((candidate) => ({
            left: Math.max(0, Math.min(window.innerWidth - bounds.width, candidate.left)),
            top: Math.max(0, Math.min(window.innerHeight - bounds.height, candidate.top)),
          }));
          const safePosition = candidates
            .filter((candidate) => !overlaps(candidate.left, candidate.top))
            .sort((first, second) =>
              Math.hypot(first.left - left, first.top - top) - Math.hypot(second.left - left, second.top - top))[0];
          setDockPosition(overlaps(left, top) ? safePosition ?? null : { left, top });
        }
      }
    }
    dragRef.current = null;
    document.documentElement.style.userSelect = previousUserSelectRef.current ?? '';
    previousUserSelectRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.moved) setDockPosition(null);
    dragRef.current = null;
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
      left: bounds.left,
      top: bounds.top,
    };
  };

  const applyResize = (pointerX: number, pointerY: number) => {
    const start = resizeRef.current;
    if (!start) return;
    const desktop = window.matchMedia('(min-width: 640px)').matches;
    const largeDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const maxWidth = Math.max(1, Math.min(
      window.innerWidth - (desktop ? 304 : 112),
      window.innerWidth - (desktop ? 32 : 24),
    ));
    const maxHeight = Math.max(1, window.innerHeight - (largeDesktop ? 112 : 176));
    const minWidth = Math.min(280, maxWidth);
    const minHeight = Math.min(300, maxHeight);
    const width = start.direction === 'top'
      ? start.width
      : Math.max(minWidth, Math.min(maxWidth, start.width - (pointerX - start.pointerX)));
    const height = start.direction === 'left'
      ? start.height
      : Math.max(minHeight, Math.min(maxHeight, start.height - (pointerY - start.pointerY)));
    setDockSize({ width, height });
    if (dockPosition) {
      setDockPosition({
        left: Math.max(0, Math.min(window.innerWidth - width, start.left + start.width - width)),
        top: Math.max(0, Math.min(window.innerHeight - height, start.top + start.height - height)),
      });
    }
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
    if (!draft.trim()) return;
    reply(conversation.id, draft.trim());
    setDraft('');
    setEmojiOpen(false);
  };

  if (minimized) {
    return (
      <section
        ref={dockRef}
        data-chat-dock={dockPosition ? 'floating' : 'docked'}
        aria-label={`Conversation with ${otherUser}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        style={dockPosition ? { left: dockPosition.left, top: dockPosition.top } : undefined}
        className={`fixed z-40 flex max-w-[calc(100vw-7rem)] items-center gap-3 rounded-full border border-outline-variant/60 bg-white py-2 pl-2 pr-4 text-left shadow-float transition sm:max-w-[calc(100vw-19rem)] ${dockPosition ? '' : 'bottom-24 right-4 sm:bottom-24 sm:right-4 lg:bottom-8 lg:right-8'}`}
      >
        <span aria-hidden="true" className="cursor-grab touch-none text-outline active:cursor-grabbing">
          <Icon name="drag_indicator" className="!text-[18px]" />
        </span>
        <UserAvatar
          disableProfilePreview
          src={conversation.contactAvatar}
          name={otherUser}
          size={40}
          showStatus
          profileHref={contactProfile}
          subtitle={conversation.fromMeta}
          profileSubtitle={conversation.contactProfileSubtitle}
          role={conversation.contactRole}
          messagePerson={messagePerson}
        />
        {conversation.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-error" aria-label="Unread" />}
        <button type="button" onClick={() => setMinimized(false)} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-secondary">
          Conversation minimized<Icon name="chat" className="text-secondary" />
        </button>
      </section>
    );
  }

  return (
    <section
      ref={dockRef}
      data-chat-dock={dockPosition ? 'floating' : 'docked'}
      aria-label={`Conversation with ${otherUser}`}
      style={{
        width: dockSize.width,
        height: dockSize.height,
        ...(dockPosition ? { left: dockPosition.left, top: dockPosition.top } : {}),
      }}
      className={`group fixed z-40 flex max-h-[calc(100dvh-11rem)] max-w-[calc(100vw-7rem)] flex-col overflow-hidden rounded-t-2xl rounded-b-xl border border-outline-variant/60 bg-white shadow-float sm:max-h-[calc(100dvh-11rem)] sm:max-w-[calc(100vw-19rem)] lg:max-h-[calc(100dvh-7rem)] ${dockPosition ? '' : 'bottom-24 right-4 sm:bottom-24 sm:right-4 lg:bottom-8 lg:right-8'}`}
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
        className="group/header flex touch-none items-center gap-2.5 border-b border-white/15 bg-[#0B5BD3] px-3.5 py-3 text-white"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(event) => {
            if (suppressHeaderClickRef.current) {
              event.preventDefault();
              return;
            }
            if (event.target instanceof Element && event.target.closest('a, button')) return;
            setMinimized(!minimized);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setMinimized(!minimized);
            }
          }}
          aria-label={`Conversation with ${otherUser}. Click to ${minimized ? 'restore' : 'minimize'}.`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <UserAvatar
            disableProfilePreview
            src={conversation.contactAvatar}
            name={otherUser}
            size={38}
            showStatus
            profileHref={contactProfile}
            subtitle={conversation.fromMeta}
            profileSubtitle={conversation.contactProfileSubtitle}
            subtitleClassName="text-white/80"
            role={conversation.contactRole}
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
        <span aria-hidden="true" className="cursor-grab touch-none text-white/70 active:cursor-grabbing">
          <Icon name="drag_indicator" className="!text-[18px]" />
        </span>
      </header>
      <div role="log" aria-label="Conversation messages" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-surface p-3">
        {conversation.messages.map((message, index) => {
          const firstInGroup = index === 0 || conversation.messages[index - 1].isMe !== message.isMe;
          const senderName = message.isMe ? displayName(user?.name, user?.email) : otherUser;
          const profileHref = message.isMe ? '/profile' : contactProfile;
          const role = message.isMe
            ? user?.role === 'faculty' ? 'Faculty' : user?.role === 'scholar' ? 'Student' : 'Applicant'
            : conversation.contactRole;
          return (
            <div key={`${conversation.id}-${index}`} className={`flex items-start gap-2 ${message.isMe ? 'flex-row-reverse' : 'justify-start'}`}>
              {firstInGroup ? (
                <UserAvatar
                  disableProfilePreview
                  src={message.isMe ? user?.photo || undefined : conversation.contactAvatar}
                  name={senderName}
                  size={28}
                  email={message.isMe ? user?.email : undefined}
                  profileHref={profileHref}
                  subtitle={message.isMe
                    ? [user?.major, user?.university].filter(Boolean).join(' • ') || 'Academix community member'
                    : conversation.fromMeta}
                  profileSubtitle={message.isMe ? undefined : conversation.contactProfileSubtitle}
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
    </section>
  );
}

function CommunityLauncher() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/compose')) return null;

  return (
    <Link
      id="community-launcher"
      to="/compose"
      className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3.5 font-semibold text-white shadow-float transition hover:bg-secondary/90 lg:bottom-8 lg:left-8"
    >
      <Icon name="forum" />
      <span className="hidden sm:inline">Join the discussion</span>
    </Link>
  );
}

function AdvisorLauncher({
  buttonRef,
  position,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onOpen,
  dragging,
}: {
  buttonRef: RefObject<HTMLButtonElement>;
  position: { left: number; top: number } | null;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  dragging: boolean;
}) {
  const { pathname } = useLocation();
  // Bölüm sayfasında kendi danışman paneli var; oluşturma ve mesaj ekranlarında yer kaplamasın.
  if (pathname.includes('/majors') || pathname.startsWith('/compose') || pathname.startsWith('/inbox/')) return null;
  return (
    <button
      ref={buttonRef}
      id="ai-college-match-launcher"
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onClick={onOpen}
      aria-label="AI College Match"
      title="AI College Match"
      style={position ? { left: position.left, top: position.top } : undefined}
      className={`fixed z-50 flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3.5 font-semibold text-white shadow-float ${dragging ? 'transition-none' : 'transition-all duration-[250ms] ease-in-out motion-reduce:transition-none'} hover:bg-secondary/90 ${position ? '' : 'bottom-[calc(96px_+_var(--chat-dock-height,0px)_+_var(--chat-dock-stack-gap,0px))] right-4 lg:bottom-[calc(32px_+_var(--chat-dock-height,0px)_+_var(--chat-dock-stack-gap,0px))] lg:right-8'}`}
    >
      <Icon name="smart_toy" />
      <span className="hidden sm:inline">AI College Match</span>
      <span className="h-2.5 w-2.5 rounded-full bg-tertiary-fixed" />
      <Icon name="drag_indicator" className="!text-[16px] text-white/70" />
    </button>
  );
}

function findFreePosition(
  left: number,
  top: number,
  width: number,
  height: number,
  blockers: DOMRect[],
): { left: number; top: number } {
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  const clamp = (x: number, y: number) => ({
    left: Math.max(0, Math.min(maxLeft, x)),
    top: Math.max(0, Math.min(maxTop, y)),
  });
  const overlaps = (x: number, y: number) => blockers.some((rect) =>
    x < rect.right + 12 && x + width > rect.left - 12
    && y < rect.bottom + 12 && y + height > rect.top - 12);
  const candidates = [
    { left, top },
    ...blockers.flatMap((rect) => [
      { left: rect.left, top: rect.top - height - 12 },
      { left: rect.left, top: rect.bottom + 12 },
      { left: rect.left - width - 12, top: rect.top },
      { left: rect.right + 12, top: rect.top },
    ]),
    { left: 12, top: 12 },
    { left: maxLeft - 12, top: 12 },
    { left: 12, top: maxTop - 12 },
    { left: maxLeft - 12, top: maxTop - 12 },
    ...Array.from({ length: Math.ceil(maxTop / 32) + 1 }, (_, row) =>
      Array.from({ length: Math.ceil(maxLeft / 32) + 1 }, (_, column) => ({
        left: Math.min(maxLeft, column * 32),
        top: Math.min(maxTop, row * 32),
      }))).flat(),
  ].map((candidate) => clamp(candidate.left, candidate.top));
  const safe = candidates.filter((candidate) => !overlaps(candidate.left, candidate.top));
  return safe.sort((first, second) =>
    Math.hypot(first.left - left, first.top - top) - Math.hypot(second.left - left, second.top - top))[0]
    ?? clamp(left, top);
}

function FloatingActionLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const advisorButtonRef = useRef<HTMLButtonElement>(null);
  const advisorPanelRef = useRef<HTMLDivElement>(null);
  const advisorDragRef = useRef<{
    target: 'button' | 'panel';
    pointerId: number;
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressAdvisorClickRef = useRef(false);
  const [advisorPosition, setAdvisorPosition] = useState<{ left: number; top: number } | null>(null);
  const [advisorPanelPosition, setAdvisorPanelPosition] = useState<{ left: number; top: number } | null>(null);
  const [advisorDragging, setAdvisorDragging] = useState(false);
  const advisorPositionRef = useRef(advisorPosition);
  const advisorPanelPositionRef = useRef(advisorPanelPosition);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  advisorPositionRef.current = advisorPosition;
  advisorPanelPositionRef.current = advisorPanelPosition;
  const signedIn = useApp((state) => state.signedIn);
  const conversationId = useApp((state) => state.miniChatConversationId);
  const hasConversation = useApp((state) => state.conversations.some((conversation) => conversation.id === state.miniChatConversationId));
  const hidden = useApp((state) => state.miniChatHidden);
  const { pathname } = useLocation();
  const chatVisible = signedIn && !!conversationId && hasConversation && !hidden && !pathname.startsWith('/inbox');
  const dockRects = () => [...document.querySelectorAll<HTMLElement>('[data-chat-dock]')]
    .map((dock) => dock.getBoundingClientRect());

  const beginAdvisorDrag = (
    target: 'button' | 'panel',
    event: PointerEvent<HTMLElement>,
    element: HTMLElement | null,
  ) => {
    if (event.button !== 0 || !element || advisorDragRef.current) return;
    if (target === 'panel' && event.target instanceof Element && event.target.closest('button, input, textarea, a')) return;
    const bounds = element.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    document.documentElement.style.userSelect = 'none';
    setAdvisorDragging(true);
    advisorDragRef.current = {
      target,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
      moved: false,
    };
  };

  const moveAdvisorDrag = (target: 'button' | 'panel', event: PointerEvent<HTMLElement>) => {
    const drag = advisorDragRef.current;
    if (drag?.target !== target || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) <= 4) return;
    event.preventDefault();
    drag.moved = true;
    const element = target === 'button' ? advisorButtonRef.current : advisorPanelRef.current;
    const bounds = element?.getBoundingClientRect();
    if (!bounds) return;
    const position = findFreePosition(
      drag.left + deltaX,
      drag.top + deltaY,
      bounds.width,
      bounds.height,
      dockRects(),
    );
    if (target === 'button') setAdvisorPosition(position);
    else setAdvisorPanelPosition(position);
  };

  const endAdvisorDrag = (target: 'button' | 'panel', event: PointerEvent<HTMLElement>) => {
    const drag = advisorDragRef.current;
    if (drag?.target !== target || drag.pointerId !== event.pointerId) return;
    const element = target === 'button' ? advisorButtonRef.current : advisorPanelRef.current;
    const bounds = element?.getBoundingClientRect();
    if (drag.moved && bounds) {
      const position = findFreePosition(
        drag.left + event.clientX - drag.pointerX,
        drag.top + event.clientY - drag.pointerY,
        bounds.width,
        bounds.height,
        dockRects(),
      );
      if (target === 'button') setAdvisorPosition(position);
      else setAdvisorPanelPosition(position);
      suppressAdvisorClickRef.current = true;
      window.setTimeout(() => { suppressAdvisorClickRef.current = false; }, 0);
    } else if (target === 'button') {
      setAdvisorOpen(true);
    }
    advisorDragRef.current = null;
    setAdvisorDragging(false);
    document.documentElement.style.userSelect = '';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancelAdvisorDrag = (target: 'button' | 'panel', event: PointerEvent<HTMLElement>) => {
    if (advisorDragRef.current?.target !== target || advisorDragRef.current.pointerId !== event.pointerId) return;
    advisorDragRef.current = null;
    setAdvisorDragging(false);
    document.documentElement.style.userSelect = '';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const advisorPanelDragHandlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => beginAdvisorDrag('panel', event, advisorPanelRef.current),
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => moveAdvisorDrag('panel', event),
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => endAdvisorDrag('panel', event),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => cancelAdvisorDrag('panel', event),
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => cancelAdvisorDrag('panel', event),
  };

  useLayoutEffect(() => {
    if (!advisorOpen || advisorPanelPosition || !advisorPanelRef.current) return;
    const bounds = advisorPanelRef.current.getBoundingClientRect();
    const position = findFreePosition(
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      dockRects(),
    );
    if (position.left !== bounds.left || position.top !== bounds.top) setAdvisorPanelPosition(position);
  }, [advisorOpen, advisorPanelPosition]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const updateDockHeight = () => {
      const height = [...layer.querySelectorAll<HTMLElement>('[data-chat-dock="docked"]')]
        .reduce((tallest, dock) => Math.max(tallest, dock.getBoundingClientRect().height), 0);
      const advisorHeight = layer.querySelector<HTMLElement>('#ai-college-match-launcher')?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty('--chat-dock-height', `${height}px`);
      document.documentElement.style.setProperty('--chat-dock-stack-gap', height ? `${12 + advisorHeight}px` : '0px');
      const button = advisorButtonRef.current;
      if (button && advisorPositionRef.current) {
        const bounds = button.getBoundingClientRect();
        const position = findFreePosition(bounds.left, bounds.top, bounds.width, bounds.height, dockRects());
        if (position.left !== advisorPositionRef.current.left || position.top !== advisorPositionRef.current.top) {
          setAdvisorPosition(position);
        }
      }
      const panel = advisorPanelRef.current;
      if (panel && advisorPanelPositionRef.current) {
        const bounds = panel.getBoundingClientRect();
        const position = findFreePosition(bounds.left, bounds.top, bounds.width, bounds.height, dockRects());
        if (position.left !== advisorPanelPositionRef.current.left || position.top !== advisorPanelPositionRef.current.top) {
          setAdvisorPanelPosition(position);
        }
      }
    };
    const resizeObserver = new ResizeObserver(updateDockHeight);
    const observeDocks = () => {
      resizeObserver.disconnect();
      layer.querySelectorAll<HTMLElement>('[data-chat-dock="docked"]').forEach((dock) => resizeObserver.observe(dock));
      const advisor = layer.querySelector<HTMLElement>('#ai-college-match-launcher');
      if (advisor) resizeObserver.observe(advisor);
      if (advisorPanelRef.current) resizeObserver.observe(advisorPanelRef.current);
      updateDockHeight();
    };
    const mutationObserver = new MutationObserver(observeDocks);
    mutationObserver.observe(layer, { attributes: true, attributeFilter: ['data-chat-dock'], childList: true, subtree: true });
    observeDocks();
    window.addEventListener('resize', updateDockHeight);
    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDockHeight);
      document.documentElement.style.setProperty('--chat-dock-height', '0px');
      document.documentElement.style.setProperty('--chat-dock-stack-gap', '0px');
    };
  }, []);

  return (
    <div ref={layerRef} className="pointer-events-none fixed inset-0 z-40">
      {chatVisible && <div className="pointer-events-auto"><MiniChatDock /></div>}
      <div className="pointer-events-auto">
        <AdvisorLauncher
          buttonRef={advisorButtonRef}
          position={advisorPosition}
          onPointerDown={(event) => beginAdvisorDrag('button', event, advisorButtonRef.current)}
          onPointerMove={(event) => moveAdvisorDrag('button', event)}
          onPointerUp={(event) => endAdvisorDrag('button', event)}
          onPointerCancel={(event) => cancelAdvisorDrag('button', event)}
          dragging={advisorDragging}
          onOpen={() => {
            if (!suppressAdvisorClickRef.current) setAdvisorOpen(true);
          }}
        />
      </div>
      <div className="pointer-events-auto">
        <AdvisorDrawer
          open={advisorOpen}
          onClose={() => {
            setAdvisorOpen(false);
            setAdvisorPanelPosition(null);
          }}
          dialogRef={advisorPanelRef}
          dialogStyle={advisorPanelPosition ? {
            position: 'fixed',
            left: advisorPanelPosition.left,
            top: advisorPanelPosition.top,
            margin: 0,
            transform: 'none',
          } : undefined}
          headerDragHandlers={advisorPanelDragHandlers}
        />
      </div>
    </div>
  );
}

export default function Layout() {
  const [query, setQuery] = useState('');
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [askMentorOpen, setAskMentorOpen] = useState(false);
  const feedSearchContext = useMemo<FeedSearchContext>(() => ({
    query,
    selectedUniversities,
    selectedMajors,
    removeUniversity: (name) => setSelectedUniversities((current) => current.filter((university) => university !== name)),
    removeMajor: (name) => setSelectedMajors((current) => current.filter((major) => major !== name)),
  }), [query, selectedMajors, selectedUniversities]);

  return (
    <div className="min-h-screen">
      <Header
        query={query}
        setQuery={setQuery}
        selectedUniversities={selectedUniversities}
        setSelectedUniversities={setSelectedUniversities}
        selectedMajors={selectedMajors}
        setSelectedMajors={setSelectedMajors}
      />
      <main className="mx-auto max-w-content px-4 pb-24 pt-24 lg:pb-8">
        <Outlet context={feedSearchContext} />
      </main>
      <Footer onAskMentor={() => setAskMentorOpen(true)} />
      <MobileNav />
      <CommunityLauncher />
      <FloatingActionLayer />
      <ToastHost />
      {askMentorOpen && <AskMentorModal onClose={() => setAskMentorOpen(false)} />}
    </div>
  );
}
