import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Avatar, Icon, MetricTile, Tag, cx } from '../components/ui';
import { amas, channels, colleges } from '../data/mock';
import type { Ama, PostAuthorType } from '../data/types';
import { displayName } from '../data/userIdentity';
import { useApp } from '../store';
import type { FeedSearchContext } from '../components/Layout';

function normalized(value: string) {
  return value.normalize('NFC').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const authorTypes: PostAuthorType[] = ['Prospective', 'Student Scholar', 'Faculty Representative'];
const authorTypeSlugs: Record<PostAuthorType, string> = {
  Prospective: 'prospective',
  'Student Scholar': 'student-scholar',
  'Faculty Representative': 'faculty-representative',
};

function authorTypesFromSearch(searchParams: URLSearchParams): PostAuthorType[] {
  const slugs = searchParams.getAll('postsFrom');
  return authorTypes.filter((type) => slugs.includes(authorTypeSlugs[type]));
}

const protocol = [
  ['bg-amber-500', 'Gold Verified', 'Faculty / Admissions Dean'],
  ['bg-secondary', 'Institution Verified', 'Active Matriculated Scholar'],
  ['bg-prospective', 'Prospective', 'Applicant / Candidate'],
  ['bg-error', 'Unverified Account', 'Institutional identity not yet reviewed'],
];

function ProfileSummary() {
  const user = useApp((s) => s.user);

  if (!user) return (
    <div className="card p-4">
      <p className="font-semibold text-primary">Your Academix profile</p>
      <p className="mt-1 text-xs text-on-surface-variant">Sign in to view and complete your profile.</p>
      <Link to="/auth" className="mt-3 inline-flex text-sm font-semibold text-secondary hover:underline">Sign up / Log in</Link>
    </div>
  );
  const subtitle = user.university && user.major
    ? `${user.major} • ${user.university}${user.graduationYear ? ` • Class of ${user.graduationYear}` : ''}`
    : 'Academix community member';

  return (
    <div className="card overflow-hidden p-0">
      <div className="h-16 bg-gradient-to-r from-primary-container via-secondary-fixed to-primary/10" />
      <div className="px-4 pb-4">
        <Link
          to="/profile"
          aria-label="View your profile"
          className="-mt-8 flex w-fit rounded-full ring-4 ring-white transition hover:opacity-90"
        >
          <Avatar src={user.photo || undefined} name={displayName(user.name, user.email)} size={64} rounded="rounded-full" />
        </Link>
        <Link to="/profile" className="mt-2 block font-semibold text-primary hover:text-secondary hover:underline">
          {displayName(user.name, user.email)}
        </Link>
        <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{subtitle}</p>
        <div className="mt-3 border-t border-outline-variant/50 pt-3">
          <Link to="/profile" className="text-sm font-semibold text-secondary hover:underline">
            View your profile
          </Link>
        </div>
      </div>
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
  const [channel, setChannel] = useState('all');
  const [selectedAuthorTypes, setSelectedAuthorTypes] = useState<PostAuthorType[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [authorFilterOpen, setAuthorFilterOpen] = useState(false);
  const { query, selectedUniversities, removeUniversity } = useOutletContext<FeedSearchContext>();
  const authorFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedAuthorTypes(authorTypesFromSearch(new URLSearchParams(location.search)));
  }, [location.search]);

  const updateAuthorTypes = (update: (current: PostAuthorType[]) => PostAuthorType[]) => {
    const next = update(selectedAuthorTypes);
    setSelectedAuthorTypes(next);
    const params = new URLSearchParams(searchParams);
    params.delete('postsFrom');
    next.forEach((type) => params.append('postsFrom', authorTypeSlugs[type]));
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!authorFilterOpen) return;
    const closeOnOutsidePointer = (event: Event) => {
      if (!(event.target instanceof Node) || !authorFilterRef.current?.contains(event.target)) setAuthorFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAuthorFilterOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [authorFilterOpen]);

  const normalizedQuery = normalized(query);
  const visible = posts.filter((post) => {
    if (channel !== 'all' && post.channelId !== channel) return false;
    if (selectedAuthorTypes.length && (!post.authorType || !selectedAuthorTypes.some((type) => type === post.authorType))) return false;
    const searchableText = normalized(`${post.title ?? ''} ${post.body} ${post.insight ?? ''} ${post.author.name} ${post.author.subtitle}`);
    if (normalizedQuery && !normalizedQuery.split(/\s+/).every((term) => searchableText.includes(term))) return false;
    if (selectedUniversities.length) {
      const college = colleges.find((item) => item.id === post.universityId);
      const affiliation = normalized([
        post.universityId,
        college?.name,
        college?.shortName,
        college?.id,
        post.author.subtitle,
      ].filter(Boolean).join(' '));
      if (!selectedUniversities.some((name) => affiliation.includes(normalized(name)))) return false;
    }
    return true;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="hidden space-y-4 lg:block">
        <div className="sticky top-24 space-y-4">
          <ProfileSummary />
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
        <div className="flex justify-end">
          <div ref={authorFilterRef} className="relative flex max-w-full flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setAuthorFilterOpen((open) => !open)}
              aria-haspopup="dialog"
              aria-expanded={authorFilterOpen}
              className={cx(
                'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
                selectedAuthorTypes.length
                  ? 'border-secondary bg-secondary-fixed text-secondary'
                  : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              Posts from{selectedAuthorTypes.length > 0 && ` (${selectedAuthorTypes.length})`}
              <Icon name="expand_more" className="!text-[18px]" />
            </button>
            {selectedAuthorTypes.length > 0 && (
              <div className="flex max-w-full flex-wrap justify-end gap-1.5" aria-label="Selected post author filters">
                {selectedAuthorTypes.map((type) => (
                  <span key={type} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-xs font-semibold text-on-secondary-fixed">
                    <span className="truncate">{type}</span>
                    <button
                      type="button"
                      onClick={() => updateAuthorTypes((current) => current.filter((item) => item !== type))}
                      aria-label={`Remove ${type} filter`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                    >
                      <Icon name="close" className="!text-[13px]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {authorFilterOpen && (
              <div
                role="dialog"
                aria-label="Filter posts by author type"
                className="absolute right-0 top-full z-30 mt-1 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-outline-variant/60 bg-white p-2 shadow-float"
              >
                <div className="space-y-0.5">
                  {authorTypes.map((type) => {
                    const checked = selectedAuthorTypes.includes(type);
                    return (
                      <label key={type} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container-low focus-within:bg-surface-container-low">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => updateAuthorTypes((current) =>
                            checked ? current.filter((item) => item !== type) : [...current, type],
                          )}
                          className="h-4 w-4 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-end border-t border-outline-variant/40 pt-1">
                  <button
                    type="button"
                    disabled={selectedAuthorTypes.length === 0}
                    onClick={() => updateAuthorTypes(() => [])}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {selectedUniversities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Selected university filters">
            {selectedUniversities.map((name) => (
              <span key={name} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">
                <span className="truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => removeUniversity(name)}
                  aria-label={`Remove ${name} university filter`}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                >
                  <Icon name="close" className="!text-[14px]" />
                </button>
              </span>
            ))}
          </div>
        )}
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

        {visible.length === 0 && (
          <div className="card p-10 text-center text-sm text-on-surface-variant">No posts found for your selected filters.</div>
        )}
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
