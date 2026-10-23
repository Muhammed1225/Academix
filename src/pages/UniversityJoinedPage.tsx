import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import SearchableSelect from '../components/SearchableSelect';
import { Icon } from '../components/ui';
import { saveProfile } from '../authService';
import { majors, universities } from '../data/educationOptions';
import { useApp } from '../store';

const graduationYears = Array.from({ length: 32 }, (_, index) => String(2000 + index));

export default function UniversityJoinedPage() {
  const user = useApp((state) => state.user);
  const authChecked = useApp((state) => state.authChecked);
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const showToast = useApp((state) => state.showToast);
  const navigate = useNavigate();
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!authChecked) {
    return <div role="status" className="card mx-auto max-w-3xl p-8 text-center text-on-surface-variant">Loading your account…</div>;
  }
  if (!user) return <Navigate to="/auth?mode=create" replace />;
  if (user.role !== 'prospective') return <Navigate to="/profile" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!university || !major || !graduationYear) {
      setError('Choose your university, major, and expected graduation year.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await saveProfile({
        role: 'scholar',
        university,
        major,
        graduationYear: Number(graduationYear),
      });
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Unable to save your university details. Please try again.');
        return;
      }
      setAuthenticatedUser(result.user);
      showToast('University details saved — your student profile is updated', 'school');
      navigate('/profile', { replace: true });
    } catch {
      setError('Unable to save your university details right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/profile" className="btn-ghost mb-5"><Icon name="arrow_back" /> Back to profile</Link>
      <section className="card p-5 sm:p-8">
        <div className="mb-7">
          <p className="eyebrow text-secondary">Student profile update</p>
          <h1 className="mt-2 font-headline text-3xl font-semibold text-primary">I have entered a university</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Add the university you joined, your major, and expected graduation year. Your account will be updated from prospective student to student / scholar.
          </p>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <SearchableSelect label="University joined" value={university} onChange={setUniversity} options={universities} />
          <SearchableSelect label="Major" value={major} onChange={setMajor} options={majors} />
          <label className="block text-sm font-semibold">
            Expected graduation year
            <select value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} className="input mt-2">
              <option value="">Choose graduation year</option>
              {graduationYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          {error && <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error}</p>}
          <div className="flex justify-end border-t border-outline-variant/50 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save university details'}
              <Icon name="check" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
