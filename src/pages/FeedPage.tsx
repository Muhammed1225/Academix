import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Avatar, Icon, Tag, cx } from '../components/ui';
import { amas, channels, colleges } from '../data/mock';
import { majors as majorOptions, universities } from '../data/educationOptions';
import { mentorProfilesById } from '../data/mentors';
import type { Ama, Post, Verification } from '../data/types';
import { displayName } from '../data/userIdentity';
import { useApp } from '../store';
import type { FeedSearchContext } from '../components/Layout';

function normalized(value: string) {
  return value.normalize('NFC').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

type FeedAuthorFilter = 'prospective' | 'student-alumni' | 'faculty-representative' | 'mentors';

const authorFilters: { id: FeedAuthorFilter; label: string }[] = [
  { id: 'prospective', label: 'Prospective students' },
  { id: 'student-alumni', label: 'Students / Alumni' },
  { id: 'faculty-representative', label: 'Faculty representatives' },
  { id: 'mentors', label: 'Mentors' },
];
const feedMajorOptions = [...new Set([
  ...majorOptions,
  ...colleges.flatMap((college) => [
    ...college.majorCategories.filter((category) => category !== 'All Disciplines'),
    ...college.majors.map((major) => major.name),
  ]),
])].sort((first, second) => first.localeCompare(second));
const verificationFilters: { id: Verification; label: string }[] = [
  { id: 'gold', label: 'Gold verified' },
  { id: 'edu', label: 'Institution verified' },
  { id: 'unverified', label: 'Unverified accounts' },
];
const currentYear = new Date().getFullYear();
const graduationYearOptions = Array.from({ length: 12 }, (_, index) => String(currentYear - 5 + index));

function authorFiltersFromSearch(searchParams: URLSearchParams): FeedAuthorFilter[] {
  const slugs = searchParams.getAll('postsFrom');
  return authorFilters.map((filter) => filter.id).filter((id) =>
    slugs.includes(id) || (id === 'student-alumni' && slugs.includes('student-scholar')),
  );
}

function postMatchesAuthorFilter(post: Post, filter: FeedAuthorFilter) {
  const isMentor = Boolean(mentorProfilesById[post.author.id]);
  if (filter === 'mentors') return isMentor;
  if (filter === 'student-alumni') return post.authorType === 'Student Scholar';
  if (filter === 'faculty-representative') return post.authorType === 'Faculty Representative';
  return post.authorType === 'Prospective';
}

function postGraduationYear(post: Post) {
  const details = `${post.author.education ?? ''} ${post.author.subtitle}`;
  const fullYear = details.match(/(?:class of\s*)?(20\d{2})/i)?.[1];
  if (fullYear) return fullYear;
  const shortYear = details.match(/(?:class of\s*)?['’](\d{2})\b/i)?.[1];
  if (!shortYear) return '';
  const year = Number(shortYear);
  return String(year >= 70 ? 1900 + year : 2000 + year);
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
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[#a6192e] font-headline text-sm font-bold text-white">BHOS</span>
        <div>
          <div className="font-semibold">Baku Higher Oil School</div>
          <div className="text-xs text-on-surface-variant">BHOS</div>
        </div>
      </div>
      <Link to="/colleges/cmu" className="btn-primary mt-4 w-full">
        Explore BHOS Details
      </Link>
    </div>
  );
}

export default function FeedPage() {
  const posts = useApp((s) => s.posts);
  const [channel, setChannel] = useState('all');
  const [selectedAuthorFilters, setSelectedAuthorFilters] = useState<FeedAuthorFilter[]>([]);
  const [selectedVerifications, setSelectedVerifications] = useState<Verification[]>([]);
  const [selectedGraduationYears, setSelectedGraduationYears] = useState<string[]>([]);
  const [universitySearch, setUniversitySearch] = useState('');
  const [majorSearch, setMajorSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [authorFilterOpen, setAuthorFilterOpen] = useState(false);
  const {
    query,
    selectedUniversities,
    selectedMajors,
    setSelectedUniversities,
    setSelectedMajors,
    removeUniversity,
    removeMajor,
  } = useOutletContext<FeedSearchContext>();
  const authorFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedAuthorFilters(authorFiltersFromSearch(new URLSearchParams(location.search)));
  }, [location.search]);

  const updateAuthorFilters = (update: (current: FeedAuthorFilter[]) => FeedAuthorFilter[]) => {
    const next = update(selectedAuthorFilters);
    setSelectedAuthorFilters(next);
    const params = new URLSearchParams(searchParams);
    params.delete('postsFrom');
    next.forEach((filter) => params.append('postsFrom', filter));
    setSearchParams(params, { replace: true });
  };

  const clearAllFilters = () => {
    updateAuthorFilters(() => []);
    setSelectedVerifications([]);
    setSelectedGraduationYears([]);
    setSelectedUniversities([]);
    setSelectedMajors([]);
    setUniversitySearch('');
    setMajorSearch('');
  };

  const visibleUniversities = universities
    .filter((name) => normalized(name).includes(normalized(universitySearch)))
    .slice(0, 80);
  const visibleMajors = feedMajorOptions
    .filter((name) => normalized(name).includes(normalized(majorSearch)))
    .slice(0, 80);

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
    if (selectedAuthorFilters.length && !selectedAuthorFilters.some((filter) => postMatchesAuthorFilter(post, filter))) return false;
    if (selectedVerifications.length && !selectedVerifications.includes(post.author.verification)) return false;
    if (selectedGraduationYears.length && !selectedGraduationYears.includes(postGraduationYear(post))) return false;
    const searchableText = normalized(`${post.title ?? ''} ${post.body} ${post.author.name} ${post.author.subtitle}`);
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
    if (selectedMajors.length) {
      const authorStudyFields = normalized([
        post.author.subtitle,
        post.author.education,
        ...(post.author.interests ?? []),
      ].filter(Boolean).join(' '));
      const matchesMajor = selectedMajors.some((selection) => {
        const categoryMajors = colleges.flatMap((college) =>
          college.majorCategories.includes(selection)
            ? college.majors.filter((major) => major.category === selection).map((major) => major.name)
            : [],
        );
        const aliases = [
          selection,
          ...categoryMajors,
        ];
        return aliases.some((alias) => {
          const terms = normalized(alias).split(' ').filter((term) => !['b', 's', 'of', 'in', 'the', 'and'].includes(term));
          return terms.length > 0 && terms.every((term) => authorStudyFields.includes(term));
        });
      });
      if (!matchesMajor) return false;
    }
    return true;
  });
  const activeFilterCount = selectedAuthorFilters.length + selectedUniversities.length + selectedMajors.length + selectedGraduationYears.length + selectedVerifications.length;

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
                activeFilterCount
                  ? 'border-secondary bg-secondary-fixed text-secondary'
                  : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              Posts from{activeFilterCount > 0 && ` (${activeFilterCount})`}
              <Icon name="expand_more" className="!text-[18px]" />
            </button>
            {(selectedAuthorFilters.length > 0 || selectedVerifications.length > 0 || selectedGraduationYears.length > 0) && (
              <div className="flex max-w-full flex-wrap justify-end gap-1.5" aria-label="Selected post filters">
                {selectedAuthorFilters.map((filter) => (
                  <span key={filter} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-xs font-semibold text-on-secondary-fixed">
                    <span className="truncate">{authorFilters.find((option) => option.id === filter)?.label ?? filter}</span>
                    <button
                      type="button"
                      onClick={() => updateAuthorFilters((current) => current.filter((item) => item !== filter))}
                      aria-label={`Remove ${filter} filter`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                    >
                      <Icon name="close" className="!text-[13px]" />
                    </button>
                  </span>
                ))}
                {selectedVerifications.map((verification) => {
                  const option = verificationFilters.find((filter) => filter.id === verification);
                  return (
                    <span key={verification} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-xs font-semibold text-on-secondary-fixed">
                      <span className="truncate">{option?.label ?? verification}</span>
                      <button type="button" onClick={() => setSelectedVerifications((current) => current.filter((item) => item !== verification))} aria-label={`Remove ${option?.label ?? verification} filter`} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-white/70">
                        <Icon name="close" className="!text-[13px]" />
                      </button>
                    </span>
                  );
                })}
                {selectedGraduationYears.map((year) => (
                  <span key={year} className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-xs font-semibold text-on-secondary-fixed">
                    Class of {year}
                    <button type="button" onClick={() => setSelectedGraduationYears((current) => current.filter((item) => item !== year))} aria-label={`Remove class of ${year} filter`} className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/70">
                      <Icon name="close" className="!text-[13px]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {authorFilterOpen && (
              <div
                role="dialog"
                aria-label="Filter posts"
                className="absolute right-0 top-full z-40 mt-2 max-h-[80vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-outline-variant/60 bg-white p-4 shadow-float"
              >
                <div className="flex items-center justify-between gap-3 border-b border-outline-variant/50 pb-3">
                  <div>
                    <h2 className="font-headline text-lg font-semibold text-primary">Customize your feed</h2>
                    <p className="mt-0.5 text-xs text-on-surface-variant">Choose who and what you want to see.</p>
                  </div>
                  <button type="button" onClick={clearAllFilters} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-low">Clear all</button>
                </div>
                <div className="grid gap-3 pt-3 sm:grid-cols-2">
                  <fieldset className="rounded-xl border border-outline-variant/50 p-3">
                    <legend className="px-1 text-sm font-semibold text-primary">People</legend>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {authorFilters.map((filter) => (
                        <label key={filter.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            checked={selectedAuthorFilters.includes(filter.id)}
                            onChange={() => updateAuthorFilters((current) => current.includes(filter.id)
                              ? current.filter((item) => item !== filter.id)
                              : [...current, filter.id])}
                            className="h-4 w-4 accent-secondary"
                          />
                          {filter.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="rounded-xl border border-outline-variant/50 p-3">
                    <legend className="px-1 text-sm font-semibold text-primary">Account verification</legend>
                    <div className="space-y-1">
                      {verificationFilters.map((filter) => (
                        <label key={filter.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            checked={selectedVerifications.includes(filter.id)}
                            onChange={() => setSelectedVerifications((current) => current.includes(filter.id)
                              ? current.filter((item) => item !== filter.id)
                              : [...current, filter.id])}
                            className="h-4 w-4 accent-secondary"
                          />
                          {filter.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="min-w-0 rounded-xl border border-outline-variant/50 p-3">
                    <legend className="px-1 text-sm font-semibold text-primary">Universities</legend>
                    <input value={universitySearch} onChange={(event) => setUniversitySearch(event.target.value)} placeholder="Search universities" aria-label="Search universities" className="input !py-2 text-sm" />
                    <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto" aria-label="University choices">
                      {visibleUniversities.map((name) => (
                        <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-container-low">
                          <input type="checkbox" checked={selectedUniversities.includes(name)} onChange={() => setSelectedUniversities(selectedUniversities.includes(name) ? selectedUniversities.filter((item) => item !== name) : [...selectedUniversities, name])} className="h-4 w-4 accent-secondary" />
                          <span className="truncate">{name}</span>
                        </label>
                      ))}
                      {!visibleUniversities.length && <p className="px-2 py-3 text-xs text-on-surface-variant">No universities found.</p>}
                    </div>
                  </fieldset>

                  <fieldset className="min-w-0 rounded-xl border border-outline-variant/50 p-3">
                    <legend className="px-1 text-sm font-semibold text-primary">Majors</legend>
                    <input value={majorSearch} onChange={(event) => setMajorSearch(event.target.value)} placeholder="Search majors" aria-label="Search majors" className="input !py-2 text-sm" />
                    <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto" aria-label="Major choices">
                      {visibleMajors.map((name) => (
                        <label key={name} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-container-low">
                          <input type="checkbox" checked={selectedMajors.includes(name)} onChange={() => setSelectedMajors(selectedMajors.includes(name) ? selectedMajors.filter((item) => item !== name) : [...selectedMajors, name])} className="h-4 w-4 accent-secondary" />
                          <span className="truncate">{name}</span>
                        </label>
                      ))}
                      {!visibleMajors.length && <p className="px-2 py-3 text-xs text-on-surface-variant">No majors found.</p>}
                    </div>
                  </fieldset>

                  <fieldset className="rounded-xl border border-outline-variant/50 p-3 sm:col-span-2">
                    <legend className="px-1 text-sm font-semibold text-primary">Graduation year</legend>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                      {graduationYearOptions.map((year) => (
                        <label key={year} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            checked={selectedGraduationYears.includes(year)}
                            onChange={() => setSelectedGraduationYears((current) => current.includes(year)
                              ? current.filter((item) => item !== year)
                              : [...current, year])}
                            className="h-4 w-4 accent-secondary"
                          />
                          Class of {year}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/50 pt-3">
                  <p className="text-xs text-on-surface-variant" aria-live="polite">{visible.length} posts match your filters</p>
                  <button type="button" onClick={() => setAuthorFilterOpen(false)} className="btn-primary !px-4 !py-2 text-sm">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {(selectedUniversities.length > 0 || selectedMajors.length > 0) && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Selected feed filters">
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
            {selectedMajors.map((name) => (
              <span key={name} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">
                <span className="truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => removeMajor(name)}
                  aria-label={`Remove ${name} major filter`}
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
