import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import UserAvatar from '../components/UserAvatar';
import { Avatar, Icon, Modal, Tag, cx } from '../components/ui';
import { colleges } from '../data/mock';
import { displayName } from '../data/userIdentity';
import type { GroupMember, GroupSharedDocument, GroupSharedLink, GroupSharedPost, Conversation } from '../data/types';
import { useApp } from '../store';

function GroupPicture({ src, name, size }: { src?: string; name: string; size: number }) {
  if (src) return <Avatar src={src} name={name} size={size} rounded="rounded-full" />;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary"
      style={{ width: size, height: size }}
      aria-label={`${name} group picture`}
      role="img"
    >
      <Icon name="groups" size={size * 0.48} />
    </span>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (conversationId: string) => void }) {
  const user = useApp((state) => state.user);
  const createGroup = useApp((state) => state.createGroup);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [groupPicture, setGroupPicture] = useState('');
  const [error, setError] = useState('');
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const connections = useMemo(() => {
    const seen = new Set<string>();
    return colleges.flatMap((college) => college.mentors.map((mentor) => ({ college, mentor })))
      .filter(({ mentor }) => {
        if (mentor.id === user?.id || seen.has(mentor.id)) return false;
        seen.add(mentor.id);
        return true;
      });
  }, [user?.id]);

  const close = () => {
    setStep(1);
    setSelectedIds([]);
    setGroupName('');
    setGroupBio('');
    setGroupPicture('');
    setError('');
    onClose();
  };
  const toggleMember = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((memberId) => memberId !== id)
      : [...current, id]);
    setError('');
  };
  const choosePicture = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLocaleLowerCase();
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);
    if (!allowedTypes.has(file.type) || !extension || !allowedExtensions.has(extension)) {
      setError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setGroupPicture(reader.result);
        setError('');
      } else {
        setError('Unable to preview this picture. Please try another image.');
      }
    };
    reader.onerror = () => setError('Unable to read this picture. Please try again.');
    reader.readAsDataURL(file);
  };
  const create = () => {
    const selectedConnections = connections.filter(({ mentor }) => selectedIds.includes(mentor.id));
    if (selectedConnections.length < 2) {
      setError('A group needs at least 2 other members.');
      return;
    }
    const members: GroupMember[] = selectedConnections.map(({ college, mentor }) => ({
      id: mentor.id,
      name: mentor.name,
      avatar: mentor.avatar,
      universityOrRole: `${college.name} · ${mentor.role === 'faculty' ? 'Faculty' : 'Student'}`,
      isAdmin: false,
      isCurrentUser: false,
    }));
    const conversationId = createGroup({
      name: groupName,
      bio: groupBio,
      ...(groupPicture ? { picture: groupPicture } : {}),
      members,
    });
    if (conversationId) onCreated(conversationId);
  };

  const selectedCount = selectedIds.filter((id) => connections.some(({ mentor }) => mentor.id === id)).length;
  const canContinue = selectedCount >= 2 && connections.length >= 2;
  const currentUserName = user ? displayName(user.name, user.email) : 'You';

  return (
    <Modal open onClose={close} label={step === 1 ? 'Select group members' : 'New group'} width="max-w-lg">
      <div className="flex items-start gap-3 border-b border-outline-variant/50 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
          <Icon name="group_add" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-secondary">Step {step} of 2</p>
          <h2 className="mt-0.5 font-headline text-xl font-semibold text-primary">
            {step === 1 ? 'Select members' : 'New group'}
          </h2>
        </div>
        <button type="button" onClick={close} aria-label="Close create group" className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
          <Icon name="close" />
        </button>
      </div>

      {step === 1 ? (
        <>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-primary">Connections</p>
              <span className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-bold text-secondary">
                {selectedCount} selected
              </span>
            </div>
            {connections.length < 2 ? (
              <p role="status" className="mt-3 rounded-lg bg-error-container/60 px-3 py-2.5 text-sm text-on-error-container">
                You need at least 2 connections to create a group.
              </p>
            ) : (
              <>
                {selectedCount < 2 && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {selectedCount === 0 ? 'Select at least 2 people to create a group' : 'Select 1 more person'}
                  </p>
                )}
                <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-outline-variant/50 p-2">
                  {connections.map(({ college, mentor }) => {
                    const selected = selectedIds.includes(mentor.id);
                    return (
                      <label key={mentor.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-container-low focus-within:bg-surface-container-low">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMember(mentor.id)}
                          className="h-4 w-4 accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-primary">{mentor.name}</span>
                          <span className="block truncate text-xs text-on-surface-variant">{college.shortName} · {mentor.collegeShort}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
            {error && <p role="alert" className="mt-3 text-sm font-medium text-error">{error}</p>}
          </div>
          <div className="flex justify-end border-t border-outline-variant/50 p-4">
            <button type="button" disabled={!canContinue} onClick={() => setStep(2)} className="btn-primary disabled:cursor-not-allowed">
              Next <Icon name="arrow_forward" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-5 p-5">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => pictureInputRef.current?.click()}
                aria-label={groupPicture ? 'Change group picture' : 'Choose group picture'}
                className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary-fixed text-secondary ring-1 ring-outline-variant/60 transition hover:ring-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {groupPicture
                  ? <img src={groupPicture} alt="Group picture preview" className="h-full w-full object-cover" />
                  : <Icon name="groups" className="!text-4xl" />}
                <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-secondary text-white">
                  <Icon name="photo_camera" className="!text-[17px]" />
                </span>
              </button>
              <input
                ref={pictureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={choosePicture}
                className="sr-only"
                aria-label="Choose a group picture"
              />
              <button type="button" onClick={() => pictureInputRef.current?.click()} className="mt-2 text-sm font-semibold text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                Choose a picture
              </button>
              {groupPicture && (
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <button type="button" onClick={() => setGroupPicture('')} className="font-semibold text-on-surface-variant hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">Remove</button>
                  <button type="button" onClick={() => pictureInputRef.current?.click()} className="font-semibold text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">Change</button>
                </div>
              )}
              <p className="mt-1 text-[11px] text-on-surface-variant">JPG, PNG, or WEBP</p>
            </div>
            <label className="block text-sm font-semibold text-primary">
              <span className="flex items-center justify-between gap-2">
                <span>Group name <span className="text-error">*</span></span>
                <span className="text-xs font-normal text-on-surface-variant">{groupName.length}/40</span>
              </span>
              <input
                autoFocus
                value={groupName}
                maxLength={40}
                onChange={(event) => {
                  setGroupName(event.target.value);
                  setError('');
                }}
                placeholder="Name your group"
                className="input mt-2"
              />
            </label>
            <label className="block text-sm font-semibold text-primary">
              <span className="flex items-center justify-between gap-2">
                <span>Group bio</span>
                <span className="text-xs font-normal text-on-surface-variant">{groupBio.length}/150</span>
              </span>
              <textarea
                value={groupBio}
                onChange={(event) => setGroupBio(event.target.value)}
                maxLength={150}
                rows={3}
                placeholder="Write a bio for your group (optional)"
                className="input mt-2 resize-none"
              />
            </label>
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Members</h3>
                <span className="text-sm font-semibold text-secondary">{selectedCount + 1} members</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[currentUserName, ...connections
                  .filter(({ mentor }) => selectedIds.includes(mentor.id))
                  .map(({ mentor }) => mentor.name)]
                  .map((name, index) => (
                    <span key={`${name}-${index}`} className="rounded-full border border-outline-variant/60 bg-white px-3 py-1 text-xs font-medium text-on-surface">
                      {index === 0 && name !== 'You' ? `${name} (You)` : name}
                    </span>
                  ))}
              </div>
            </div>
            {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
          </div>
          <div className="flex items-center justify-between border-t border-outline-variant/50 p-4">
            <button type="button" onClick={() => { setError(''); setStep(1); }} className="btn-outline">
              <Icon name="arrow_back" /> Back
            </button>
            <button type="button" disabled={!groupName.trim() || groupName.length > 40} onClick={create} className="btn-primary disabled:cursor-not-allowed">
              Create group
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

type GroupInfoTab = 'posts' | 'links' | 'documents';

function formatGroupDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function GroupInfoPanel({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<GroupInfoTab>('posts');
  const tabs: { id: GroupInfoTab; label: string; icon: string }[] = [
    { id: 'posts', label: 'Posts', icon: 'article' },
    { id: 'links', label: 'Links', icon: 'link' },
    { id: 'documents', label: 'Documents', icon: 'description' },
  ];
  const members = [...(conversation.groupMembers ?? [])].sort((first, second) =>
    Number(second.isAdmin) - Number(first.isAdmin),
  );
  const sharedPosts: GroupSharedPost[] = conversation.groupSharedPosts ?? [];
  const sharedLinks: GroupSharedLink[] = conversation.groupSharedLinks ?? [];
  const sharedDocuments: GroupSharedDocument[] = conversation.groupSharedDocuments ?? [];
  const date = formatGroupDate(conversation.groupCreatedAt ?? '');

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close group info" onClick={onClose} className="absolute inset-0 bg-primary/40 sm:bg-primary/30" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Group info"
        className="absolute inset-0 flex flex-col overflow-hidden bg-white shadow-float sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-lg sm:border-l sm:border-outline-variant/60"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant/50 px-4 py-3">
          <button type="button" onClick={onClose} aria-label="Back to group chat" className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
            <Icon name="arrow_back" />
          </button>
          <h2 className="flex-1 font-headline text-lg font-semibold text-primary">Group info</h2>
          <button type="button" onClick={onClose} aria-label="Close group info" className="hidden rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary sm:inline-flex">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-outline-variant/50 px-5 py-7 text-center">
            <GroupPicture src={conversation.groupPicture} name={conversation.title || 'Group'} size={104} />
            <h3 className="mt-3 font-headline text-2xl font-semibold text-primary">{conversation.title || 'Group'}</h3>
            {conversation.groupBio && <p className="mx-auto mt-2 max-w-md whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">{conversation.groupBio}</p>}
            <p className="mt-2 text-xs text-on-surface-variant">Created on {date}</p>
            <Tag tone="blue" icon="groups" className="mt-3">{members.length} members</Tag>
          </section>

          <section>
            <div role="tablist" aria-label="Group shared content" className="flex border-b border-outline-variant/50 px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`group-info-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls="group-info-tab-panel"
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    'flex min-h-12 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary sm:text-sm',
                    activeTab === tab.id ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                  )}
                >
                  <Icon name={tab.icon} className="!text-[17px]" />{tab.label}
                </button>
              ))}
            </div>

            <div id="group-info-tab-panel" role="tabpanel" aria-labelledby={`group-info-tab-${activeTab}`} className="min-h-36 p-4">
              {activeTab === 'posts' && (sharedPosts.length ? (
                <div className="space-y-2">
                  {sharedPosts.map((post) => (
                    <Link key={post.id} to={post.href} onClick={onClose} className="block rounded-xl border border-outline-variant/50 p-3 transition hover:border-secondary/50 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                      <p className="font-semibold leading-snug text-primary">{post.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{post.author} · {post.time}</p>
                    </Link>
                  ))}
                </div>
              ) : <p className="py-8 text-center text-sm text-on-surface-variant">No posts shared yet.</p>)}

              {activeTab === 'links' && (sharedLinks.length ? (
                <div className="space-y-2">
                  {sharedLinks.map((link) => {
                    let title = link.url;
                    try {
                      title = new URL(link.url).hostname;
                    } catch {
                      title = link.url;
                    }
                    return (
                      <a key={`${link.url}-${link.date}`} href={link.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl border border-outline-variant/50 p-3 transition hover:border-secondary/50 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-fixed text-secondary"><Icon name="link" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-all font-semibold text-primary">{title}</span>
                          <span className="mt-1 block text-xs text-on-surface-variant">Shared by {link.sender} · {formatGroupDate(link.date)}</span>
                        </span>
                        <Icon name="open_in_new" className="text-outline" />
                      </a>
                    );
                  })}
                </div>
              ) : <p className="py-8 text-center text-sm text-on-surface-variant">No links shared yet.</p>)}

              {activeTab === 'documents' && (sharedDocuments.length ? (
                <div className="space-y-2">
                  {sharedDocuments.map((file) => {
                    const extension = file.fileName.split('.').pop()?.toLocaleLowerCase() ?? '';
                    const icon = extension === 'pdf' ? 'picture_as_pdf'
                      : ['xls', 'xlsx'].includes(extension) ? 'table_chart'
                        : ['ppt', 'pptx'].includes(extension) ? 'slideshow'
                          : 'description';
                    return (
                      <div key={file.id} className="flex items-center gap-3 rounded-xl border border-outline-variant/50 p-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-secondary"><Icon name={icon} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-primary">{file.fileName}</span>
                          <span className="mt-0.5 block text-xs text-on-surface-variant">{file.size} · {file.sender} · {formatGroupDate(file.date)}</span>
                        </span>
                        <a href={file.downloadUrl} download={file.fileName} aria-label={`Download ${file.fileName}`} className="rounded-full p-2 text-secondary transition hover:bg-secondary-fixed focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                          <Icon name="download" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="py-8 text-center text-sm text-on-surface-variant">No documents shared yet.</p>)}
            </div>
          </section>

          <section className="border-t border-outline-variant/50 px-4 py-5">
            <h3 className="mb-3 font-headline text-lg font-semibold text-primary">Members</h3>
            <div className="space-y-1">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                  <Avatar src={member.avatar} name={member.name || 'Group member'} size={42} rounded="rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-primary">
                        {member.name || 'Group member'}{member.isCurrentUser && member.name !== 'You' ? ' (You)' : ''}
                      </span>
                      {member.isAdmin && <Tag tone="blue" className="!px-1.5 !py-0.5 !text-[10px]">Admin</Tag>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{member.universityOrRole || 'Group member'}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function accountRole(role?: string) {
  if (role === 'faculty') return 'Faculty';
  if (role === 'scholar') return 'Student';
  return 'Applicant';
}

function ConversationThread({ conversation, onShowGroupInfo }: { conversation: Conversation; onShowGroupInfo: () => void }) {
  const reply = useApp((s) => s.reply);
  const showToast = useApp((s) => s.showToast);
  const user = useApp((s) => s.user);
  const ownName = displayName(user?.name, user?.email);
  const contactName = displayName(conversation.from);
  const [draft, setDraft] = useState(conversation.suggestedReply ?? '');
  const contactHref = conversation.contactId ? `/people/${conversation.contactId}` : undefined;
  const messagePerson = conversation.contactId ? {
    id: conversation.contactId,
    name: contactName,
    subtitle: conversation.contactProfileSubtitle ?? conversation.fromMeta,
    ...(conversation.contactAvatar ? { avatar: conversation.contactAvatar } : {}),
  } : undefined;

  useEffect(() => {
    setDraft(conversation.suggestedReply ?? '');
  }, [conversation.id, conversation.suggestedReply]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    reply(conversation.id, draft.trim());
    setDraft('');
    showToast('Message sent', 'send');
  };

  return (
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/50 p-5">
        <Link to="/inbox" className="rounded-full p-1.5 hover:bg-surface-container-low md:hidden" aria-label="Back to inbox">
          <Icon name="arrow_back" />
        </Link>
        <div className="min-w-0 flex-1">
          {conversation.category === 'Group' ? (
            <button type="button" onClick={onShowGroupInfo} className="flex max-w-full items-center gap-3 rounded-lg text-left transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
              <GroupPicture src={conversation.groupPicture} name={conversation.title || 'Group'} size={48} />
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-primary">{conversation.title || 'Group'}</span>
                <span className="block truncate text-xs text-on-surface-variant">{conversation.groupMembers?.length ?? 0} members · View group info</span>
              </span>
            </button>
          ) : (
            <>
              <UserAvatar
                disableProfilePreview
                src={conversation.contactAvatar}
                name={contactName}
                size={48}
                showStatus
                profileHref={contactHref}
                subtitle={conversation.fromMeta}
                profileSubtitle={conversation.contactProfileSubtitle}
                role={conversation.contactRole}
                messagePerson={messagePerson}
                showName
                nameClassName="text-base"
                className="max-w-full"
              />
              <p className="truncate text-sm font-medium text-on-surface-variant">{conversation.title}</p>
            </>
          )}
        </div>
        {conversation.category === 'Group' && <Tag tone="blue" icon="groups">{conversation.fromMeta}</Tag>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-surface p-5">
        {conversation.messages.map((m, i) => {
          const firstInGroup = i === 0 || conversation.messages[i - 1].isMe !== m.isMe;
          const senderName = m.isMe ? ownName : contactName;
          const senderHref = m.isMe ? '/profile' : contactHref;
          const senderRole = m.isMe ? accountRole(user?.role) : conversation.contactRole;
          return (
            <div key={`${conversation.id}-${i}`} className={cx('flex items-start gap-3', m.isMe && 'flex-row-reverse')}>
              {firstInGroup ? (
                <UserAvatar
                  disableProfilePreview
                  src={m.isMe ? user?.photo || undefined : conversation.contactAvatar}
                  name={senderName}
                  size={36}
                  profileHref={senderHref}
                  subtitle={m.isMe
                    ? [user?.major, user?.university].filter(Boolean).join(' • ') || 'Academix community member'
                    : conversation.fromMeta}
                  profileSubtitle={m.isMe ? undefined : conversation.contactProfileSubtitle}
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

      <form onSubmit={send} className="border-t border-outline-variant/50 p-4">
          {conversation.suggestedReply && draft === conversation.suggestedReply && (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <UserAvatar
                disableProfilePreview
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
            placeholder="Write a message..."
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
              <Icon name="send" /> Send
            </button>
          </div>
      </form>
    </div>
  );
}

export default function InboxPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const conversations = useApp((s) => s.conversations);
  const markRead = useApp((s) => s.markRead);
  const setMiniChatConversationId = useApp((s) => s.setMiniChatConversationId);
  const miniChatConversationId = useApp((s) => s.miniChatConversationId);
  const activeId = conversationId ?? miniChatConversationId;
  const active = conversations.find((t) => t.id === activeId);
  const conversationCount = conversations.length;
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupInfoConversationId, setGroupInfoConversationId] = useState<string | null>(null);
  const groupInfoConversation = conversations.find((conversation) => conversation.id === groupInfoConversationId && conversation.category === 'Group');

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
    if (active) setMiniChatConversationId(active.id);
  }, [active?.id, setMiniChatConversationId]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-headline text-3xl font-semibold text-primary">Messages</h1>
            <p className="mt-1 text-on-surface-variant">Your messages and group conversations.</p>
          </div>
          <button type="button" onClick={() => setCreateGroupOpen(true)} className="btn-outline">
            <Icon name="group_add" /> Create a group
          </button>
        </div>
      </div>
      <div className="card grid overflow-hidden md:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={cx('border-r border-outline-variant/50', active && 'hidden md:block')}>
          <div className="border-b border-outline-variant/50 px-5 py-3">
            <Tag tone="blue" icon="inbox">
              {conversationCount} {conversationCount === 1 ? 'Conversation' : 'Conversations'}
            </Tag>
          </div>
          {conversations.map((t) => (
            <div
              key={t.id}
              className={cx(
                'flex items-start gap-3 border-b border-outline-variant/40 px-5 py-4 transition',
                t.id === activeId ? 'bg-secondary-fixed/50' : 'hover:bg-surface-container-low',
              )}
            >
              <div className="min-w-0 flex-1">
                <UserAvatar
                  disableProfilePreview
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
                  nameClassName={cx('text-sm', t.unread ? 'font-bold' : 'font-semibold')}
                  className="w-full"
                />
                <button type="button" onClick={() => navigate(`/inbox/${t.id}`)} className="mt-2 block w-full text-left">
                  <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-on-surface-variant">"{t.preview}"</span>
                  <span className="mt-2 flex items-center justify-start gap-2 text-left">
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />}
                    <span className="shrink-0 text-xs text-on-surface-variant">{t.timeAgo}</span>
                  </span>
                </button>
              </div>
            </div>
          ))}
        </aside>
        <section className={cx(!active && 'hidden md:block')}>
          {active ? (
            <ConversationThread conversation={active} onShowGroupInfo={() => setGroupInfoConversationId(active.id)} />
          ) : (
            <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 p-10 text-center text-on-surface-variant">
              <Icon name={conversationId ? 'search_off' : 'forum'} className="!text-5xl text-outline-variant" />
              <p className="font-semibold text-on-surface">
                {conversationId ? 'Conversation not found' : 'Select a conversation'}
              </p>
              <p className="text-sm">
                {conversationId ? 'This conversation may have been removed or is no longer available.' : 'Choose a conversation to read and reply.'}
              </p>
              {conversationId && <Link to="/inbox" className="btn-outline mt-3">Back to messages</Link>}
            </div>
          )}
        </section>
      </div>
      {createGroupOpen && (
        <CreateGroupModal
          onClose={() => setCreateGroupOpen(false)}
          onCreated={(groupConversationId) => {
            setCreateGroupOpen(false);
            navigate(`/inbox/${groupConversationId}`);
          }}
        />
      )}
      {groupInfoConversation && (
        <GroupInfoPanel
          key={groupInfoConversation.id}
          conversation={groupInfoConversation}
          onClose={() => setGroupInfoConversationId(null)}
        />
      )}
    </div>
  );
}
