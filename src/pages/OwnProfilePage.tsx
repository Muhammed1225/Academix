import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import PostCard from '../components/PostCard';
import RichText, { sanitizeRichText } from '../components/RichText';
import { Avatar, Icon, Tag, VerificationBadge } from '../components/ui';
import { saveProfile } from '../authService';
import { majors as majorOptions, universities } from '../data/educationOptions';
import { defaultInterestEmoji, interestEmojis, interests as interestOptions } from '../data/interestOptions';
import { people } from '../data/mock';
import { useApp, type AuthenticatedUser } from '../store';

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read the selected image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function educationFor(user: AuthenticatedUser) {
  const education = [user.major, user.university].filter(Boolean).join(' • ');
  return [education, user.graduationYear ? `Class of ${user.graduationYear}` : ''].filter(Boolean).join(' • ');
}

function biographyForEditor(biography: string) {
  const document = new DOMParser().parseFromString(sanitizeRichText(biography), 'text/html');
  return document.body.textContent ?? '';
}

function ProfileEditor({ user, onClose }: { user: AuthenticatedUser; onClose: () => void }) {
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const [name, setName] = useState(user.name);
  const [photo, setPhoto] = useState(user.photo);
  const [biography, setBiography] = useState(() => biographyForEditor(user.biography));
  const [selectedInterests, setSelectedInterests] = useState(user.interests);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [purpose, setPurpose] = useState(user.purpose);
  const [location, setLocation] = useState(user.location ?? '');
  const [university, setUniversity] = useState(user.university ?? '');
  const [universitiesOpen, setUniversitiesOpen] = useState(false);
  const [major, setMajor] = useState(user.major ?? '');
  const [majorsOpen, setMajorsOpen] = useState(false);
  const [graduationYear, setGraduationYear] = useState(user.graduationYear?.toString() ?? '');
  const [graduationYearsOpen, setGraduationYearsOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const availableInterests = [...new Set([...interestOptions, ...selectedInterests])];
  const availableMajors = [...new Set([...majorOptions, ...(major ? [major] : [])])];
  const graduationYears = [...new Set([
    ...Array.from({ length: 32 }, (_, index) => String(2000 + index)),
    ...(graduationYear ? [graduationYear] : []),
  ])].sort((a, b) => Number(a) - Number(b));

  const toggleInterest = (interest: string) => {
    setSelectedInterests((selected) => selected.includes(interest)
      ? selected.filter((item) => item !== interest)
      : selected.length < 30 ? [...selected, interest] : selected);
  };

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    try {
      setPhoto(await readImage(file));
      setError('');
    } catch {
      setError('Unable to read the selected image. Please try another one.');
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await saveProfile({
          name,
          photo,
          biography,
          interests: selectedInterests,
          purpose,
          location,
          university,
          major,
          graduationYear: graduationYear ? Number(graduationYear) : null,
      });
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Unable to save your profile. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      onClose();
    } catch {
      setError('Unable to reach the profile service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-primary/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-float sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-secondary">Account details</p>
            <h2 id="edit-profile-title" className="mt-1 font-headline text-2xl font-semibold text-primary">Edit your profile</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close profile editor"><Icon name="close" /></button>
        </div>
        <form onSubmit={(event) => void save(event)} className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={photo || undefined} name={name} size={72} rounded="rounded-full" />
            <div className="flex flex-wrap gap-2">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} className="sr-only" aria-label="Choose profile picture" />
              <button type="button" onClick={() => photoInput.current?.click()} className="btn-outline !h-9 !px-3 text-sm">{photo ? 'Change photo' : 'Add photo'}</button>
              {photo && <button type="button" onClick={() => setPhoto('')} className="btn-ghost !h-9 !px-3 text-sm">Remove</button>}
            </div>
          </div>
          <label className="block text-sm font-semibold">Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="input mt-1.5" /></label>
          <label className="block text-sm font-semibold">Biography<textarea maxLength={5000} value={biography} onChange={(event) => setBiography(event.target.value)} rows={5} className="input mt-1.5 resize-y" placeholder="Tell the community a little about yourself." /></label>
          <div>
            <span className="block text-sm font-semibold">Interests</span>
            <button
              type="button"
              aria-expanded={interestsOpen}
              aria-controls="profile-interest-options"
              onClick={() => setInterestsOpen((open) => !open)}
              className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
            >
              <span className={selectedInterests.length ? 'text-on-surface' : 'text-on-surface-variant'}>
                {selectedInterests.length
                  ? `${selectedInterests.length} selected: ${selectedInterests.slice(0, 3).join(', ')}${selectedInterests.length > 3 ? '…' : ''}`
                  : 'Choose your interests'}
              </span>
              <Icon name={interestsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
            </button>
            {interestsOpen && (
              <div id="profile-interest-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                <ul aria-label="Choose interests" className="grid gap-1 sm:grid-cols-2">
                  {availableInterests.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <li key={interest}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleInterest(interest)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${selected ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          <span aria-hidden="true">{interestEmojis[interest] ?? defaultInterestEmoji}</span>
                          <span className="flex-1">{interest}</span>
                          {selected && <Icon name="check" className="!text-sm" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="px-2.5 pt-2 text-[11px] text-on-surface-variant">{selectedInterests.length} selected (up to 30)</p>
              </div>
            )}
          </div>
          <label className="block text-sm font-semibold">What brings you to Academix<textarea maxLength={200} value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={2} className="input mt-1.5 resize-y" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-sm font-semibold">{user.role === 'prospective' ? 'Dream university' : 'University'}</span>
              <button
                type="button"
                aria-expanded={universitiesOpen}
                aria-controls="profile-university-options"
                onClick={() => setUniversitiesOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={university ? 'text-on-surface' : 'text-on-surface-variant'}>
                  {university || (user.role === 'prospective' ? 'Choose your dream university' : 'Choose your university')}
                </span>
                <Icon name={universitiesOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {universitiesOpen && (
                <div id="profile-university-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose university" className="space-y-1">
                    {universities.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          aria-pressed={university === option}
                          onClick={() => { setUniversity(option); setUniversitiesOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${university === option ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold">Major / subject</span>
              <button
                type="button"
                aria-expanded={majorsOpen}
                aria-controls="profile-major-options"
                onClick={() => setMajorsOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={major ? 'text-on-surface' : 'text-on-surface-variant'}>{major || 'Choose your major'}</span>
                <Icon name={majorsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {majorsOpen && (
                <div id="profile-major-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose major" className="space-y-1">
                    {availableMajors.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          aria-pressed={major === option}
                          onClick={() => { setMajor(option); setMajorsOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${major === option ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold">Graduation year</span>
              <button
                type="button"
                aria-expanded={graduationYearsOpen}
                aria-controls="profile-graduation-year-options"
                onClick={() => setGraduationYearsOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={graduationYear ? 'text-on-surface' : 'text-on-surface-variant'}>
                  {graduationYear || 'Choose graduation year'}
                </span>
                <Icon name={graduationYearsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {graduationYearsOpen && (
                <div id="profile-graduation-year-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose graduation year" className="space-y-1">
                    {graduationYears.map((year) => (
                      <li key={year}>
                        <button
                          type="button"
                          aria-pressed={graduationYear === year}
                          onClick={() => { setGraduationYear(year); setGraduationYearsOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${graduationYear === year ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {year}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <label className="block text-sm font-semibold">Location<input maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} className="input mt-1.5" placeholder="City, region" /></label>
            <label className="block text-sm font-semibold">Email address<input readOnly value={user.email} className="input mt-1.5 bg-surface-container-low text-on-surface-variant" /></label>
          </div>
          {user.role === 'prospective' && (
            <div className="flex justify-end">
              <Link to="/profile/university-joined" onClick={onClose} className="btn-outline border-secondary text-secondary hover:bg-secondary-fixed">
                <Icon name="account_balance" />
                I have entered a university
              </Link>
            </div>
          )}
          {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-outline-variant/50 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'} <Icon name="check" /></button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function OwnProfilePage() {
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const posts = useApp((state) => state.posts);
  const showToast = useApp((state) => state.showToast);
  const [editing, setEditing] = useState(false);
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>([]);

  const authoredPosts = useMemo(
    () => user ? posts.filter((post) => post.author.id === user.id && !post.auditNote) : [],
    [posts, user],
  );

  if (!authChecked) return <div role="status" className="card mx-auto max-w-3xl p-8 text-center text-on-surface-variant">Loading your profile…</div>;
  if (!user) return <Navigate to="/auth?mode=create" replace />;

  const recommendations = Object.values(people)
    .filter((candidate) => candidate.id !== 'anon' && candidate.id !== 'anon-ivy')
    .map((person) => ({
      person,
      sharedInterests: person.interests?.filter((interest) => user.interests.includes(interest)) ?? [],
    }))
    .filter(({ sharedInterests }) => sharedInterests.length > 0)
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length)
    .slice(0, 3);
  const verification = user.verificationStatus === 'verified' ? 'edu' : user.role === 'prospective' ? 'prospective' : 'unverified';

  return (
    <>
      <div className="mx-auto grid max-w-5xl items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary-container via-secondary to-[#86c7ce] sm:h-48">
              <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
              <div className="absolute right-24 top-10 h-32 w-32 rounded-full bg-white/10 blur-sm" />
              <div className="absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            <div className="px-5 pb-5 sm:px-8 sm:pb-7">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                <Avatar src={user.photo || undefined} name={user.name} size={112} rounded="rounded-2xl ring-4 ring-white shadow-float" />
                <div className="flex w-full gap-2 sm:w-auto">
                  <button type="button" onClick={() => setEditing(true)} className="btn-primary flex-1 sm:flex-none"><Icon name="edit" /> Edit profile</button>
                  <button type="button" onClick={() => showToast('Messaging is available from your Messages inbox', 'mail')} className="btn-outline flex-1 sm:flex-none"><Icon name="mail" /> Message</button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-headline text-2xl font-semibold text-primary sm:text-3xl">{user.name}</h1>
                  <Tag tone="blue">Your profile</Tag>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant sm:text-base">
                  {educationFor(user) || 'Academix community member'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5"><Icon name="mail" className="!text-[17px]" />{user.email}</span>
                  <span className="hidden text-outline-variant sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="location_on" className="!text-[17px]" />{user.location || 'Academic network'}</span>
                  <span className="hidden text-outline-variant sm:inline">•</span>
                  <span>{user.role === 'faculty' ? 'Faculty' : user.role === 'prospective' ? 'Prospective student' : 'Student / scholar'}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <VerificationBadge verification={verification} />
                  {user.verificationStatus === 'pending' && <Tag tone="neutral">Verification pending</Tag>}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-outline-variant/50 pt-4 text-sm text-on-surface-variant">
                <Icon name="dynamic_feed" className="text-secondary" />
                <span><strong className="text-primary">{authoredPosts.length}</strong> {authoredPosts.length === 1 ? 'public post' : 'public posts'}</span>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-xl font-semibold text-primary">About</h2>
            {user.biography ? <RichText text={user.biography} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant" /> : (
              <div className="mt-3 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Add a biography to introduce yourself to the academic community.
                <button type="button" onClick={() => setEditing(true)} className="ml-1 font-semibold text-secondary hover:underline">Complete your profile</button>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <div>
                <h2 className="font-headline text-xl font-semibold text-primary">Activity</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Posts shared with the Academix community</p>
              </div>
              <Tag tone="blue">{authoredPosts.length} {authoredPosts.length === 1 ? 'post' : 'posts'}</Tag>
            </div>
            <div className="mt-4 space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
              {authoredPosts.length ? authoredPosts.map((post) => <PostCard key={post.id} post={post} interactive={false} />) : (
                <div className="rounded-xl bg-surface-container-low p-6 text-center">
                  <Icon name="edit_note" className="text-secondary" />
                  <p className="mt-2 text-sm text-on-surface-variant">No public posts yet.</p>
                  <Link to="/compose" className="mt-2 inline-flex text-sm font-semibold text-secondary hover:underline">Share your first post</Link>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">People you may be interested in</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Suggested based on shared academic interests</p>
            <div className="mt-4 divide-y divide-outline-variant/50">
              {recommendations.length ? recommendations.map(({ person, sharedInterests }) => {
                const requested = requestedProfiles.includes(person.id);
                return (
                  <div key={person.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Link to={`/people/${person.id}`} aria-label={`View ${person.name}'s profile`}>
                        <Avatar src={person.avatar} name={person.name} size={44} rounded="rounded-full" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/people/${person.id}`} className="font-semibold text-primary hover:text-secondary hover:underline">{person.name}</Link>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{person.subtitle}</p>
                        <p className="mt-1 text-xs font-medium text-secondary">Shares {sharedInterests.join(', ')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={requested}
                      onClick={() => {
                        setRequestedProfiles((current) => [...current, person.id]);
                        showToast(`Connection request sent to ${person.name}`, 'person_add');
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-secondary px-3 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary-fixed disabled:cursor-default disabled:opacity-70"
                    >
                      <Icon name={requested ? 'check' : 'person_add'} className="!text-[15px]" />
                      {requested ? 'Request sent' : 'Connect'}
                    </button>
                  </div>
                );
              }) : <p className="py-4 text-sm text-on-surface-variant">Add interests to see people with shared academic interests.</p>}
            </div>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">Interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Topics you are exploring</p>
            {user.interests.length ? (
              <div className="mt-4 flex flex-wrap gap-2">{user.interests.map((interest) => <Tag key={interest} tone="blue">{interest}</Tag>)}</div>
            ) : (
              <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">No interests added yet. <button type="button" onClick={() => setEditing(true)} className="font-semibold text-secondary hover:underline">Add interests</button></p>
            )}
          </section>
          {user.purpose && <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">What brings me to Academix</h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{user.purpose}</p>
          </section>}
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">Profile details</h2>
            <dl className="mt-4 space-y-4">
              <div className="flex gap-3">
                <Icon name="school" className="text-secondary" />
                <div><dt className="text-xs text-on-surface-variant">Education</dt><dd className="mt-0.5 text-sm font-medium text-primary">{educationFor(user) || 'Not specified'}</dd></div>
              </div>
              <div className="flex gap-3">
                <Icon name="verified_user" className="text-secondary" />
                <div><dt className="text-xs text-on-surface-variant">Account status</dt><dd className="mt-0.5 text-sm font-medium text-primary">{user.verificationStatus === 'pending' ? 'Verification review pending' : user.verificationStatus === 'verified' ? 'Institution verified' : 'Unverified account'}</dd></div>
              </div>
            </dl>
          </section>
          <p className="px-2 text-xs leading-relaxed text-on-surface-variant">Academix profiles help students and educators find people with shared academic interests.</p>
        </aside>
      </div>
      {editing && <ProfileEditor user={user} onClose={() => setEditing(false)} />}
    </>
  );
}
