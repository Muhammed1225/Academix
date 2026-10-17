import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { DiscussionCard, MentorCard } from '../components/CollegeCards';
import { Chip, Icon, SectionHeader, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import type { College } from '../data/types';
import { useApp } from '../store';

type HubTab = 'overview' | 'mentors' | 'insights' | 'qa';

function MentorsSection({ college, limit }: { college: College; limit?: number }) {
  const [filter, setFilter] = useState('All');
  const filters = ['All', ...new Set(college.mentors.map((m) => m.collegeShort))];
  const mentors = college.mentors.filter((m) => filter === 'All' || m.collegeShort === filter).slice(0, limit);
  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-headline text-2xl font-semibold text-primary">
            <span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Available Peer Mentors
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">Connect 1-on-1 with vetted CMU students currently enrolled in target colleges.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-1">College:</span>
          {filters.map((f) => (
            <Chip key={f} active={f === filter} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {mentors.map((m) => (
          <MentorCard key={m.id} mentor={m} />
        ))}
      </div>
      <p className="mt-5 text-center text-sm font-semibold text-secondary">
        Explore all {college.mentorCount} CMU Mentors across 7 colleges →
      </p>
    </section>
  );
}

function DiscussionsSection({ college }: { college: College }) {
  return (
    <section className="card p-6">
      <SectionHeader
        title="Unfiltered Student Discussions"
        subtitle="Crowdsourced answers directly from verified CMU undergraduate & alumni accounts."
        icon="forum"
        action={<span className="chip bg-surface-container-low text-on-surface-variant"><Icon name="tune" className="!text-[16px]" /> Most Helpful</span>}
      />
      {college.discussions.map((d) => (
        <DiscussionCard key={d.question} discussion={d} />
      ))}
      <p className="mt-2 text-center text-sm text-on-surface-variant">
        Showing {college.discussions.length} of {college.questionCount} verified questions
      </p>
    </section>
  );
}

function Sidebar({ college }: { college: College }) {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <SectionHeader title="Admissions Timelines" icon="event_upcoming" />
        <div className="space-y-2.5">
          {college.deadlines.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
              <div>
                <Tag tone={d.kind === 'Binding' ? 'dark' : 'neutral'}>{d.kind}</Tag>
                <div className="mt-1.5 font-semibold">{d.name}</div>
                <div className="text-xs text-on-surface-variant">{d.sub}</div>
              </div>
              <div className="text-right">
                <div className="font-headline text-xl font-semibold text-secondary">{d.date}</div>
                <div className="text-xs text-on-surface-variant">{d.notice}</div>
              </div>
            </div>
          ))}
        </div>
        <h3 className="mt-6 flex items-center gap-2 font-semibold text-primary">
          <Icon name="checklist" className="text-secondary" /> Applicant Requirements Checklist
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {college.checklist.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <Icon name={c.required ? 'check_box' : 'check_box_outline_blank'} fill={c.required} className={c.required ? 'text-on-tertiary-container' : 'text-outline'} />
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <SectionHeader title="Outcomes & Placements" icon="trending_up" />
        <p className="text-xs text-on-surface-variant">Median Starting Salary (Undergrad)</p>
        <p className="font-headline text-3xl font-semibold text-primary">$121,500</p>
        <div className="mt-4 space-y-3">
          {college.salaries.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="font-semibold text-secondary">{s.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${s.fraction * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold">Top Hiring Employers</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {college.employers.map((e) => (
            <Tag key={e}>{e}</Tag>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <SectionHeader title="Similar Cohort Schools" icon="compare_arrows" />
        {college.similar.map((s) => (
          <div key={s.name} className="flex items-center gap-3 border-b border-outline-variant/40 py-2.5 last:border-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-xs font-bold">{s.initials}</span>
            <span className="flex-1 text-sm">
              <span className="block font-semibold">{s.name}</span>
              <span className="block text-xs text-on-surface-variant">{s.meta}</span>
            </span>
            <Icon name="chevron_right" className="text-outline" />
          </div>
        ))}
      </div>

      <div className="card flex items-center gap-3 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
          <Icon name="location_on" />
        </span>
        <div>
          <div className="font-semibold">Campus & Neighborhood</div>
          <div className="text-xs text-on-surface-variant">{college.address}</div>
        </div>
      </div>
    </div>
  );
}

export default function CollegeHubPage() {
  const { collegeId } = useParams();
  const college = colleges.find((c) => c.id === collegeId);
  const saved = useApp((s) => (college ? s.savedColleges.includes(college.id) : false));
  const toggleSaved = useApp((s) => s.toggleSavedCollege);
  const showToast = useApp((s) => s.showToast);
  const [tab, setTab] = useState<HubTab>('overview');

  if (!college) return <Navigate to="/colleges" replace />;

  const tabs: { id: HubTab | 'majors'; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'mentors', label: 'Verified Student Mentors', count: college.mentorCount },
    { id: 'majors', label: 'Majors Directory', count: college.majorCount },
    { id: 'insights', label: 'Admissions Insights' },
    { id: 'qa', label: 'Q&A Board', count: college.questionCount },
  ];

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
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-on-tertiary-container" /> {college.mentorCount} Mentors Online
            </span>
          </div>
          <h1 className="absolute bottom-5 left-5 right-5 font-headline text-3xl font-bold text-white sm:left-44 sm:text-4xl">{college.name}</h1>
        </div>
        <div className="relative flex flex-col gap-4 px-5 pb-5 pt-4 sm:flex-row sm:items-end sm:pl-44">
          <span className="absolute -top-14 left-5 hidden h-28 w-28 items-center justify-center rounded-xl border-4 border-white bg-secondary-fixed shadow-header sm:flex">
            <Icon name="account_balance" className="!text-5xl text-secondary" />
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
              className={cx(saved ? 'btn-outline' : 'btn-primary')}
              onClick={() => {
                toggleSaved(college.id);
                showToast(saved ? 'Removed from your list' : `${college.name} bookmarked`, 'bookmark');
              }}
            >
              <Icon name="bookmark" fill={saved} /> {saved ? 'Bookmarked' : 'Bookmark University'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setTab('mentors')}>
              <Icon name="forum" /> Find a Mentor ({college.mentorCount})
            </button>
            <Link to="/compose" className="btn-outline">
              <Icon name="question_answer" /> Ask Campus Community
            </Link>
          </div>
        </div>
        <div className="grid gap-3 border-t border-outline-variant/40 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {college.stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-outline-variant/50 p-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{s.label}</span>
                <Icon name={s.icon} className="text-secondary" />
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="font-headline text-3xl font-semibold text-primary">{s.value}</span>
                {s.tag && <Tag tone="blue">{s.tag}</Tag>}
              </div>
              {s.note && <p className="mt-1 text-xs text-on-surface-variant">{s.note}</p>}
            </div>
          ))}
        </div>
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
              <section className="card p-6">
                <SectionHeader title={`About ${college.name}`} icon="info" />
                <p className="leading-relaxed text-on-surface-variant">{college.description}</p>
              </section>
              <MentorsSection college={college} limit={4} />
              <DiscussionsSection college={college} />
            </>
          )}
          {tab === 'mentors' && <MentorsSection college={college} />}
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
            <Sidebar college={college} />
          </div>
        </aside>
      </div>
    </div>
  );
}
