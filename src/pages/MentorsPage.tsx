import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Avatar, Icon, Tag } from '../components/ui';
import { mentorDirectory } from '../data/mentors';
import { useApp } from '../store';

const normalize = (value: string) => value.toLocaleLowerCase().trim();

export default function MentorsPage() {
  const [query, setQuery] = useState('');
  const openMiniChatForPerson = useApp((state) => state.openMiniChatForPerson);
  const navigate = useNavigate();
  const mentors = useMemo(() => {
    const search = normalize(query);
    return mentorDirectory.filter((mentor) =>
      [mentor.name, mentor.university, mentor.field].some((value) => normalize(value ?? '').includes(search)),
    );
  }, [query]);

  const messageMentor = (mentor: (typeof mentorDirectory)[number]) => {
    openMiniChatForPerson({
      id: mentor.id,
      name: mentor.name,
      subtitle: `${mentor.field} • ${mentor.university}`,
      ...(mentor.avatar ? { avatar: mentor.avatar } : {}),
    });
    const ticket = useApp.getState().tickets.find((item) =>
      item.contactId === mentor.id || item.id === `direct-${mentor.id}`,
    );
    if (ticket) navigate(`/inbox/${ticket.id}`);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-secondary">Academix Network</p>
        <h1 className="mt-1 font-headline text-3xl font-semibold text-primary sm:text-4xl">Verified Mentors</h1>
        <p className="mt-2 text-on-surface-variant">Connect with verified mentors from universities across the platform.</p>
      </header>

      <label className="relative block w-full sm:max-w-lg">
        <span className="sr-only">Search mentors</span>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search mentors..."
          className="input rounded-full pl-10"
        />
      </label>

      {mentors.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mentors.map((mentor) => (
            <article key={`${mentor.id}-${mentor.university}`} className="group card flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-float">
              <div className="flex items-center gap-3">
                <Avatar src={mentor.avatar || undefined} name={mentor.name || 'Mentor'} size={56} rounded="rounded-full" />
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-primary">{mentor.name || 'Verified mentor'}</h2>
                  {mentor.verified && <Tag tone="green" icon="verified">Verified</Tag>}
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-on-surface">{mentor.university || 'University not listed'}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{mentor.field || 'Academic mentor'}</p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-on-surface-variant">{mentor.bio || 'A verified mentor ready to share their academic experience.'}</p>
              <div className="mt-5 flex flex-wrap gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:!opacity-100">
                <Link to={`/mentors/${mentor.id}`} className="btn-outline min-h-10 flex-1 !px-3 text-xs">View Profile</Link>
                <button type="button" onClick={() => messageMentor(mentor)} className="btn-primary min-h-10 flex-1 !px-3 text-xs">Message</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-sm text-on-surface-variant">No mentors found.</div>
      )}
    </div>
  );
}
