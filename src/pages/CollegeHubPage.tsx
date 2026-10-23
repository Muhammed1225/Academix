import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { DiscussionCard } from '../components/CollegeCards';
import PostCard from '../components/PostCard';
import { Avatar, Icon, SectionHeader, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import bhosInfo from '../../data/bhosinfo.txt?raw';
import type { College, Post } from '../data/types';
import { useApp } from '../store';

type HubTab = 'overview' | 'insights' | 'qa';

function DiscussionsSection({ college }: { college: College }) {
  return (
    <section className="card p-6">
      <SectionHeader
        title="Unfiltered Student Discussions"
        subtitle={`Crowdsourced answers from students and alumni in the ${college.shortName} network.`}
        icon="forum"
        action={
          <div className="flex flex-col items-end gap-2">
            <Link to={`/compose?university=${encodeURIComponent(college.id)}`} className="btn-outline !h-9 !px-3 text-xs">
              <Icon name="edit_note" className="!text-[18px]" /> Share your experience
            </Link>
            <Link to={`/compose?university=${encodeURIComponent(college.id)}&intent=question`} className="btn-primary !h-9 !px-3 text-xs">
              <Icon name="forum" className="!text-[18px]" /> Ask campus community
            </Link>
            <span className="chip bg-surface-container-low text-on-surface-variant"><Icon name="tune" className="!text-[16px]" /> Most Helpful</span>
          </div>
        }
      />
      {college.discussions.map((d) => (
        <DiscussionCard key={d.question} discussion={d} />
      ))}
      <p className="mt-2 text-center text-sm text-on-surface-variant">
        Showing {college.discussions.length} discussions
      </p>
      <Link
        to={`/search?university=${encodeURIComponent(college.id)}`}
        className="mt-4 flex items-center justify-center gap-1 border-t border-outline-variant/40 pt-4 text-sm font-semibold text-secondary hover:underline"
      >
        View more posts about {college.shortName} <Icon name="arrow_forward" className="!text-[18px]" />
      </Link>
    </section>
  );
}

function PopularMajorsSection({ college }: { college: College }) {
  const majors = college.majors.slice(0, 3);

  return (
    <section id="majors" className="card p-6 scroll-mt-24">
      <SectionHeader
        title={`Popular Majors at ${college.shortName}`}
        subtitle="Explore standout programs at this university."
        icon="school"
        action={
          <Link to={`/colleges/${college.id}/majors`} className="text-sm font-semibold text-secondary hover:underline">
            View all majors
          </Link>
        }
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {majors.map((major) => (
          <Link
            key={major.id}
            to={`/colleges/${college.id}/majors/${major.id}`}
            className="group rounded-xl border border-outline-variant/50 p-4 transition hover:border-secondary/50 hover:bg-surface-container-low"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-primary group-hover:text-secondary">{major.name}</div>
              <Icon name="arrow_outward" className="shrink-0 text-outline group-hover:text-secondary" />
            </div>
            <div className="mt-1 text-xs font-medium text-secondary">{major.category}</div>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{major.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Sidebar({ college, onViewInsights }: { college: College; onViewInsights: () => void }) {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <SectionHeader
          title="Acceptance Requirements"
          icon="rule"
          action={
            <button type="button" onClick={onViewInsights} className="text-right text-xs font-semibold text-secondary hover:underline">
              Admission insights
            </button>
          }
        />
        <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
          Illustrative DIM-scale estimates out of 700, not official university cutoffs.
        </p>
        <div className="space-y-3">
          {college.majors.map((major) => (
            <Link
              key={major.id}
              to={`/colleges/${college.id}/majors/${major.id}`}
              className="block rounded-lg bg-surface-container-low p-3 transition hover:bg-surface-container"
            >
              <div className="font-semibold text-primary hover:text-secondary">{major.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {major.dimStyleIllustrativeScores?.map(({ year, points }) => (
                  <div key={year} className="text-center">
                    <div className="text-[11px] text-on-surface-variant">{year}</div>
                    <div className="font-headline text-lg font-semibold text-secondary">{points}</div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div id="mentors" className="card scroll-mt-24 p-5">
        <SectionHeader title="Mentors" subtitle="Connect with students and alumni from the university network." icon="group" />
        <div className="mt-2 divide-y divide-outline-variant/40">
          {college.mentors.slice(0, 3).map((mentor) => (
            <SuggestedConnection key={mentor.id} mentor={mentor} />
          ))}
        </div>
        <Link
          to={`/connections?university=${encodeURIComponent(college.id)}`}
          className="mt-3 flex items-center justify-center gap-1 border-t border-outline-variant/40 pt-3 text-sm font-semibold text-secondary hover:underline"
        >
          Connect with more {college.shortName} people <Icon name="arrow_forward" className="!text-[18px]" />
        </Link>
      </div>

    </div>
  );
}

function UniversityNewsSection({ college, posts }: { college: College; posts: Post[] }) {
  const relatedPosts = posts.filter((post) => post.universityId === college.id).slice(0, 3);

  return (
    <section id="news" className="card scroll-mt-24 p-6">
      <SectionHeader title={`${college.shortName} News`} subtitle="Updates and dispatches connected to this university." icon="feed" />
      {relatedPosts.length ? (
        <div className="space-y-4">{relatedPosts.map((post) => <PostCard key={post.id} post={post} interactive={false} />)}</div>
      ) : (
        <div className="rounded-xl bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant">No university news has been shared yet.</p>
          <Link to={`/compose?university=${encodeURIComponent(college.id)}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline">
            Share a university update <Icon name="arrow_forward" className="!text-[17px]" />
          </Link>
        </div>
      )}
    </section>
  );
}

function UniversityGallerySection({ college, posts }: { college: College; posts: Post[] }) {
  const photos = [
    { src: college.heroImage, alt: `${college.name} campus` },
    ...posts
      .flatMap((post) => post.universityId === college.id && post.image
        ? [{ src: post.image.src, alt: post.title ?? `${college.shortName} community photo` }]
        : []),
  ];

  return (
    <section id="gallery" className="card scroll-mt-24 p-6">
      <SectionHeader title={`${college.shortName} Gallery`} subtitle="Photos from the university community." icon="photo_library" />
      <div className="grid gap-3 sm:grid-cols-2">
        {photos.map((photo, index) => (
          <img key={`${photo.src}-${index}`} src={photo.src} alt={photo.alt} className="h-52 w-full rounded-xl object-cover" />
        ))}
      </div>
    </section>
  );
}

function SuggestedConnection({ mentor }: { mentor: College['mentors'][number] }) {
  const showToast = useApp((s) => s.showToast);

  return (
    <div className="flex items-center gap-3 py-3 first:pt-1">
      <Avatar src={mentor.avatar} name={mentor.name} size={44} verified />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-primary">{mentor.name}</div>
        <div className="truncate text-xs text-on-surface-variant">{mentor.program}</div>
        <Tag tone="blue" className="mt-1">{mentor.tags[0]}</Tag>
      </div>
      <button
        type="button"
        onClick={() => showToast(`Connection request sent to ${mentor.name}`, 'person_add')}
        className="btn-outline !h-8 !px-2.5 text-xs"
      >
        Connect
      </button>
    </div>
  );
}

export default function CollegeHubPage() {
  const { collegeId } = useParams();
  const college = colleges.find((c) => c.id === collegeId);
  const saved = useApp((s) => (college ? s.savedColleges.includes(college.id) : false));
  const toggleSaved = useApp((s) => s.toggleSavedCollege);
  const showToast = useApp((s) => s.showToast);
  const posts = useApp((s) => s.posts);
  const [tab, setTab] = useState<HubTab>('overview');

  if (!college) return <Navigate to="/colleges" replace />;

  const tabs: { id: HubTab | 'majors'; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'majors', label: 'Majors Directory', count: college.majorCount },
    { id: 'insights', label: 'Admissions Insights' },
    { id: 'qa', label: 'Q&A Board', count: college.questionCount },
  ];
  const about = college.shortName.toLocaleUpperCase('en') === 'BHOS'
    ? bhosInfo.replace(/\s+/g, ' ').trim()
    : college.description;
  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-56 sm:h-72">
          <img src={college.heroImage} alt={college.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
          <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-secondary">
              <Icon name="verified" fill className="!text-[15px] text-on-tertiary-container" /> Verified Campus Network
            </span>
          </div>
          <h1 className="absolute bottom-5 left-5 right-5 font-headline text-3xl font-bold text-white sm:left-44 sm:text-4xl">{college.name}</h1>
        </div>
        <div className="relative flex flex-col gap-4 px-5 pb-5 pt-4 sm:flex-row sm:items-end sm:pl-56">
          <span className="absolute -top-14 left-5 hidden h-28 w-48 items-center justify-center rounded-xl border-4 border-white bg-secondary-fixed p-3 shadow-header sm:flex">
            <img src="/images/bhos-logo.png" alt={`${college.name} logo`} className="max-h-full w-full object-contain" />
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <Tag tone="green" icon="verified">
              Official Hub
            </Tag>
            <span className="flex items-center gap-1">
              <Icon name="location_on" className="!text-[16px]" /> {college.location}
            </span>
            <span>• {college.founded}</span>
            <Tag tone="blue">{college.kind}</Tag>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={saved}
              className={cx(saved ? 'btn-outline' : 'btn-primary')}
              onClick={() => {
                toggleSaved(college.id);
                showToast(saved ? `Removed ${college.name} from your dream universities` : `${college.name} added to your dream universities`, 'star');
              }}
            >
              <Icon name="star" fill={saved} /> Dream University
            </button>
            <Link to="/compose" className="btn-outline">
              <Icon name="question_answer" /> Ask Campus Community
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <SectionHeader title={`About ${college.name}`} icon="info" />
        <p className="leading-relaxed text-on-surface-variant">{about}</p>
      </section>

      <nav className="card sticky top-[72px] z-30 flex gap-1 overflow-x-auto p-1.5">
        {tabs.map((t) =>
          t.id === 'majors' ? (
            <Link key={t.id} to={`/colleges/${college.id}/majors`} className="flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low">
              {t.label}
              <span className="rounded-full bg-surface-container px-2 text-xs font-semibold">{t.count}</span>
            </Link>
          ) : (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as HubTab)}
              className={cx(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm',
                tab === t.id ? 'bg-secondary font-semibold text-white' : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cx('rounded-full px-2 text-xs font-semibold', tab === t.id ? 'bg-white/20' : 'bg-surface-container')}>{t.count}</span>
              )}
            </button>
          ),
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {tab === 'overview' && (
            <>
              {college.majors.length > 0 && <PopularMajorsSection college={college} />}
              <UniversityNewsSection college={college} posts={posts} />
              <UniversityGallerySection college={college} posts={posts} />
              <DiscussionsSection college={college} />
            </>
          )}
          {tab === 'qa' && <DiscussionsSection college={college} />}
          {tab === 'insights' && (
            <section className="card p-6">
              <SectionHeader title="Admissions Insights" subtitle="What CMU's committees look for, from verified mentors and officers." icon="insights" />
              <ul className="space-y-3 text-sm leading-relaxed">
                {[
                  'Holistic scoring is real: one deep, well-documented project beats 15 shallow ones.',
                  'SCS evaluates epistemic curiosity under failure — show how a hypothesis collapsed and what you learned.',
                  'Rigor is judged in the context of your school: exhaust the hardest quantitative courses available to you.',
                  'Early Decision is binding; ED applicants make up a large share of the incoming SCS class.',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Icon name="check_circle" fill className="text-on-tertiary-container" /> {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside>
          <div className="space-y-4">
            <Sidebar college={college} onViewInsights={() => setTab('insights')} />
          </div>
        </aside>
      </div>
    </div>
  );
}
