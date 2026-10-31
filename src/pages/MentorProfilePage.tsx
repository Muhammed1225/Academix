import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Avatar, Icon, Modal, SectionHeader, Tag, cx } from '../components/ui';
import { mentorDirectory, mentorProfilesById } from '../data/mentors';
import type { MentorProfile, OfferedCourse, Review } from '../data/types';
import { useApp } from '../store';

type ProfileTab = 'courses' | 'posts' | 'feedback';

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
  const platformPosts = useApp((state) => state.posts);
  const posts = platformPosts
    .filter((post) => post.author.id === profile.id)
    .sort((a, b) => (sort === 'engagement' ? b.votes - a.votes : sort === 'discussed' ? b.commentCount - a.commentCount : 0));
  return (
    <section className="card p-6">
      <SectionHeader
        title="Posts"
        subtitle={`${posts.length} ${posts.length === 1 ? 'post' : 'posts'} shared on Academix`}
        action={(
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="input !w-auto !py-1.5 text-xs">
            <option value="newest">Sort By: Newest First</option>
            <option value="engagement">Highest Engagement</option>
            <option value="discussed">Most Discussed</option>
          </select>
        )}
      />
      {posts.length ? (
        <div className="mt-4 space-y-4">
          {posts.map((post) => <PostCard key={post.id} post={post} interactive={false} />)}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-surface-container-low p-6 text-center">
          <Icon name="dynamic_feed" className="text-secondary" />
          <p className="mt-2 font-semibold text-primary">No posts yet</p>
          <p className="mt-1 text-sm text-on-surface-variant">Posts this mentor shares on Academix will appear here.</p>
        </div>
      )}
    </section>
  );
}

function OfferedCoursesTab({ profile }: { profile: MentorProfile }) {
  const courses = profile.offeredCourses ?? [];
  const showToast = useApp((state) => state.showToast);
  const [courseApplications, setCourseApplications] = useState<Record<string, string>>({});
  const [selectedCourse, setSelectedCourse] = useState<OfferedCourse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const closeEnrollment = () => {
    setSelectedCourse(null);
    setSelectedSlot(null);
  };
  const confirmEnrollment = () => {
    if (
      !selectedCourse ||
      !selectedSlot ||
      !selectedCourse.availableSlots.includes(selectedSlot) ||
      selectedCourse.enrolledCount >= selectedCourse.capacity
    ) return;
    setCourseApplications((current) => ({ ...current, [selectedCourse.title]: selectedSlot }));
    showToast(`Application submitted for ${selectedCourse.title} at ${selectedSlot}`, 'check');
    closeEnrollment();
  };
  return (
    <>
      <section className="card p-6">
        <SectionHeader
          title="Offered Courses"
          subtitle="Sample timetables and seat availability are shown in Baku time"
          action={<Tag>{courses.length} {courses.length === 1 ? 'Course' : 'Courses'}</Tag>}
        />
        {courses.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {courses.map((course, index) => {
              const applicationSlot = courseApplications[course.title];
              const enrolled = Boolean(applicationSlot);
              const fullyBooked = course.enrolledCount >= course.capacity;
              return (
                <article key={course.title} className="flex h-full flex-col rounded-xl border border-outline-variant/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
                    <Icon name="school" className="!text-[17px]" /> Course {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-2 font-semibold text-primary">{course.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{course.description}</p>
                  <div className="mt-3 rounded-lg bg-surface-container-low p-3">
                    <p className="eyebrow">Timetable</p>
                    <p className="mt-1 text-sm font-medium text-on-surface">
                      {course.availableSlots.length
                        ? `${course.availableSlots.length} available time ${course.availableSlots.length === 1 ? 'slot' : 'slots'}`
                        : 'No available time slots'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-on-surface-variant">{course.enrolledCount}/{course.capacity} enrolled</span>
                      <Tag tone={fullyBooked ? 'red' : 'green'} icon={fullyBooked ? 'event_busy' : 'event_available'}>
                        {fullyBooked ? 'Fully booked' : `${course.capacity - course.enrolledCount} seats available`}
                      </Tag>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={enrolled || fullyBooked}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setSelectedCourse(course);
                      setSelectedSlot(null);
                    }}
                    className={cx(
                      'mt-4 w-full justify-center',
                      enrolled || fullyBooked ? 'btn-outline !text-on-surface-variant' : 'btn-primary',
                    )}
                  >
                    <Icon name={enrolled ? 'check' : fullyBooked ? 'event_busy' : 'school'} />
                    {enrolled ? 'Application Submitted' : fullyBooked ? 'Fully Booked' : 'Enroll'}
                  </button>
                  {applicationSlot && (
                    <p className="mt-2 text-xs text-on-surface-variant">Selected time: {applicationSlot}</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
            This mentor has not added any courses yet.
          </p>
        )}
      </section>

      <Modal
        open={selectedCourse !== null}
        onClose={closeEnrollment}
        label={selectedCourse ? `Apply to ${selectedCourse.title}` : 'Course application details'}
        width="max-w-2xl"
      >
        {selectedCourse && (
          <>
            <div className="bg-primary-container px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Tag tone="blue" icon="school">Course application</Tag>
                  <h2 className="mt-3 font-headline text-2xl font-semibold">{selectedCourse.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">{selectedCourse.description}</p>
                </div>
                <button type="button" onClick={closeEnrollment} aria-label="Close enrollment details" className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white">
                  <Icon name="close" />
                </button>
              </div>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="eyebrow">Instructor</p>
                  <p className="mt-1 font-semibold text-primary">{profile.name}</p>
                  <p className="text-sm text-on-surface-variant">{profile.headline}</p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="eyebrow">Academic focus</p>
                  <p className="mt-1 font-semibold text-primary">{profile.degree}</p>
                  <p className="text-sm text-on-surface-variant">{profile.university ?? 'University not listed'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-outline-variant/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-primary">Choose an available time</h3>
                    <p className="mt-1 text-xs text-on-surface-variant">Times are shown in Baku time. Your selection will be included with your application.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag
                      tone={selectedCourse.enrolledCount >= selectedCourse.capacity ? 'red' : 'green'}
                      icon={selectedCourse.enrolledCount >= selectedCourse.capacity ? 'event_busy' : 'event_available'}
                    >
                      {selectedCourse.enrolledCount >= selectedCourse.capacity
                        ? 'Fully booked'
                        : `${selectedCourse.capacity - selectedCourse.enrolledCount} seats available`}
                    </Tag>
                    <Icon name="calendar_month" className="text-secondary" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  {selectedCourse.enrolledCount}/{selectedCourse.capacity} enrolled
                </p>
                {selectedCourse.availableSlots.length ? (
                  <div role="group" aria-label="Available course times" className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedCourse.availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={selectedSlot === slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cx(
                          'flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-medium transition',
                          selectedSlot === slot
                            ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed ring-2 ring-secondary/20'
                            : 'border-outline-variant/60 text-on-surface hover:border-secondary hover:bg-surface-container-low',
                        )}
                      >
                        <Icon name={selectedSlot === slot ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-secondary" />
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container">
                    This course has no available time slots and is fully booked.
                  </p>
                )}
              </div>
              {(profile.tags ?? []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary">Related topics</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(profile.tags ?? []).map((tag) => <Tag key={tag} tone="blue">{tag}</Tag>)}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-outline-variant/50 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-primary">
                  <Icon name="info" className="text-secondary" /> Before you enroll
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  Confirm the course focus fits your goals. For scheduling, format, or prerequisite questions, message {profile.name} from the mentor profile before enrolling.
                </p>
              </div>
              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <button type="button" onClick={closeEnrollment} className="btn-outline justify-center">Cancel</button>
                <button
                  type="button"
                  disabled={!selectedSlot || selectedCourse.enrolledCount >= selectedCourse.capacity}
                  onClick={confirmEnrollment}
                  className={cx(
                    'justify-center',
                    !selectedSlot || selectedCourse.enrolledCount >= selectedCourse.capacity ? 'btn-outline !text-on-surface-variant' : 'btn-primary',
                  )}
                >
                  <Icon name={selectedCourse.enrolledCount >= selectedCourse.capacity ? 'event_busy' : 'check'} />
                  {selectedCourse.enrolledCount >= selectedCourse.capacity
                    ? 'Fully Booked'
                    : selectedSlot ? 'Submit Application' : 'Select a Time Slot'}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function SimilarMentors({ profile }: { profile: MentorProfile }) {
  const profileTags = profile.tags ?? [];
  const candidates = mentorDirectory
    .filter((mentor) => mentor.id !== profile.id)
    .map((mentor) => {
      const sharedTopics = mentor.tags.filter((tag) => profileTags.includes(tag));
      const sameMajor = mentor.major !== 'Major not listed' && profile.degree.toLocaleLowerCase().includes(mentor.major.toLocaleLowerCase());
      const sameUniversity = Boolean(profile.university && mentor.university === profile.university);
      return {
        mentor,
        sharedTopics,
        score: sharedTopics.length * 3 + Number(sameMajor) * 2 + Number(sameUniversity),
      };
    })
    .sort((first, second) => second.score - first.score || second.mentor.rating - first.mentor.rating)
    .slice(0, 4);

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-headline text-xl font-semibold text-primary">Similar Mentors</h2>
          <p className="mt-1 text-xs text-on-surface-variant">Related mentors to explore</p>
        </div>
        <Tag>{candidates.length}</Tag>
      </div>
      {candidates.length ? (
        <div className="space-y-2">
          {candidates.map(({ mentor, sharedTopics }) => (
            <Link
              key={mentor.id}
              to={`/mentors/${mentor.id}`}
              className="group flex items-center gap-3 rounded-xl border border-outline-variant/50 p-3 transition-colors hover:border-secondary/50 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <Avatar src={mentor.avatar} name={mentor.name} size={44} rounded="rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-primary group-hover:text-secondary">{mentor.name}</span>
                <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{mentor.major} · {mentor.university}</span>
                {sharedTopics.length > 0 && (
                  <span className="mt-1 block truncate text-xs text-secondary">Shared interests: {sharedTopics.slice(0, 2).join(', ')}</span>
                )}
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                  <Icon name="star" fill className="!text-[14px] text-gold" /> {mentor.rating.toFixed(1)}
                </span>
              </span>
              <Icon name="arrow_forward" className="!text-[18px] text-outline transition group-hover:text-secondary" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No similar mentors are available yet.</p>
      )}
    </section>
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
      <p className="mt-3 leading-relaxed text-on-surface">&ldquo;{review.text}&rdquo;</p>
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
      <section>
        <SectionHeader
          title="Student comments"
          subtitle={`${profile.reviews.length} written ${profile.reviews.length === 1 ? 'comment' : 'comments'} about ${profile.name}`}
        />
        {profile.reviews.length ? (
          <div className="mt-3 space-y-4">
            {profile.reviews.map((review) => <ReviewCard key={`${review.name}-${review.date}`} review={review} />)}
          </div>
        ) : (
          <div className="card mt-3 p-6 text-sm text-on-surface-variant">No written comments yet.</div>
        )}
      </section>
    </div>
  );
}

export default function MentorProfilePage() {
  const { mentorId = 'maya' } = useParams();
  const navigate = useNavigate();
  const profile = mentorProfilesById[mentorId];
  const showToast = useApp((s) => s.showToast);
  const openMiniChatForPerson = useApp((s) => s.openMiniChatForPerson);
  const platformPosts = useApp((s) => s.posts);
  const [tab, setTab] = useState<ProfileTab>('courses');
  const [following, setFollowing] = useState(false);

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-outline-variant/50 bg-white p-8 text-center">
        <Icon name="person_off" className="!text-5xl text-outline-variant" />
        <h1 className="mt-3 font-headline text-2xl font-semibold text-primary">Mentor not found</h1>
        <p className="mt-2 text-sm text-on-surface-variant">We could not find that mentor profile.</p>
        <Link to="/mentors" className="btn-primary mt-5">Back to mentors</Link>
      </div>
    );
  }

  const tabs: { id: ProfileTab; label: string; icon: string; meta: string }[] = [
    { id: 'courses', label: 'Offered Courses', icon: 'school', meta: String(profile.offeredCourses?.length ?? 0) },
    { id: 'posts', label: 'Posts', icon: 'dynamic_feed', meta: String(platformPosts.filter((post) => post.author.id === profile.id).length) },
    { id: 'feedback', label: 'Feedback', icon: 'star', meta: String(profile.rating) },
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-48 sm:h-60">
          {profile.cover ? (
            <img src={profile.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full bg-gradient-to-br from-primary-container via-secondary to-[#86c7ce]" />
          )}
          <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-on-tertiary-fixed-variant">
            <Icon name="verified_user" fill className="!text-[15px] text-on-tertiary-container" /> {profile.university ?? 'Institution'} Institutional ID Verified
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
              <Tag tone="blue" icon="school">Institution Verified</Tag>
              <Tag tone="gold" icon="workspace_premium">Gold Peer Mentor</Tag>
              {(profile.tags ?? []).slice(0, 2).map((tag) => <Tag key={tag} tone="green">{tag}</Tag>)}
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
            <button type="button" className="btn-outline" onClick={() => showToast('Profile link copied', 'link')}>
              <Icon name="share" /> Share
            </button>
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
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                const conversationId = openMiniChatForPerson({
                  id: profile.id,
                  name: profile.name,
                  subtitle: profile.headline,
                  ...(profile.avatar ? { avatar: profile.avatar } : {}),
                });
                navigate(`/inbox/${conversationId}`);
              }}
            >
              <Icon name="mail" /> Message
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
          {tab === 'courses' && <OfferedCoursesTab profile={profile} />}
          {tab === 'posts' && <PostsTab profile={profile} />}
          {tab === 'feedback' && <FeedbackTab profile={profile} />}
        </div>
        <aside>
          <div className="space-y-4 lg:sticky lg:top-24">
            <SimilarMentors profile={profile} />
            <div className="card p-5 text-sm">
              <p className="eyebrow">Research Focus</p>
              <p className="mt-1 font-semibold">{profile.degree}</p>
              <p className="eyebrow mt-3">University</p>
              <p className="mt-1 font-semibold">{profile.university ?? 'University not listed'}</p>
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
