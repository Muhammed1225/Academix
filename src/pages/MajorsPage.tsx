import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { Chip, Icon, SectionHeader, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import type { College, Major } from '../data/types';
import { useApp } from '../store';

function MajorList({ college, activeId }: { college: College; activeId: string }) {
  const [category, setCategory] = useState(college.majorCategories[0]);
  const [query, setQuery] = useState('');
  const q = query.toLowerCase();
  const majors = college.majors
    .filter((m) => category === college.majorCategories[0] || m.category === category)
    .filter((m) => !q || `${m.name} ${m.school} ${m.summary}`.toLowerCase().includes(q));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search major, keyword, or career..." className="input pl-10" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {college.majorCategories.map((c) => (
          <Chip key={c} active={c === category} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>
      {majors.length === 0 && <p className="py-6 text-center text-sm text-on-surface-variant">No majors match your search.</p>}
      {majors.map((m) => (
        <Link
          key={m.id}
          to={`/colleges/${college.id}/majors/${m.id}`}
          className={cx(
            'block rounded-xl border p-4 transition',
            m.id === activeId ? 'border-secondary bg-secondary-fixed/40 ring-1 ring-secondary' : 'border-outline-variant/60 bg-white hover:bg-surface-container-low',
          )}
        >
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-secondary">{m.tag}</div>
          <div className="mt-1 font-semibold">{m.name}</div>
          <div className="text-xs text-on-surface-variant">{m.school}</div>
          <div className="mt-2 flex gap-1.5">
            <Tag tone="green">{m.salary} Med. Base</Tag>
            <Tag>{m.acceptance} Acc.</Tag>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MajorDetail({ college, major }: { college: College; major: Major }) {
  const navigate = useNavigate();
  const showToast = useApp((s) => s.showToast);

  return (
    <article className="min-w-0 space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-secondary">{major.school}</p>
            <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">{major.name}</h1>
            {major.degree && (
              <Tag tone="green" icon="verified_user" className="mt-2">
                {major.degree}
              </Tag>
            )}
          </div>
          <button type="button" className="btn-outline" onClick={() => showToast('Major dossier link copied', 'link')}>
            <Icon name="share" /> Share Major Dossier
          </button>
        </div>
        <p className="mt-4 leading-relaxed text-on-surface-variant">{major.summary}</p>

        {major.metrics ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {major.metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-outline-variant/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{m.label}</span>
                  <Icon name={m.icon} className="text-secondary" />
                </div>
                <div className="mt-2 font-headline text-xl font-semibold text-primary">{m.value}</div>
                {m.lines.map((l) => (
                  <div key={l} className="text-xs text-on-surface-variant">
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="eyebrow">Median base salary</div>
              <div className="mt-1 font-headline text-2xl font-semibold text-secondary">{major.salary}</div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="eyebrow">Acceptance</div>
              <div className="mt-1 font-headline text-2xl font-semibold text-primary">{major.acceptance}</div>
            </div>
          </div>
        )}
        {!major.metrics && (
          <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
            The full dossier for this major is being verified by CMU mentors. Book a mentor for more details.
          </p>
        )}
      </section>

      {major.philosophy && (
        <section className="card p-6">
          <SectionHeader title="Academic Philosophy & Curriculum Architecture" icon="menu_book" />
          {major.philosophy.map((p) => (
            <p key={p} className="mb-3 leading-relaxed text-on-surface-variant">
              {p}
            </p>
          ))}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {major.pillars?.map((p) => (
              <div key={p.title} className="rounded-xl bg-surface-container-low p-4">
                <Icon name={p.icon ?? 'star'} className="text-secondary" />
                <div className="mt-2 font-semibold">{p.title}</div>
                <p className="mt-1 text-sm text-on-surface-variant">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {major.coursework && (
        <section className="card p-6">
          <SectionHeader
            title="High School Preparation & Prerequisites"
            subtitle="Admissions evaluates rigor within the context of your secondary institution."
            icon="assignment_turned_in"
          />
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Icon name="calendar_month" className="text-secondary" /> Required Secondary Coursework
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {major.coursework.map((c) => (
                  <li key={c} className="flex gap-2">
                    <Icon name="check_circle" fill className="!text-[18px] text-on-tertiary-container" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Icon name="military_tech" className="text-secondary" /> Standardized Tests & Extracurricular Edge
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm">
                {major.testsAndEdge?.map((c) => (
                  <li key={c} className="flex gap-2">
                    <Icon name="stars" fill className="!text-[18px] text-gold" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {major.peers && (
        <section className="card overflow-hidden">
          <div className="p-6 pb-2">
            <SectionHeader
              title="Top Peer Institution Benchmark"
              subtitle='Comparative analysis across the "Big Four" CS powerhouses & elite peers'
              icon="balance"
              action={<Tag tone="blue">2024-2025 Dataset</Tag>}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
                <tr>
                  {['University & Program', 'CS Ranking', 'CS Major Acc.', 'Mid 50% SAT', 'Annual Tuition', 'Flagship Specialty'].map((h) => (
                    <th key={h} className="px-6 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {major.peers.map((p, i) => (
                  <tr key={p.name} className={cx('border-t border-outline-variant/40', i === 0 && 'bg-secondary-fixed/30')}>
                    <td className="px-6 py-3">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-on-surface-variant">{p.location}</div>
                    </td>
                    <td className="px-6 py-3 font-semibold text-secondary">{p.rank}</td>
                    <td className="px-6 py-3">{p.acceptance}</td>
                    <td className="px-6 py-3">{p.sat}</td>
                    <td className="px-6 py-3">{p.tuition}</td>
                    <td className="px-6 py-3">
                      <Tag tone="blue">{p.specialty}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {major.roles && (
        <section className="card p-6">
          <SectionHeader
            title="Career Pathways & Compensation Trajectory"
            subtitle="Class of 2024 Destination Survey: 98% employed or in graduate school within 6 months"
            icon="trending_up"
            action={<Tag tone="green">$138,500 Base Med.</Tag>}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {major.careerTracks?.map((t) => (
              <div key={t.title} className="flex gap-3 rounded-xl bg-surface-container-low p-4">
                <Icon name={t.icon ?? 'work'} className="text-secondary" />
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <p className="text-sm text-on-surface-variant">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-semibold">Typical Early Career Roles & Verified CMU Compensation</h3>
          <div className="mt-3 divide-y divide-outline-variant/40 rounded-xl border border-outline-variant/50">
            {major.roles.map((r) => (
              <div key={r.title} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-on-surface-variant">{r.employers}</div>
                </div>
                <span className="text-sm font-semibold text-on-tertiary-container">{r.comp}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm font-semibold">Top Volume Employers:</span>
            {major.employers?.map((e) => (
              <Tag key={e} tone="dark">
                {e}
              </Tag>
            ))}
          </div>
        </section>
      )}

      {major.related && (
        <section className="card p-6">
          <SectionHeader title="Related & Interdisciplinary Programs" subtitle="Cross-college computational degrees with high core curriculum overlap" icon="hub" />
          <div className="grid gap-3 md:grid-cols-3">
            {major.related.map((r) => {
              const target = college.majors.find((m) => m.name === r.name);
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() =>
                    target ? navigate(`/colleges/${college.id}/majors/${target.id}`) : showToast(`${r.name} dossier is coming soon`, 'schedule')
                  }
                  className="rounded-xl border border-outline-variant/60 p-4 text-left transition hover:border-secondary hover:bg-surface-container-low"
                >
                  <Tag tone="blue">{r.overlap}% Core Overlap</Tag>
                  <div className="mt-2 text-xs text-on-surface-variant">{r.school}</div>
                  <div className="font-semibold">{r.name}</div>
                  <p className="mt-1 text-sm text-on-surface-variant">{r.note}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                    Explore <Icon name="chevron_right" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}

export default function MajorsPage() {
  const { collegeId, majorId } = useParams();
  const college = colleges.find((c) => c.id === collegeId);
  if (!college) return <Navigate to="/colleges" replace />;
  const major = college.majors.find((m) => m.id === majorId);
  if (!major) return <Navigate to={`/colleges/${college.id}/majors/${college.majors[0].id}`} replace />;

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-on-surface-variant">
        <Link to="/colleges" className="hover:text-secondary">
          Explore Colleges
        </Link>
        <Icon name="chevron_right" className="!text-[16px]" />
        <Link to={`/colleges/${college.id}`} className="hover:text-secondary">
          {college.name}
        </Link>
        <Icon name="chevron_right" className="!text-[16px]" />
        <span>Majors & Academic Programs</span>
        <Icon name="chevron_right" className="!text-[16px]" />
        <span className="font-semibold text-primary">{major.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <p className="eyebrow mb-3">Majors Directory ({college.majorCount})</p>
          <MajorList college={college} activeId={major.id} />
        </aside>
        <MajorDetail college={college} major={major} />
      </div>
    </div>
  );
}
