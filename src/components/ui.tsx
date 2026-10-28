import { useEffect, type CSSProperties, type ReactNode, type Ref } from 'react';

import { BRAND } from '../data/mock';
import { verificationLabel, type Person, type Verification } from '../data/types';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Icon({ name, className, fill, size }: { name: string; className?: string; fill?: boolean; size?: number }) {
  return (
    <span
      className={cx('material-symbols-outlined select-none', fill && 'icon-fill', className)}
      style={size ? { fontSize: size } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export function BrandMark({ className, size = 'text-2xl' }: { className?: string; size?: string }) {
  const compact = size === 'text-xl';
  const logoSize = compact ? 'h-12 w-12' : 'h-[60px] w-[60px]';
  const imageSize = compact ? 'h-[78px] w-[78px]' : 'h-[99px] w-[99px]';
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-headline font-bold tracking-tight text-primary', size, className)}>
      <span className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden', logoSize)}>
        <img
          src="/images/academix-logo.png"
          alt=""
          aria-hidden="true"
          className={cx('absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain', imageSize)}
        />
      </span>
      {BRAND}
    </span>
  );
}

const initialsOf = (name: string) =>
  name
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export function Avatar({
  src,
  name,
  size = 44,
  verified,
  rounded = 'rounded-xl',
}: {
  src?: string;
  name: string;
  size?: number;
  verified?: boolean;
  rounded?: string;
}) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className={cx('h-full w-full object-cover', rounded)} />
      ) : (
        <span
          className={cx('flex h-full w-full items-center justify-center bg-surface-container-high font-bold text-secondary', rounded)}
          style={{ fontSize: size * 0.34 }}
        >
          {initialsOf(name)}
        </span>
      )}
      {verified && (
        <span className="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-on-tertiary-container ring-2 ring-white">
          <Icon name="check" className="!text-[12px] text-white" />
        </span>
      )}
    </span>
  );
}

export function PersonAvatar({ person, size, showVerified }: { person: Person; size?: number; showVerified?: boolean }) {
  return (
    <Avatar
      src={person.avatar}
      name={person.name}
      size={size}
      verified={showVerified && (person.verification === 'edu' || person.verification === 'gold')}
    />
  );
}

const badgeStyle: Record<Verification, { cls: string; icon: string }> = {
  gold: { cls: 'bg-gold-container text-gold', icon: 'verified' },
  edu: { cls: 'bg-secondary-fixed text-secondary', icon: 'verified' },
  prospective: { cls: 'bg-prospective-container text-prospective', icon: 'school' },
  unverified: { cls: 'bg-error-container text-error', icon: 'warning' },
};

export function VerificationBadge({ verification, label }: { verification: Verification; label?: string }) {
  const s = badgeStyle[verification];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls)}>
      <Icon name={s.icon} fill className="!text-[13px]" />
      {label ?? verificationLabel[verification]}
    </span>
  );
}

export type Tone = 'neutral' | 'blue' | 'green' | 'red' | 'gold' | 'dark';

const toneCls: Record<Tone, string> = {
  neutral: 'bg-surface-container-low text-on-surface-variant',
  blue: 'bg-secondary-fixed text-on-secondary-fixed',
  green: 'bg-mint text-on-tertiary-fixed-variant',
  red: 'bg-error-container text-on-error-container',
  gold: 'bg-gold-container text-gold',
  dark: 'bg-primary-container text-white',
};

export function Tag({ children, tone = 'neutral', icon, className }: { children: ReactNode; tone?: Tone; icon?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold', toneCls[tone], className)}>
      {icon && <Icon name={icon} className="!text-[14px]" />}
      {children}
    </span>
  );
}

export function SectionHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      {icon && <Icon name={icon} className="mt-1 text-secondary" />}
      <div className="min-w-0 flex-1">
        <h2 className="font-headline text-xl font-semibold text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-on-surface-variant">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricTile({ value, label, dark }: { value: string; label: string; dark?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-3 py-3 text-center">
      <div className={cx('text-lg font-bold', dark ? 'text-primary' : 'text-secondary')}>{value}</div>
      <div className="mt-0.5 text-[11px] text-on-surface-variant">{label}</div>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'chip whitespace-nowrap',
        active ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
      )}
    >
      {children}
    </button>
  );
}

/** Ortalanmış modal (masaüstü) / alttan açılan sayfa (mobil). */
export function Modal({
  open,
  onClose,
  children,
  width = 'max-w-lg',
  label,
  dialogStyle,
  dialogRef,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  label: string;
  dialogStyle?: CSSProperties;
  dialogRef?: Ref<HTMLDivElement>;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-primary/40 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={dialogStyle}
        className={cx('animate-slide-up max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-float sm:rounded-2xl', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
