import { Link, useSearchParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import { Icon, Tag } from '../components/ui';
import { colleges } from '../data/mock';
import { useApp } from '../store';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const q = query.toLowerCase();
  const posts = useApp((s) => s.posts);
  const university = colleges.find((college) => college.id === params.get('university'));

  const matches = (text: string) => !q || text.toLowerCase().includes(q);
  const postHits = posts.filter((post) =>
    university
      ? post.universityId === university.id
      : matches(`${post.title ?? ''} ${post.body} ${post.author.name}`),
  );
  const collegeHits = colleges.filter((c) => matches(`${c.name} ${c.shortName} ${c.location}`));
  const majorHits = colleges.flatMap((c) => c.majors.filter((m) => matches(`${m.name} ${m.school} ${m.summary}`)).map((m) => ({ college: c, major: m })));
  const mentorHits = colleges.flatMap((c) => c.mentors.filter((m) => matches(`${m.name} ${m.program} ${m.tags.join(' ')}`)));
  const total = university ? postHits.length : postHits.length + collegeHits.length + majorHits.length + mentorHits.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-semibold text-primary">
          {university ? `Posts about ${university.shortName}` : query ? `Results for “${query}”` : 'Search'}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {university ? `${total} posts tagged with ${university.name}.` : `${total} matches across colleges, majors, mentors, and dispatches.`}
        </p>
      </div>

      {!university && collegeHits.length + majorHits.length + mentorHits.length > 0 && (
        <div className="card divide-y divide-outline-variant/40">
          {collegeHits.map((c) => (
            <Link key={c.id} to={`/colleges/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-container-low">
              <Icon name="account_balance" className="text-secondary" />
              <span className="flex-1 font-semibold">{c.name}</span>
              <Tag>University</Tag>
            </Link>
          ))}
          {majorHits.map(({ college, major }) => (
            <Link key={major.id} to={`/colleges/${college.id}/majors/${major.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-container-low">
              <Icon name="school" className="text-secondary" />
              <span className="flex-1">
                <span className="block font-semibold">{major.name}</span>
                <span className="block text-xs text-on-surface-variant">{college.name}</span>
              </span>
              <Tag tone="blue">Major</Tag>
            </Link>
          ))}
          {mentorHits.map((m) => (
            <Link key={m.id} to="/colleges/cmu" className="flex items-center gap-3 p-4 hover:bg-surface-container-low">
              <img src={m.avatar} alt="" className="h-8 w-8 rounded-lg object-cover" />
              <span className="flex-1">
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-xs text-on-surface-variant">{m.program}</span>
              </span>
              <Tag tone="green">Mentor</Tag>
            </Link>
          ))}
        </div>
      )}

      {postHits.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {total === 0 && (
        <div className="card p-10 text-center text-on-surface-variant">
          {university ? `No posts have been shared about ${university.name} yet.` : 'Nothing matched your search. Try a university, major, or course number.'}
        </div>
      )}
    </div>
  );
}
