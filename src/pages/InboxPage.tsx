import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Avatar, Icon, Tag, cx } from '../components/ui';
import type { Ticket } from '../data/types';
import { useApp } from '../store';

function TicketThread({ ticket }: { ticket: Ticket }) {
  const reply = useApp((s) => s.reply);
  const toggleResolved = useApp((s) => s.toggleResolved);
  const showToast = useApp((s) => s.showToast);
  const user = useApp((s) => s.user);
  const [draft, setDraft] = useState(ticket.suggestedReply ?? '');

  useEffect(() => {
    setDraft(ticket.suggestedReply ?? '');
  }, [ticket.id, ticket.suggestedReply]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    reply(ticket.id, draft.trim());
    setDraft('');
    showToast('Critique sent', 'send');
  };

  return (
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="flex flex-wrap items-start gap-3 border-b border-outline-variant/50 p-5">
        <Link to="/inbox" className="rounded-full p-1.5 hover:bg-surface-container-low md:hidden" aria-label="Back to inbox">
          <Icon name="arrow_back" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-xl font-semibold text-primary">{ticket.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            <Tag tone={ticket.resolved ? 'green' : 'blue'}>{ticket.resolved ? 'Resolved' : 'Active Ticket'}</Tag>
            Submitted by {ticket.from} • {ticket.fromMeta}
          </div>
        </div>
        <button
          type="button"
          className={ticket.resolved ? 'btn-outline' : 'btn-primary'}
          onClick={() => {
            toggleResolved(ticket.id);
            showToast(ticket.resolved ? 'Ticket reopened' : 'Ticket marked as resolved', 'task_alt');
          }}
        >
          <Icon name={ticket.resolved ? 'undo' : 'task_alt'} /> {ticket.resolved ? 'Reopen' : 'Mark Resolved'}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-surface p-5">
        {ticket.messages.map((m, i) => (
          <div key={i} className={cx('flex gap-3', m.isMe && 'flex-row-reverse')}>
            <Avatar src={m.isMe ? user?.photo || undefined : undefined} name={m.author} size={36} rounded="rounded-full" />
            <div className={cx('max-w-[80%] rounded-2xl p-4', m.isMe ? 'rounded-tr-md bg-secondary-fixed' : 'rounded-tl-md border border-outline-variant/50 bg-white')}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{m.author}</span>
                <span className="text-xs text-on-surface-variant">{m.time}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-on-surface">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      {!ticket.resolved && (
        <form onSubmit={send} className="border-t border-outline-variant/50 p-4">
          {ticket.suggestedReply && draft === ticket.suggestedReply && (
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">{user?.name ?? 'You'} • Drafted 2m ago</p>
          )}
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Write your critique..." className="input resize-none" />
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={() => showToast('Attachments are not connected yet', 'attach_file')} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Attach file">
              <Icon name="attach_file" />
            </button>
            <button type="button" onClick={() => showToast('Voice notes are not connected yet', 'mic')} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Record voice note">
              <Icon name="mic" />
            </button>
            <div className="flex-1" />
            <button type="submit" disabled={!draft.trim()} className="btn-primary">
              <Icon name="send" /> Send Critique
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function InboxPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const tickets = useApp((s) => s.tickets);
  const markRead = useApp((s) => s.markRead);
  const active = tickets.find((t) => t.id === ticketId);
  const openCount = tickets.filter((t) => !t.resolved).length;

  useEffect(() => {
    if (active?.unread) markRead(active.id);
  }, [active, markRead]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-semibold text-primary">Messages</h1>
        <p className="mt-1 text-on-surface-variant">Your mentorship conversations and pending supplemental essay feedback.</p>
      </div>
      <div className="card grid overflow-hidden md:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={cx('border-r border-outline-variant/50', active && 'hidden md:block')}>
          <div className="border-b border-outline-variant/50 px-5 py-3">
            <Tag tone="blue" icon="inbox">
              {openCount} Active Inquiry Tickets
            </Tag>
          </div>
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/inbox/${t.id}`)}
              className={cx(
                'block w-full border-b border-outline-variant/40 px-5 py-4 text-left transition',
                t.id === ticketId ? 'bg-secondary-fixed/50' : 'hover:bg-surface-container-low',
              )}
            >
              <div className="flex items-center gap-2">
                <Tag tone={t.resolved ? 'green' : 'blue'}>{t.resolved ? 'Resolved' : t.category}</Tag>
                <span className="flex-1" />
                {t.unread && !t.resolved && <span className="h-2 w-2 rounded-full bg-secondary" />}
                <span className="text-xs text-on-surface-variant">{t.timeAgo}</span>
              </div>
              <div className={cx('mt-2 text-sm', t.unread && !t.resolved ? 'font-bold' : 'font-semibold')}>{t.title}</div>
              <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">"{t.preview}"</p>
              <p className="mt-1.5 text-xs font-semibold text-on-surface-variant">
                From: {t.from} • {t.fromMeta}
              </p>
            </button>
          ))}
        </aside>
        <section className={cx(!active && 'hidden md:block')}>
          {active ? (
            <TicketThread ticket={active} />
          ) : (
            <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 p-10 text-center text-on-surface-variant">
              <Icon name="forum" className="!text-5xl text-outline-variant" />
              <p className="font-semibold text-on-surface">Select a ticket</p>
              <p className="text-sm">Pick an inquiry on the left to read the thread and send your critique.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
