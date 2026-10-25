import type { AuthenticatedUser } from './store';

type AuthMode = 'login' | 'register';
type ProfileChanges = Partial<Pick<AuthenticatedUser, 'name' | 'photo' | 'biography' | 'interests' | 'purpose' | 'location' | 'university' | 'major' | 'role' | 'bannerBackground'>> & {
  bannerImage?: string | null;
  bannerImagePosition?: string | null;
  bannerImageZoom?: number | null;
  graduationYear?: number | null;
  requestGoldVerification?: boolean;
  verificationMethod?: 'identity_document' | 'edu_email';
  eduEmail?: string;
  identityDocument?: {
    type: 'student_card' | 'work_card';
    mimeType: string;
    base64: string;
  };
};

const testAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false';
const accountsKey = 'academix.test.accounts';
const sessionKey = 'academix.test.session';

interface AuthResult {
  ok: boolean;
  user?: AuthenticatedUser;
  verificationStatus?: 'pending' | 'unverified';
  error?: string;
}

function readAccounts(): Record<string, AuthenticatedUser> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(accountsKey) ?? '{}');
    return stored && typeof stored === 'object' && !Array.isArray(stored)
      ? stored as Record<string, AuthenticatedUser>
      : {};
  } catch {
    return {};
  }
}

function writeTestUser(user: AuthenticatedUser) {
  const accounts = readAccounts();
  accounts[user.email] = user;
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
  localStorage.setItem(sessionKey, user.email);
}

function displayNameFromEmail(email: string) {
  return email.split('@')[0]
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part[0].toLocaleUpperCase() + part.slice(1))
    .join(' ') || 'Test User';
}

function testAuthenticate(mode: AuthMode, input: Record<string, unknown>): AuthResult {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!email) return { ok: false, error: 'Enter a valid email address.' };

  const accounts = readAccounts();
  const savedUser = accounts[email];
  const role = input.role === 'scholar' || input.role === 'faculty' ? input.role : 'prospective';
  const graduationYear = Number(input.graduationYear);
  const user: AuthenticatedUser = mode === 'register' || !savedUser
    ? {
        id: savedUser?.id ?? `test-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
        email,
        name: typeof input.name === 'string' && input.name.trim() ? input.name.trim() : displayNameFromEmail(email),
        role,
        ...(typeof input.university === 'string' && input.university ? { university: input.university } : {}),
        ...(typeof input.major === 'string' && input.major ? { major: input.major } : {}),
        ...(Number.isInteger(graduationYear) && graduationYear > 0 ? { graduationYear } : {}),
        verificationStatus: 'unverified',
        photo: savedUser?.photo ?? '',
        biography: savedUser?.biography ?? '',
        interests: savedUser?.interests ?? [],
        purpose: savedUser?.purpose ?? '',
        ...(savedUser?.bannerBackground ? { bannerBackground: savedUser.bannerBackground } : {}),
        ...(savedUser?.location ? { location: savedUser.location } : {}),
      }
    : savedUser;

  writeTestUser(user);
  return { ok: true, user, verificationStatus: user.verificationStatus === 'pending' ? 'pending' : 'unverified' };
}

export async function authenticate(mode: AuthMode, input: Record<string, unknown>): Promise<AuthResult> {
  if (testAuthEnabled) return testAuthenticate(mode, input);

  try {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(input),
    });
    const result = await response.json() as AuthResult;
    return response.ok ? result : { ...result, ok: false };
  } catch {
    return { ok: false, error: 'Unable to reach the authentication service. Please try again.' };
  }
}

export async function loadAuthSession(): Promise<AuthenticatedUser | null> {
  if (testAuthEnabled) {
    const email = localStorage.getItem(sessionKey);
    return email ? readAccounts()[email] ?? null : null;
  }

  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Unable to load the current session.');
  const session = await response.json() as { authenticated: boolean; user?: AuthenticatedUser };
  return session.authenticated ? session.user ?? null : null;
}

export async function saveProfile(changes: ProfileChanges): Promise<AuthResult> {
  if (testAuthEnabled) {
    const email = localStorage.getItem(sessionKey);
    const user = email ? readAccounts()[email] : undefined;
    if (!user) return { ok: false, error: 'Sign in to update your profile.' };
    if (changes.role !== undefined) {
      if (!['scholar', 'prospective', 'faculty'].includes(changes.role) || changes.role === user.role) {
        return { ok: false, error: 'Choose a different valid account role.' };
      }
      const university = typeof changes.university === 'string' ? changes.university.trim() : '';
      const major = typeof changes.major === 'string' ? changes.major.trim() : '';
      if (changes.role !== 'prospective' && (!university || !major)) {
        return { ok: false, error: 'Choose your university and major or subject.' };
      }
      if (changes.role === 'scholar' &&
        (!Number.isInteger(changes.graduationYear) || Number(changes.graduationYear) < 2000 || Number(changes.graduationYear) > 2100)) {
        return { ok: false, error: 'Choose a valid graduation year.' };
      }
      const requestingVerification = changes.requestGoldVerification === true;
      if (requestingVerification && !['scholar', 'faculty'].includes(changes.role)) {
        return { ok: false, error: 'Gold verification is available for student / scholar and faculty / representative accounts.' };
      }
      if (requestingVerification && !['identity_document', 'edu_email'].includes(changes.verificationMethod ?? '')) {
        return { ok: false, error: 'Choose a valid verification method.' };
      }
      if (requestingVerification && changes.verificationMethod === 'edu_email' &&
        !/^[^@\s]+@[^@\s]+\.edu$/i.test((changes.eduEmail ?? '').trim())) {
        return { ok: false, error: 'Enter a valid institutional .edu email for this verification option.' };
      }
      if (requestingVerification && changes.verificationMethod === 'identity_document' &&
        (!changes.identityDocument || !['image/jpeg', 'image/png'].includes(changes.identityDocument.mimeType) ||
          !['student_card', 'work_card'].includes(changes.identityDocument.type) ||
          changes.identityDocument.type !== (changes.role === 'faculty' ? 'work_card' : 'student_card') ||
          !changes.identityDocument.base64 || changes.identityDocument.base64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4)) {
        return { ok: false, error: changes.role === 'faculty'
          ? 'Upload a faculty or work ID to request Gold verification.'
          : 'Upload a student or work card to request Gold verification.' };
      }
    }
    const { graduationYear } = changes;
    const profile: Partial<AuthenticatedUser> = {
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.photo !== undefined ? { photo: changes.photo } : {}),
      ...(changes.biography !== undefined ? { biography: changes.biography } : {}),
      ...(changes.interests !== undefined ? { interests: changes.interests } : {}),
      ...(changes.purpose !== undefined ? { purpose: changes.purpose } : {}),
      ...(changes.location !== undefined ? { location: changes.location } : {}),
      ...(changes.university !== undefined ? { university: changes.university } : {}),
      ...(changes.major !== undefined ? { major: changes.major } : {}),
      ...(changes.role !== undefined ? { role: changes.role } : {}),
    };
    const updated = { ...user, ...profile };
    if (changes.role !== undefined) {
      const university = typeof changes.university === 'string' ? changes.university.trim() : '';
      const major = typeof changes.major === 'string' ? changes.major.trim() : '';
      updated.role = changes.role;
      if (university) updated.university = university;
      else delete updated.university;
      if (major) updated.major = major;
      else delete updated.major;
      updated.verificationStatus = changes.requestGoldVerification ? 'pending' : 'unverified';
    }
    if (graduationYear === null || (changes.role !== undefined && changes.role !== 'scholar')) delete updated.graduationYear;
    else if (graduationYear !== undefined) updated.graduationYear = graduationYear;
    if (changes.bannerImage === null || changes.bannerImage === '') delete updated.bannerImage;
    if (changes.bannerImage === null || changes.bannerImage === '') {
      delete updated.bannerImagePosition;
      delete updated.bannerImageZoom;
    }
    writeTestUser(updated);
    return { ok: true, user: updated };
  }

  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(changes),
    });
    const result = await response.json() as AuthResult;
    return response.ok ? result : { ...result, ok: false };
  } catch {
    return { ok: false, error: 'Unable to reach the profile service. Please try again.' };
  }
}

export async function signOut(): Promise<void> {
  if (testAuthEnabled) {
    localStorage.removeItem(sessionKey);
    return;
  }

  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Sign out request failed.');
}
