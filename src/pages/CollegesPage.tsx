import { Link } from 'react-router-dom';

import { Icon, MetricTile, SectionHeader, Tag } from '../components/ui';
import { colleges } from '../data/mock';
import { useApp } from '../store';

export default function CollegesPage() {
  const showToast = useApp((s) => s.showToast);
  const featured = colleges[0];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-headline text-3xl font-semibold text-primary sm:text-4xl">Explore Colleges</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Verified campus hubs with real admissions data, student mentors, and honest answers from current scholars.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {colleges.map((c) => (
          <Link key={c.id} to={`/colleges/${c.id}`} className="card group overflow-hidden transition hover:shadow-float">
            <div className="relative aspect-[16/8] overflow-hidden">
              <img src={c.heroImage} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-on-tertiary-container" /> {c.mentorCount} Mentors Online
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2">
                <h2 className="flex-1 font-headline text-2xl font-semibold text-primary">{c.name}</h2>
                <Icon name="arrow_forward" className="text-secondary transition group-hover:translate-x-1" />
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">
                {c.location} • {c.kind}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {c.stats.slice(0, 3).map((s) => (
                  <MetricTile key={s.label} value={s.value} label={s.label} />
                ))}
              </div>
            </div>
          </Link>
        ))}

        <div className="card p-6">
          <SectionHeader title="Similar Cohort Schools" subtitle="Verified hubs opening this season" icon="compare_arrows" />
          <div className="space-y-3">
            {featured.similar.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => showToast(`${s.name} hub is coming soon`, 'schedule')}
                className="flex w-full items-center gap-3 rounded-xl border border-outline-variant/50 p-3 text-left hover:bg-surface-container-low"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-high text-sm font-bold text-primary">
                  {s.initials}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-xs text-on-surface-variant">{s.meta}</span>
                </span>
                <Tag>Soon</Tag>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
