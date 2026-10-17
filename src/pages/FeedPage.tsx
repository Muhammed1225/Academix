import { useState } from 'react';
import { Link } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Icon, MetricTile, PersonAvatar, Tag, cx } from '../components/ui';
import { amas, channels, currentUser } from '../data/mock';
import type { Ama, FeedTab } from '../data/types';
import { useApp } from '../store';

const tabs: { id: FeedTab; label: string }[] = [
  { id: 'trending', label: 'Trending Discussions' },
  { id: 'latest', label: 'Latest Queries' },
  { id: 'essays', label: 'Verified Essays' },
];

const protocol = [
  ['bg-amber-500', 'Gold Verified', 'Faculty / Admissions Dean'],
  ['bg-secondary', '.edu Verified', 'Active Matriculated Scholar'],
  ['bg-prospective', 'Prospective', 'Applicant / Candidate'],
  ['bg-error', 'Unverified Claim', 'Flagged for Community Audit'],
];

function ProfileSummary() {
  return (
    <div className="card p-5">
      <Link to="/mentors/maya" className="flex items-center gap-3">
        <PersonAvatar person={currentUser} size={48} showVerified />
        <div>
          <div className="font-semibold">Maya Patel</div>
          <div className="text-xs text-on-surface-variant">CMU '25 • SCS Honors</div>
        </div>
      </Link>
      <div className="mt-4 flex justify-between rounded-lg bg-surface-container-low px-3 py-2.5 text-xs">
        <div>
          <div className="eyebrow !text-[10px]">Credential</div>
          <div className="mt-0.5 flex items-center gap-1 font-semibold text-secondary">
            <Icon name="school" className="!text-[15px]" /> .edu Verified
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow !text-[10px]">Reputation</div>
          <div className="mt-0.5 font-semibold">1,480 pts</div>
        </div>
      </div>
      <Link to="/compose" className="btn-primary mt-4 w-full">
        <Icon name="add_circle" /> Draft Scholarly Dispatch
      </Link>
    </div>
  );
}

function AmaCard({ ama }: { ama: Ama }) {
  const showToast = useApp((s) => s.showToast);
  const [joined, setJoined] = useState(false);
  const attending = ama.attending !== undefined ? ama.attending + (joined ? 1 : 0) : undefined;
  return (
    <div className="rounded-xl border border-secondary-fixed bg-surface-container-low p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-secondary">{ama.when}</span>
        <Tag tone={ama.tag.includes('Verified') ? 'green' : 'neutral'}>{ama.tag}</Tag>
      </div>
      <div className="mt-2 font-semibold text-primary">{ama.title}</div>
      <div className="mt-1 text-xs text-on-surface-variant">{ama.host}</div>
      <button
        type="button"
        onClick={() => {
          setJoined((v) => !v);
          if (!joined) showToast(`${ama.cta} confirmed: ${ama.title}`, 'event_available');
        }}
        className={cx('btn mt-3 w-full !h-9 border text-xs', joined ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-secondary')}
      >
        {joined ? "You're in" : ama.cta}
        {attending !== undefined && ` (${attending} attending)`}
      </button>
    </div>
  );
}

export function UpcomingAmas() {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-xl font-semibold text-primary">Upcoming AMAs</h2>
        <Tag tone="blue">Live Schedule</Tag>
      </div>
      <div className="space-y-3">
        {amas.map((a) => (
          <AmaCard key={a.title} ama={a} />
        ))}
      </div>
    </div>
  );
}

export function InstitutionSpotlight() {
  return (
    <div className="card p-5">
      <p className="eyebrow">Institution Spotlight</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#a6192e] font-headline text-sm font-bold text-white">CMU</span>
        <div>
          <div className="font-semibold">Carnegie Mellon</div>
          <div className="text-xs text-on-surface-variant">School of Computer Science</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricTile value="#1" label="US News CS" />
        <MetricTile value="5.2%" label="SCS Acceptance" dark />
      </div>
      <Link to="/colleges/cmu" className="btn-primary mt-4 w-full">
        Explore CMU Program Details
      </Link>
    </div>
  );
}

export default function FeedPage() {
  const posts = useApp((s) => s.posts);
  const signedIn = useApp((s) => s.signedIn);
  const setAuthOpen = useApp((s) => s.setAuthOpen);
  const [tab, setTab] = useState<FeedTab>('trending');
  const [channel, setChannel] = useState('all');

  const visible = posts.filter((p) => p.tabs.includes(tab) && (channel === 'all' || p.channelId === channel));

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="hidden space-y-4 lg:block">
        <div className="sticky top-24 space-y-4">
          {signedIn ? (
            <ProfileSummary />
          ) : (
            <div className="card p-5 text-sm">
              <p className="text-on-surface-variant">Join to follow mentors, book sessions, and publish dispatches.</p>
              <button type="button" className="btn-primary mt-3 w-full" onClick={() => setAuthOpen(true)}>
                Sign In / Join
              </button>
            </div>
          )}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="eyebrow">Subscribed Channels</p>
              <Icon name="tune" className="text-outline" />
            </div>
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm',
                  channel === c.id ? 'bg-secondary-fixed font-semibold text-on-secondary-fixed' : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs">{c.count}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Credential Protocol</p>
            <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">
              {protocol.map(([dot, title, desc]) => (
                <li key={title} className="flex gap-2">
                  <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-full', dot)} />
                  <span>
                    <b className="text-on-surface">{title}:</b> {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChannel(c.id)}
              className={cx('chip whitespace-nowrap', channel === c.id ? 'bg-secondary text-white' : 'bg-white text-on-surface-variant')}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: channel === c.id ? '#fff' : c.color }} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="card flex items-center gap-1 overflow-x-auto p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cx(
                'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm',
                tab === t.id ? 'bg-secondary-fixed font-semibold text-on-secondary-fixed' : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <Icon name="filter_list" className="mr-2 text-outline" />
        </div>

        {visible.length === 0 && <div className="card p-10 text-center text-sm text-on-surface-variant">No dispatches in this channel yet.</div>}
        {visible.map((p, i) => (
          <div key={p.id} className="space-y-4">
            <PostCard post={p} />
            {/* Dar ekranlarda sağ kolon akışın içine girer. */}
            {i === 0 && (
              <div className="space-y-4 xl:hidden">
                <UpcomingAmas />
              </div>
            )}
          </div>
        ))}
      </section>

      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-4">
          <UpcomingAmas />
          <InstitutionSpotlight />
        </div>
      </aside>
    </div>
  );
}
