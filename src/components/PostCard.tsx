import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { currentUser } from '../data/mock';
import type { Post } from '../data/types';
import { useApp } from '../store';
import RichText from './RichText';
import { Avatar, Icon, PersonAvatar, VerificationBadge, cx } from './ui';

function FlaggedClaim({ post }: { post: Post }) {
  const showToast = useApp((s) => s.showToast);
  return (
    <article className="card overflow-hidden border-l-4 !border-l-error p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-outline">
          <Icon name="person_off" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{post.author.name}</span>
            <VerificationBadge verification="unverified" />
          </div>
          <p className="text-xs text-on-surface-variant">{post.author.subtitle}</p>
        </div>
        <span className="text-xs font-semibold text-error">Community Audit Active</span>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-on-surface">{post.body}</p>
      {post.auditNote && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-error-container/60 px-4 py-3 text-sm text-on-error-container">
          <Icon name="gavel" className="text-error" />
          <span className="flex-1">{post.auditNote}</span>
          <button type="button" className="font-semibold text-error hover:underline" onClick={() => showToast('Counter-proof request sent to auditors', 'gavel')}>
            Submit Counter-Proof
          </button>
        </div>
      )}
    </article>
  );
}

export default function PostCard({ post, interactive = true }: { post: Post; interactive?: boolean }) {
  const vote = useApp((s) => s.vote);
  const toggleBookmark = useApp((s) => s.toggleBookmark);
  const addComment = useApp((s) => s.addComment);
  const showToast = useApp((s) => s.showToast);
  const [threadOpen, setThreadOpen] = useState(false);
  const [draft, setDraft] = useState('');

  if (post.auditNote) return <FlaggedClaim post={post} />;

  const latest = post.comments[post.comments.length - 1];
  const visibleComments = threadOpen ? post.comments : latest ? [latest] : [];

  const submitComment = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment(post.id, draft.trim());
    setDraft('');
    setThreadOpen(true);
  };

  const authorHeader = (
    <div className="flex items-start gap-3">
      <PersonAvatar person={post.author} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-on-surface">{post.author.name}</span>
          <VerificationBadge verification={post.author.verification} label={post.author.badge} />
        </div>
        <p className="truncate text-xs text-on-surface-variant">{post.author.subtitle}</p>
      </div>
      <span className="shrink-0 text-xs text-on-surface-variant">{post.timeAgo}</span>
    </div>
  );

  return (
    <article className="card overflow-hidden">
      <div className="px-5 pt-5">
        {post.author.id === 'maya' ? (
          <Link to="/mentors/maya" className="block rounded-lg hover:opacity-90">
            {authorHeader}
          </Link>
        ) : (
          authorHeader
        )}
        {post.title && <h3 className="mt-4 font-headline text-xl font-semibold leading-snug text-primary">{post.title}</h3>}
        <RichText text={post.body} className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-on-surface-variant" />

        {post.image && (
          <img
            src={post.image.src}
            alt={post.image.fileName}
            loading="lazy"
            className="mt-4 max-h-[32rem] w-full rounded-lg bg-surface-container-low object-contain"
          />
        )}

        {post.insight && (
          <div className="mt-4 flex gap-2.5 rounded-lg border border-secondary-fixed bg-surface-container-low px-4 py-3 text-sm text-on-surface">
            <Icon name="lightbulb" className="text-secondary" />
            <p>
              <span className="font-semibold">Admissions Rubric Insight: </span>
              {post.insight}
            </p>
          </div>
        )}

        {post.attachment && (
          <button
            type="button"
            onClick={() => showToast(`Opening ${post.attachment!.fileName}`, 'description')}
            className="mt-4 flex w-full items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-left hover:bg-surface-container"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
              <Icon name="description" className="text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{post.attachment.fileName}</span>
              <span className="block text-xs text-on-surface-variant">{post.attachment.meta}</span>
            </span>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-secondary">View</span>
          </button>
        )}
      </div>

      <div className="mx-5 mt-4 flex items-center gap-1 border-t border-outline-variant/50 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!interactive}
            onClick={() => vote(post.id, 1)}
            className={cx('btn-ghost !h-9 !gap-1.5 !px-2.5', post.myVote === 1 && '!bg-secondary-fixed !text-secondary')}
            aria-label={`Like post (${post.likes})`}
            aria-pressed={post.myVote === 1}
          >
            <Icon name="thumb_up" fill={post.myVote === 1} />
            <span>Like</span>
            <span className="tabular-nums">{post.likes}</span>
          </button>
          <button
            type="button"
            disabled={!interactive}
            onClick={() => vote(post.id, -1)}
            className={cx('btn-ghost !h-9 !gap-1.5 !px-2.5', post.myVote === -1 && '!bg-error-container !text-error')}
            aria-label={`Dislike post (${post.dislikes})`}
            aria-pressed={post.myVote === -1}
          >
            <Icon name="thumb_down" fill={post.myVote === -1} />
            <span>Dislike</span>
            <span className="tabular-nums">{post.dislikes}</span>
          </button>
        </div>
        <button type="button" disabled={!interactive} onClick={() => setThreadOpen((v) => !v)} className="btn-ghost !h-9 !px-3">
          <Icon name="mode_comment" />
          {post.commentCount} Comments
        </button>
        <button
          type="button"
          disabled={!interactive}
          onClick={() => {
            toggleBookmark(post.id);
            showToast(post.bookmarked ? 'Removed from saved' : 'Saved to your library', 'bookmark');
          }}
          className={cx('btn-ghost !h-9 !px-2.5', post.bookmarked && '!text-secondary')}
          aria-label="Bookmark"
        >
          <Icon name={post.bookmarked ? 'bookmark' : 'bookmark_border'} fill={post.bookmarked} />
        </button>
        <div className="flex-1" />
        {post.author.id === 'maya' && post.tabs.length > 0 ? (
          <Link to="/mentors/maya" className="hidden items-center gap-1 text-sm font-semibold text-secondary hover:underline sm:inline-flex">
            View Maya's Profile <Icon name="arrow_forward" />
          </Link>
        ) : (
          <button type="button" onClick={() => showToast('Link copied to clipboard', 'link')} className="btn-ghost !h-9 !px-3">
            <Icon name="share" /> <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>

      {interactive && (visibleComments.length > 0 || threadOpen) && (
        <div className="space-y-4 bg-surface-container-low/60 px-5 py-4">
          {visibleComments.map((c, i) => (
            <div key={i} className="flex gap-3">
              <Link to={`/people/${c.author.id}`} className="shrink-0 rounded-lg hover:opacity-80" aria-label={`View ${c.author.name}'s profile`}>
                <Avatar src={c.author.avatar} name={c.author.name} size={32} rounded="rounded-lg" />
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <div>
                  <Link to={`/people/${c.author.id}`} className="font-semibold text-on-surface hover:text-secondary hover:underline">
                    {c.author.name}
                  </Link>{' '}
                  <span className="text-xs text-on-surface-variant">
                    ({c.author.verification === 'edu' ? 'Verified CMU Scholar' : 'Prospective Scholar'}) • {c.timeAgo}
                  </span>
                </div>
                <p className="mt-0.5 text-on-surface">{c.text}</p>
              </div>
            </div>
          ))}
          {!threadOpen && post.commentCount > 1 && (
            <button type="button" onClick={() => setThreadOpen(true)} className="text-xs font-semibold text-secondary hover:underline">
              View all comments ({post.commentCount})
            </button>
          )}
          {threadOpen && (
            <form onSubmit={submitComment} className="flex items-center gap-2">
              <Avatar src={currentUser.avatar} name={currentUser.name} size={32} rounded="rounded-lg" />
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a verified response..." className="input !bg-white" />
              <button type="submit" className="btn-primary !h-9">
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
