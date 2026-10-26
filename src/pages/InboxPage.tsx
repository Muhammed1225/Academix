import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import UserAvatar from '../components/UserAvatar';
import { Icon, Tag, cx } from '../components/ui';
import { displayName } from '../data/userIdentity';
import type { Ticket } from '../data/types';
import { useApp } from '../store';

function accountRole(role?: string) {
  if (role === 'faculty') return 'Faculty';
  if (role === 'scholar') return 'Student';
  return 'Applicant';
}

function TicketThread({ ticket }: { ticket: Ticket }) {
  const reply = useApp((s) => s.reply);
  const toggleResolved = useApp((s) => s.toggleResolved);
  const showToast = useApp((s) => s.showToast);
  const user = useApp((s) => s.user);
  const ownName = displayName(user?.name, user?.email);
  const contactName = displayName(ticket.from);
  const [draft, setDraft] = useState(ticket.suggestedReply ?? '');
  const directMessage = ticket.category === 'Direct message';
  const contactHref = ticket.contactId ? `/people/${ticket.contactId}` : undefined;
  const messagePerson = ticket.contactId ? {
    id: ticket.contactId,
    name: contactName,
    subtitle: ticket.contactProfileSubtitle ?? ticket.fromMeta,
    ...(ticket.contactAvatar ? { avatar: ticket.contactAvatar } : {}),
  } : undefined;

  useEffect(() => {
    setDraft(ticket.suggestedReply ?? '');
  }, [ticket.id, ticket.suggestedReply]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    reply(ticket.id, draft.trim());
    setDraft('');
    showToast(directMessage ? 'Message sent' : 'Critique sent', 'send');
  };

  return (
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/50 p-5">
        <Link to="/inbox" className="rounded-full p-1.5 hover:bg-surface-container-low md:hidden" aria-label="Back to inbox">
          <Icon name="arrow_back" />
        </Link>
        <div className="min-w-0 flex-1">
          <UserAvatar
            src={ticket.contactAvatar}
            name={contactName}
            size={48}
            showStatus
            profileHref={contactHref}
            subtitle={ticket.fromMeta}
            profileSubtitle={ticket.contactProfileSubtitle}
            role={ticket.contactRole}
            messagePerson={messagePerson}
            showName
            nameClassName="text-base"
            className="max-w-full"
          />
          <p className="truncate text-sm font-medium text-on-surface-variant">{ticket.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            {!directMessage && <Tag tone={ticket.resolved ? 'green' : 'blue'}>{ticket.resolved ? 'Resolved' : 'Active Ticket'}</Tag>}
          </div>
        </div>
        {!directMessage && <button
          type="button"
          className={ticket.resolved ? 'btn-outline' : 'btn-primary'}
          onClick={() => {
            toggleResolved(ticket.id);
            showToast(ticket.resolved ? 'Ticket reopened' : 'Ticket marked as resolved', 'task_alt');
          }}
        >
          <Icon name={ticket.resolved ? 'undo' : 'task_alt'} /> {ticket.resolved ? 'Reopen' : 'Mark Resolved'}
        </button>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-surface p-5">
        {ticket.messages.map((m, i) => {
          const firstInGroup = i === 0 || ticket.messages[i - 1].isMe !== m.isMe;
          const senderName = m.isMe ? ownName : contactName;
          const senderHref = m.isMe ? '/profile' : contactHref;
          const senderRole = m.isMe ? accountRole(user?.role) : ticket.contactRole;
          return (
            <div key={`${ticket.id}-${i}`} className={cx('flex items-start gap-3', m.isMe && 'flex-row-reverse')}>
              {firstInGroup ? (
                <UserAvatar
                  src={m.isMe ? user?.photo || undefined : ticket.contactAvatar}
                  name={senderName}
                  size={36}
                  profileHref={senderHref}
                  subtitle={m.isMe
                    ? [user?.major, user?.university].filter(Boolean).join(' • ') || 'Academix community member'
                    : ticket.fromMeta}
                  profileSubtitle={m.isMe ? undefined : ticket.contactProfileSubtitle}
                  role={senderRole}
                  messagePerson={m.isMe ? undefined : messagePerson}
                  showName
                  nameClassName="max-w-[90px] text-xs"
                  className="w-[36%] max-w-[170px] shrink-0 items-start"
                />
              ) : <span aria-hidden="true" className="w-[36%] max-w-[170px] shrink-0" />}
              <div className={cx('min-w-0 flex-1 rounded-2xl p-4', m.isMe ? 'rounded-tr-md bg-secondary-fixed' : 'rounded-tl-md border border-outline-variant/50 bg-white')}>
                <div className="flex flex-wrap items-center gap-2">
                  {senderRole && <Tag tone="neutral" className="!px-1.5 !py-0 text-[10px]">{senderRole}</Tag>}
                  <span className="ml-auto text-xs text-on-surface-variant">{m.time}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface">{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {!ticket.resolved && (
        <form onSubmit={send} className="border-t border-outline-variant/50 p-4">
          {ticket.suggestedReply && draft === ticket.suggestedReply && (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <UserAvatar
                src={user?.photo || undefined}
                name={ownName}
                email={user?.email}
                size={32}
                profileHref="/profile"
                subtitle={[user?.major, user?.university].filter(Boolean).join(' • ') || 'Academix community member'}
                role={accountRole(user?.role)}
                showName
                nameClassName="text-xs"
                trailing={<Tag tone="neutral" className="text-[10px]">{accountRole(user?.role)}</Tag>}
              />
              <span>Drafted 2m ago</span>
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={directMessage ? 'Write a message...' : 'Write your critique...'}
            className="input resize-none"
          />
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={() => showToast('Attachments are not connected yet', 'attach_file')} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Attach file">
              <Icon name="attach_file" />
            </button>
            <button type="button" onClick={() => showToast('Voice notes are not connected yet', 'mic')} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Record voice note">
              <Icon name="mic" />
            </button>
            <div className="flex-1" />
            <button type="submit" disabled={!draft.trim()} className="btn-primary">
              <Icon name="send" /> {directMessage ? 'Send' : 'Send Critique'}
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
  const setMiniChatTicketId = useApp((s) => s.setMiniChatTicketId);
  const miniChatTicketId = useApp((s) => s.miniChatTicketId);
  const activeId = ticketId ?? miniChatTicketId;
  const active = tickets.find((t) => t.id === activeId);
  const openCount = tickets.filter((t) => !t.resolved && t.category !== 'Direct message').length;

  useEffect(() => {
    if (!active) return;
    const markFocusedConversationRead = () => {
      if (active.unread && document.visibilityState === 'visible' && document.hasFocus()) {
        markRead(active.id);
      }
    };
    markFocusedConversationRead();
    window.addEventListener('focus', markFocusedConversationRead);
    document.addEventListener('visibilitychange', markFocusedConversationRead);
    return () => {
      window.removeEventListener('focus', markFocusedConversationRead);
      document.removeEventListener('visibilitychange', markFocusedConversationRead);
    };
  }, [active, markRead]);

  useEffect(() => {
    if (active) setMiniChatTicketId(active.id);
  }, [active?.id, setMiniChatTicketId]);

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
            <div
              key={t.id}
              className={cx(
                'flex items-start gap-3 border-b border-outline-variant/40 px-5 py-4 transition',
                t.id === activeId ? 'bg-secondary-fixed/50' : 'hover:bg-surface-container-low',
              )}
            >
              <div className="min-w-0 flex-1">
                <UserAvatar
                  src={t.contactAvatar}
                  name={displayName(t.from)}
                  size={40}
                  showStatus
                  profileHref={t.contactId ? `/people/${t.contactId}` : undefined}
                  subtitle={t.fromMeta}
                  profileSubtitle={t.contactProfileSubtitle}
                  role={t.contactRole}
                  messagePerson={t.contactId ? {
                    id: t.contactId,
                    name: displayName(t.from),
                    subtitle: t.contactProfileSubtitle ?? t.fromMeta,
                    ...(t.contactAvatar ? { avatar: t.contactAvatar } : {}),
                  } : undefined}
                  showName
                  nameClassName={cx('text-sm', t.unread && !t.resolved ? 'font-bold' : 'font-semibold')}
                  className="w-full"
                />
                <button type="button" onClick={() => navigate(`/inbox/${t.id}`)} className="mt-2 block w-full text-left">
                  <span className="flex items-center gap-2">
                    <Tag tone={t.resolved ? 'green' : 'blue'}>{t.resolved ? 'Resolved' : t.category}</Tag>
                    <span className="flex-1" />
                    {t.unread && !t.resolved && <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />}
                    <span className="shrink-0 text-xs text-on-surface-variant">{t.timeAgo}</span>
                  </span>
                  <span className={cx('mt-2 block truncate text-sm', t.unread && !t.resolved ? 'font-bold text-primary' : 'font-semibold text-on-surface')}>{t.title}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-on-surface-variant">"{t.preview}"</span>
                </button>
              </div>
            </div>
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
