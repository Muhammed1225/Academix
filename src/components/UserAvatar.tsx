import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { avatarColor, displayName, initialsForName } from '../data/userIdentity';
import { useApp } from '../store';
import { cx, Icon } from './ui';

interface MessagePerson {
  id: string;
  name: string;
  subtitle: string;
  avatar?: string;
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
  showName?: boolean;
  nameClassName?: string;
  subtitleClassName?: string;
  className?: string;
  messagePerson?: MessagePerson;
  trailing?: ReactNode;
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
  showName = false,
  nameClassName,
  subtitleClassName,
  className,
  messagePerson,
  trailing,
}: UserAvatarProps) {
  const safeName = displayName(name, email);
  const [imageFailed, setImageFailed] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const identityRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const openMiniChatForPerson = useApp((state) => state.openMiniChatForPerson);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const openPopover = () => {
    if (!profileHref) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    const bounds = identityRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = 264;
    setPopoverPosition({
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - 220)),
    });
  };

  const scheduleClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPopoverPosition(null), 160);
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
      {avatar}
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
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
      onFocus={openPopover}
      onBlur={(event) => {
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
            'inline-flex min-w-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary',
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
      {popoverPosition && profileHref && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`${safeName} profile preview`}
          onMouseEnter={() => {
            if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
          }}
          onMouseLeave={scheduleClose}
          style={{ left: popoverPosition.left, top: popoverPosition.top }}
          className="fixed z-[100] w-64 rounded-xl border border-outline-variant/60 bg-white p-4 shadow-float"
        >
          <div className="flex items-center gap-3">
            {avatar}
            <span className="min-w-0">
              <span title={safeName} className="block truncate text-sm font-semibold text-primary">{safeName}</span>
              {role && <span className="mt-1 inline-flex rounded-full bg-secondary-fixed px-2 py-0.5 text-[10px] font-semibold text-secondary">{role}</span>}
            </span>
          </div>
          <p title={profileSubtitle ?? subtitle} className="mt-3 line-clamp-2 text-xs text-on-surface-variant">{profileSubtitle ?? subtitle ?? 'Academix community member'}</p>
          <div className="mt-3 flex gap-2">
            <Link to={profileHref} onClick={() => setPopoverPosition(null)} className="btn-outline flex-1 justify-center !px-2 !py-2 text-xs">
              <Icon name="person" />View profile
            </Link>
            {messagePerson && (
              <button
                type="button"
                onClick={() => {
                  openMiniChatForPerson(messagePerson);
                  setPopoverPosition(null);
                }}
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
