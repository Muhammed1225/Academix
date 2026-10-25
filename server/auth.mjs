import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const dataFile = resolve(process.env.AUTH_DATA_FILE || resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'users.json'));
const verificationDirectory = resolve(dirname(dataFile), 'verification-documents');
const sessions = new Map();
const users = new Map();
const profileBannerBackgrounds = new Set([
  'academix',
  'deep-blue',
  'ocean-teal',
  'purple',
  'sunset-orange',
  'emerald-green',
  'rose-pink',
  'slate-gray',
  'midnight-dark',
  'sky-blue',
  'indigo',
  'lavender',
  'coral',
  'amber',
  'forest-green',
  'mint',
  'berry',
  'copper',
]);
const isProfileBannerBackground = (value) =>
  typeof value === 'string' && (profileBannerBackgrounds.has(value) || /^#[\da-f]{6}$/i.test(value));
function isProfileBannerImage(value) {
  const match = typeof value === 'string' &&
    value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  const content = match ? Buffer.from(match[2], 'base64') : null;
  if (!match || !content?.length || content.length > 5 * 1024 * 1024 || content.toString('base64') !== match[2]) return false;
  if (match[1] === 'image/jpeg') return content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (match[1] === 'image/png') return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return match[1] === 'image/webp' &&
    content.toString('ascii', 0, 4) === 'RIFF' &&
    content.toString('ascii', 8, 12) === 'WEBP';
}
const port = Number(process.env.AUTH_PORT || 3001);
const allowTestLogin = process.env.NODE_ENV !== 'production' && process.env.AUTH_ALLOW_TEST_LOGIN !== 'false';

try {
  const saved = JSON.parse(await readFile(dataFile, 'utf8'));
  let migrated = false;
  for (const user of saved) {
    if (!user.id) {
      user.id = randomUUID();
      migrated = true;
    }
    users.set(user.email, user);
  }
  if (migrated) await saveUsers();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

async function saveUsers() {
  const tempFile = `${dataFile}.tmp`;
  await mkdir(dirname(dataFile), { recursive: true, mode: 0o700 });
  await writeFile(tempFile, JSON.stringify([...users.values()]), { mode: 0o600 });
  await rename(tempFile, dataFile);
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function publicUser(user) {
  const bannerImageValid = isProfileBannerImage(user.bannerImage);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.location ? { location: user.location } : {}),
    ...(user.university ? { university: user.university } : {}),
    ...(user.major ? { major: user.major } : {}),
    ...(user.graduationYear ? { graduationYear: user.graduationYear } : {}),
    ...(isProfileBannerBackground(user.bannerBackground) ? { bannerBackground: user.bannerBackground } : {}),
    ...(bannerImageValid ? { bannerImage: user.bannerImage } : {}),
    ...(bannerImageValid && typeof user.bannerImagePosition === 'string' && /^(?:100|[1-9]?\d)% (?:100|[1-9]?\d)%$/.test(user.bannerImagePosition) ? { bannerImagePosition: user.bannerImagePosition } : {}),
    ...(bannerImageValid && Number.isFinite(user.bannerImageZoom) && user.bannerImageZoom >= 1 && user.bannerImageZoom <= 2.5 ? { bannerImageZoom: user.bannerImageZoom } : {}),
    verificationStatus: user.verificationStatus,
    photo: user.photo || '',
    biography: user.biography || '',
    interests: Array.isArray(user.interests) ? user.interests : [],
    purpose: user.purpose || '',
  };
}

function authenticatedSession(req) {
  const token = req.headers.cookie?.match(/(?:^|;\s*)academix_session=([^;]+)/)?.[1];
  const session = token && sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return { session: null, user: null };
  }
  return { session, user: session.user || users.get(session.email) || null };
}

async function readBody(req, maxBytes = 16_384) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > maxBytes) throw new Error('Request too large');
    chunks.push(data);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function passwordHash(password, salt) {
  return scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
}

function decodeIdentityDocument(document) {
  if (
    !document ||
    !['student_card', 'work_card'].includes(document.type) ||
    !['image/jpeg', 'image/png'].includes(document.mimeType) ||
    typeof document.base64 !== 'string' ||
    document.base64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4
  ) {
    return null;
  }

  const content = Buffer.from(document.base64, 'base64');
  if (!content.length || content.length > 5 * 1024 * 1024 || content.toString('base64') !== document.base64) return null;

  const validSignature =
    (document.mimeType === 'image/jpeg' && content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (document.mimeType === 'image/png' && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));

  return validSignature ? content : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/auth/session') {
    const { user } = authenticatedSession(req);
    sendJson(res, 200, user ? { authenticated: true, user: publicUser(user) } : { authenticated: false });
    return;
  }
  if (req.method === 'PUT' && url.pathname === '/api/auth/profile') {
    const { session, user } = authenticatedSession(req);
    if (!user) {
      sendJson(res, 401, { error: 'Sign in to update your profile.' });
      return;
    }
    if (!req.headers['content-type']?.startsWith('application/json')) {
      sendJson(res, 415, { error: 'Expected a JSON request' });
      return;
    }
    try {
      const input = await readBody(req, 7_100_000);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        sendJson(res, 400, { error: 'Invalid profile update.' });
        return;
      }
      const updated = { ...user };
      if (input.name !== undefined) {
        if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) {
          sendJson(res, 400, { error: 'Enter a name no longer than 100 characters.' });
          return;
        }
        updated.name = input.name.trim();
      }
      if (input.biography !== undefined) {
        if (typeof input.biography !== 'string' || input.biography.length > 5_000) {
          sendJson(res, 400, { error: 'Biography must be 5,000 characters or fewer.' });
          return;
        }
        updated.biography = input.biography;
      }
      if (input.interests !== undefined) {
        if (!Array.isArray(input.interests) || input.interests.length > 30 ||
          input.interests.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 80)) {
          sendJson(res, 400, { error: 'Choose up to 30 valid interests.' });
          return;
        }
        updated.interests = [...new Set(input.interests.map((item) => item.trim()))];
      }
      if (input.purpose !== undefined) {
        if (typeof input.purpose !== 'string' || input.purpose.length > 200) {
          sendJson(res, 400, { error: 'Purpose must be 200 characters or fewer.' });
          return;
        }
        updated.purpose = input.purpose;
      }
      if (input.bannerBackground !== undefined) {
        if (!isProfileBannerBackground(input.bannerBackground)) {
          sendJson(res, 400, { error: 'Choose a valid profile banner background.' });
          return;
        }
        updated.bannerBackground = input.bannerBackground;
      }
      if (input.bannerImage !== undefined) {
        if (input.bannerImage === null || input.bannerImage === '') {
          delete updated.bannerImage;
          delete updated.bannerImagePosition;
          delete updated.bannerImageZoom;
        } else if (!isProfileBannerImage(input.bannerImage)) {
          sendJson(res, 400, { error: 'Choose a valid JPG, PNG, or WebP banner image no larger than 5 MB.' });
          return;
        } else {
          updated.bannerImage = input.bannerImage;
        }
      }
      if (input.bannerImagePosition !== undefined) {
        if (input.bannerImagePosition === null || input.bannerImagePosition === '') {
          delete updated.bannerImagePosition;
        } else if (typeof input.bannerImagePosition !== 'string' ||
          !/^(?:100|[1-9]?\d)% (?:100|[1-9]?\d)%$/.test(input.bannerImagePosition) || !updated.bannerImage) {
          sendJson(res, 400, { error: 'Choose a valid banner image position.' });
          return;
        } else {
          updated.bannerImagePosition = input.bannerImagePosition;
        }
      }
      if (input.bannerImageZoom !== undefined) {
        if (input.bannerImageZoom === null) {
          delete updated.bannerImageZoom;
        } else if (!Number.isFinite(input.bannerImageZoom) || input.bannerImageZoom < 1 || input.bannerImageZoom > 2.5 || !updated.bannerImage) {
          sendJson(res, 400, { error: 'Choose a valid banner image zoom.' });
          return;
        } else {
          updated.bannerImageZoom = input.bannerImageZoom;
        }
      }
      if (input.photo !== undefined) {
        if (input.photo === '') {
          updated.photo = '';
        } else {
          const match = typeof input.photo === 'string' &&
            input.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
          const content = match ? Buffer.from(match[2], 'base64') : null;
          if (!match || !content?.length || content.length > 5 * 1024 * 1024 || content.toString('base64') !== match[2]) {
            sendJson(res, 400, { error: 'Choose a JPG, PNG, or WebP image no larger than 5 MB.' });
            return;
          }
          updated.photo = input.photo;
        }
      }
      if (input.university !== undefined) {
        if (typeof input.university !== 'string' || input.university.length > 200) {
          sendJson(res, 400, { error: 'University must be 200 characters or fewer.' });
          return;
        }
        if (input.university.trim()) updated.university = input.university.trim();
        else delete updated.university;
      }
      if (input.location !== undefined) {
        if (typeof input.location !== 'string' || input.location.length > 200) {
          sendJson(res, 400, { error: 'Location must be 200 characters or fewer.' });
          return;
        }
        if (input.location.trim()) updated.location = input.location.trim();
        else delete updated.location;
      }
      if (input.major !== undefined) {
        if (typeof input.major !== 'string' || input.major.length > 200) {
          sendJson(res, 400, { error: 'Major or subject must be 200 characters or fewer.' });
          return;
        }
        if (input.major.trim()) updated.major = input.major.trim();
        else delete updated.major;
      }
      if (input.graduationYear !== undefined) {
        if (input.graduationYear === null || input.graduationYear === '') {
          delete updated.graduationYear;
        } else if (!Number.isInteger(input.graduationYear) || input.graduationYear < 1900 || input.graduationYear > 2100) {
          sendJson(res, 400, { error: 'Enter a valid graduation year.' });
          return;
        } else {
          updated.graduationYear = input.graduationYear;
        }
      }
      if (input.role !== undefined) {
        if (user.role !== 'prospective' || input.role !== 'scholar') {
          sendJson(res, 403, { error: 'Only prospective students can update their account to student / scholar.' });
          return;
        }
        if (!updated.university || !updated.major || !Number.isInteger(updated.graduationYear) ||
          updated.graduationYear < 2000 || updated.graduationYear > 2100) {
          sendJson(res, 400, { error: 'Choose your university, major, and a valid graduation year before updating your account.' });
          return;
        }
        updated.role = 'scholar';
      }
      if (session.testOnly) {
        session.user = updated;
      } else {
        users.set(user.email, updated);
        try {
          await saveUsers();
        } catch (error) {
          users.set(user.email, user);
          throw error;
        }
      }
      sendJson(res, 200, { user: publicUser(updated) });
    } catch (error) {
      if (error instanceof SyntaxError || error.message === 'Request too large') {
        sendJson(res, 400, { error: 'Invalid profile update.' });
        return;
      }
      console.error('Profile update failed:', error);
      sendJson(res, 500, { error: 'Unable to save profile changes. Please try again.' });
    }
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = req.headers.cookie?.match(/(?:^|;\s*)academix_session=([^;]+)/)?.[1];
    if (token) sessions.delete(token);
    const clearCookie = `academix_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie });
    return;
  }
  if (req.method !== 'POST' || !['/api/auth/login', '/api/auth/register'].includes(url.pathname)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  if (!req.headers['content-type']?.startsWith('application/json')) {
    sendJson(res, 415, { error: 'Expected a JSON request' });
    return;
  }

  try {
    const input = await readBody(req, url.pathname.endsWith('/register') ? 7_100_000 : 16_384);
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 1 || password.length > 1024) {
      sendJson(res, 400, { error: 'Enter a valid email and password.' });
      return;
    }

    let authenticatedUser;
    let testOnly = false;
    if (url.pathname.endsWith('/register')) {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (name.split(/\s+/).filter(Boolean).length < 2) {
        sendJson(res, 400, { error: 'Enter your first and last name.' });
        return;
      }
      if (input.confirmPassword !== password) {
        sendJson(res, 400, { error: 'Passwords do not match.' });
        return;
      }
      if (
        password.length < 12 ||
        !/[A-Za-z]/.test(password) ||
        !/\d/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/[^A-Za-z0-9\s]/.test(password)
      ) {
        sendJson(res, 400, {
          error: 'Use at least 12 characters, including a letter, a number, an uppercase letter, and a special character.',
        });
        return;
      }
      if (!['scholar', 'prospective', 'faculty'].includes(input.role)) {
        sendJson(res, 400, { error: 'Choose a valid account role.' });
        return;
      }
      if (input.role !== 'prospective' && (!input.university || !input.major)) {
        sendJson(res, 400, { error: 'Choose your university and major or subject.' });
        return;
      }
      if (input.role === 'scholar' && (!Number.isInteger(Number(input.graduationYear)) || Number(input.graduationYear) < 2000 || Number(input.graduationYear) > 2100)) {
        sendJson(res, 400, { error: 'Choose a valid graduation year.' });
        return;
      }
      const isVerificationRequest = input.requestGoldVerification === true;
      if (isVerificationRequest && !['scholar', 'faculty'].includes(input.role)) {
        sendJson(res, 400, { error: 'Gold verification is available for student / scholar and faculty / representative accounts.' });
        return;
      }
      const verificationMethod = input.verificationMethod;
      if (isVerificationRequest && !['identity_document', 'edu_email'].includes(verificationMethod)) {
        sendJson(res, 400, { error: 'Choose a valid verification method.' });
        return;
      }
      const eduEmail = typeof input.eduEmail === 'string' ? input.eduEmail.trim().toLowerCase() : '';
      if (isVerificationRequest && verificationMethod === 'edu_email' && !/^[^@\s]+@[^@\s]+\.edu$/.test(eduEmail)) {
        sendJson(res, 400, { error: 'Enter a valid institutional .edu email for this verification option.' });
        return;
      }
      const identityDocument = input.identityDocument ? decodeIdentityDocument(input.identityDocument) : null;
      if (identityDocument && input.identityDocument.type !== (input.role === 'faculty' ? 'work_card' : 'student_card')) {
        sendJson(res, 400, { error: 'Choose the identity document type that matches your account role.' });
        return;
      }
      if (input.identityDocument && !identityDocument) {
        sendJson(res, 400, { error: 'Upload a valid JPG or PNG identity document no larger than 5 MB.' });
        return;
      }
      if (isVerificationRequest && verificationMethod === 'identity_document' && !identityDocument) {
        sendJson(res, 400, {
          error: input.role === 'faculty'
            ? 'Upload a faculty or work ID to request Gold verification.'
            : 'Upload a student or work card to request Gold verification.',
        });
        return;
      }
      if (verificationMethod === 'edu_email' && identityDocument) {
        sendJson(res, 400, { error: 'Choose either .edu email review or a student/work card.' });
        return;
      }
      if (!isVerificationRequest && input.identityDocument) {
        sendJson(res, 400, { error: 'Request verification to submit an identity document.' });
        return;
      }
      if (users.has(email)) {
        sendJson(res, 409, { error: 'An account with that email already exists. Try signing in.' });
        return;
      }
      const salt = randomBytes(16).toString('hex');
      const hash = (await passwordHash(password, Buffer.from(salt, 'hex'))).toString('hex');
      let verificationDocument;
      if (identityDocument) {
        const extension = input.identityDocument.mimeType === 'application/pdf' ? '.pdf' : input.identityDocument.mimeType === 'image/png' ? '.png' : '.jpg';
        const fileName = `${randomBytes(16).toString('hex')}${extension}`;
        await mkdir(verificationDirectory, { recursive: true, mode: 0o700 });
        await writeFile(resolve(verificationDirectory, fileName), identityDocument, { flag: 'wx', mode: 0o600 });
        verificationDocument = { fileName, type: input.identityDocument.type, submittedAt: new Date().toISOString() };
      }
      const user = {
        id: randomUUID(),
        email,
        name,
        role: input.role,
        ...(typeof input.university === 'string' && input.university ? { university: input.university } : {}),
        ...(typeof input.major === 'string' && input.major ? { major: input.major } : {}),
        ...(input.role === 'scholar' ? { graduationYear: Number(input.graduationYear) } : {}),
        verificationStatus: isVerificationRequest ? 'pending' : 'unverified',
        photo: '',
        biography: '',
        interests: [],
        purpose: '',
        ...(isVerificationRequest
          ? { verificationRequest: { method: verificationMethod, ...(verificationMethod === 'edu_email' ? { eduEmail } : {}), submittedAt: new Date().toISOString() } }
          : {}),
        ...(verificationDocument ? { verificationDocument } : {}),
        salt,
        hash,
      };
      users.set(email, user);
      try {
        await saveUsers();
      } catch (error) {
        users.delete(email);
        if (verificationDocument) {
          await unlink(resolve(verificationDirectory, verificationDocument.fileName)).catch((cleanupError) => {
            console.error('Unable to remove uncommitted verification document:', cleanupError);
          });
        }
        throw error;
      }
      input.verificationStatus = user.verificationStatus;
      authenticatedUser = user;
    } else {
      let user = users.get(email);
      if (!user) {
        if (allowTestLogin) {
          const displayName = email.split('@')[0]
            .split(/[._+-]+/)
            .filter(Boolean)
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(' ') || 'Test User';
          user = {
            id: `test-${randomUUID()}`,
            email,
            name: displayName,
            role: 'prospective',
            verificationStatus: 'unverified',
            photo: '',
            biography: '',
            interests: [],
            purpose: '',
          };
          testOnly = true;
        } else {
        // Spend comparable work for unknown accounts to reduce email enumeration timing differences.
        await passwordHash(password, Buffer.alloc(16));
        sendJson(res, 401, { error: 'Email or password is incorrect.' });
        return;
        }
      } else {
        const candidate = await passwordHash(password, Buffer.from(user.salt, 'hex'));
        if (!timingSafeEqual(candidate, Buffer.from(user.hash, 'hex'))) {
          sendJson(res, 401, { error: 'Email or password is incorrect.' });
          return;
        }
      }
      authenticatedUser = user;
    }

    const token = randomBytes(32).toString('base64url');
    sessions.set(token, {
      email,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      ...(testOnly ? { testOnly: true, user: authenticatedUser } : {}),
    });
    const cookie = `academix_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    sendJson(res, 200, {
      ok: true,
      user: publicUser(authenticatedUser),
      ...(testOnly ? { testLogin: true } : {}),
      ...(url.pathname.endsWith('/register') ? { verificationStatus: input.verificationStatus } : {}),
    }, { 'Set-Cookie': cookie });
  } catch (error) {
    if (error instanceof SyntaxError || error.message === 'Request too large') {
      sendJson(res, 400, { error: 'Invalid request.' });
      return;
    }
    console.error('Authentication request failed:', error);
    sendJson(res, 500, { error: 'Authentication service is unavailable. Please try again.' });
  }
});

server.listen(port, () => console.log(`Academix auth API listening on http://localhost:${port}`));
