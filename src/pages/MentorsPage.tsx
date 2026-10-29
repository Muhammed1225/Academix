import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SearchableSelect from '../components/SearchableSelect';
import FilterButton from '../components/FilterButton';
import { Avatar, Icon, Tag } from '../components/ui';
import { majors, universities } from '../data/educationOptions';
import { mentorDirectory } from '../data/mentors';
import { mentorProfilePath } from '../data/mentorRoutes';
import { useApp } from '../store';

const normalize = (value: string) => value.replace(/\s*\([^)]*\)/g, '').toLocaleLowerCase().trim();

export default function MentorsPage() {
  const [query, setQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const openMiniChatForPerson = useApp((state) => state.openMiniChatForPerson);
  const navigate = useNavigate();
  const filteredMentors = useMemo(() => {
    const search = normalize(query);
    return mentorDirectory.filter((mentor) =>
      (!search || [mentor.name, mentor.university, mentor.major, mentor.field].some((value) => normalize(value ?? '').includes(search))) &&
      (!universityFilter || normalize(mentor.university) === normalize(universityFilter)) &&
      (!majorFilter || normalize(mentor.major) === normalize(majorFilter)),
    );
  }, [query, universityFilter, majorFilter]);

  useEffect(() => {
    if (!filterOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filterOpen]);

  const clearFilters = () => {
    setUniversityFilter('');
    setMajorFilter('');
  };
  const activeFilters: { label: string; value: string; clear: (value: string) => void }[] = [
    { label: 'University', value: universityFilter, clear: setUniversityFilter },
    { label: 'Major', value: majorFilter, clear: setMajorFilter },
  ];

  const messageMentor = (mentor: (typeof mentorDirectory)[number]) => {
    openMiniChatForPerson({
      id: mentor.id,
      name: mentor.name,
      subtitle: `${mentor.field} • ${mentor.university}`,
      ...(mentor.avatar ? { avatar: mentor.avatar } : {}),
    });
    const conversation = useApp.getState().conversations.find((item) =>
      item.contactId === mentor.id || item.id === `direct-${mentor.id}`,
    );
    if (conversation) navigate(`/inbox/${conversation.id}`);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-secondary">Academix Network</p>
        <h1 className="mt-1 font-headline text-3xl font-semibold text-primary sm:text-4xl">Verified Mentors</h1>
        <p className="mt-2 text-on-surface-variant">Connect with verified mentors from universities across the platform.</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label className="relative block min-w-0 flex-1 sm:max-w-lg">
          <span className="sr-only">Search mentors</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search mentors..."
            className="input rounded-full pl-10"
          />
        </label>
        <div ref={filterRef} className="relative">
          <FilterButton
            activeCount={Number(Boolean(universityFilter)) + Number(Boolean(majorFilter))}
            expanded={filterOpen}
            ariaLabel="Filter mentors"
            onClick={() => setFilterOpen((open) => !open)}
          />
          {filterOpen && (
            <div role="dialog" aria-label="Filter mentors" className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-outline-variant/60 bg-white p-4 shadow-float">
              <div className="space-y-4">
                <SearchableSelect label="University" value={universityFilter} onChange={setUniversityFilter} options={universities} optional />
                <SearchableSelect label="Major" value={majorFilter} onChange={setMajorFilter} options={majors} optional />
              </div>
              <div className="mt-4 flex justify-end border-t border-outline-variant/40 pt-3">
                <button type="button" onClick={clearFilters} disabled={!universityFilter && !majorFilter} className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50">
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(universityFilter || majorFilter) && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active mentor filters">
          {activeFilters.filter(({ value }) => value).map(({ label, value, clear }) => (
            <span key={label} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">
              <span className="truncate">{label}: {value}</span>
              <button type="button" onClick={() => clear('')} aria-label={`Remove ${label} filter`} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                <Icon name="close" className="!text-[14px]" />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-secondary hover:underline">Clear all</button>
        </div>
      )}

      <p className="text-xs font-medium text-on-surface-variant" aria-live="polite">
        Showing {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'}
      </p>

      {filteredMentors.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMentors.map((mentor) => (
            <article key={`${mentor.id}-${mentor.university}`} className="group card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-float">
              <div className="flex items-center gap-3">
                <Avatar src={mentor.avatar || undefined} name={mentor.name || 'Mentor'} size={56} rounded="rounded-full" />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-primary">{mentor.name || 'Verified mentor'}</h2>
                  {mentor.verified && <Tag tone="green" icon="verified">Verified</Tag>}
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-on-surface">{mentor.university || 'University not listed'}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{mentor.major || mentor.field || 'Academic mentor'}</p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-on-surface-variant">{mentor.bio || 'A verified mentor ready to share their academic experience.'}</p>
              <div className="mt-5 flex flex-wrap gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:!opacity-100">
                <Link
                  to={mentorProfilePath(mentor.id)}
                  aria-label={`View ${mentor.name || 'mentor'}'s profile`}
                  className="btn-outline min-h-10 flex-1 !px-3 text-xs"
                >
                  View Profile
                </Link>
                <button type="button" onClick={() => messageMentor(mentor)} className="btn-primary min-h-10 flex-1 !px-3 text-xs">Message</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-on-surface-variant">No mentors found. Try changing your filters.</div>
      )}
    </div>
  );
}
