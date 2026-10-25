export type GoldRole = 'scholar' | 'faculty';
export type VerificationMethod = 'identity_document' | 'edu_email';
export type GoldVerificationErrors = Record<string, string>;

export interface GoldVerificationInput {
  role: GoldRole;
  requestGold: boolean;
  method: VerificationMethod;
  eduEmail: string;
  document: File | null;
}

export function validateGoldVerification({
  role,
  requestGold,
  method,
  eduEmail,
  document,
}: GoldVerificationInput): GoldVerificationErrors {
  const errors: GoldVerificationErrors = {};
  if (!requestGold) return errors;
  if (method === 'edu_email' && !/^[^@\s]+@[^@\s]+\.edu$/i.test(eduEmail.trim())) {
    errors.eduEmail = 'Enter a valid .edu email address.';
  }
  if (method === 'identity_document' && !document) {
    errors.document = `Upload a photo of your ${role === 'faculty' ? 'faculty or work ID' : 'student card'}.`;
  }
  if (document && (!['image/jpeg', 'image/png'].includes(document.type) || document.size > 5 * 1024 * 1024)) {
    errors.document = 'Choose a JPG or PNG image no larger than 5 MB.';
  }
  return errors;
}

export function readIdentityDocument(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result.slice(reader.result.indexOf(',') + 1))
      : reject(new Error('Unable to read file'));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}
