import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import RichText, { sanitizeRichText } from '../components/RichText';
import { Avatar, Icon, Tag, VerificationBadge } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';
import GoldVerificationSection from '../components/GoldVerificationSection';
import {
  readIdentityDocument,
  validateGoldVerification,
  type GoldVerificationErrors,
  type VerificationMethod,
} from '../components/goldVerification';
import { saveProfile } from '../authService';
import { majors as majorOptions, universities } from '../data/educationOptions';
import { defaultInterestEmoji, interestEmojis, interests as interestOptions } from '../data/interestOptions';
import { people } from '../data/mock';
import { useApp, type AuthenticatedUser, type ProfileBannerBackground } from '../store';

const bannerBackgrounds: { id: ProfileBannerBackground; label: string; background: string }[] = [
  { id: 'academix', label: 'Academix blue', background: 'linear-gradient(135deg, #315f91, #5aa6ad, #86c7ce)' },
  { id: 'deep-blue', label: 'Deep blue', background: 'linear-gradient(135deg, #172554, #1d4ed8, #60a5fa)' },
  { id: 'ocean-teal', label: 'Ocean teal', background: 'linear-gradient(135deg, #134e4a, #0f766e, #5eead4)' },
  { id: 'purple', label: 'Purple', background: 'linear-gradient(135deg, #3b0764, #7e22ce, #c084fc)' },
  { id: 'sunset-orange', label: 'Sunset orange', background: 'linear-gradient(135deg, #7c2d12, #ea580c, #fdba74)' },
  { id: 'emerald-green', label: 'Emerald green', background: 'linear-gradient(135deg, #064e3b, #059669, #6ee7b7)' },
  { id: 'rose-pink', label: 'Rose pink', background: 'linear-gradient(135deg, #881337, #e11d48, #fda4af)' },
  { id: 'slate-gray', label: 'Slate gray', background: 'linear-gradient(135deg, #1e293b, #64748b, #cbd5e1)' },
  { id: 'midnight-dark', label: 'Midnight dark', background: 'linear-gradient(135deg, #020617, #111827, #334155)' },
  { id: 'sky-blue', label: 'Sky blue', background: 'linear-gradient(135deg, #075985, #0ea5e9, #bae6fd)' },
  { id: 'indigo', label: 'Indigo', background: 'linear-gradient(135deg, #312e81, #4f46e5, #a5b4fc)' },
  { id: 'lavender', label: 'Lavender', background: 'linear-gradient(135deg, #581c87, #a855f7, #e9d5ff)' },
  { id: 'coral', label: 'Coral', background: 'linear-gradient(135deg, #9f1239, #fb7185, #fecdd3)' },
  { id: 'amber', label: 'Amber', background: 'linear-gradient(135deg, #78350f, #f59e0b, #fde68a)' },
  { id: 'forest-green', label: 'Forest green', background: 'linear-gradient(135deg, #14532d, #16a34a, #bbf7d0)' },
  { id: 'mint', label: 'Mint', background: 'linear-gradient(135deg, #115e59, #2dd4bf, #ccfbf1)' },
  { id: 'berry', label: 'Berry', background: 'linear-gradient(135deg, #701a75, #c026d3, #f0abfc)' },
  { id: 'copper', label: 'Copper', background: 'linear-gradient(135deg, #431407, #c2410c, #fdba74)' },
];

function isCustomBannerColor(value: string): value is `#${string}` {
  return /^#[\da-f]{6}$/i.test(value);
}

function bannerBackgroundStyle(background: ProfileBannerBackground) {
  if (isCustomBannerColor(background)) return { background };
  return { background: bannerBackgrounds.find((preset) => preset.id === background)?.background ?? bannerBackgrounds[0].background };
}

function BannerImageCropper({
  src,
  position,
  zoom,
  onPositionChange,
}: {
  src: string;
  position: { x: number; y: number };
  zoom: number;
  onPositionChange: (position: { x: number; y: number }) => void;
}) {
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  return (
    <div
      role="group"
      className="mt-4 aspect-[3/1] touch-none cursor-move overflow-hidden rounded-xl bg-surface-container-low"
      aria-label="Drag image to reposition banner crop, then use the zoom slider"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (!drag.current || drag.current.pointerId !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const deltaX = event.clientX - drag.current.x;
        const deltaY = event.clientY - drag.current.y;
        drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        onPositionChange({
          x: Math.max(0, Math.min(100, position.x - (deltaX / bounds.width) * 100)),
          y: Math.max(0, Math.min(100, position.y - (deltaY / bounds.height) * 100)),
        });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ objectPosition: `${position.x}% ${position.y}%`, transform: `scale(${zoom})` }}
      />
    </div>
  );
}

function BackgroundOptions({
  selected,
  disabled,
  onSelect,
}: {
  selected: ProfileBannerBackground | null;
  disabled: boolean;
  onSelect: (background: ProfileBannerBackground) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {bannerBackgrounds.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          aria-label={preset.label}
          aria-pressed={selected === preset.id}
          onClick={() => onSelect(preset.id)}
          className={`group relative aspect-square rounded-xl border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-wait ${selected === preset.id ? 'border-secondary ring-2 ring-secondary/20' : 'border-transparent hover:scale-105 hover:border-outline-variant'}`}
          style={{ background: preset.background }}
        >
          {selected === preset.id && (
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-[#0B5BD3] shadow-md">
                <Icon name="check" className="!text-[20px]" />
              </span>
            </span>
          )}
          <span className="sr-only">{preset.label}</span>
        </button>
      ))}
      <label className={`relative flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 transition hover:scale-105 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary ${selected && isCustomBannerColor(selected) ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant'} ${disabled ? 'cursor-wait opacity-60' : ''}`}>
        <input
          type="color"
          value={selected && isCustomBannerColor(selected) ? selected : '#0B5BD3'}
          disabled={disabled}
          aria-label="Choose a custom solid color"
          onChange={(event) => {
            if (isCustomBannerColor(event.currentTarget.value)) onSelect(event.currentTarget.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
        />
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#0B5BD3] shadow">
          <Icon name="colorize" />
        </span>
        {selected && isCustomBannerColor(selected) && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white text-[#0B5BD3] shadow-md">
              <Icon name="check" className="!text-[20px]" />
            </span>
          </span>
        )}
        <span className="sr-only">Custom solid color</span>
      </label>
    </div>
  );
}

function BackgroundPickerPanel({
  selected,
  selectedImage,
  imagePosition,
  imageZoom,
  disabled,
  hasChanges,
  error,
  modal = false,
  onSelect,
  onUpload,
  onRemoveImage,
  onImagePositionChange,
  onImageZoomChange,
  onReset,
  onSave,
  onClose,
}: {
  selected: ProfileBannerBackground;
  selectedImage: string;
  imagePosition: { x: number; y: number };
  imageZoom: number;
  disabled: boolean;
  hasChanges: boolean;
  error: string;
  modal?: boolean;
  onSelect: (background: ProfileBannerBackground) => void;
  onUpload: (file: File) => void;
  onRemoveImage: () => void;
  onImagePositionChange: (position: { x: number; y: number }) => void;
  onImageZoomChange: (zoom: number) => void;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'colors' | 'image'>('colors');
  const titleId = modal ? 'background-picker-title-mobile' : 'background-picker-title-desktop';
  const colorsTabId = `${titleId}-colors`;
  const imageTabId = `${titleId}-image`;
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextTab = event.key === 'Home' || event.key === 'ArrowLeft'
      ? 'colors'
      : 'image';
    setActiveTab(nextTab);
    document.getElementById(nextTab === 'colors' ? colorsTabId : imageTabId)?.focus();
  };

  return (
    <section role="dialog" aria-modal={modal} aria-labelledby={titleId} className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-float sm:max-h-none sm:overflow-visible">
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-body text-lg font-semibold text-primary">Change background</h2>
        <button type="button" disabled={disabled} onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low disabled:cursor-wait" aria-label="Close background picker">
          <Icon name="close" />
        </button>
      </div>
      <div role="tablist" aria-label="Background type" className="mt-4 flex border-b border-outline-variant/50">
        <button
          type="button"
          id={colorsTabId}
          role="tab"
          aria-selected={activeTab === 'colors'}
          tabIndex={activeTab === 'colors' ? 0 : -1}
          aria-controls={`${colorsTabId}-panel`}
          onClick={() => setActiveTab('colors')}
          onKeyDown={handleTabKeyDown}
          className={`flex-1 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'colors' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          Colors
        </button>
        <button
          type="button"
          id={imageTabId}
          role="tab"
          aria-selected={activeTab === 'image'}
          tabIndex={activeTab === 'image' ? 0 : -1}
          aria-controls={`${imageTabId}-panel`}
          onClick={() => setActiveTab('image')}
          onKeyDown={handleTabKeyDown}
          className={`flex-1 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'image' ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-primary'}`}
        >
          Upload image
        </button>
      </div>
      {activeTab === 'colors' ? (
        <div id={`${colorsTabId}-panel`} role="tabpanel" aria-labelledby={colorsTabId}>
          <p className="mt-3 text-sm text-on-surface-variant">Choose a gradient or solid color for your profile banner.</p>
          <BackgroundOptions selected={selectedImage ? null : selected} disabled={disabled} onSelect={onSelect} />
        </div>
      ) : (
        <div id={`${imageTabId}-panel`} role="tabpanel" aria-labelledby={imageTabId} className="mt-4">
          <div className="mb-3 rounded-xl bg-surface-container-low px-3.5 py-3 text-sm text-on-surface-variant">
            <p className="mb-1.5 font-semibold text-primary">Image requirements</p>
            <ul className="space-y-1">
              <li>Recommended size: 1500 × 500 px (3:1 ratio)</li>
              <li>Minimum size: 1200 × 400 px</li>
              <li>Maximum file size: 5 MB</li>
              <li>Allowed formats: JPG, PNG, WebP</li>
            </ul>
          </div>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/50 px-4 py-5 text-center transition hover:border-secondary hover:bg-surface-container-low">
            <Icon name="add_photo_alternate" className="text-secondary" />
            <span className="text-sm font-semibold text-primary">{selectedImage ? 'Choose a different image' : 'Choose a banner image'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) onUpload(file);
              }}
              className="sr-only"
              aria-label="Upload banner image"
            />
          </label>
          {selectedImage && <p className="mt-2 text-xs text-on-surface-variant">A banner image is selected.</p>}
          {error && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-error">
              <Icon name="error" className="mt-0.5 shrink-0 !text-[18px]" />
              <span>{error}</span>
            </p>
          )}
          {selectedImage && (
            <>
              <BannerImageCropper
                src={selectedImage}
                position={imagePosition}
                zoom={imageZoom}
                onPositionChange={onImagePositionChange}
              />
              <label className="mt-3 block text-sm font-medium text-on-surface">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={imageZoom}
                  disabled={disabled}
                  onChange={(event) => onImageZoomChange(Number(event.currentTarget.value))}
                  className="mt-2 w-full accent-secondary"
                  aria-label="Zoom banner image"
                />
              </label>
              <button type="button" disabled={disabled} onClick={onRemoveImage} className="mt-2 text-sm font-semibold text-error hover:underline disabled:cursor-wait">
                Remove image
              </button>
            </>
          )}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={disabled} onClick={onReset} className="text-sm font-semibold text-secondary hover:underline disabled:cursor-wait">
          Reset to default
        </button>
        <div className="flex gap-2">
          <button type="button" disabled={disabled} onClick={onClose} className="btn-outline !h-9 !px-3 text-sm disabled:cursor-wait">
            Cancel
          </button>
          <button type="button" disabled={disabled || !hasChanges} onClick={onSave} className="btn-primary !h-9 !px-3 text-sm disabled:cursor-not-allowed">
            Save
          </button>
        </div>
      </div>
      {error && activeTab !== 'image' && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-error">
          <Icon name="error" className="mt-0.5 shrink-0 !text-[18px]" />
          <span>{error}</span>
        </p>
      )}
      {disabled && <p role="status" className="mt-3 text-sm text-on-surface-variant">Saving background…</p>}
    </section>
  );
}

type Role = AuthenticatedUser['role'];

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: 'Student / Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty Representative', icon: 'account_balance' },
];

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read the selected image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Unable to load the selected image.'));
    image.src = src;
  });
}

function imageCropPosition(value: string) {
  const [x, y] = value.split(' ').map(Number.parseFloat);
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
    y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
  };
}

function educationFor(user: AuthenticatedUser) {
  const education = [user.major, user.university].filter(Boolean).join(' • ');
  return [education, user.graduationYear ? `Class of ${user.graduationYear}` : ''].filter(Boolean).join(' • ');
}

function biographyForEditor(biography: string) {
  const document = new DOMParser().parseFromString(sanitizeRichText(biography), 'text/html');
  return document.body.textContent ?? '';
}

function roleLabel(role: Role) {
  return roles.find((item) => item.id === role)?.label ?? role;
}

export function RoleChangePage() {
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const showToast = useApp((state) => state.showToast);
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [university, setUniversity] = useState(user?.university ?? '');
  const [major, setMajor] = useState(user?.major ?? '');
  const [graduationYear, setGraduationYear] = useState(user?.graduationYear?.toString() ?? '');
  const [requestGold, setRequestGold] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('identity_document');
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [eduEmail, setEduEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<GoldVerificationErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const needsEducation = selectedRole === 'scholar' || selectedRole === 'faculty';
  const validGraduationYear = Number.isInteger(Number(graduationYear)) &&
    Number(graduationYear) >= 2000 && Number(graduationYear) <= 2100;
  const formValid = Boolean(selectedRole) &&
    (!needsEducation || Boolean(university.trim() && major.trim())) &&
    (selectedRole !== 'scholar' || validGraduationYear) &&
    (!requestGold || Object.keys(validateGoldVerification({
      role: selectedRole === 'faculty' ? 'faculty' : 'scholar',
      requestGold,
      method: verificationMethod,
      eduEmail,
      document: identityDocument,
    })).length === 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRole || !formValid || !user) return;
    setSaving(true);
    setError('');
    try {
      const encodedDocument = requestGold && verificationMethod === 'identity_document' && identityDocument
        ? await readIdentityDocument(identityDocument)
        : undefined;
      const result = await saveProfile({
        role: selectedRole,
        university,
        major,
        graduationYear: selectedRole === 'scholar' ? Number(graduationYear) : null,
        requestGoldVerification: requestGold,
        ...(requestGold ? {
          verificationMethod,
          ...(verificationMethod === 'edu_email' ? { eduEmail: eduEmail.trim().toLowerCase() } : {}),
          ...(encodedDocument && identityDocument ? {
            identityDocument: {
              type: selectedRole === 'faculty' ? 'work_card' : 'student_card',
              mimeType: identityDocument.type,
              base64: encodedDocument,
            },
          } : {}),
        } : {}),
      });
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Unable to change your role. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      showToast(result.user.verificationStatus === 'pending'
        ? 'Your role has been updated; verification review is pending'
        : 'Your role has been updated');
      navigate('/', { replace: true });
    } catch {
      setError('Unable to reach the profile service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return <div role="status" className="card mx-auto max-w-3xl p-8 text-center text-on-surface-variant">Loading your account…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="mx-auto max-w-4xl">
      <button type="button" onClick={() => navigate('/profile?edit=true')} className="btn-ghost mb-5">
        <Icon name="arrow_back" /> Back to Edit Profile
      </button>
      <section className="card p-5 sm:p-8">
        <div>
          <p className="eyebrow text-secondary">Account details</p>
          <h1 ref={headingRef} tabIndex={-1} id="change-role-title" className="mt-1 font-headline text-2xl font-semibold text-primary sm:text-3xl">Change my role</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Choose how you participate in the Academix community.</p>
        </div>
        <p className="mt-5 rounded-xl bg-surface-container-low px-3.5 py-3 text-sm font-medium text-on-surface">
          Current role: <span className="font-semibold">{roleLabel(user.role)}</span>
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-6">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Select a new role</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.filter((role) => role.id !== user.role).map((role) => (
                <button
                  key={role.id}
                  type="button"
                  aria-pressed={selectedRole === role.id}
                  onClick={() => {
                    setSelectedRole(role.id);
                    setRequestGold(false);
                    setVerificationMethod('identity_document');
                    setIdentityDocument(null);
                    setEduEmail('');
                    setFieldErrors({});
                    setError('');
                  }}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedRole === role.id
                      ? 'border-secondary bg-secondary-fixed text-secondary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={role.icon} />
                  {role.label}
                  {selectedRole === role.id && <Icon name="check" className="ml-auto" />}
                </button>
              ))}
            </div>
          </fieldset>
          {selectedRole && (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">Update the details required for your new role. Your name, email, and password will remain unchanged.</p>
              {selectedRole === 'prospective' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SearchableSelect label="Dream University" value={university} onChange={setUniversity} options={universities} optional />
                  <SearchableSelect label="Dream Major" value={major} onChange={setMajor} options={majorOptions} optional />
                </div>
              ) : (
                <>
                  <div className={`grid gap-4 ${selectedRole === 'scholar' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    <SearchableSelect label="University" value={university} onChange={setUniversity} options={universities} />
                    <SearchableSelect label={selectedRole === 'faculty' ? 'Major / Subject taught' : 'Major'} value={major} onChange={setMajor} options={majorOptions} />
                    {selectedRole === 'scholar' && (
                      <label className="block text-sm font-semibold">
                        Graduation year
                        <select value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} className="input mt-2">
                          <option value="">Select graduation year</option>
                          {Array.from({ length: 32 }, (_, index) => String(2000 + index)).map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                  <GoldVerificationSection
                    role={selectedRole}
                    requestGold={requestGold}
                    setRequestGold={setRequestGold}
                    method={verificationMethod}
                    setMethod={setVerificationMethod}
                    document={identityDocument}
                    setDocument={setIdentityDocument}
                    eduEmail={eduEmail}
                    setEduEmail={setEduEmail}
                    errors={{
                      ...fieldErrors,
                      ...(requestGold ? validateGoldVerification({
                        role: selectedRole,
                        requestGold,
                        method: verificationMethod,
                        eduEmail,
                        document: identityDocument,
                      }) : {}),
                    }}
                    setErrors={setFieldErrors}
                  />
                </>
              )}
            </div>
          )}
          {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-outline-variant/50 pt-5 sm:flex-row">
            <button type="button" onClick={() => navigate('/profile?edit=true')} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={!formValid || saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'} <Icon name="check" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProfileEditor({ user, onClose }: { user: AuthenticatedUser; onClose: () => void }) {
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [photo, setPhoto] = useState(user.photo);
  const [biography, setBiography] = useState(() => biographyForEditor(user.biography));
  const [selectedInterests, setSelectedInterests] = useState(user.interests);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [purpose, setPurpose] = useState(user.purpose);
  const [location, setLocation] = useState(user.location ?? '');
  const [university, setUniversity] = useState(user.university ?? '');
  const [universitiesOpen, setUniversitiesOpen] = useState(false);
  const [major, setMajor] = useState(user.major ?? '');
  const [majorsOpen, setMajorsOpen] = useState(false);
  const [graduationYear, setGraduationYear] = useState(user.graduationYear?.toString() ?? '');
  const [graduationYearsOpen, setGraduationYearsOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const availableInterests = [...new Set([...interestOptions, ...selectedInterests])];
  const availableMajors = [...new Set([...majorOptions, ...(major ? [major] : [])])];
  const graduationYears = [...new Set([
    ...Array.from({ length: 32 }, (_, index) => String(2000 + index)),
    ...(graduationYear ? [graduationYear] : []),
  ])].sort((a, b) => Number(a) - Number(b));

  const toggleInterest = (interest: string) => {
    setSelectedInterests((selected) => selected.includes(interest)
      ? selected.filter((item) => item !== interest)
      : selected.length < 30 ? [...selected, interest] : selected);
  };

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    try {
      setPhoto(await readImage(file));
      setError('');
    } catch {
      setError('Unable to read the selected image. Please try another one.');
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await saveProfile({
          name,
          photo,
          biography,
          interests: selectedInterests,
          purpose,
          location,
          university,
          major,
          graduationYear: graduationYear ? Number(graduationYear) : null,
      });
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Unable to save your profile. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      onClose();
    } catch {
      setError('Unable to reach the profile service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-primary/50 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-float sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-secondary">Account details</p>
            <h2 id="edit-profile-title" className="mt-1 font-headline text-2xl font-semibold text-primary">Edit your profile</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close profile editor"><Icon name="close" /></button>
        </div>
        <form onSubmit={(event) => void save(event)} className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={photo || undefined} name={name} size={72} rounded="rounded-full" />
            <div className="flex flex-wrap gap-2">
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} className="sr-only" aria-label="Choose profile picture" />
              <button type="button" onClick={() => photoInput.current?.click()} className="btn-outline !h-9 !px-3 text-sm">{photo ? 'Change photo' : 'Add photo'}</button>
              {photo && <button type="button" onClick={() => setPhoto('')} className="btn-ghost !h-9 !px-3 text-sm">Remove</button>}
            </div>
          </div>
          <label className="block text-sm font-semibold">Name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="input mt-1.5" /></label>
          <label className="block text-sm font-semibold">Biography<textarea maxLength={5000} value={biography} onChange={(event) => setBiography(event.target.value)} rows={5} className="input mt-1.5 resize-y" placeholder="Tell the community a little about yourself." /></label>
          <div>
            <span className="block text-sm font-semibold">Interests</span>
            <button
              type="button"
              aria-expanded={interestsOpen}
              aria-controls="profile-interest-options"
              onClick={() => setInterestsOpen((open) => !open)}
              className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
            >
              <span className={selectedInterests.length ? 'text-on-surface' : 'text-on-surface-variant'}>
                {selectedInterests.length
                  ? `${selectedInterests.length} selected: ${selectedInterests.slice(0, 3).join(', ')}${selectedInterests.length > 3 ? '…' : ''}`
                  : 'Choose your interests'}
              </span>
              <Icon name={interestsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
            </button>
            {interestsOpen && (
              <div id="profile-interest-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                <ul aria-label="Choose interests" className="grid gap-1 sm:grid-cols-2">
                  {availableInterests.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <li key={interest}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleInterest(interest)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${selected ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          <span aria-hidden="true">{interestEmojis[interest] ?? defaultInterestEmoji}</span>
                          <span className="flex-1">{interest}</span>
                          {selected && <Icon name="check" className="!text-sm" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="px-2.5 pt-2 text-[11px] text-on-surface-variant">{selectedInterests.length} selected (up to 30)</p>
              </div>
            )}
          </div>
          <label className="block text-sm font-semibold">What brings you to Academix<textarea maxLength={200} value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={2} className="input mt-1.5 resize-y" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-sm font-semibold">{user.role === 'prospective' ? 'Dream university' : 'University'}</span>
              <button
                type="button"
                aria-expanded={universitiesOpen}
                aria-controls="profile-university-options"
                onClick={() => setUniversitiesOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={university ? 'text-on-surface' : 'text-on-surface-variant'}>
                  {university || (user.role === 'prospective' ? 'Choose your dream university' : 'Choose your university')}
                </span>
                <Icon name={universitiesOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {universitiesOpen && (
                <div id="profile-university-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose university" className="space-y-1">
                    {universities.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          aria-pressed={university === option}
                          onClick={() => { setUniversity(option); setUniversitiesOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${university === option ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold">Major / subject</span>
              <button
                type="button"
                aria-expanded={majorsOpen}
                aria-controls="profile-major-options"
                onClick={() => setMajorsOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={major ? 'text-on-surface' : 'text-on-surface-variant'}>{major || 'Choose your major'}</span>
                <Icon name={majorsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {majorsOpen && (
                <div id="profile-major-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose major" className="space-y-1">
                    {availableMajors.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          aria-pressed={major === option}
                          onClick={() => { setMajor(option); setMajorsOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${major === option ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold">Graduation year</span>
              <button
                type="button"
                aria-expanded={graduationYearsOpen}
                aria-controls="profile-graduation-year-options"
                onClick={() => setGraduationYearsOpen((open) => !open)}
                className="input mt-1.5 flex min-h-11 items-center justify-between gap-3 text-left"
              >
                <span className={graduationYear ? 'text-on-surface' : 'text-on-surface-variant'}>
                  {graduationYear || 'Choose graduation year'}
                </span>
                <Icon name={graduationYearsOpen ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
              </button>
              {graduationYearsOpen && (
                <div id="profile-graduation-year-options" className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/70 bg-white p-2 shadow-header">
                  <ul aria-label="Choose graduation year" className="space-y-1">
                    {graduationYears.map((year) => (
                      <li key={year}>
                        <button
                          type="button"
                          aria-pressed={graduationYear === year}
                          onClick={() => { setGraduationYear(year); setGraduationYearsOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${graduationYear === year ? 'bg-secondary-fixed text-secondary' : 'text-on-surface hover:bg-surface-container-low'}`}
                        >
                          {year}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <label className="block text-sm font-semibold">Location<input maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} className="input mt-1.5" placeholder="City, region" /></label>
            <label className="block text-sm font-semibold">Email address<input readOnly value={user.email} className="input mt-1.5 bg-surface-container-low text-on-surface-variant" /></label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => navigate('/change-role')} className="btn-outline border-secondary text-secondary hover:bg-secondary-fixed">
                  <Icon name="manage_accounts" />
                  Change my role
            </button>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-outline-variant/50 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'} <Icon name="check" /></button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function OwnProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const posts = useApp((state) => state.posts);
  const showToast = useApp((state) => state.showToast);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const savedBannerBackground = user?.bannerBackground ?? 'academix';
  const savedBannerImage = user?.bannerImage ?? '';
  const savedImagePosition = user?.bannerImagePosition ?? '50% 50%';
  const savedImageZoom = user?.bannerImageZoom ?? 1;
  const [editing, setEditing] = useState(() => searchParams.get('edit') === 'true');
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [backgroundSaving, setBackgroundSaving] = useState(false);
  const [backgroundError, setBackgroundError] = useState('');
  const [bannerBackground, setBannerBackground] = useState<ProfileBannerBackground>(savedBannerBackground);
  const [bannerImage, setBannerImage] = useState(savedBannerImage);
  const [imagePosition, setImagePosition] = useState(() => imageCropPosition(savedImagePosition));
  const [imageZoom, setImageZoom] = useState(savedImageZoom);
  const [outgoingBannerBackground, setOutgoingBannerBackground] = useState<{ background: ProfileBannerBackground; fading: boolean } | null>(null);
  const previousBannerBackground = useRef(bannerBackground);
  const desktopPickerRef = useRef<HTMLDivElement>(null);
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>([]);

  useEffect(() => {
    setEditing(searchParams.get('edit') === 'true');
  }, [searchParams]);

  const closeEditor = () => {
    setEditing(false);
    if (searchParams.has('edit')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('edit');
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    setBannerBackground(savedBannerBackground);
    setBannerImage(savedBannerImage);
    setImagePosition(imageCropPosition(savedImagePosition));
    setImageZoom(savedImageZoom);
  }, [savedBannerBackground, savedBannerImage, savedImagePosition, savedImageZoom]);

  useLayoutEffect(() => {
    if (previousBannerBackground.current === bannerBackground) return;
    const previous = previousBannerBackground.current;
    previousBannerBackground.current = bannerBackground;
    setOutgoingBannerBackground({ background: previous, fading: false });
    const frame = window.requestAnimationFrame(() => {
      setOutgoingBannerBackground((current) => current && { ...current, fading: true });
    });
    const timeout = window.setTimeout(() => setOutgoingBannerBackground(null), 350);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [bannerBackground]);

  const cancelBannerBackground = () => {
    if (backgroundSaving) return;
    setBannerBackground(savedBannerBackground);
    setBannerImage(savedBannerImage);
    setImagePosition(imageCropPosition(savedImagePosition));
    setImageZoom(savedImageZoom);
    setBackgroundError('');
    setBackgroundPickerOpen(false);
  };

  useEffect(() => {
    if (!backgroundPickerOpen || backgroundSaving) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBannerBackground(savedBannerBackground);
        setBannerImage(savedBannerImage);
        setImagePosition(imageCropPosition(savedImagePosition));
        setImageZoom(savedImageZoom);
        setBackgroundError('');
        setBackgroundPickerOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [backgroundPickerOpen, backgroundSaving, savedBannerBackground, savedBannerImage, savedImagePosition, savedImageZoom]);

  useEffect(() => {
    if (!backgroundPickerOpen || backgroundSaving) return;
    const cancelOnOutsideClick = (event: PointerEvent) => {
      if (!window.matchMedia('(min-width: 640px)').matches) return;
      if (event.target instanceof Node && desktopPickerRef.current?.contains(event.target)) return;
      setBannerBackground(savedBannerBackground);
      setBannerImage(savedBannerImage);
      setImagePosition(imageCropPosition(savedImagePosition));
      setImageZoom(savedImageZoom);
      setBackgroundError('');
      setBackgroundPickerOpen(false);
    };
    document.addEventListener('pointerdown', cancelOnOutsideClick);
    return () => document.removeEventListener('pointerdown', cancelOnOutsideClick);
  }, [backgroundPickerOpen, backgroundSaving, savedBannerBackground, savedBannerImage, savedImagePosition, savedImageZoom]);

  const saveBannerBackground = async () => {
    const positionValue = `${Math.round(imagePosition.x)}% ${Math.round(imagePosition.y)}%`;
    if (!user || backgroundSaving || (
      bannerBackground === savedBannerBackground &&
      bannerImage === savedBannerImage &&
      positionValue === savedImagePosition &&
      imageZoom === savedImageZoom
    )) return;
    setBackgroundSaving(true);
    setBackgroundError('');
    try {
      const result = await saveProfile({
        bannerBackground,
        bannerImage: bannerImage || null,
        bannerImagePosition: bannerImage ? positionValue : null,
        bannerImageZoom: bannerImage ? imageZoom : null,
      });
      if (!result.ok || !result.user) {
        setBackgroundError(result.error ?? 'Unable to save your banner background. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      setBackgroundPickerOpen(false);
      showToast('Background updated', 'check');
    } catch {
      setBackgroundError('Unable to reach the profile service. Please try again.');
    } finally {
      setBackgroundSaving(false);
    }
  };

  const chooseBannerBackground = (background: ProfileBannerBackground) => {
    setBannerBackground(background);
    setBannerImage('');
    setImagePosition({ x: 50, y: 50 });
    setImageZoom(1);
    setBackgroundError('');
  };

  const chooseBannerImage = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setBackgroundError('Unsupported format. Please upload a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBackgroundError('File is too large. Maximum size is 5 MB.');
      return;
    }
    try {
      const imageData = await readImage(file);
      const { width, height } = await getImageDimensions(imageData);
      if (width < 1200 || height < 400) {
        setBackgroundError(`Image is too small. Minimum size is 1200 x 400 px. Your image is ${width} x ${height} px.`);
        return;
      }
      setBannerImage(imageData);
      setImagePosition({ x: 50, y: 50 });
      setImageZoom(1);
      setBackgroundError('');
    } catch {
      setBackgroundError('Unable to read the selected banner image. Please try another one.');
    }
  };

  const removeBannerImage = () => {
    setBannerImage('');
    setImagePosition({ x: 50, y: 50 });
    setImageZoom(1);
    setBackgroundError('');
  };

  const authoredPosts = useMemo(
    () => user ? posts.filter((post) => post.author.id === user.id && !post.auditNote) : [],
    [posts, user],
  );

  if (!authChecked) return <div role="status" className="card mx-auto max-w-3xl p-8 text-center text-on-surface-variant">Loading your profile…</div>;
  if (!user) return <Navigate to="/auth?mode=create" replace />;

  const recommendations = Object.values(people)
    .filter((candidate) => candidate.id !== 'anon' && candidate.id !== 'anon-ivy')
    .map((person) => ({
      person,
      sharedInterests: person.interests?.filter((interest) => user.interests.includes(interest)) ?? [],
    }))
    .filter(({ sharedInterests }) => sharedInterests.length > 0)
    .sort((a, b) => b.sharedInterests.length - a.sharedInterests.length)
    .slice(0, 3);
  const verification = user.verificationStatus === 'verified' ? 'edu' : user.role === 'prospective' ? 'prospective' : 'unverified';

  return (
    <>
      <div className="mx-auto grid max-w-5xl items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-5">
          <section className="card relative">
            <div
              className="relative h-36 overflow-hidden rounded-t-xl sm:h-48"
            >
              <div aria-hidden="true" className="absolute inset-0" style={bannerBackgroundStyle(bannerBackground)} />
              {bannerImage && (
                <img
                  src={bannerImage}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300"
                  style={{
                    objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                    transform: `scale(${imageZoom})`,
                  }}
                />
              )}
              {outgoingBannerBackground && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${outgoingBannerBackground.fading ? 'opacity-0' : 'opacity-100'}`}
                  style={bannerBackgroundStyle(outgoingBannerBackground.background)}
                />
              )}
              <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full border-[28px] border-white/10" />
              <div className="absolute right-24 top-10 h-32 w-32 rounded-full bg-white/10 blur-sm" />
              <div className="absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-primary/20 to-transparent" />
              <button
                type="button"
                title="Change background"
                aria-label="Change background"
                aria-expanded={backgroundPickerOpen}
                onClick={() => {
                  if (!backgroundPickerOpen) {
                    setBannerBackground(savedBannerBackground);
                    setBannerImage(savedBannerImage);
                    setImagePosition(imageCropPosition(savedImagePosition));
                    setImageZoom(savedImageZoom);
                  }
                  setBackgroundError('');
                  setBackgroundPickerOpen(true);
                }}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-sm backdrop-blur-md transition duration-200 hover:scale-105 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icon name="palette" className="!text-[19px]" />
              </button>
            </div>
            {backgroundPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40 p-4 sm:hidden"
                  role="presentation"
                  onClick={cancelBannerBackground}
                >
                  <div onClick={(event) => event.stopPropagation()}>
                    <BackgroundPickerPanel
                      selected={bannerBackground}
                      selectedImage={bannerImage}
                      imagePosition={imagePosition}
                      imageZoom={imageZoom}
                      disabled={backgroundSaving}
                      hasChanges={
                        bannerBackground !== savedBannerBackground ||
                        bannerImage !== savedBannerImage ||
                        `${Math.round(imagePosition.x)}% ${Math.round(imagePosition.y)}%` !== savedImagePosition ||
                        imageZoom !== savedImageZoom
                      }
                      error={backgroundError}
                      modal
                      onSelect={chooseBannerBackground}
                      onUpload={(file) => void chooseBannerImage(file)}
                      onRemoveImage={removeBannerImage}
                      onImagePositionChange={setImagePosition}
                      onImageZoomChange={setImageZoom}
                      onReset={() => chooseBannerBackground('academix')}
                      onSave={() => void saveBannerBackground()}
                      onClose={cancelBannerBackground}
                    />
                  </div>
                </div>
                <div ref={desktopPickerRef} className="absolute right-4 top-14 z-40 hidden w-80 sm:block">
                  <BackgroundPickerPanel
                    selected={bannerBackground}
                    selectedImage={bannerImage}
                    imagePosition={imagePosition}
                    imageZoom={imageZoom}
                    disabled={backgroundSaving}
                    hasChanges={
                      bannerBackground !== savedBannerBackground ||
                      bannerImage !== savedBannerImage ||
                      `${Math.round(imagePosition.x)}% ${Math.round(imagePosition.y)}%` !== savedImagePosition ||
                      imageZoom !== savedImageZoom
                    }
                    error={backgroundError}
                    onSelect={chooseBannerBackground}
                    onUpload={(file) => void chooseBannerImage(file)}
                    onRemoveImage={removeBannerImage}
                    onImagePositionChange={setImagePosition}
                    onImageZoomChange={setImageZoom}
                    onReset={() => chooseBannerBackground('academix')}
                    onSave={() => void saveBannerBackground()}
                    onClose={cancelBannerBackground}
                  />
                </div>
              </>
            )}
            <div className="px-5 pb-5 sm:px-8 sm:pb-7">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                <Avatar src={user.photo || undefined} name={user.name} size={112} rounded="rounded-2xl ring-4 ring-white shadow-float" />
                <div className="flex w-full gap-2 sm:w-auto">
                  <button type="button" onClick={() => setEditing(true)} className="btn-primary flex-1 sm:flex-none"><Icon name="edit" /> Edit profile</button>
                  <Link to="/inbox" className="btn-outline flex-1 sm:flex-none"><Icon name="mail" /> Message</Link>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-headline text-2xl font-semibold text-primary sm:text-3xl">{user.name}</h1>
                  <Tag tone="blue">Your profile</Tag>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant sm:text-base">
                  {educationFor(user) || 'Academix community member'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5"><Icon name="mail" className="!text-[17px]" />{user.email}</span>
                  <span className="hidden text-outline-variant sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5"><Icon name="location_on" className="!text-[17px]" />{user.location || 'Academic network'}</span>
                  <span className="hidden text-outline-variant sm:inline">•</span>
                  <span>{user.role === 'faculty' ? 'Faculty' : user.role === 'prospective' ? 'Prospective student' : 'Student / scholar'}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <VerificationBadge verification={verification} />
                  {user.verificationStatus === 'pending' && <Tag tone="neutral">Verification pending</Tag>}
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-outline-variant/50 pt-4 text-sm text-on-surface-variant">
                <Icon name="dynamic_feed" className="text-secondary" />
                <span><strong className="text-primary">{authoredPosts.length}</strong> {authoredPosts.length === 1 ? 'public post' : 'public posts'}</span>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-xl font-semibold text-primary">About</h2>
            {user.biography ? <RichText text={user.biography} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant" /> : (
              <div className="mt-3 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Add a biography to introduce yourself to the academic community.
                <button type="button" onClick={() => setEditing(true)} className="ml-1 font-semibold text-secondary hover:underline">Complete your profile</button>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <div>
                <h2 className="font-headline text-xl font-semibold text-primary">Activity</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Posts shared with the Academix community</p>
              </div>
              <Tag tone="blue">{authoredPosts.length} {authoredPosts.length === 1 ? 'post' : 'posts'}</Tag>
            </div>
            <div className="mt-4 space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
              {authoredPosts.length ? authoredPosts.map((post) => <PostCard key={post.id} post={post} interactive={false} />) : (
                <div className="rounded-xl bg-surface-container-low p-6 text-center">
                  <Icon name="edit_note" className="text-secondary" />
                  <p className="mt-2 text-sm text-on-surface-variant">No public posts yet.</p>
                  <Link to="/compose" className="mt-2 inline-flex text-sm font-semibold text-secondary hover:underline">Share your first post</Link>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">People you may be interested in</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Suggested based on shared academic interests</p>
            <div className="mt-4 divide-y divide-outline-variant/50">
              {recommendations.length ? recommendations.map(({ person, sharedInterests }) => {
                const requested = requestedProfiles.includes(person.id);
                return (
                  <div key={person.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Link to={`/people/${person.id}`} aria-label={`View ${person.name}'s profile`}>
                        <Avatar src={person.avatar} name={person.name} size={44} rounded="rounded-full" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/people/${person.id}`} className="font-semibold text-primary hover:text-secondary hover:underline">{person.name}</Link>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{person.subtitle}</p>
                        <p className="mt-1 text-xs font-medium text-secondary">Shares {sharedInterests.join(', ')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={requested}
                      onClick={() => {
                        setRequestedProfiles((current) => [...current, person.id]);
                        showToast(`Connection request sent to ${person.name}`, 'person_add');
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-secondary px-3 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary-fixed disabled:cursor-default disabled:opacity-70"
                    >
                      <Icon name={requested ? 'check' : 'person_add'} className="!text-[15px]" />
                      {requested ? 'Request sent' : 'Connect'}
                    </button>
                  </div>
                );
              }) : <p className="py-4 text-sm text-on-surface-variant">Add interests to see people with shared academic interests.</p>}
            </div>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">Interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Topics you are exploring</p>
            {user.interests.length ? (
              <div className="mt-4 flex flex-wrap gap-2">{user.interests.map((interest) => <Tag key={interest} tone="blue">{interest}</Tag>)}</div>
            ) : (
              <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">No interests added yet. <button type="button" onClick={() => setEditing(true)} className="font-semibold text-secondary hover:underline">Add interests</button></p>
            )}
          </section>
          {user.purpose && <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">What brings me to Academix</h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{user.purpose}</p>
          </section>}
          <section className="card p-5 sm:p-6">
            <h2 className="font-headline text-lg font-semibold text-primary">Profile details</h2>
            <dl className="mt-4 space-y-4">
              <div className="flex gap-3">
                <Icon name="school" className="text-secondary" />
                <div><dt className="text-xs text-on-surface-variant">Education</dt><dd className="mt-0.5 text-sm font-medium text-primary">{educationFor(user) || 'Not specified'}</dd></div>
              </div>
              <div className="flex gap-3">
                <Icon name="verified_user" className="text-secondary" />
                <div><dt className="text-xs text-on-surface-variant">Account status</dt><dd className="mt-0.5 text-sm font-medium text-primary">{user.verificationStatus === 'pending' ? 'Verification review pending' : user.verificationStatus === 'verified' ? 'Institution verified' : 'Unverified account'}</dd></div>
              </div>
            </dl>
          </section>
          <p className="px-2 text-xs leading-relaxed text-on-surface-variant">Academix profiles help students and educators find people with shared academic interests.</p>
        </aside>
      </div>
      {editing && <ProfileEditor user={user} onClose={closeEditor} />}
    </>
  );
}
