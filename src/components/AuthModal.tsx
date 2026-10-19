import { useState, type FormEvent } from 'react';

import { useApp } from '../store';
import { BrandMark, Icon, Modal, cx } from './ui';

type Role = 'scholar' | 'prospective' | 'faculty';
type AuthErrors = { name?: string; email?: string; password?: string; identityDocument?: string; form?: string };
type IdentityDocumentType = 'student_card' | 'work_card';
type VerificationMethod = 'identity_document' | 'edu_email';

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: 'Student / Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty / Rep', icon: 'account_balance' },
];

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read the selected document.'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected document.'));
    reader.readAsDataURL(file);
  });

export default function AuthModal() {
  const open = useApp((s) => s.authOpen);
  const setOpen = useApp((s) => s.setAuthOpen);
  const setSignedIn = useApp((s) => s.setSignedIn);
  const showToast = useApp((s) => s.showToast);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>('scholar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestGoldVerification, setRequestGoldVerification] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('identity_document');
  const [identityDocumentType, setIdentityDocumentType] = useState<IdentityDocumentType>('student_card');
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});
  const passwordRequirements = [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'At least one letter', met: /[A-Za-z]/.test(password) },
    { label: 'At least one number', met: /\d/.test(password) },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one special character', met: /[^A-Za-z0-9\s]/.test(password) },
  ];

  const close = () => setOpen(false);
  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: AuthErrors = {};
    if (mode === 'register' && name.trim().split(/\s+/).length < 2) next.name = 'Enter your first and last name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    else if (
      mode === 'register' &&
      passwordRequirements.some((requirement) => !requirement.met)
    ) {
      next.password = 'Use at least 12 characters, including a letter, a number, an uppercase letter, and a special character';
    }
    if (mode === 'register' && requestGoldVerification && verificationMethod === 'identity_document' && !identityDocument) {
      next.identityDocument = role === 'faculty'
        ? 'Upload a faculty or work ID to request Gold verification.'
        : 'Upload a student or work card to request Gold verification.';
    }
    if (
      mode === 'register' &&
      requestGoldVerification &&
      verificationMethod === 'identity_document' &&
      identityDocument &&
      (!['application/pdf', 'image/jpeg', 'image/png'].includes(identityDocument.type) ||
        identityDocument.size > 5 * 1024 * 1024)
    ) {
      next.identityDocument = 'Choose a PDF, JPG, or PNG file no larger than 5 MB.';
    }
    if (mode === 'register' && requestGoldVerification && verificationMethod === 'edu_email' && !email.trim().toLowerCase().endsWith('.edu')) {
      next.email = 'Use an institutional .edu email for this verification option.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const documentBase64 = mode === 'register' && requestGoldVerification && verificationMethod === 'identity_document' && identityDocument
        ? await readFileAsBase64(identityDocument)
        : undefined;
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(mode === 'register'
            ? {
                name: name.trim(),
                role,
                requestGoldVerification,
                ...(requestGoldVerification ? { verificationMethod } : {}),
                ...(documentBase64 && identityDocument && verificationMethod === 'identity_document'
                  ? {
                      identityDocument: {
                        type: identityDocumentType,
                        mimeType: identityDocument.type,
                        base64: documentBase64,
                      },
                    }
                  : {}),
              }
            : {}),
        }),
      });
      const result = await response.json() as { error?: string; verificationStatus?: 'pending' | 'unverified' };
      if (!response.ok) {
        setErrors({ form: result.error ?? 'Unable to sign in. Please try again.' });
        return;
      }
      setPassword('');
      setSignedIn(true);
      close();
      showToast(
        mode === 'login'
          ? 'Signed in successfully'
          : result.verificationStatus === 'pending'
            ? 'Account created — identity review pending; you are unverified until approved'
            : 'Account created — welcome to the network; your account is unverified',
      );
    } catch {
      setErrors({ form: 'Unable to reach the authentication service. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} label={mode === 'login' ? 'Sign in' : 'Join the network'}>
      <form onSubmit={submit} className="p-6 sm:p-8" noValidate>
        <div className="flex items-start justify-between">
          <BrandMark size="text-xl" />
          <button type="button" onClick={close} className="rounded-full p-1.5 hover:bg-surface-container-low" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <p className="eyebrow mt-6 !text-secondary">Identity Verification</p>
        <h2 className="mt-1 font-headline text-2xl font-semibold text-primary">
          {mode === 'login' ? 'Sign in to Academix' : 'Join the Academic Network'}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {mode === 'login'
            ? 'Use your account email and password to continue.'
            : 'Use any email to join. Verification is optional and requires an institutional .edu address or an appropriate ID.'}
        </p>

        {mode === 'register' && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setRequestGoldVerification(false);
                    setIdentityDocument(null);
                    setIdentityDocumentType(r.id === 'faculty' ? 'work_card' : 'student_card');
                  }}
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition',
                    role === r.id ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  <Icon name={r.icon} />
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Full Legal Name
              <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1.5" autoComplete="name" />
              {errors.name && <span className="mt-1 block text-xs font-medium text-error">{errors.name}</span>}
            </label>
          </>
        )}

        <label className="mt-4 block text-sm font-semibold">
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input mt-1.5" autoComplete="email" />
          {errors.email && <span className="mt-1 block text-xs font-medium text-error">{errors.email}</span>}
          {mode === 'register' && <span className="mt-1 block text-xs font-normal text-on-surface-variant">Any valid email is accepted; .edu is not required.</span>}
        </label>

        {mode === 'register' && role !== 'prospective' && (
          <div className="mt-4 rounded-xl border border-outline-variant/70 bg-surface-container-low/70 p-4">
            <label className="flex items-start gap-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={requestGoldVerification}
                onChange={(e) => {
                  setRequestGoldVerification(e.target.checked);
                  setErrors((current) => ({ ...current, identityDocument: undefined }));
                }}
                className="mt-0.5 accent-secondary"
              />
              <span>
                Request Gold verification
                <span className="mt-1 block text-xs font-normal leading-relaxed text-on-surface-variant">
                  Optional. Request review with {role === 'faculty' ? 'a faculty/work ID' : 'a student/work card'} or an institutional .edu email. You can join without either, but your account will remain unverified.
                </span>
              </span>
            </label>
            {requestGoldVerification && (
              <div className="mt-3 space-y-3">
                <fieldset>
                  <legend className="text-sm font-semibold">Verification method</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className={cx('flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs', verificationMethod === 'identity_document' ? 'border-secondary bg-secondary-fixed/60' : 'border-outline-variant')}>
                      <input
                        type="radio"
                        name="verification-method"
                        value="identity_document"
                        checked={verificationMethod === 'identity_document'}
                        onChange={() => {
                          setVerificationMethod('identity_document');
                          setErrors((current) => ({ ...current, email: undefined }));
                        }}
                        className="mt-0.5 accent-secondary"
                      />
                      <span>{role === 'faculty' ? 'Faculty/work ID' : 'Student/work card'}</span>
                    </label>
                    <label className={cx('flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs', verificationMethod === 'edu_email' ? 'border-secondary bg-secondary-fixed/60' : 'border-outline-variant')}>
                      <input
                        type="radio"
                        name="verification-method"
                        value="edu_email"
                        checked={verificationMethod === 'edu_email'}
                        onChange={() => {
                          setVerificationMethod('edu_email');
                          setIdentityDocument(null);
                          setErrors((current) => ({ ...current, identityDocument: undefined }));
                        }}
                        className="mt-0.5 accent-secondary"
                      />
                      <span>.edu email</span>
                    </label>
                  </div>
                </fieldset>
                {verificationMethod === 'identity_document' ? (
                  <>
                    <label className="block text-sm font-semibold">
                      Identification type
                      <select
                        value={identityDocumentType}
                        onChange={(e) => setIdentityDocumentType(e.target.value as IdentityDocumentType)}
                        className="input mt-1.5"
                      >
                        <option value="student_card">Student card</option>
                        <option value="work_card">{role === 'faculty' ? 'Faculty / work ID' : 'Work card'}</option>
                      </select>
                    </label>
                    <label className="block text-sm font-semibold">
                      {role === 'faculty' ? 'Upload faculty / work ID' : 'Upload student / work card'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(e) => {
                          setIdentityDocument(e.target.files?.[0] ?? null);
                          setErrors((current) => ({ ...current, identityDocument: undefined }));
                        }}
                        className="mt-1.5 block w-full text-xs text-on-surface-variant file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-fixed file:px-3 file:py-2 file:font-semibold file:text-secondary"
                        aria-invalid={Boolean(errors.identityDocument)}
                      />
                      <span className="mt-1 block text-xs font-normal text-on-surface-variant">PDF, JPG, or PNG • maximum 5 MB. Do not upload unrelated documents.</span>
                      {identityDocument && <span className="mt-1 block truncate text-xs text-on-surface-variant">{identityDocument.name}</span>}
                      {errors.identityDocument && <span className="mt-1 block text-xs font-medium text-error">{errors.identityDocument}</span>}
                    </label>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-on-surface-variant">
                    Use your institutional .edu email. Your request remains pending until the institution email is reviewed; no .edu address is required to join.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <label className="mt-4 block text-sm font-semibold">
          Password
          <span className="relative mt-1.5 block">
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
              }}
              type={showPassword ? 'text' : 'password'}
              className="input pr-12"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 12 : undefined}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={mode === 'register' ? 'password-requirements' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center px-2 text-on-surface-variant hover:text-secondary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
            </button>
          </span>
          {mode === 'register' && (
            <ul id="password-requirements" className="mt-2 space-y-1 text-xs font-medium" aria-label="Password requirements">
              {passwordRequirements.map((requirement) => (
                <li key={requirement.label} className={requirement.met ? 'flex items-center gap-1.5 text-green-700' : 'flex items-center gap-1.5 text-on-surface-variant'}>
                  <Icon name={requirement.met ? 'check_circle' : 'radio_button_unchecked'} className="!text-[15px]" />
                  {requirement.label}
                </li>
              ))}
            </ul>
          )}
          {errors.password && <span className="mt-1 block text-xs font-medium text-error">{errors.password}</span>}
        </label>

        {errors.form && <p role="alert" className="mt-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{errors.form}</p>}
        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !h-11">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <button type="button" className="font-semibold text-secondary" onClick={() => showToast('Password reset is not connected yet', 'info')}>
            Forgot password?
          </button>
          <button type="button" className="font-semibold text-secondary" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
