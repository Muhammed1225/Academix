import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useApp } from '../store';
import { BrandMark, Icon, cx } from '../components/ui';

type Role = 'scholar' | 'prospective' | 'faculty';
type Method = 'identity_document' | 'edu_email';
type Errors = Record<string, string>;

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: 'Student / Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty Representative', icon: 'account_balance' },
];
const universities = ['Carnegie Mellon University', 'Massachusetts Institute of Technology', 'Stanford University', 'University of California, Berkeley', 'Cornell University', 'Georgia Institute of Technology'];
const majors = ['Computer Science', 'Artificial Intelligence', 'Electrical & Computer Engineering', 'Information Systems', 'Business Administration', 'Mathematics', 'Physics', 'Other'];
const requirements = [
  { label: 'At least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'At least one letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'At least one number', test: (value: string) => /\d/.test(value) },
  { label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'At least one special character', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];
const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.slice(reader.result.indexOf(',') + 1)) : reject(new Error('Unable to read file'));
  reader.onerror = () => reject(new Error('Unable to read file'));
  reader.readAsDataURL(file);
});

function SelectField({ label, value, onChange, options, optional = false, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; optional?: boolean; error?: string }) {
  return <label className="block min-w-0 text-sm font-semibold">{label}{optional && <span className="font-normal text-on-surface-variant"> (optional)</span>}<select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(error)}><option value="">Select {label.toLowerCase()}{optional ? ' (optional)' : ''}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{error && <span className="mt-1 block text-xs font-medium text-error">{error}</span>}</label>;
}

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setModeValue] = useState<'login' | 'register'>(params.get('mode') === 'create' ? 'register' : 'login');
  const [role, setRole] = useState<Role>('scholar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [eduEmail, setEduEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [requestGold, setRequestGold] = useState(false);
  const [method, setMethod] = useState<Method>('identity_document');
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const setSignedIn = useApp((s) => s.setSignedIn);
  const showToast = useApp((s) => s.showToast);
  const registration = mode === 'register';
  const verificationTitle = role === 'faculty' ? 'Faculty / Work ID' : 'Student card';

  const switchMode = (next: 'login' | 'register') => setModeValue(next);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (registration && name.trim().split(/\s+/).filter(Boolean).length < 2) next.name = 'Enter your first and last name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    else if (registration && requirements.some((item) => !item.test(password))) next.password = 'Password must meet every requirement listed below.';
    if (registration && confirm !== password) next.confirm = 'Passwords do not match.';
    if (registration && role !== 'prospective' && !university) next.university = 'Choose your university.';
    if (registration && role !== 'prospective' && !major) next.major = role === 'faculty' ? 'Choose the subject you teach.' : 'Choose your major.';
    if (registration && role === 'scholar' && !graduationYear) next.graduationYear = 'Choose your graduation year.';
    if (registration && role !== 'prospective' && requestGold) {
      if (method === 'edu_email' && !/^[^@\s]+@[^@\s]+\.edu$/i.test(eduEmail.trim())) next.eduEmail = 'Enter a valid .edu email address.';
      if (method === 'identity_document' && !document) next.document = `Upload a photo of your ${role === 'faculty' ? 'faculty or work ID' : 'student card'}.`;
      if (document && (!['image/jpeg', 'image/png'].includes(document.type) || document.size > 5 * 1024 * 1024)) next.document = 'Choose a JPG or PNG image no larger than 5 MB.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const encoded = registration && requestGold && method === 'identity_document' && document ? await readFile(document) : undefined;
      const response = await fetch(`/api/auth/${registration ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, ...(registration ? {
          name: name.trim(), role, university, major, graduationYear: graduationYear || undefined, confirmPassword: confirm,
          requestGoldVerification: requestGold, ...(requestGold ? { verificationMethod: method, ...(method === 'edu_email' ? { eduEmail: eduEmail.trim().toLowerCase() } : {}) } : {}),
          ...(encoded && document ? { identityDocument: { type: role === 'faculty' ? 'work_card' : 'student_card', mimeType: document.type, base64: encoded } } : {}),
        } : {}) }),
      });
      const result = await response.json() as { error?: string; verificationStatus?: 'pending' | 'unverified' };
      if (!response.ok) { setErrors({ form: result.error ?? 'Unable to complete your request. Please try again.' }); return; }
      setPassword(''); setConfirm(''); setSignedIn(true);
      showToast(registration ? result.verificationStatus === 'pending' ? 'Account created; verification review is pending' : 'Account created; welcome to Academix' : 'Signed in successfully');
      navigate('/', { replace: true });
    } catch {
      setErrors({ form: 'Unable to reach the authentication service. Please try again.' });
    } finally { setBusy(false); }
  };

  const passwordInput = (field: 'password' | 'confirm') => {
    const isConfirm = field === 'confirm';
    const value = isConfirm ? confirm : password;
    const setValue = isConfirm ? setConfirm : setPassword;
    const visible = isConfirm ? showConfirm : showPassword;
    const setVisible = isConfirm ? setShowConfirm : setShowPassword;
    return <label className="block min-w-0 text-sm font-semibold">{isConfirm ? 'Confirm password' : 'Password'}<span className={cx('relative block', registration ? 'mt-2' : 'mt-1.5')}><input value={value} onChange={(e) => setValue(e.target.value)} type={visible ? 'text' : 'password'} className={cx('input pr-12', registration && '!bg-surface-container-low/40 !py-[9px]')} autoComplete={isConfirm ? 'new-password' : registration ? 'new-password' : 'current-password'} aria-invalid={Boolean(errors[field])} /><button type="button" onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-2 flex items-center px-2 text-on-surface-variant" aria-label={visible ? 'Hide password' : 'Show password'}><Icon name={visible ? 'visibility_off' : 'visibility'} /></button></span>{errors[field] && <span className="mt-1 block text-xs font-medium text-error">{errors[field]}</span>}{registration && !isConfirm && <ul className="mt-2 space-y-1 text-[11px] font-medium">{requirements.map((item) => <li key={item.label} className={item.test(password) ? 'text-green-700' : 'text-on-surface-variant'}><Icon name={item.test(password) ? 'check_circle' : 'radio_button_unchecked'} className="mr-1 !text-[13px]" />{item.label}</li>)}</ul>}</label>;
  };

  return <div className="min-h-screen bg-surface px-4 py-5 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-[1440px] items-center justify-between"><Link to="/" aria-label="Academix home"><BrandMark /></Link><Link to="/" className="text-sm font-semibold text-secondary">Back to Academix</Link></header>
    <main className={cx('mx-auto mt-6 max-w-[1440px]', registration ? 'max-w-[720px]' : 'grid min-h-[calc(100vh-112px)] overflow-hidden rounded-3xl bg-white shadow-header lg:grid-cols-[1.12fr_0.88fr]')}>
      {!registration && <div className="relative hidden min-h-[700px] overflow-hidden bg-surface-container-high lg:block"><img src="/images/graduates.png" alt="Graduates celebrating together" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent"/><div className="absolute bottom-12 left-12 right-12 text-white"><p className="eyebrow !text-white/80">Your next chapter starts here</p><h1 className="mt-3 max-w-xl font-headline text-4xl font-semibold leading-tight">Find your people. Shape what comes next.</h1><p className="mt-3 max-w-lg text-white/85">Connect with students, mentors, and the universities that move you forward.</p></div></div>}
      <section className={cx('rounded-3xl bg-white p-5 shadow-header sm:p-9 lg:rounded-none lg:shadow-none', registration && 'mx-auto max-w-[720px]')}>
        <p className="eyebrow text-secondary">{registration ? 'Join the academic network' : 'Welcome back'}</p>
        <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">{registration ? 'Create your account' : 'Log in to Academix'}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{registration ? 'Choose how you’ll take part in the community.' : 'Continue your academic journey with your community.'}</p>
        {registration && <div role="tablist" aria-label="Account role" className="mx-auto mt-7 grid max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-3">{roles.map((item) => <button key={item.id} type="button" role="tab" aria-selected={role === item.id} onClick={() => { setRole(item.id); setRequestGold(false); setDocument(null); setErrors({}); }} className={cx('flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition', role === item.id ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low')}><Icon name={item.icon}/>{item.label}</button>)}</div>}
        <form onSubmit={submit} noValidate className={cx('mt-7', registration ? 'mx-auto max-w-[640px] space-y-6' : 'space-y-5')}>
          {registration && <div className="space-y-5">
            <label className="block text-sm font-semibold">Full Legal Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.name)}/>{errors.name && <span className="mt-1 block text-xs text-error">{errors.name}</span>}</label>
            <label className="block text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.email)}/>{errors.email && <span className="mt-1 block text-xs text-error">{errors.email}</span>}</label>
            {passwordInput('password')}
            {passwordInput('confirm')}
            {role === 'prospective' ? <div className="grid gap-5 sm:grid-cols-2"><SelectField label="Dream University" value={university} onChange={setUniversity} options={universities} optional/><SelectField label="Dream Major" value={major} onChange={setMajor} options={majors} optional/></div> : <div className={cx('grid gap-5', role === 'scholar' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              <SelectField label="University" value={university} onChange={setUniversity} options={universities} error={errors.university}/>
              <SelectField label={role === 'faculty' ? 'Major / Subject taught' : 'Major'} value={major} onChange={setMajor} options={majors} error={errors.major}/>
              {role === 'scholar' && <label className="block text-sm font-semibold">Graduation year<select value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.graduationYear)}><option value="">Select graduation year</option>{Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + index - 4)).map((year) => <option key={year}>{year}</option>)}</select>{errors.graduationYear && <span className="mt-1 block text-xs text-error">{errors.graduationYear}</span>}</label>}
            </div>}
            {role !== 'prospective' && <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/60 p-3.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold"><input type="checkbox" checked={requestGold} onChange={(e) => { setRequestGold(e.target.checked); setErrors({}); }} className="accent-secondary"/>Request gold verification</label>
              {requestGold && <div className="mt-3 space-y-3">
                <fieldset><legend className="text-sm font-semibold">Verification method</legend><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-white p-2.5 text-xs"><input type="radio" checked={method === 'identity_document'} onChange={() => setMethod('identity_document')} name="verification-method" className="accent-secondary"/>{verificationTitle}</label><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-white p-2.5 text-xs"><input type="radio" checked={method === 'edu_email'} onChange={() => setMethod('edu_email')} name="verification-method" className="accent-secondary"/>.edu email</label></div></fieldset>
                {method === 'identity_document' ? <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-white px-3 py-4 text-center"><Icon name="cloud_upload" className="text-secondary"/><span className="mt-1 text-sm font-semibold">Upload image of your {verificationTitle.toLowerCase()}</span><span className="mt-1 text-xs text-on-surface-variant">JPG or PNG, up to 5 MB</span><input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => setDocument(e.target.files?.[0] ?? null)}/>{document && <span className="mt-2 max-w-full truncate text-xs text-secondary">{document.name}</span>}{errors.document && <span className="mt-2 text-xs text-error">{errors.document}</span>}</label> : <label className="block text-sm font-semibold">Institutional .edu email<input type="email" value={eduEmail} onChange={(e) => setEduEmail(e.target.value)} placeholder="you@university.edu" className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.eduEmail)}/>{errors.eduEmail && <span className="mt-1 block text-xs text-error">{errors.eduEmail}</span>}</label>}
              </div>}
            </div>}
          </div>}
          {!registration && <><label className="block text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="input mt-1.5" aria-invalid={Boolean(errors.email)}/>{errors.email && <span className="mt-1 block text-xs text-error">{errors.email}</span>}</label>{passwordInput('password')}</>}
          {errors.form && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{errors.form}</p>}
          <button type="submit" disabled={busy} className={cx('btn-primary h-12 w-full', registration && 'mt-1')}>{busy ? 'Please wait…' : registration ? 'Create account' : 'Log in'}</button>
          <div className="flex items-center justify-between gap-4 text-sm">{registration ? <span/> : <button type="button" onClick={() => showToast('Password reset is not connected yet', 'info')} className="font-semibold text-secondary">Forgot password?</button>}<button type="button" onClick={() => { switchMode(registration ? 'login' : 'register'); setErrors({}); }} className="ml-auto font-semibold text-secondary">{registration ? 'Sign in' : 'Create account'}</button></div>
        </form>
      </section>
    </main>
  </div>;
}
