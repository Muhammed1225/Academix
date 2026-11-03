import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authenticate } from '../authService';
import { useApp } from '../store';
import { BrandMark, Icon, Modal, cx } from '../components/ui';
import SearchableSelect from '../components/SearchableSelect';
import GoldVerificationSection from '../components/GoldVerificationSection';
import {
  readIdentityDocument,
  validateGoldVerification,
  type VerificationMethod,
} from '../components/goldVerification';
import { majors, universities, universityOptionId } from '../data/educationOptions';

type Role = 'scholar' | 'prospective' | 'faculty' | 'mentor';
type Errors = Record<string, string>;

const roles: { id: Role; label: string; icon: string }[] = [
  { id: 'scholar', label: 'Student / Scholar', icon: 'school' },
  { id: 'prospective', label: 'Prospective', icon: 'person_search' },
  { id: 'faculty', label: 'Faculty Representative', icon: 'account_balance' },
  { id: 'mentor', label: 'Mentors', icon: 'workspace_premium' },
];
const requirements = [
  { label: 'At least 12 characters', test: (value: string) => value.length >= 12 },
  { label: 'At least one letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'At least one number', test: (value: string) => /\d/.test(value) },
  { label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'At least one special character', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];
export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setModeValue] = useState<'login' | 'register'>(params.get('mode') === 'create' ? 'register' : 'login');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
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
  const [mentorField, setMentorField] = useState('');
  const [requestGold, setRequestGold] = useState(false);
  const [method, setMethod] = useState<VerificationMethod>('identity_document');
  const [document, setDocument] = useState<File | null>(null);
  const [goldModalOpen, setGoldModalOpen] = useState(false);
  const [diploma, setDiploma] = useState<File | null>(null);
  const [diplomaPreview, setDiplomaPreview] = useState('');
  const [diplomaConfirmation, setDiplomaConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const setAuthenticatedUser = useApp((s) => s.setAuthenticatedUser);
  const showToast = useApp((s) => s.showToast);
  const registration = mode === 'register';

  useEffect(() => {
    if (!diploma) {
      setDiplomaPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(diploma);
    setDiplomaPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [diploma]);

  const switchMode = (next: 'login' | 'register') => {
    setModeValue(next);
    setParams(next === 'register' ? { mode: 'create' } : { mode: 'login' }, { replace: true });
  };

  const sendPasswordResetCode = (emailAddress: string) => {
    // TODO: Connect this UI to the password-reset API when it is available.
    setResetConfirmation(`We've sent a code to ${emailAddress}.`);
  };

  const submitPasswordReset = (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrors({ email: 'Enter your email address.' });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setErrors({ email: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    sendPasswordResetCode(normalizedEmail);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (registration && name.trim().split(/\s+/).filter(Boolean).length < 2) next.name = 'Enter your first and last name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    else if (registration && requirements.some((item) => !item.test(password))) next.password = 'Password must meet every requirement listed below.';
    if (registration && confirm !== password) next.confirm = 'Passwords do not match.';
    if (registration && role !== 'prospective' && role !== 'mentor' && !university) next.university = 'Choose your university.';
    if (registration && role !== 'prospective' && role !== 'mentor' && !major) next.major = role === 'faculty' ? 'Choose the subject you teach.' : 'Choose your major.';
    if (registration && role === 'scholar' && !graduationYear) next.graduationYear = 'Choose your graduation year.';
    if (registration && role === 'mentor' && !mentorField) next.mentorField = 'Choose the field you teach in.';
    if (registration && role !== 'prospective' && role !== 'mentor') Object.assign(next, validateGoldVerification({
      role,
      requestGold,
      method,
      eduEmail,
      document,
    }));
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const encoded = registration && requestGold && method === 'identity_document' && document ? await readIdentityDocument(document) : undefined;
      const result = await authenticate(registration ? 'register' : 'login', { email: email.trim().toLowerCase(), password, ...(registration ? {
          name: name.trim(), role, university, ...(role === 'prospective' ? { dreamUniversityId: university ? universityOptionId(university) : null } : {}), major: role === 'mentor' ? mentorField : major, graduationYear: graduationYear || undefined, confirmPassword: confirm,
          requestGoldVerification: requestGold, ...(requestGold ? { verificationMethod: method, ...(method === 'edu_email' ? { eduEmail: eduEmail.trim().toLowerCase() } : {}) } : {}),
          ...(encoded && document ? { identityDocument: { type: role === 'faculty' ? 'work_card' : 'student_card', mimeType: document.type, base64: encoded } } : {}),
        } : {}) });
      if (!result.ok) { setErrors({ form: result.error ?? 'Unable to complete your request. Please try again.' }); return; }
      if (!result.user) throw new Error('Authentication response did not include the account profile.');
      setPassword(''); setConfirm(''); setAuthenticatedUser(result.user);
      if (registration) {
        showToast(result.verificationStatus === 'pending' ? 'Account created; verification review is pending' : 'Account created; welcome to Academix');
        navigate('/onboarding', { replace: true });
        return;
      }
      showToast('Signed in successfully');
      navigate(result.user.onboardingStep === 4 && !result.user.subscriptionStepCompletedAt
        ? '/subscription?flow=onboarding'
        : '/', { replace: true });
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
    <main className="mx-auto mt-6 grid min-h-[calc(100vh-112px)] max-w-[1440px] overflow-hidden rounded-3xl bg-white shadow-header lg:grid-cols-[1.12fr_0.88fr]">
      <div className="relative hidden min-h-[700px] overflow-hidden bg-surface-container-high lg:block"><img src="/images/graduates.png" alt="Graduates celebrating together" className="absolute inset-0 h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent"/><div className="absolute bottom-12 left-12 right-12 text-white"><p className="eyebrow !text-white/80">Your next chapter starts here</p><h1 className="mt-3 max-w-xl font-headline text-4xl font-semibold leading-tight">Find your people. Shape what comes next.</h1><p className="mt-3 max-w-lg text-white/85">Connect with students, mentors, and the universities that move you forward.</p></div></div>
      <section className="rounded-3xl bg-white p-5 shadow-header sm:p-9 lg:rounded-none lg:shadow-none">
        {forgotPassword ? <>
          <p className="eyebrow text-secondary">Account recovery</p>
          <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">Forgot password</h1>
          <p className="mt-2 text-sm text-on-surface-variant">Enter the email address associated with your account.</p>
          {resetConfirmation ? <div role="status" className="mt-7 rounded-xl bg-mint p-4 text-sm font-semibold text-on-tertiary-fixed-variant">
            <p>{resetConfirmation}</p>
          </div> : <form onSubmit={submitPasswordReset} noValidate className="mt-7 space-y-5">
            <label className="block text-sm font-semibold">Email address<input value={email} onChange={(event) => { setEmail(event.target.value); setErrors({}); }} type="email" autoComplete="email" placeholder="you@example.com" className="input mt-1.5" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'reset-email-error' : undefined}/>{errors.email && <span id="reset-email-error" role="alert" className="mt-1 block text-xs font-medium text-error">{errors.email}</span>}</label>
            <button type="submit" className="btn-primary h-12 w-full">Send code</button>
          </form>}
          <button type="button" onClick={() => { setForgotPassword(false); setErrors({}); setResetConfirmation(''); }} className="mt-6 text-sm font-semibold text-secondary">Back to log in</button>
        </> : <>
        <p className="eyebrow text-secondary">{registration ? 'Join the academic network' : 'Welcome back'}</p>
        <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">{registration ? 'Create your account' : 'Log in to Academix'}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{registration ? 'Choose how you’ll take part in the community.' : 'Continue your academic journey with your community.'}</p>
        {registration && <div role="tablist" aria-label="Account role" className="mx-auto mt-7 grid max-w-[640px] grid-cols-2 gap-3">{roles.map((item) => <button key={item.id} type="button" role="tab" aria-selected={role === item.id} onClick={() => { setRole(item.id); setRequestGold(false); setDocument(null); setMentorField(''); setDiplomaConfirmation(false); setErrors({}); }} className={cx('relative flex min-h-16 w-full min-w-0 items-center justify-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition', role === item.id ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low')}><Icon name={item.icon} className="shrink-0" /><span className={cx('min-w-0 flex-1 leading-tight', item.id === 'mentor' && 'pr-14')}>{item.label}</span>{item.id === 'mentor' && <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-gold-container px-1.5 py-0.5 text-[10px] text-gold"><Icon name="star" className="!text-[12px]" />Premium</span>}</button>)}</div>}
        <form onSubmit={submit} noValidate className={cx('mt-7', registration ? 'mx-auto max-w-[640px] space-y-6' : 'space-y-5')}>
          {registration && <div className="space-y-5">
            <label className="block text-sm font-semibold">Full Legal Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.name)}/>{errors.name && <span className="mt-1 block text-xs text-error">{errors.name}</span>}</label>
            <label className="block text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.email)}/>{errors.email && <span className="mt-1 block text-xs text-error">{errors.email}</span>}</label>
            {passwordInput('password')}
            {passwordInput('confirm')}
            {role === 'mentor' ? <SearchableSelect label="What field do you teach in?" value={mentorField} onChange={setMentorField} options={majors} placeholder="Select your field" error={errors.mentorField} /> : role === 'prospective' ? <div className="grid gap-5 sm:grid-cols-2"><SearchableSelect label="Dream University" value={university} onChange={setUniversity} options={universities} optional/><SearchableSelect label="Dream Major" value={major} onChange={setMajor} options={majors} optional/></div> : <div className={cx('grid gap-5', role === 'scholar' ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              <SearchableSelect label="University" value={university} onChange={setUniversity} options={universities} error={errors.university}/>
              <SearchableSelect label={role === 'faculty' ? 'Major / Subject taught' : 'Major'} value={major} onChange={setMajor} options={majors} error={errors.major}/>
              {role === 'scholar' && <label className="block text-sm font-semibold">Graduation year<select value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} className="input mt-2 !bg-surface-container-low/40 !py-[9px]" aria-invalid={Boolean(errors.graduationYear)}><option value="">Select graduation year</option>{Array.from({ length: 32 }, (_, index) => String(2000 + index)).map((year) => <option key={year}>{year}</option>)}</select>{errors.graduationYear && <span className="mt-1 block text-xs text-error">{errors.graduationYear}</span>}</label>}
            </div>}
            {role === 'mentor' ? <button type="button" onClick={() => setGoldModalOpen(true)} className="w-full rounded-xl border border-gold/40 bg-gold-container/40 p-4 text-left transition hover:bg-gold-container/70">
              <span className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="workspace_premium" className="text-gold" />Request Gold Verification</span>
              <span className="mt-1 block text-xs text-on-surface-variant">Upload your diploma to get the Gold Verified badge. Optional during sign-up.</span>
              {diplomaConfirmation && <span role="status" className="mt-2 block text-xs font-semibold text-green-700">Diploma uploaded – pending review</span>}
            </button> : role !== 'prospective' && <GoldVerificationSection
              role={role}
              requestGold={requestGold}
              setRequestGold={setRequestGold}
              method={method}
              setMethod={setMethod}
              document={document}
              setDocument={setDocument}
              eduEmail={eduEmail}
              setEduEmail={setEduEmail}
              errors={errors}
              setErrors={setErrors}
            />}
          </div>}
          {!registration && <><label className="block text-sm font-semibold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="input mt-1.5" aria-invalid={Boolean(errors.email)}/>{errors.email && <span className="mt-1 block text-xs text-error">{errors.email}</span>}</label>{passwordInput('password')}</>}
          {errors.form && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{errors.form}</p>}
          <button type="submit" disabled={busy} className={cx('btn-primary h-12 w-full', registration && 'mt-1')}>{busy ? 'Please wait…' : registration ? 'Create account' : 'Log in'}</button>
          <div className="flex items-center justify-between gap-4 text-sm">
            {registration ? (
              <button type="button" onClick={() => { switchMode('login'); setErrors({}); }} className="font-semibold text-secondary">I already have an account</button>
            ) : (
              <>
                <button type="button" onClick={() => { setForgotPassword(true); setErrors({}); setResetConfirmation(''); }} className="font-semibold text-secondary">Forgot your password?</button>
                <button type="button" onClick={() => { switchMode('register'); setErrors({}); }} className="font-semibold text-secondary">Create account</button>
              </>
            )}
          </div>
        </form>
        </>}
      </section>
    </main>
    <Modal open={goldModalOpen} onClose={() => setGoldModalOpen(false)} label="Gold Verification">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-gold">Premium verification</p>
            <h2 className="mt-1 font-headline text-2xl font-semibold text-primary">Gold Verification</h2>
          </div>
          <button type="button" onClick={() => setGoldModalOpen(false)} className="rounded-full p-1.5 hover:bg-surface-container-low" aria-label="Close"><Icon name="close" /></button>
        </div>
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low/40 px-4 py-6 text-center">
          <Icon name="upload_file" className="text-gold" />
          <span className="mt-2 text-sm font-semibold">Upload your diploma</span>
          <span className="mt-1 text-xs text-on-surface-variant">JPG or PNG</span>
          <span className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white">Choose file</span>
          <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => setDiploma(event.target.files?.[0] ?? null)} />
        </label>
        {diplomaPreview && <div className="mt-4 rounded-xl border border-outline-variant p-3"><img src={diplomaPreview} alt="Selected diploma preview" className="max-h-48 w-full rounded-lg object-contain" /><div className="mt-2 flex justify-end gap-3"><button type="button" onClick={() => setDiploma(null)} className="text-xs font-semibold text-error">Remove</button><label className="cursor-pointer text-xs font-semibold text-secondary">Replace<input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => setDiploma(event.target.files?.[0] ?? null)} /></label></div></div>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setGoldModalOpen(false)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant">Cancel</button><button type="button" disabled={!diploma} onClick={() => { setDiplomaConfirmation(true); setRequestGold(true); setGoldModalOpen(false); }} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">Submit</button></div>
      </div>
    </Modal>
  </div>;
}
