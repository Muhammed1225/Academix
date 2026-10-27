import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Icon, MetricTile } from '../components/ui';
import UniversityAdmissionCalculator from '../components/UniversityAdmissionCalculator';
import { isAdmissionPredictionRequest } from '../data/admission';
import { colleges } from '../data/mock';
import { universities } from '../data/educationOptions';
import type { College } from '../data/types';
import { useApp } from '../store';

const normalizeName = (name: string) => name.replace(/\s*\([^)]*\)/g, '').trim().toLocaleLowerCase('en');

function collegeForUniversity(university: string) {
  const normalizedName = normalizeName(university);
  return colleges.find((college) =>
    [college.name, college.shortName].some((name) => normalizeName(name) === normalizedName),
  );
}

function UniversityCard({ university, college }: { university: string; college?: College }) {
  const admissionPointAverages = college?.majors.flatMap((major) => {
    const latestScore = [...(major.dimStyleIllustrativeScores ?? [])].sort((a, b) => b.year - a.year)[0];
    return latestScore ? [latestScore.points] : [];
  }) ?? [];
  const averageAdmissionPoints = admissionPointAverages.length
    ? String(Math.round(admissionPointAverages.reduce((total, points) => total + points, 0) / admissionPointAverages.length))
    : '—';
  const campusImage = college ? (
    <img src={college.heroImage} alt={`${university} campus`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
  ) : (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary-fixed to-surface-container-high">
      <Icon name="account_balance" className="!text-6xl text-secondary" />
    </div>
  );
  const details = (
    <>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 font-headline text-2xl font-semibold text-primary">{university}</h2>
        <Icon name="arrow_forward" className="text-secondary transition group-hover:translate-x-1" />
      </div>
      <p className="mt-1 text-sm text-on-surface-variant">
        {college ? `${college.location} • ${college.kind}` : 'University profile coming soon'}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MetricTile value={college?.stats.find((stat) => stat.label === 'Student Body')?.value ?? '—'} label="Students" />
        <MetricTile value={averageAdmissionPoints} label="Avg. admission points" />
        <MetricTile value={college ? String(college.majorCount) : '—'} label="Majors" />
      </div>
      <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-secondary">
        {college ? 'View university page' : 'Full university page unavailable'}
        <Icon name="open_in_new" className="!text-[17px]" />
      </p>
    </>
  );

  return college ? (
    <Link to={`/colleges/${college.id}`} className="card group block overflow-hidden transition hover:shadow-float lg:flex lg:h-full lg:flex-col">
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary-fixed lg:aspect-auto lg:min-h-0 lg:flex-1">
        {campusImage}
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-on-tertiary-container" /> {college.mentorCount} Mentors
        </span>
      </div>
      <div className="p-4 lg:flex-none">
        {details}
      </div>
    </Link>
  ) : (
    <article className="card overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary-fixed">{campusImage}</div>
      <div className="p-5">{details}</div>
    </article>
  );
}

function UniversityListingCard({
  university,
  college,
  selected,
  onSelect,
}: {
  university: string;
  college?: College;
  selected: boolean;
  onSelect: () => void;
}) {
  const studentCount = college?.stats.find((stat) => stat.label === 'Student Body')?.value;
  const highlights = college
    ? [
        `${college.majorCount} majors`,
        `${college.mentorCount} mentors`,
        `${college.questionCount} student Q&A`,
      ]
    : ['Academic programs', 'Campus overview', 'Community hub'];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`card group overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-float ${selected ? 'ring-2 ring-secondary' : ''}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-container via-secondary/80 to-[#86c7ce]">
        {college ? (
          <img src={college.heroImage} alt={`${university} campus`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <>
            <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border-[20px] border-white/15" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/60 to-transparent" />
            <Icon name="account_balance" className="absolute bottom-4 left-5 !text-5xl text-white/90" />
          </>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary">
          {college ? 'Campus hub' : 'University'}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-primary/80 px-3 py-1 text-xs font-semibold text-white">
          {college ? `${college.mentorCount} mentors` : 'Explore listing'}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-h-12 flex-1 font-headline text-lg font-semibold leading-snug text-primary">{university}</h3>
          <Icon name="arrow_forward" className="mt-1 text-secondary transition group-hover:translate-x-1" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
          <Icon name="location_on" className="!text-[17px]" />
          {college ? `${college.location} • ${college.kind}` : 'Azerbaijan • University'}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {highlights.map((highlight) => (
            <span key={highlight} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
              {highlight}
            </span>
          ))}
        </div>
        {studentCount && <p className="mt-3 text-xs font-medium text-on-surface-variant">{studentCount} students listed</p>}
        <p className="mt-4 border-t border-outline-variant/50 pt-3 text-sm font-semibold text-secondary">
          {selected ? 'Selected for preview' : college ? 'Open campus preview' : 'Preview university'}
        </p>
      </div>
    </button>
  );
}

function UniversitySections({ university, college }: { university: string; college?: College }) {
  const posts = useApp((state) => state.posts);
  const majors = college?.majors.slice(0, 4) ?? [];
  const relatedPosts = posts.filter((post) => college && post.universityId === college.id);
  const photos = [
    ...(college ? [{ src: college.heroImage, alt: `${university} campus` }] : []),
    ...relatedPosts.flatMap((post) => post.image ? [{ src: post.image.src, alt: post.title ?? `${university} community photo` }] : []),
  ];
  const sections = [
    {
      id: 'majors',
      emoji: '🎓',
      title: 'Majors',
      content: majors.length ? (
        <div className="space-y-1.5">
          {majors.map((major) => {
            const scores = [...(major.dimStyleIllustrativeScores ?? [])].sort((a, b) => a.year - b.year);
            const latest = scores[scores.length - 1];
            const previous = scores.length > 1 ? scores[scores.length - 2] : latest;
            const projected = latest
              ? Math.max(0, Math.min(700, latest.points + (latest.points - (previous?.points ?? latest.points))))
              : undefined;
            return (
              <div key={major.id} className="rounded-lg bg-surface-container-low px-2.5 py-1.5">
                <span className="block truncate text-[13px] font-semibold text-primary">{major.name}</span>
                <span className="block text-[11px] text-on-surface-variant">{major.category}</span>
                {latest && projected !== undefined ? (
                  <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px]">
                    <span className="text-on-surface-variant">{latest.year} past: <strong className="text-primary">{latest.points}</strong></span>
                    <span className="text-secondary">{latest.year + 1} projected: <strong>{projected}</strong></span>
                  </div>
                ) : (
                  <span className="mt-1 block text-[11px] text-on-surface-variant">Point requirements unavailable</span>
                )}
              </div>
            );
          })}
          <p className="pt-1 text-[10px] leading-relaxed text-on-surface-variant">
            Illustrative DIM-scale estimates out of 700, not official university cutoffs. Projections extend the most recent year-to-year trend.
          </p>
        </div>
      ) : <p className="text-sm text-on-surface-variant">Major information for {university} is not available yet.</p>,
    },
    {
      id: 'news',
      emoji: '📰',
      title: 'News',
      content: relatedPosts.length ? (
        <ul className="space-y-1.5">
          {relatedPosts.slice(0, 3).map((post) => (
            <li key={post.id} className="rounded-lg bg-surface-container-low px-2.5 py-1.5">
              <span className="block text-sm font-semibold text-primary">{post.title ?? 'University community update'}</span>
              <span className="mt-1 line-clamp-2 block text-xs text-on-surface-variant">{post.body}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-on-surface-variant">No news has been shared about {university} yet.</p>,
    },
    {
      id: 'gallery',
      emoji: '📸',
      title: 'Gallery',
      content: photos.length ? (
        <div className="grid grid-cols-2 gap-1.5">
          {photos.slice(0, 4).map((photo, index) => (
            <img key={`${photo.src}-${index}`} src={photo.src} alt={photo.alt} className="h-20 w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : <p className="text-sm text-on-surface-variant">Photos from {university} are not available yet.</p>,
    },
  ];

  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
      {sections.map((section) => (
        <section
          key={section.id}
          className={`card flex min-h-[288px] min-w-0 flex-col p-3 ${section.id === 'majors' ? 'sm:row-span-2' : ''}`}
        >
          <h3 className="mb-1.5 flex items-center gap-2 font-headline text-base font-semibold text-primary">
            <span aria-hidden="true" className="text-xl">{section.emoji}</span>
            {section.title}
          </h3>
          <div className="min-h-0 flex-1 overflow-y-auto">{section.content}</div>
        </section>
      ))}
    </div>
  );
}

export default function CollegesPage() {
  const location = useLocation();
  const routeState: unknown = location.state;
  const routeRequest = routeState && typeof routeState === 'object' && 'admissionCalculatorRequest' in routeState
    ? routeState.admissionCalculatorRequest
    : undefined;
  const initialAdmissionRequest = isAdmissionPredictionRequest(routeRequest)
    ? routeRequest
    : undefined;
  const defaultUniversity = universities.find((name) => normalizeName(name) === normalizeName('Baku Higher Oil School'));
  const requestedUniversity = new URLSearchParams(location.search).get('university');
  const initialUniversity = universities.find((name) => normalizeName(name) === normalizeName(requestedUniversity ?? ''))
    ?? defaultUniversity
    ?? 'Baku Higher Oil School (BHOS)';
  const [admissionCalculatorOpen, setAdmissionCalculatorOpen] = useState(Boolean(initialAdmissionRequest));
  const [query, setQuery] = useState(initialUniversity);
  const [selectedUniversity, setSelectedUniversity] = useState(initialUniversity);
  const [searchMessage, setSearchMessage] = useState('');
  const [browseQuery, setBrowseQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const selectedCollege = collegeForUniversity(selectedUniversity);
  const filteredUniversities = useMemo(
    () => universities.filter((university) => university.toLocaleLowerCase('en').includes(browseQuery.trim().toLocaleLowerCase('en'))),
    [browseQuery],
  );

  const selectUniversity = (value: string) => {
    const match = universities.find((university) => university.toLocaleLowerCase('en') === value.trim().toLocaleLowerCase('en'));
    if (!match) {
      setSearchMessage('Choose a university from the list.');
      return;
    }
    setQuery(match);
    setSelectedUniversity(match);
    setSearchMessage('');
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    selectUniversity(query);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary sm:text-4xl">Explore Universities</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Find university hubs, explore academic programs, and connect with current students and mentors.
          </p>
        </div>
        <div className="w-full space-y-3 lg:max-w-md">
          <button
            type="button"
            onClick={() => setAdmissionCalculatorOpen(true)}
            className="card group flex w-full items-center gap-3 border-secondary/20 bg-gradient-to-r from-secondary-fixed/70 to-white p-4 text-left transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-float"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-secondary shadow-sm">
              <Icon name="query_stats" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-primary">Which universities can I get into?</span>
              <span className="mt-1 block text-xs text-on-surface-variant">Explore admission possibilities based on your exam results.</span>
            </span>
            <Icon name="arrow_forward" className="shrink-0 text-secondary transition group-hover:translate-x-1" />
          </button>
          <form onSubmit={submitSearch} className="w-full">
            <label htmlFor="university-search" className="sr-only">Search universities</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="university-search"
                list="university-options"
                value={query}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  setSearchMessage('');
                  const exactMatch = universities.find((university) => university.toLocaleLowerCase('en') === value.trim().toLocaleLowerCase('en'));
                  if (exactMatch) setSelectedUniversity(exactMatch);
                }}
                placeholder="Search universities..."
                autoComplete="off"
                className="input rounded-full pl-10 pr-24"
              />
              <datalist id="university-options">
                {universities.map((university) => <option key={university} value={university} />)}
              </datalist>
              <button type="submit" className="btn-primary absolute right-1 top-1 h-10 !px-4">Search</button>
            </div>
            {searchMessage && <p role="status" className="mt-2 text-sm text-on-surface-variant">{searchMessage}</p>}
          </form>
        </div>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.5fr)]">
        <UniversityCard university={selectedUniversity} college={selectedCollege} />
        <div aria-hidden="true" className="flex items-center justify-center gap-8 py-1 lg:flex-col lg:justify-around lg:py-8">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index}>
              <Icon name="south" className="text-secondary lg:hidden" />
              <Icon name="arrow_forward" className="hidden text-secondary lg:inline-flex" />
            </span>
          ))}
        </div>
        <UniversitySections university={selectedUniversity} college={selectedCollege} />
      </div>

      <section id="browse-universities" aria-labelledby="university-listings-title" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-secondary">Find your campus</p>
            <h2 id="university-listings-title" className="mt-1 font-headline text-2xl font-semibold text-primary sm:text-3xl">Browse universities</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Compare campus hubs, student communities, and academic programs.</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Filter university listings</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={browseQuery}
              onChange={(event) => {
                setBrowseQuery(event.target.value);
                setVisibleCount(12);
              }}
              placeholder="Filter university listings..."
              className="input rounded-full pl-10"
            />
          </label>
        </div>

        <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
          Showing {Math.min(visibleCount, filteredUniversities.length)} of {filteredUniversities.length} universities
        </p>
        {filteredUniversities.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUniversities.slice(0, visibleCount).map((university) => {
              const college = collegeForUniversity(university);
              return (
                <UniversityListingCard
                  key={university}
                  university={university}
                  college={college}
                  selected={normalizeName(university) === normalizeName(selectedUniversity)}
                  onSelect={() => {
                    setSelectedUniversity(university);
                    setQuery(university);
                    setSearchMessage('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-on-surface-variant">No universities match that search.</div>
        )}
        {visibleCount < filteredUniversities.length && (
          <div className="flex justify-center">
            <button type="button" onClick={() => setVisibleCount((count) => count + 12)} className="btn-outline">
              Show more universities <Icon name="expand_more" />
            </button>
          </div>
        )}
      </section>
      <UniversityAdmissionCalculator
        open={admissionCalculatorOpen}
        onClose={() => setAdmissionCalculatorOpen(false)}
        initialRequest={initialAdmissionRequest}
      />
    </div>
  );
}
