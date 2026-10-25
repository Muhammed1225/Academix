import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Avatar, Icon, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import { defaultInterestEmoji, interestEmojis, interests as signupInterests } from '../data/interestOptions';
import type { ConnectionRole } from '../data/types';
import { useApp } from '../store';

const connections = colleges.flatMap((college) =>
  college.mentors.map((mentor) => ({ college, mentor })),
);
const initialPreferences = ['15-122 Rigor', 'SCS Supplemental Essay'];
const interestsPerPage = 12;
const connectionRoles: Record<ConnectionRole, { label: string; icon: string }> = {
  prospective: { label: 'Prospective student', icon: 'person_search' },
  scholar: { label: 'Student / Scholar', icon: 'school' },
  faculty: { label: 'Faculty representative', icon: 'account_balance' },
};
const connectionRoleIds: ConnectionRole[] = ['prospective', 'scholar', 'faculty'];

export default function ConnectionsPage() {
  const showToast = useApp((s) => s.showToast);
  const [searchParams] = useSearchParams();
  const [preferences, setPreferences] = useState(() => searchParams.has('university') ? [] : initialPreferences);
  const [selectedRoles, setSelectedRoles] = useState<ConnectionRole[]>([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [visibleInterestCount, setVisibleInterestCount] = useState(interestsPerPage);
  const [requested, setRequested] = useState<string[]>([]);
  const university = colleges.find((college) => college.id === searchParams.get('university'));
  const affiliatedConnections = university
    ? connections.filter(({ college }) => college.id === university.id)
    : connections;
  const filteredInterests = signupInterests.filter((interest) =>
    interest.toLocaleLowerCase().includes(interestSearch.trim().toLocaleLowerCase()),
  );
  const visibleInterests = filteredInterests.slice(0, visibleInterestCount);

  const recommendations = affiliatedConnections
    .filter(({ mentor }) => !selectedRoles.length || selectedRoles.includes(mentor.role))
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

  const toggleRole = (role: ConnectionRole) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
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
        <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">
          {university ? `Connect with ${university.shortName} Students & Alumni` : 'Make Connections'}
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          {university
            ? `Browse students and mentors affiliated with ${university.name}. Choose topics to find people with shared interests.`
            : 'Choose the topics you care about to find students and mentors with shared interests. Recommendations update as you change your preferences.'}
        </p>
      </header>

      <section className="card p-5 sm:p-6" aria-labelledby="roles-heading">
        <div className="text-center">
          <h2 id="roles-heading" className="font-semibold text-primary">Connect with</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Choose one or more roles to filter people. Leave them unselected to see everyone.</p>
        </div>
        <div role="group" aria-label="Filter by role" className="mx-auto mt-4 grid max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-3">
          {connectionRoleIds.map((id) => {
            const { label, icon } = connectionRoles[id];
            const selected = selectedRoles.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleRole(id)}
                className={cx(
                  'flex min-h-[4.5rem] items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                  selected
                    ? 'border-secondary bg-secondary-fixed text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <Icon name={icon} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="interests-heading">
        <div className="grid items-center gap-3 text-center sm:grid-cols-3">
          <div className="sm:col-start-2">
            <h2 id="interests-heading" className="font-semibold text-primary">Your interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Select one or more topics to personalize your list.</p>
          </div>
          <label className="relative sm:col-start-3 sm:row-start-1 sm:justify-self-end">
            <span className="sr-only">Search interests</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant" />
            <input
              type="search"
              value={interestSearch}
              onChange={(event) => {
                setInterestSearch(event.target.value);
                setVisibleInterestCount(interestsPerPage);
              }}
              placeholder="Search interests"
              className="input !py-2 pl-9 text-sm sm:w-56"
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleInterests.map((interest) => {
            const selected = preferences.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePreference(interest)}
                className={cx(
                  'flex min-h-10 w-full items-center justify-center rounded-full border px-3 py-1.5 text-center text-sm font-medium transition',
                  selected
                    ? 'border-secondary bg-secondary-fixed text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <span aria-hidden="true">{interestEmojis[interest] ?? defaultInterestEmoji}</span>
                {interest}
              </button>
            );
          })}
        </div>
        {!filteredInterests.length && (
          <p className="mt-4 text-center text-sm text-on-surface-variant">No interests match “{interestSearch}”.</p>
        )}
        <div className="mt-4 grid grid-cols-3 items-center">
          <span />
          {visibleInterestCount < filteredInterests.length ? (
            <button
              type="button"
              className="text-center text-sm font-semibold text-secondary hover:underline"
              onClick={() => setVisibleInterestCount((count) => count + interestsPerPage)}
            >
              <Icon name="keyboard_arrow_down" className="align-middle" />
              Show more interests
            </button>
          ) : <span />}
          <button type="button" className="text-right text-sm font-semibold text-secondary hover:underline" onClick={() => setPreferences([])}>
            Clear preferences
          </button>
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
                        <Tag tone="green">{connectionRoles[mentor.role].label}</Tag>
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
            <p className="mt-2 font-semibold text-primary">No matches for those filters yet</p>
            <p className="mt-1 text-sm text-on-surface-variant">Try selecting different roles or topics, or clear your preferences to browse everyone.</p>
          </div>
        )}
      </section>
    </div>
  );
}
