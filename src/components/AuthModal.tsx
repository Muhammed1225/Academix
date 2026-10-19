import { useState, type FormEvent } from 'react';

import { useApp } from '../store';
import { BrandMark, Icon, Modal, cx } from './ui';

type Role = 'scholar' | 'prospective' | 'faculty';
type AuthErrors = { name?: string; email?: string; password?: string; form?: string };

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: '.edu Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty / Rep', icon: 'account_balance' },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<AuthErrors>({});

  const needsEdu = role !== 'prospective';
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
    else if (mode === 'register' && needsEdu && !email.trim().toLowerCase().endsWith('.edu')) next.email = 'A .edu address is required for this role';
    if (!password) next.password = 'Enter your password';
    else if (mode === 'register' && password.length < 12) next.password = 'Use at least 12 characters for a stronger password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(mode === 'register' ? { name: name.trim(), role } : {}),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setErrors({ form: result.error ?? 'Unable to sign in. Please try again.' });
        return;
      }
      setPassword('');
      setSignedIn(true);
      close();
      showToast(mode === 'login' ? 'Signed in successfully' : 'Account created — welcome to the network');
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
        <p className="eyebrow mt-6 !text-secondary">Credential Protocol</p>
        <h2 className="mt-1 font-headline text-2xl font-semibold text-primary">
          {mode === 'login' ? 'Sign in to Academix' : 'Join the Verified Academic Network'}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {mode === 'login' ? 'Use your account email and password to continue.' : 'Create an account to join the academic network.'}
        </p>

        {mode === 'register' && (
          <>
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
          </>
        )}

        <label className="mt-4 block text-sm font-semibold">
          {mode === 'register' && needsEdu ? 'Institutional Email (.edu required)' : 'Email'}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input mt-1.5" autoComplete="email" />
          {errors.email && <span className="mt-1 block text-xs font-medium text-error">{errors.email}</span>}
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Password
          <span className="relative mt-1.5 block">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="input pr-12"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 12 : undefined}
              aria-invalid={Boolean(errors.password)}
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
          {errors.password ? (
            <span className="mt-1 block text-xs font-medium text-error">{errors.password}</span>
          ) : (
            mode === 'register' && <span className="mt-1 block text-xs font-normal text-on-surface-variant">Use at least 12 characters.</span>
          )}
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
