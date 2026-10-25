import { Icon } from './ui';
import type { GoldRole, GoldVerificationErrors, VerificationMethod } from './goldVerification';

export default function GoldVerificationSection({
  role,
  requestGold,
  setRequestGold,
  method,
  setMethod,
  document,
  setDocument,
  eduEmail,
  setEduEmail,
  errors,
  setErrors,
}: {
  role: GoldRole;
  requestGold: boolean;
  setRequestGold: (value: boolean) => void;
  method: VerificationMethod;
  setMethod: (value: VerificationMethod) => void;
  document: File | null;
  setDocument: (value: File | null) => void;
  eduEmail: string;
  setEduEmail: (value: string) => void;
  errors: GoldVerificationErrors;
  setErrors: (errors: GoldVerificationErrors) => void;
}) {
  const verificationTitle = role === 'faculty' ? 'Faculty / Work ID' : 'Student card';

  return (
    <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/60 p-3.5">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input
          type="checkbox"
          checked={requestGold}
          onChange={(event) => { setRequestGold(event.target.checked); setErrors({}); }}
          className="accent-secondary"
        />
        Request gold verification
      </label>
      {requestGold && <div className="mt-3 space-y-3">
        <fieldset>
          <legend className="text-sm font-semibold">Verification method</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-white p-2.5 text-xs">
              <input type="radio" checked={method === 'identity_document'} onChange={() => setMethod('identity_document')} name="verification-method" className="accent-secondary" />
              {verificationTitle}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-white p-2.5 text-xs">
              <input type="radio" checked={method === 'edu_email'} onChange={() => setMethod('edu_email')} name="verification-method" className="accent-secondary" />
              .edu email
            </label>
          </div>
        </fieldset>
        {method === 'identity_document' ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-white px-3 py-4 text-center">
            <Icon name="cloud_upload" className="text-secondary" />
            <span className="mt-1 text-sm font-semibold">Upload image of your {verificationTitle.toLowerCase()}</span>
            <span className="mt-1 text-xs text-on-surface-variant">JPG or PNG, up to 5 MB</span>
            <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => setDocument(event.target.files?.[0] ?? null)} />
            {document && <span className="mt-2 max-w-full truncate text-xs text-secondary">{document.name}</span>}
            {errors.document && <span className="mt-2 text-xs text-error">{errors.document}</span>}
          </label>
        ) : (
          <label className="block text-sm font-semibold">
            Institutional .edu email
            <input
              type="email"
              value={eduEmail}
              onChange={(event) => setEduEmail(event.target.value)}
              placeholder="you@university.edu"
              className="input mt-2 !bg-surface-container-low/40 !py-[9px]"
              aria-invalid={Boolean(errors.eduEmail)}
            />
            {errors.eduEmail && <span className="mt-1 block text-xs text-error">{errors.eduEmail}</span>}
          </label>
        )}
      </div>}
    </div>
  );
}
