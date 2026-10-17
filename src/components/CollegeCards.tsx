import { useState } from 'react';

import type { Discussion, Mentor } from '../data/types';
import BookingModal from './BookingModal';
import { Avatar, Icon, Tag, cx } from './ui';

export function MentorCard({ mentor }: { mentor: Mentor }) {
  const [booking, setBooking] = useState(false);
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar src={mentor.avatar} name={mentor.name} size={56} verified />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex-1 font-semibold">{mentor.name}</span>
            <Icon name="star" fill className="!text-[17px] text-secondary" />
            <span className="text-sm font-semibold">{mentor.rating.toFixed(1)}</span>
            <span className="text-xs text-on-surface-variant">({mentor.reviews})</span>
          </div>
          <div className="text-sm text-secondary">{mentor.college}</div>
          <div className="text-xs text-on-surface-variant">{mentor.program}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {mentor.tags.map((t) => (
          <Tag key={t} tone="blue">
            {t}
          </Tag>
        ))}
      </div>
      <p className="mt-3 flex-1 text-sm text-on-surface">“{mentor.quote}”</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-container">
          <span className="h-2 w-2 rounded-full bg-on-tertiary-container" /> Response time: {mentor.responseTime}
        </span>
        <button type="button" onClick={() => setBooking(true)} className="btn-primary !h-9 !px-3 text-xs">
          Request 15-min Chat <Icon name="arrow_forward" className="!text-[16px]" />
        </button>
      </div>
      <BookingModal mentorName={mentor.name} open={booking} onClose={() => setBooking(false)} />
    </div>
  );
}

export function DiscussionCard({ discussion: d }: { discussion: Discussion }) {
  const [voted, setVoted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex gap-4 border-b border-outline-variant/50 py-5 last:border-0">
      <button
        type="button"
        onClick={() => setVoted((v) => !v)}
        className={cx(
          'flex h-fit w-14 shrink-0 flex-col items-center rounded-lg py-2 text-xs',
          voted ? 'bg-secondary-fixed text-secondary' : 'bg-surface-container-low text-on-surface-variant',
        )}
      >
        <Icon name="thumb_up" fill={voted} />
        <span className="mt-1 text-base font-bold text-on-surface">{d.votes + (voted ? 1 : 0)}</span>
        votes
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
          {d.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          <span>• {d.askedBy}</span>
        </div>
        <h3 className="mt-2 font-semibold text-primary">“{d.question}”</h3>
        <div className="mt-3 rounded-lg bg-surface-container-low p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Avatar name={d.answerer} size={26} rounded="rounded-full" />
            <span className="font-semibold">{d.answerer}</span>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-on-tertiary-container">
              <Icon name="check_circle" className="!text-[14px]" /> {d.answererRole}
            </span>
            <span className="text-xs text-on-surface-variant">{d.answeredAgo}</span>
          </div>
          <p className={cx('mt-2 text-sm leading-relaxed text-on-surface', !expanded && 'line-clamp-3')}>{d.answer}</p>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-semibold text-secondary">
            {expanded ? 'Show less' : 'Read full answer'}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Icon name="mode_comment" className="!text-[15px]" /> {d.answers} answers
          </span>
          <span className="font-semibold text-on-tertiary-container">{d.accuracy}% felt this answer was accurate</span>
        </div>
      </div>
    </div>
  );
}
