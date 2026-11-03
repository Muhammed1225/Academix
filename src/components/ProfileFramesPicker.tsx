import { useEffect, useState } from 'react';

import { saveProfile } from '../authService';
import { profileFrames, type ProfileFrameId } from '../data/profileFrames';
import type { AuthenticatedUser } from '../store';
import { useApp } from '../store';
import { Avatar, Icon } from './ui';

export default function ProfileFramesPicker({
  user,
  photo,
  name,
  selectedFrame,
  onClose,
  onSaved,
}: {
  user: AuthenticatedUser;
  photo: string;
  name: string;
  selectedFrame?: ProfileFrameId;
  onClose: () => void;
  onSaved: (frame?: ProfileFrameId) => void;
}) {
  const setAuthenticatedUser = useApp((state) => state.setAuthenticatedUser);
  const [draftFrame, setDraftFrame] = useState<ProfileFrameId | ''>(selectedFrame ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await saveProfile({ profileFrame: draftFrame || null });
      if (!result.ok || !result.user) {
        setError(result.error ?? 'Unable to save your profile frame. Please try again.');
        return;
      }
      setAuthenticatedUser({ ...user, ...result.user });
      onSaved(draftFrame || undefined);
      onClose();
    } catch {
      setError('Unable to reach the profile service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-primary/50 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="profile-frames-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-float sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-1 text-gold"><Icon name="workspace_premium" /> Premium feature</p>
            <h2 id="profile-frames-title" className="mt-1 font-headline text-2xl font-semibold text-primary">Profile Frames</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Choose an animated frame for your profile photo.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low" aria-label="Close profile frames"><Icon name="close" /></button>
        </div>

        <div className="my-6 flex flex-col items-center rounded-2xl bg-surface-container-low/60 px-4 py-6">
          <Avatar src={photo || undefined} name={name} size={112} rounded="rounded-full" profileFrame={draftFrame || undefined} />
          <span className="mt-4 text-sm font-semibold text-primary">{draftFrame ? profileFrames.find((frame) => frame.id === draftFrame)?.label : 'No frame'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <button
            type="button"
            aria-pressed={!draftFrame}
            onClick={() => setDraftFrame('')}
            className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${!draftFrame ? 'border-secondary bg-secondary-fixed text-secondary ring-2 ring-secondary/20' : 'border-outline-variant hover:bg-surface-container-low'}`}
          >
            <Avatar src={photo || undefined} name={name} size={48} rounded="rounded-full" />
            No frame
          </button>
          {profileFrames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              aria-pressed={draftFrame === frame.id}
              onClick={() => setDraftFrame(frame.id)}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${draftFrame === frame.id ? 'border-secondary bg-secondary-fixed text-secondary ring-2 ring-secondary/20' : 'border-outline-variant hover:bg-surface-container-low'}`}
            >
              <Avatar src={photo || undefined} name={name} size={48} rounded="rounded-full" profileFrame={frame.id} />
              <span className="inline-flex items-center gap-1"><Icon name={frame.icon} className="!text-[14px]" />{frame.label}</span>
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-medium text-error">{error}</p>}
        <div className="mt-6 flex justify-end gap-2 border-t border-outline-variant/50 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'} <Icon name="check" /></button>
        </div>
      </section>
    </div>
  );
}
