import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';

import { avatarColor, displayName, initialsForName } from '../data/userIdentity';
import type { Verification } from '../data/types';
import { useApp } from '../store';
import { cx, Icon, VerificationBadge } from './ui';

interface MessagePerson {
  id: string;
  name: string;
  subtitle: string;
  avatar?: string;
  verification?: Verification;
  badge?: string;
}

interface UserAvatarProps {
  src?: string;
  name?: string | null;
  size?: number;
  showStatus?: boolean;
  isOnline?: boolean;
  email?: string;
  profileHref?: string;
  subtitle?: string;
  profileSubtitle?: string;
  role?: string;
  verification?: Verification;
  badge?: string;
  showAvatar?: boolean;
  showName?: boolean;
  nameClassName?: string;
  subtitleClassName?: string;
  className?: string;
  messagePerson?: MessagePerson;
  trailing?: ReactNode;
  disableProfilePreview?: boolean;
}

export default function UserAvatar({
  src,
  name,
  size = 44,
  showStatus = false,
  isOnline = false,
  email,
  profileHref,
  subtitle,
  profileSubtitle,
  role,
  showAvatar = true,
  showName = false,
  nameClassName,
  subtitleClassName,
  className,
  messagePerson,
  trailing,
  disableProfilePreview = false,
  verification,
  badge,
}: UserAvatarProps) {
  const safeName = displayName(name, email);
  const [imageFailed, setImageFailed] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const identityRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const openMiniChatForPerson = useApp((state) => state.openMiniChatForPerson);
  const signedIn = useApp((state) => state.signedIn);
  const currentUser = useApp((state) => state.user);
  const navigate = useNavigate();
  const isCurrentUser = profileHref === '/profile' || Boolean(currentUser && messagePerson?.id === currentUser.id);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const openPopover = (immediate = false) => {
    if (!profileHref) return;
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    const show = () => {
      const bounds = identityRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPopoverPosition({ left: Math.max(12, Math.min(bounds.left, window.innerWidth - 300)), top: bounds.bottom + 8 });
    };
    if (immediate) show();
    else openTimer.current = window.setTimeout(show, 200);
  };

  const scheduleClose = () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement && (identityRef.current?.contains(activeElement) || popoverRef.current?.contains(activeElement))) return;
      setPopoverPosition(null);
    }, 150);
  };

  useLayoutEffect(() => {
    if (!popoverPosition || !identityRef.current || !popoverRef.current) return;
    const position = () => {
      const anchor = identityRef.current?.getBoundingClientRect();
      const card = popoverRef.current?.getBoundingClientRect();
      if (!anchor || !card) return;
      const margin = 12;
      const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - card.width - margin));
      const below = window.innerHeight - anchor.bottom - margin;
      const above = anchor.top - margin;
      const top = below >= card.height + 8 || below >= above
        ? Math.min(window.innerHeight - card.height - margin, anchor.bottom + 8)
        : Math.max(margin, anchor.top - card.height - 8);
      setPopoverPosition((current) => current && (current.left !== left || current.top !== top) ? { left, top } : current);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [popoverPosition]);

  useEffect(() => {
    if (!popoverPosition) return;
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!identityRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) {
        setPopoverPosition(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopoverPosition(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [popoverPosition]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (disableProfilePreview || event.pointerType !== 'touch' || !profileHref) return;
    event.preventDefault();
    if (popoverPosition) setPopoverPosition(null);
    else openPopover(true);
  };

  const message = () => {
    if (!messagePerson || isCurrentUser) return;
    if (!signedIn) {
      setPopoverPosition(null);
      navigate('/auth');
      return;
    }
    openMiniChatForPerson(messagePerson);
    const conversation = useApp.getState().conversations.find((item) =>
      item.contactId === messagePerson.id || item.id === `direct-${messagePerson.id}`,
    );
    setPopoverPosition(null);
    if (conversation) navigate(`/inbox/${conversation.id}`);
  };

  const avatar = (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src && !imageFailed ? (
        <img
          src={src}
          alt={safeName}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={safeName}
          className="flex h-full w-full items-center justify-center rounded-full font-bold text-white"
          style={{ backgroundColor: avatarColor(safeName), fontSize: size * 0.34 }}
        >
          {initialsForName(safeName)}
        </span>
      )}
      {showStatus && (
        <span
          role="img"
          aria-label={isOnline ? 'Online' : 'Offline'}
          title={isOnline ? 'Online' : 'Offline'}
          className={cx(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
            isOnline ? 'bg-emerald-500' : 'bg-slate-400',
          )}
        />
      )}
    </span>
  );

  const identityContent = (
    <>
      {showAvatar && avatar}
      {showName && (
        <span className="min-w-0 flex-1">
          <span title={safeName} className={cx('block truncate font-semibold text-primary', nameClassName)}>{safeName}</span>
          {subtitle && <span title={subtitle} className={cx('block truncate text-xs font-normal text-on-surface-variant', subtitleClassName)}>{subtitle}</span>}
        </span>
      )}
      {trailing}
    </>
  );

  return (
    <span
      ref={identityRef}
      className={cx('relative inline-flex min-w-0 items-center gap-2', className)}
      onMouseEnter={disableProfilePreview ? undefined : () => openPopover()}
      onMouseLeave={disableProfilePreview ? undefined : scheduleClose}
      onFocus={disableProfilePreview ? undefined : () => openPopover(true)}
      onPointerDown={handlePointerDown}
      onBlur={disableProfilePreview ? undefined : (event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node)
          || (!event.currentTarget.contains(nextTarget) && !popoverRef.current?.contains(nextTarget))) scheduleClose();
      }}
    >
      {profileHref ? (
        <Link
          to={profileHref}
          aria-label={`View ${safeName}'s profile`}
          onClick={(event) => event.stopPropagation()}
          className={cx(
            'inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary',
            showName && 'flex-1',
          )}
        >
          {identityContent}
        </Link>
      ) : (
        <span className={cx('inline-flex min-w-0 items-center gap-2', showName && 'flex-1')}>
          {identityContent}
        </span>
      )}
      {!disableProfilePreview && popoverPosition && profileHref && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`${safeName} profile preview`}
          onMouseEnter={() => {
            if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
          }}
          onMouseLeave={scheduleClose}
          style={{ left: popoverPosition.left, top: popoverPosition.top }}
          className="fixed z-[100] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-outline-variant/60 bg-white p-4 shadow-float"
        >
          <div className="flex items-center gap-3">
            {avatar}
            <span className="min-w-0 flex-1">
              <span title={safeName} className="block truncate text-sm font-semibold text-primary">{safeName}</span>
              {verification && <VerificationBadge verification={verification} label={badge} />}
            </span>
          </div>
          {role && <p className="mt-2 text-xs font-medium text-on-surface">{role}</p>}
          <p title={profileSubtitle ?? subtitle} className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{profileSubtitle ?? subtitle ?? 'Academix community member'}</p>
          <div className="mt-3 flex gap-2">
            <Link to={profileHref} onClick={() => setPopoverPosition(null)} className="btn-outline flex-1 justify-center !px-2 !py-2 text-xs">
              <Icon name="person" />{isCurrentUser ? 'Edit Profile' : 'View Profile'}
            </Link>
            {messagePerson && !isCurrentUser && (
              <button
                type="button"
                onClick={message}
                className="btn-primary flex-1 justify-center !px-2 !py-2 text-xs"
              >
                <Icon name="mail" />Message
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}
