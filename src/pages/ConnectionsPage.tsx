import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, Icon, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import { useApp } from '../store';

const connections = colleges.flatMap((college) =>
  college.mentors.map((mentor) => ({ college, mentor })),
);
const interests = [...new Set(connections.flatMap(({ mentor }) => mentor.tags))].sort();
const initialPreferences = ['15-122 Rigor', 'SCS Supplemental Essay'];

export default function ConnectionsPage() {
  const showToast = useApp((s) => s.showToast);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [requested, setRequested] = useState<string[]>([]);

  const recommendations = connections
    .filter(({ mentor }) => !preferences.length || mentor.tags.some((tag) => preferences.includes(tag)))
    .sort(
      (a, b) =>
        b.mentor.tags.filter((tag) => preferences.includes(tag)).length -
        a.mentor.tags.filter((tag) => preferences.includes(tag)).length,
    );

  const togglePreference = (interest: string) => {
    setPreferences((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  };

  const requestConnection = (id: string, name: string) => {
    setRequested((current) => (current.includes(id) ? current : [...current, id]));
    showToast(`Connection request sent to ${name}`, 'person_add');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow text-secondary">Your academic network</p>
        <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">Make Connections</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Choose the topics you care about to find students and mentors with shared interests.
          Recommendations update as you change your preferences.
        </p>
      </header>

      <section className="card p-5 sm:p-6" aria-labelledby="interests-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="interests-heading" className="font-semibold text-primary">Your interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Select one or more topics to personalize your list.</p>
          </div>
          <button type="button" className="text-sm font-semibold text-secondary hover:underline" onClick={() => setPreferences([])}>
            Clear preferences
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {interests.map((interest) => {
            const selected = preferences.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePreference(interest)}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  selected
                    ? 'border-secondary bg-secondary-fixed text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recommendations-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recommendations-heading" className="font-headline text-xl font-semibold text-primary">
              People you may like to meet
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
              {preferences.length ? ' matching your interests' : ' across the community'}
            </p>
          </div>
        </div>
        {recommendations.length ? (
          <div className="space-y-3">
            {recommendations.map(({ college, mentor }) => {
              const sharedInterests = mentor.tags.filter((tag) => preferences.includes(tag));
              const hasRequested = requested.includes(mentor.id);
              return (
                <article key={mentor.id} className="card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar src={mentor.avatar} name={mentor.name} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-primary">{mentor.name}</h3>
                        <Tag tone="green">Mentor</Tag>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">{mentor.program}</p>
                      <p className="text-sm text-on-surface-variant">{college.name}</p>
                      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{mentor.quote}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(sharedInterests.length ? sharedInterests : mentor.tags).map((tag) => (
                          <Tag key={tag} tone={sharedInterests.includes(tag) ? 'blue' : 'neutral'}>{tag}</Tag>
                        ))}
                      </div>
                      <p className="mt-3 flex items-center gap-1 text-xs text-on-surface-variant">
                        <Icon name="star" fill className="!text-[15px] text-gold" />
                        {mentor.rating.toFixed(1)} · {mentor.reviews} reviews
                        <span className="mx-1">·</span>
                        Usually responds {mentor.responseTime}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <button
                        type="button"
                        disabled={hasRequested}
                        onClick={() => requestConnection(mentor.id, mentor.name)}
                        className={hasRequested ? 'btn-outline !text-on-surface-variant' : 'btn-primary'}
                      >
                        <Icon name={hasRequested ? 'check' : 'person_add'} />
                        {hasRequested ? 'Request sent' : 'Connect'}
                      </button>
                      <Link to={`/colleges/${college.id}`} className="btn-ghost justify-center">
                        View college
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <Icon name="person_search" className="text-secondary" />
            <p className="mt-2 font-semibold text-primary">No matches for those interests yet</p>
            <p className="mt-1 text-sm text-on-surface-variant">Try selecting different topics or clear your preferences to browse everyone.</p>
          </div>
        )}
      </section>
    </div>
  );
}
