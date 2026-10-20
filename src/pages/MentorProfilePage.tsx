import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { BookingPanel } from '../components/BookingModal';
import PostCard from '../components/PostCard';
import { Avatar, Icon, SectionHeader, Tag, cx } from '../components/ui';
import { BRAND, mentorProfiles } from '../data/mock';
import type { MentorProfile, Review } from '../data/types';
import { useApp } from '../store';

type ProfileTab = 'posts' | 'journey' | 'sessions' | 'feedback';

function Stars({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex text-gold">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" fill size={size} />
      ))}
    </span>
  );
}

function PostsTab({ profile }: { profile: MentorProfile }) {
  const [sort, setSort] = useState('newest');
  const posts = [...profile.posts].sort((a, b) => (sort === 'engagement' ? b.votes - a.votes : sort === 'discussed' ? b.commentCount - a.commentCount : 0));
  return (
    <div className="space-y-4">
      <section className="card p-6">
        <SectionHeader title="About My College Journey" />
        {profile.about.map((p) => (
          <p key={p} className="mb-3 leading-relaxed text-on-surface-variant">
            {p}
          </p>
        ))}
        <div className="mt-4 rounded-xl bg-surface-container-low p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon name="psychology" className="text-secondary" /> What I Wish I Knew as an Applicant
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {profile.wishIKnew.map((w) => (
              <li key={w} className="flex gap-2">
                <Icon name="check_circle" fill className="!text-[18px] text-on-tertiary-container" /> {w}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="card p-6">
        <SectionHeader title="Mentorship Tracks" />
        <div className="grid gap-3 md:grid-cols-2">
          {profile.tracks.map((t) => (
            <div key={t.title} className="flex gap-3 rounded-xl border border-outline-variant/50 p-4">
              <Icon name={t.icon ?? 'description'} className="text-secondary" />
              <div>
                <div className="font-semibold">{t.title}</div>
                <p className="text-sm text-on-surface-variant">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="flex items-center justify-between">
        <p className="eyebrow">Recent Dispatches</p>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-auto !py-1.5 text-xs">
          <option value="newest">Sort By: Newest First</option>
          <option value="engagement">Highest Engagement</option>
          <option value="discussed">Most Discussed</option>
        </select>
      </div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} interactive={false} />
      ))}
    </div>
  );
}

function JourneyTab({ profile }: { profile: MentorProfile }) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-primary-container p-6 text-white">
        <p className="eyebrow !text-on-primary-container">Personal Odyssey</p>
        <h3 className="mt-1 font-headline text-xl font-semibold">Reflections on Computing, Math Competitions & Radical Curiosity</h3>
        <p className="mt-3 font-headline text-lg leading-relaxed text-white/90">{profile.journeyIntro}</p>
      </section>
      {profile.journey.map((section, i) => (
        <section key={section.title} className="card p-6">
          <SectionHeader title={`${i + 1}. ${section.title}`} subtitle={section.subtitle} icon={section.icon} />
          <ol className="relative ml-1.5 space-y-5 border-l-2 border-secondary-fixed pl-6">
            {section.items.map((item) => (
              <li key={item.title} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-secondary ring-4 ring-white" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-semibold">{item.title}</div>
                  {item.trailing && <Tag tone="blue">{item.trailing}</Tag>}
                </div>
                <div className="text-sm text-on-surface-variant">{item.subtitle}</div>
                {item.body && <p className="mt-1 text-sm text-on-surface">{item.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function SessionsTab({ profile }: { profile: MentorProfile }) {
  const showToast = useApp((s) => s.showToast);
  const [registered, setRegistered] = useState(false);
  const next = profile.nextSession;
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-secondary-fixed bg-surface-container-low p-6">
        <Tag tone="blue" icon="videocam">
          Next Upcoming Session • {BRAND} Live Campus Stage
        </Tag>
        <h3 className="mt-3 font-headline text-2xl font-semibold text-primary">{next.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{next.body}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Icon name="calendar_month" className="text-secondary" /> {next.date}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-error">
            <Icon name="how_to_reg" /> Only {next.seats - (registered ? 1 : 0)} Seats Remaining
          </span>
        </div>
        <button
          type="button"
          className={cx('mt-4', registered ? 'btn-outline' : 'btn-primary')}
          onClick={() => {
            setRegistered((v) => !v);
            if (!registered) showToast('Registered — we will remind you 1 hour before', 'notification_add');
          }}
        >
          <Icon name={registered ? 'check' : 'notification_add'} /> {registered ? 'Registered' : 'Register for Session'}
        </button>
        <p className="mt-2 text-xs text-on-surface-variant">Free for all verified high schoolers</p>
      </section>

      <section className="card p-6">
        <SectionHeader title="Curated Workshop Archive" subtitle="Access agendas, attendee stats, and recap notes" action={<Tag>{profile.workshops.length} Completed Workshops</Tag>} />
        <div className="space-y-3">
          {profile.workshops.map((w) => (
            <div key={w.title} className="rounded-xl border border-outline-variant/50 p-4">
              <div className="text-xs font-semibold text-secondary">
                {w.date} • {w.attended} Attended
              </div>
              <div className="mt-1 font-semibold">{w.title}</div>
              <p className="mt-1 text-sm text-on-surface-variant">{w.body}</p>
              <button type="button" onClick={() => showToast('Downloading recap PDF', 'download')} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                <Icon name="description" /> Download Recap PDF
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <SectionHeader title="Session Media & Recorded Excerpts" subtitle="Interactive previews from past cohorts" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { img: '/images/resource_cache_deck.jpg', label: 'Workshop Deck: Cache Optimization', meta: 'Slide Deck • 42 Slides', video: false },
            { img: '/images/resource_pipeline_replay.jpg', label: 'Full Replay: High School to SCS Pipeline', meta: '54:12 • Recorded at the Gates Hillman Center', video: true },
          ].map((m) => (
            <button key={m.label} type="button" onClick={() => showToast(m.video ? 'Playing replay' : 'Opening slide deck', m.video ? 'play_arrow' : 'slideshow')} className="group overflow-hidden rounded-xl border border-outline-variant/50 text-left">
              <div className="relative aspect-video overflow-hidden">
                <img src={m.img} alt={m.label} className="h-full w-full object-cover transition group-hover:scale-105" />
                {m.video && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary">
                      <Icon name="play_arrow" fill />
                    </span>
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="text-xs text-on-surface-variant">{m.meta}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [helpful, setHelpful] = useState(false);
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <Avatar src={review.avatar} name={review.name} size={44} rounded="rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{review.name}</span>
            <Tag tone="green" icon={review.badge === 'Former Mentee' ? 'verified' : 'check_circle'}>
              {review.badge}
            </Tag>
          </div>
          <div className="text-xs text-on-surface-variant">{review.role}</div>
        </div>
        <Stars size={15} />
      </div>
      <p className="mt-3 leading-relaxed text-on-surface">“{review.text}”</p>
      <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
        <span>Reviewed on {review.date}</span>
        <button type="button" onClick={() => setHelpful((v) => !v)} className={cx('flex items-center gap-1 font-semibold', helpful ? 'text-secondary' : '')}>
          <Icon name="thumb_up" fill={helpful} className="!text-[16px]" /> Helpful ({review.helpful + (helpful ? 1 : 0)})
        </button>
      </div>
    </div>
  );
}

function FeedbackTab({ profile }: { profile: MentorProfile }) {
  return (
    <div className="space-y-4">
      <section className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="text-center sm:w-48">
          <p className="eyebrow">Scholar Rating Index</p>
          <div className="mt-1 font-headline text-5xl font-bold text-primary">
            {profile.rating}
            <span className="text-lg text-on-surface-variant"> / 5.0</span>
          </div>
          <Stars />
          <p className="mt-1 text-xs text-on-surface-variant">Based on {profile.reviewCount} Verified Student Reviews</p>
          <Tag tone="green" icon="thumb_up" className="mt-2">
            99% Recommendation Rate
          </Tag>
        </div>
        <div className="flex-1 space-y-2">
          {profile.ratingBreakdown.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-14 text-on-surface-variant">{5 - i} Star</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-gold" style={{ width: `${f * 100}%` }} />
              </div>
              <span className="w-10 text-right font-semibold">{Math.round(f * 100)}%</span>
            </div>
          ))}
        </div>
      </section>
      {profile.reviews.map((r) => (
        <ReviewCard key={r.name} review={r} />
      ))}
    </div>
  );
}

export default function MentorProfilePage() {
  const { mentorId = 'maya' } = useParams();
  const profile = mentorProfiles[mentorId];
  const showToast = useApp((s) => s.showToast);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [following, setFollowing] = useState(false);

  if (!profile) return <Navigate to="/" replace />;

  const tabs: { id: ProfileTab; label: string; icon: string; meta: string }[] = [
    { id: 'posts', label: 'Posts', icon: 'dynamic_feed', meta: String(profile.posts.length) },
    { id: 'journey', label: 'Journey', icon: 'account_tree', meta: `${profile.journey.length} Sections` },
    { id: 'sessions', label: 'Sessions', icon: 'co_present', meta: `${profile.workshops.length + 1}` },
    { id: 'feedback', label: 'Feedback', icon: 'star', meta: `${profile.rating} ★` },
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-48 sm:h-60">
          <img src={profile.cover} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-on-tertiary-fixed-variant">
            <Icon name="verified_user" fill className="!text-[15px] text-on-tertiary-container" /> CMU Institutional ID Verified
          </span>
        </div>
        <div className="flex flex-col gap-5 px-6 pb-6 lg:flex-row lg:items-end">
          <div className="-mt-16 shrink-0">
            <span className="relative block rounded-2xl border-4 border-white bg-white shadow-header">
              <Avatar src={profile.avatar} name={profile.name} size={128} verified />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-headline text-3xl font-bold text-primary">{profile.name}</h1>
              <Tag tone="blue" icon="school">
                Institution Verified
              </Tag>
              <Tag tone="gold" icon="workspace_premium">
                Gold Peer Mentor
              </Tag>
              <Tag tone="green">Accepting Fall '25 Mentees</Tag>
            </div>
            <p className="mt-1 font-semibold text-secondary">{profile.classOf}</p>
            <p className="mt-1 text-on-surface-variant">{profile.headline}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="!text-[17px]" /> {profile.location}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="translate" className="!text-[17px]" /> {profile.languages}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={following ? 'btn-outline' : 'btn-primary'}
              onClick={() => {
                setFollowing((v) => !v);
                if (!following) showToast(`Following ${profile.name}`, 'person_add');
              }}
            >
              <Icon name={following ? 'check' : 'person_add'} /> {following ? 'Following' : 'Follow Updates'}
            </button>
            <button type="button" className="btn-outline" onClick={() => showToast('Profile link copied', 'link')}>
              <Icon name="share" /> Share
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-outline-variant/40 bg-outline-variant/40 sm:grid-cols-4">
          {profile.stats.map((s) => (
            <div key={s.label} className="bg-white px-6 py-4">
              <div className="font-headline text-2xl font-semibold text-primary">{s.value}</div>
              <div className="text-xs text-on-surface-variant">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <nav className="card sticky top-[72px] z-30 flex gap-1 overflow-x-auto p-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm',
                  tab === t.id ? 'bg-secondary font-semibold text-white' : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <Icon name={t.icon} className="!text-[18px]" />
                {t.label}
                <span className={cx('rounded-full px-2 text-xs font-semibold', tab === t.id ? 'bg-white/20' : 'bg-surface-container')}>{t.meta}</span>
              </button>
            ))}
          </nav>
          {tab === 'posts' && <PostsTab profile={profile} />}
          {tab === 'journey' && <JourneyTab profile={profile} />}
          {tab === 'sessions' && <SessionsTab profile={profile} />}
          {tab === 'feedback' && <FeedbackTab profile={profile} />}
        </div>
        <aside>
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="card p-6">
              <BookingPanel mentorName={profile.name} />
            </div>
            <div className="card p-5 text-sm">
              <p className="eyebrow">Research Focus</p>
              <p className="mt-1 font-semibold">Distributed Systems & LTI</p>
              <p className="eyebrow mt-3">Next Career</p>
              <p className="mt-1 font-semibold">Incoming Jane Street SWE</p>
              <p className="eyebrow mt-3">Community Standing</p>
              <p className="mt-1 flex items-center gap-1 font-semibold">
                {profile.rating} <Icon name="star" fill className="!text-[16px] text-gold" />
                <span className="font-normal text-on-surface-variant">({profile.reviewCount} verified)</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
