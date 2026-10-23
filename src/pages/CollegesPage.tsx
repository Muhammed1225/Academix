import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, Icon, MetricTile } from '../components/ui';
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
  const content = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary-fixed">
        {college ? (
          <img src={college.heroImage} alt={`${university} campus`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary-fixed to-surface-container-high">
            <Icon name="account_balance" className="!text-6xl text-secondary" />
          </div>
        )}
        {college && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-on-tertiary-container" /> {college.mentorCount} Mentors
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 font-headline text-2xl font-semibold text-primary">{university}</h2>
          <Icon name="arrow_forward" className="text-secondary transition group-hover:translate-x-1" />
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          {college ? `${college.location} • ${college.kind}` : 'University profile coming soon'}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricTile value={college?.stats.find((stat) => stat.label === 'Student Body')?.value ?? '—'} label="Students" />
          <MetricTile value={college ? String(college.mentorCount) : '—'} label="Mentors" />
          <MetricTile value={college ? String(college.majorCount) : '—'} label="Majors" />
        </div>
        <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-secondary">
          {college ? 'View university page' : 'Full university page unavailable'}
          <Icon name="open_in_new" className="!text-[17px]" />
        </p>
      </div>
    </>
  );

  return college ? (
    <Link to={`/colleges/${college.id}`} className="card group block overflow-hidden transition hover:shadow-float">
      {content}
    </Link>
  ) : (
    <article className="card overflow-hidden">{content}</article>
  );
}

function UniversitySections({ university, college }: { university: string; college?: College }) {
  const posts = useApp((state) => state.posts);
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
      content: college?.majors.length ? (
        <ul className="space-y-2">
          {college.majors.slice(0, 4).map((major) => (
            <li key={major.id} className="rounded-lg bg-surface-container-low px-3 py-2">
              <span className="block text-sm font-semibold text-primary">{major.name}</span>
              <span className="text-xs text-on-surface-variant">{major.category}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-on-surface-variant">Major information for {university} is not available yet.</p>,
    },
    {
      id: 'mentors',
      emoji: '🧑‍🏫',
      title: 'Mentors',
      content: college?.mentors.length ? (
        <ul className="space-y-3">
          {college.mentors.slice(0, 3).map((mentor) => (
            <li key={mentor.id} className="flex min-w-0 items-center gap-3">
              <Avatar src={mentor.avatar} name={mentor.name} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-primary">{mentor.name}</span>
                <span className="block truncate text-xs text-on-surface-variant">{mentor.program}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-on-surface-variant">Mentors from {university} are not listed yet.</p>,
    },
    {
      id: 'news',
      emoji: '📰',
      title: 'News',
      content: relatedPosts.length ? (
        <ul className="space-y-2">
          {relatedPosts.slice(0, 3).map((post) => (
            <li key={post.id} className="rounded-lg bg-surface-container-low px-3 py-2">
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
        <div className="grid grid-cols-2 gap-2">
          {photos.slice(0, 4).map((photo, index) => (
            <img key={`${photo.src}-${index}`} src={photo.src} alt={photo.alt} className="h-24 w-full rounded-lg object-cover" />
          ))}
        </div>
      ) : <p className="text-sm text-on-surface-variant">Photos from {university} are not available yet.</p>,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <section key={section.id} className="card min-w-0 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-headline text-lg font-semibold text-primary">
            <span aria-hidden="true" className="text-2xl">{section.emoji}</span>
            {section.title}
          </h3>
          {section.content}
        </section>
      ))}
    </div>
  );
}

export default function CollegesPage() {
  const defaultUniversity = universities.find((name) => normalizeName(name) === normalizeName('Baku Higher Oil School'));
  const [query, setQuery] = useState(defaultUniversity ?? 'Baku Higher Oil School (BHOS)');
  const [selectedUniversity, setSelectedUniversity] = useState(defaultUniversity ?? 'Baku Higher Oil School (BHOS)');
  const [searchMessage, setSearchMessage] = useState('');
  const selectedCollege = collegeForUniversity(selectedUniversity);

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
        <form onSubmit={submitSearch} className="w-full lg:max-w-md">
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

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.5fr)]">
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
    </div>
  );
}
