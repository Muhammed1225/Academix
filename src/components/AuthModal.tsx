import { useState, type FormEvent } from 'react';

import { useApp } from '../store';
import { BrandMark, Icon, Modal, cx } from './ui';

type Role = 'scholar' | 'prospective' | 'faculty';

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: '.edu Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty / Rep', icon: 'account_balance' },
];

/**
 * "Join the Verified Academic Network" — rol seçimi ve .edu doğrulaması.
 * Gerçek kimlik doğrulama backend'e bağlanana kadar yalnızca yerel form doğrulaması yapar.
 */
export default function AuthModal() {
  const open = useApp((s) => s.authOpen);
  const setOpen = useApp((s) => s.setAuthOpen);
  const setSignedIn = useApp((s) => s.setSignedIn);
  const showToast = useApp((s) => s.showToast);

  const [role, setRole] = useState<Role>('scholar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const needsEdu = role !== 'prospective';
  const close = () => setOpen(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().split(/\s+/).length < 2) next.name = 'Enter your first and last name';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email';
    else if (needsEdu && !email.trim().toLowerCase().endsWith('.edu')) next.email = 'A .edu address is required for this role';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSignedIn(true);
    close();
    showToast('Credentials verified — welcome to the network');
  };

  return (
    <Modal open={open} onClose={close} label="Join the network">
      <form onSubmit={submit} className="p-6 sm:p-8" noValidate>
        <div className="flex items-start justify-between">
          <BrandMark size="text-xl" />
          <button type="button" onClick={close} className="rounded-full p-1.5 hover:bg-surface-container-low" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <p className="eyebrow mt-6 !text-secondary">Credential Protocol</p>
        <h2 className="mt-1 font-headline text-2xl font-semibold text-primary">Join the Verified Academic Network</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Select your collegiate role to begin cryptographic or email verification.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
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
        <label className="mt-4 block text-sm font-semibold">
          {needsEdu ? 'Institutional Email (.edu required)' : 'Email'}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input mt-1.5" autoComplete="email" />
          {errors.email ? (
            <span className="mt-1 block text-xs font-medium text-error">{errors.email}</span>
          ) : (
            needsEdu && <span className="mt-1 block text-xs font-normal text-on-surface-variant">Domain verification active for 2,400+ accredited universities</span>
          )}
        </label>

        <div className="mt-4 text-sm font-semibold">Student ID / Enrollment Verification (Optional)</div>
        <button
          type="button"
          onClick={() => setUploaded((v) => !v)}
          className={cx(
            'mt-1.5 flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition',
            uploaded ? 'border-on-tertiary-container bg-mint' : 'border-outline-variant bg-surface-container-low hover:bg-surface-container',
          )}
        >
          <Icon name={uploaded ? 'check_circle' : 'cloud_upload'} className={uploaded ? 'text-on-tertiary-container' : 'text-secondary'} />
          <span className="text-sm font-semibold">{uploaded ? 'student_card.pdf attached' : 'Upload .edu transcript or Student Card'}</span>
          <span className="text-xs text-on-surface-variant">PDF, PNG, or JPG up to 10MB</span>
        </button>

        <button type="submit" className="btn-primary mt-6 w-full !h-11">
          Verify Credentials & Enter Network
        </button>
        <div className="mt-3 flex items-center justify-between text-sm">
          <button type="button" className="font-semibold text-secondary" onClick={() => showToast('Password reset is not connected yet', 'info')}>
            Forgot password?
          </button>
          <button type="button" className="font-semibold text-secondary" onClick={() => showToast('Shibboleth / SSO is not connected yet', 'info')}>
            Log in with Shibboleth / SSO
          </button>
        </div>
      </form>
    </Modal>
  );
}
