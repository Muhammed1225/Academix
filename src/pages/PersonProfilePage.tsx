import { Navigate, useParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Avatar, Icon, VerificationBadge } from '../components/ui';
import { people, posts } from '../data/mock';

export default function PersonProfilePage() {
  const { personId = '' } = useParams();
  const person = Object.values(people).find((entry) => entry.id === personId);

  if (!person) return <Navigate to="/" replace />;
  if (person.id === 'maya') return <Navigate to="/mentors/maya" replace />;

  const authoredPosts = posts.filter((post) => post.author.id === person.id && !post.auditNote);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar src={person.avatar} name={person.name} size={72} />
          <div className="min-w-0">
            <h1 className="font-headline text-2xl font-semibold text-primary">{person.name}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{person.subtitle}</p>
            <VerificationBadge verification={person.verification} label={person.badge} />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 border-t border-outline-variant/50 pt-4 text-sm text-on-surface-variant">
          <Icon name="dynamic_feed" className="text-secondary" />
          {authoredPosts.length} {authoredPosts.length === 1 ? 'public post' : 'public posts'}
        </div>
      </section>
      {authoredPosts.length > 0 ? authoredPosts.map((post) => <PostCard key={post.id} post={post} interactive={false} />) : (
        <div className="card p-6 text-center text-sm text-on-surface-variant">No public posts yet.</div>
      )}
    </div>
  );
}
