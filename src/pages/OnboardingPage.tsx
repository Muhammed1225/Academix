import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BrandMark, Icon, cx } from '../components/ui';
import { sanitizeRichText } from '../components/RichText';
import { defaultInterestEmoji, interestEmojis, interests } from '../data/interestOptions';
import { saveProfile } from '../authService';
import { useApp } from '../store';

const purposes = [
  { label: 'Discover universities and events', icon: 'explore' },
  { label: 'Connect with mentors and students', icon: 'groups' },
  { label: 'Share my interests and life updates', icon: 'dynamic_feed' },
  { label: 'Other', icon: 'more_horiz' },
];

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Unable to read the selected image.'));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useApp((state) => state.user);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState('');
  const [biography, setBiography] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [purpose, setPurpose] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [biographyFormats, setBiographyFormats] = useState({ bold: false, italic: false });
  const photoInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setPhoto(user.photo);
    setBiography(user.biography);
    setSelectedInterests(user.interests);
    setPurpose(user.purpose);
    if (editor.current) editor.current.innerHTML = sanitizeRichText(user.biography);
  }, [user]);

  const saveAndFinish = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const result = await saveProfile({ photo, biography, interests: selectedInterests, purpose });
      if (!result.ok || !result.user) {
        setSaveError(result.error ?? 'Unable to save your profile. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      navigate('/profile');
    } catch {
      setSaveError('Unable to reach the profile service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPhotoError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    try {
      setPhoto(await readImage(file));
      setPhotoError('');
    } catch {
      setPhotoError('Unable to read the selected image. Please try another one.');
    }
  };

  const updateBiography = () => {
    if (!editor.current) return;
    setBiography(sanitizeRichText(editor.current.innerHTML));
    setBiographyFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    });
  };

  const formatBiography = (format: 'bold' | 'italic') => {
    editor.current?.focus();
    document.execCommand(format);
    updateBiography();
  };

  const filteredInterests = interests.filter((interest) =>
    interest.toLocaleLowerCase().includes(interestSearch.trim().toLocaleLowerCase()),
  );

  const toggleInterest = (interest: string) => {
    setSelectedInterests((selected) => selected.includes(interest)
      ? selected.filter((item) => item !== interest)
      : [...selected, interest]);
  };

  return <div className="min-h-screen bg-surface px-4 py-5 sm:px-8 lg:px-12">
    <header className="mx-auto flex max-w-5xl items-center justify-between">
      <Link to="/" aria-label="Academix home"><BrandMark /></Link>
      <span className="text-sm font-medium text-on-surface-variant">Set up your profile</span>
    </header>
    <main className="mx-auto mt-7 max-w-5xl">
      <nav aria-label="Onboarding progress" className="mb-7">
        <ol className="grid grid-cols-3 gap-2">
          {['Create your profile', 'Interests', 'Your purpose'].map((label, index) => {
            const number = index + 1;
            const completed = step > number;
            const active = step === number;
            return <li key={label} className="min-w-0">
              <div className={cx('h-1 rounded-full', active || completed ? 'bg-secondary' : 'bg-outline-variant/50')} />
              <p className={cx('mt-2 truncate text-xs font-semibold sm:text-sm', active || completed ? 'text-secondary' : 'text-on-surface-variant')}>
                <span className="mr-1">{number}.</span>{label}
              </p>
            </li>;
          })}
        </ol>
      </nav>

      <section className="card mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
        {step === 1 && <>
          <div className="mb-7">
            <p className="eyebrow text-secondary">Step 1 of 3</p>
            <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">Create your profile</h1>
            <p className="mt-2 text-sm text-on-surface-variant">Introduce yourself to the Academix community.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-container-low/60 p-6 text-center">
              <h2 className="text-sm font-semibold text-primary">Profile picture</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Add a photo so people can recognize you.</p>
              {photo ? <img src={photo} alt="Profile preview" className="mt-5 h-36 w-36 rounded-full border-4 border-white object-cover shadow-float" /> : <div className="mt-5 flex h-36 w-36 items-center justify-center rounded-full bg-surface-container-high text-secondary">
                <Icon name="person" className="!text-6xl" />
              </div>}
              <input ref={photoInput} type="file" accept="image/*" onChange={selectPhoto} className="sr-only" aria-label="Choose profile picture" />
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => photoInput.current?.click()} className="btn-outline">{photo ? 'Change photo' : 'Choose photo'}</button>
                {photo && <button type="button" onClick={() => { setPhoto(''); setPhotoError(''); if (photoInput.current) photoInput.current.value = ''; }} className="btn-ghost">Remove</button>}
              </div>
              {photoError && <p role="alert" className="mt-3 text-xs font-medium text-error">{photoError}</p>}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-primary">Biography <span className="font-normal text-on-surface-variant">(optional)</span></h2>
              <p className="mt-1 text-xs text-on-surface-variant">Tell others a little about yourself.</p>
              <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant/70 bg-white focus-within:border-secondary/50 focus-within:ring-2 focus-within:ring-secondary/20">
                <div role="toolbar" aria-label="Biography formatting" className="flex gap-1 border-b border-outline-variant/50 p-2">
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatBiography('bold')} aria-label="Bold" aria-pressed={biographyFormats.bold} className={cx('flex h-9 w-9 items-center justify-center rounded-lg font-bold text-primary hover:bg-surface-container-low', biographyFormats.bold && 'bg-secondary-fixed text-secondary')}>B</button>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatBiography('italic')} aria-label="Italic" aria-pressed={biographyFormats.italic} className={cx('flex h-9 w-9 items-center justify-center rounded-lg font-serif italic text-primary hover:bg-surface-container-low', biographyFormats.italic && 'bg-secondary-fixed text-secondary')}>I</button>
                </div>
                <div
                  ref={editor}
                  contentEditable
                  role="textbox"
                  aria-label="Biography"
                  aria-multiline="true"
                  onInput={updateBiography}
                  dangerouslySetInnerHTML={{ __html: biography }}
                  className="rich-text min-h-40 p-3.5 text-sm leading-relaxed outline-none empty:before:text-outline empty:before:content-['Write_a_short_bio...']"
                />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-outline-variant/50 pt-5 sm:flex-row">
            <button type="button" onClick={() => setStep(2)} className="btn-ghost">Skip</button>
            <button type="button" onClick={() => setStep(2)} className="btn-primary">Continue <Icon name="arrow_forward" /></button>
          </div>
        </>}

        {step === 2 && <>
          <div className="mb-7">
            <p className="eyebrow text-secondary">Step 2 of 3</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="font-headline text-3xl font-semibold text-primary">What are you interested in?</h1>
              <label className="relative w-full sm:w-64 sm:shrink-0">
                <span className="sr-only">Search interests</span>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant" />
                <input
                  type="search"
                  value={interestSearch}
                  onChange={(event) => setInterestSearch(event.target.value)}
                  placeholder="Search interests"
                  className="input !py-2 pl-9 text-sm"
                />
              </label>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">Select at least 2 to help us tailor your experience.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredInterests.map((interest) => {
              const selected = selectedInterests.includes(interest);
              return <button key={interest} type="button" aria-pressed={selected} onClick={() => toggleInterest(interest)} className={cx('flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition sm:p-4', selected ? 'border-secondary bg-secondary-fixed text-secondary ring-2 ring-secondary/15' : 'border-outline-variant/70 bg-white text-on-surface hover:border-secondary/40 hover:bg-surface-container-low')}>
                <span className="text-xl" aria-hidden="true">{interestEmojis[interest] ?? defaultInterestEmoji}</span>
                <span>{interest}</span>
              </button>;
            })}
          </div>
          {filteredInterests.length === 0 && (
            <p className="mt-4 text-center text-sm text-on-surface-variant">No interests match “{interestSearch}”.</p>
          )}
          <p className="mt-4 text-xs text-on-surface-variant" aria-live="polite">{selectedInterests.length} selected</p>
          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-outline-variant/50 pt-5 sm:flex-row">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost"><Icon name="arrow_back" /> Back</button>
            <button type="button" disabled={selectedInterests.length < 2} onClick={() => setStep(3)} className="btn-primary">Continue <Icon name="arrow_forward" /></button>
          </div>
        </>}

        {step === 3 && <>
          <div className="mb-7">
            <p className="eyebrow text-secondary">Step 3 of 3</p>
            <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">What is your purpose for using the platform?</h1>
            <p className="mt-2 text-sm text-on-surface-variant">Choose what brings you to Academix.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {purposes.map((option) => {
              const selected = purpose === option.label;
              return <button key={option.label} type="button" aria-pressed={selected} onClick={() => setPurpose(option.label)} className={cx('flex min-h-24 items-center gap-4 rounded-xl border p-4 text-left font-semibold transition', selected ? 'border-secondary bg-secondary-fixed text-secondary ring-2 ring-secondary/15' : 'border-outline-variant/70 bg-white text-on-surface hover:border-secondary/40 hover:bg-surface-container-low')}>
                <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-white text-secondary' : 'bg-surface-container-low text-secondary')}><Icon name={option.icon} /></span>
                <span>{option.label}</span>
              </button>;
            })}
          </div>
          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-outline-variant/50 pt-5 sm:flex-row">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={() => setStep(4)} className="btn-ghost">Skip</button>
              <button type="button" onClick={() => setStep(2)} className="btn-ghost"><Icon name="arrow_back" /> Back</button>
            </div>
            <button type="button" disabled={!purpose} onClick={() => setStep(4)} className="btn-primary">Continue <Icon name="arrow_forward" /></button>
          </div>
        </>}

        {step === 4 && <div className="flex min-h-[420px] flex-col items-center justify-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-fixed text-secondary"><Icon name="north_east" className="!text-3xl" /></span>
          <h1 className="mt-6 font-headline text-4xl font-bold text-primary">Your profile is ready.</h1>
          <p className="mt-3 text-lg italic text-on-surface-variant">Let the adventure begin!</p>
          {saveError && <p role="alert" className="mt-4 text-sm font-medium text-error">{saveError}</p>}
          <button type="button" disabled={saving} onClick={() => void saveAndFinish()} className="btn-primary mt-10 min-w-48">{saving ? 'Saving…' : 'Go to profile'} <Icon name="arrow_forward" /></button>
        </div>}
      </section>
    </main>
  </div>;
}
