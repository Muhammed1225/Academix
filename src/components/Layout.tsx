import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BRAND, people } from '../data/mock';
import { useApp, useUnreadCount } from '../store';
import AdvisorDrawer from './AdvisorDrawer';
import { Avatar, BrandMark, Icon, cx } from './ui';

const navItems = [
  { to: '/', label: 'Feed', icon: 'dynamic_feed', end: true },
  { to: '/colleges', label: 'Explore Colleges', icon: 'account_balance' },
  { to: '/connections', label: 'Make Connections', icon: 'person_add' },
  { to: '/inbox', label: 'Messages', icon: 'mail' },
];

function Header() {
  const unread = useUnreadCount();
  const signedIn = useApp((s) => s.signedIn);
  const authChecked = useApp((s) => s.authChecked);
  const setSignedIn = useApp((s) => s.setSignedIn);
  const showToast = useApp((s) => s.showToast);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-white shadow-header">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4">
        <div className="flex max-w-md flex-1 items-center gap-4">
          <Link to="/" className="shrink-0" aria-label={`${BRAND} home`}>
            <BrandMark />
          </Link>
          <form onSubmit={onSearch} className="relative hidden w-full md:block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search university, major, mentor, or question..."
              className="input rounded-full !py-2 pl-10"
            />
          </form>
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
<<<<<<< HEAD
          {signedIn && <Link
            to="/people/fuad-test"
            aria-label="My profile"
            title="My profile"
            className="rounded-full ring-2 ring-transparent transition hover:ring-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <Avatar src={people.fuadTest.avatar} name={people.fuadTest.name} size={44} rounded="rounded-full" />
          </Link>}
=======
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none"
            >
              <Avatar src={people.fuadTest.avatar} name={people.fuadTest.name} size={44} rounded="rounded-full" />
              <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-transparent transition-colors group-hover:border-secondary group-focus-visible:border-secondary" />
            </button>
            {menuOpen && (
              <div role="menu" className="animate-slide-up absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-outline-variant/60 bg-white py-1 shadow-float">
                <Link
                  to="/people/fuad-test"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                >
                  <Icon name="person" /> View profile
                </Link>
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
                  onClick={() => {
                    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
                    setSignedIn(false);
                    setMenuOpen(false);
                    showToast('Signed out', 'logout');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-error hover:bg-error-container/50"
                >
                  <Icon name="logout" /> Sign out
                </button>
              </div>
            )}
          </div>
>>>>>>> 676b9de3b62c332f61f41de3c1b6ce52cabf3a94
          <button
            type="button"
            className="relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Notifications"
            onClick={() => showToast('You are all caught up', 'notifications')}
          >
            <Icon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
          </button>
<<<<<<< HEAD
          {signedIn && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Account options"
                aria-expanded={menuOpen}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
              >
                <Icon name="more_vert" />
              </button>
              {menuOpen && (
                <div className="animate-slide-up absolute right-0 top-12 w-36 overflow-hidden rounded-xl border border-outline-variant/60 bg-white py-1 shadow-float">
                  <button
                    type="button"
                    onClick={() => {
                      void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
                      setSignedIn(false);
                      setMenuOpen(false);
                      showToast('Signed out', 'logout');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-surface-container-low"
                  >
                    <Icon name="logout" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
          {!signedIn && (
            <Link to="/auth" className="btn-primary">Sign up / Log in</Link>
=======
          {!signedIn && authChecked && (
            <button type="button" className="btn-primary" onClick={() => setAuthOpen(true)}>
              Sign In / Join
            </button>
>>>>>>> 676b9de3b62c332f61f41de3c1b6ce52cabf3a94
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
    { to: '/colleges', label: 'Colleges', icon: 'account_balance' },
    { to: '/compose', label: 'Post', icon: 'add', primary: true },
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

function CommunityLauncher() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/compose')) return null;

  return (
    <Link
      to="/compose"
      className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3.5 font-semibold text-white shadow-float transition hover:bg-secondary/90 lg:bottom-8 lg:left-8"
    >
      <Icon name="edit_note" />
      <span className="hidden sm:inline">Ask Community</span>
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
      <ToastHost />
    </div>
  );
}
