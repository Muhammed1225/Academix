import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import ConnectionRequestModal from '../components/ConnectionRequestModal';
import PostCard from '../components/PostCard';
import { Avatar, Icon, Tag, VerificationBadge } from '../components/ui';
import { people, posts } from '../data/mock';
import { useApp } from '../store';

export default function PersonProfilePage() {
  const { personId = '' } = useParams();
  const navigate = useNavigate();
  const person = Object.values(people).find((entry) => entry.id === personId);
  const showToast = useApp((s) => s.showToast);
  const openMiniChatForPerson = useApp((s) => s.openMiniChatForPerson);
  const [connectionRequested, setConnectionRequested] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>([]);

  if (!person) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-outline-variant/50 bg-white p-8 text-center">
        <Icon name="person_off" className="!text-5xl text-outline-variant" />
        <h1 className="mt-3 font-headline text-2xl font-semibold text-primary">Profile not found</h1>
        <p className="mt-2 text-sm text-on-surface-variant">We could not find this profile. It may have been removed or is no longer available.</p>
        <Link to="/" className="btn-primary mt-5">Return to feed</Link>
      </div>
    );
  }
  if (person.id === 'maya') return <Navigate to="/mentors/maya" replace />;

  const authoredPosts = posts.filter((post) => post.author.id === person.id && !post.auditNote);
  const recommendations = Object.values(people)
    .filter((candidate) => candidate.id !== person.id && candidate.id !== 'anon' && candidate.id !== 'anon-ivy')
    .map((candidate) => ({
      person: candidate,
      sharedInterests: candidate.interests?.filter((interest) => person.interests?.includes(interest)) ?? [],
    }))
    .filter(({ sharedInterests }) => sharedInterests.length > 0)
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length)
    .slice(0, 3);

  return (
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
              <Avatar
                src={person.avatar}
                name={person.name}
                size={112}
                rounded="rounded-2xl ring-4 ring-white shadow-float"
              />
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  disabled={connectionRequested}
                  onClick={() => setConnectionDialogOpen(true)}
                  className={connectionRequested ? 'btn-outline flex-1 sm:flex-none' : 'btn-primary flex-1 sm:flex-none'}
                >
                  <Icon name={connectionRequested ? 'check' : 'person_add'} />
                  {connectionRequested ? 'Pending' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const conversationId = openMiniChatForPerson(person);
                    navigate(`/inbox/${conversationId}`);
                  }}
                  className="btn-outline flex-1 sm:flex-none"
                >
                  <Icon name="mail" /> Messages
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-2xl font-semibold text-primary sm:text-3xl">{person.name}</h1>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant sm:text-base">{person.subtitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location_on" className="!text-[17px]" />
                  {person.location ?? 'Academic network'}
                </span>
                <span className="hidden text-outline-variant sm:inline">•</span>
                <span>{person.education ?? 'Academix community member'}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <VerificationBadge verification={person.verification} label={person.badge} />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-outline-variant/50 pt-4 text-sm text-on-surface-variant">
              <Icon name="dynamic_feed" className="text-secondary" />
              <span><strong className="text-primary">{authoredPosts.length}</strong> {authoredPosts.length === 1 ? 'public post' : 'public posts'}</span>
            </div>
          </div>
        </section>

        {person.about && (
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-xl font-semibold text-primary">About</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">{person.about}</p>
          </section>
        )}

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
            <div>
              <h2 className="font-headline text-xl font-semibold text-primary">Activity</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Posts shared with the Academix community</p>
            </div>
            <Tag tone="blue">{authoredPosts.length} {authoredPosts.length === 1 ? 'post' : 'posts'}</Tag>
          </div>
          <div className="mt-4 space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
            {authoredPosts.length > 0 ? authoredPosts.map((post) => <PostCard key={post.id} post={post} interactive={false} />) : (
              <div className="rounded-xl bg-surface-container-low p-6 text-center">
                <Icon name="edit_note" className="text-secondary" />
                <p className="mt-2 text-sm text-on-surface-variant">No public posts yet.</p>
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
            {recommendations.length ? recommendations.map(({ person: recommended, sharedInterests }) => {
              const requestSent = requestedProfiles.includes(recommended.id);
              return (
                <div key={recommended.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <Link to={`/people/${recommended.id}`} aria-label={`View ${recommended.name}'s profile`}>
                      <Avatar src={recommended.avatar} name={recommended.name} size={44} rounded="rounded-full" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/people/${recommended.id}`} className="font-semibold text-primary hover:text-secondary hover:underline">
                        {recommended.name}
                      </Link>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{recommended.subtitle}</p>
                      <p className="mt-1 text-xs font-medium text-secondary">
                        Shares {sharedInterests.join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={requestSent}
                    onClick={() => {
                      setRequestedProfiles((current) => [...current, recommended.id]);
                      showToast(`Connection request sent to ${recommended.name}`, 'person_add');
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-secondary px-3 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary-fixed disabled:cursor-default disabled:opacity-70"
                  >
                    <Icon name={requestSent ? 'check' : 'person_add'} className="!text-[15px]" />
                    {requestSent ? 'Request sent' : 'Connect'}
                  </button>
                </div>
              );
            }) : (
              <p className="py-4 text-sm text-on-surface-variant">
                Add interests to this profile to see people with shared academic interests.
              </p>
            )}
          </div>
        </section>
        {person.interests && person.interests.length > 0 && (
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">Interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Topics this member is exploring</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {person.interests.map((interest) => (
                <Tag key={interest} tone="blue">{interest}</Tag>
              ))}
            </div>
          </section>
        )}
        <section className="card p-5 sm:p-6">
          <h2 className="font-headline text-lg font-semibold text-primary">Profile details</h2>
          <dl className="mt-4 space-y-4">
            <div className="flex gap-3">
              <Icon name="school" className="text-secondary" />
              <div>
                <dt className="text-xs text-on-surface-variant">Education</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">{person.education ?? 'Not specified'}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Icon name="verified_user" className="text-secondary" />
              <div>
                <dt className="text-xs text-on-surface-variant">Account status</dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">{person.badge ?? 'Academix member'}</dd>
              </div>
            </div>
          </dl>
        </section>
        <p className="px-2 text-xs leading-relaxed text-on-surface-variant">
          Academix profiles help students and educators find people with shared academic interests.
        </p>
      </aside>
      <ConnectionRequestModal
        personId={person.id}
        personName={person.name}
        open={connectionDialogOpen}
        onClose={() => setConnectionDialogOpen(false)}
        onSent={() => {
          setConnectionDialogOpen(false);
          setConnectionRequested(true);
        }}
      />
    </div>
  );
}
