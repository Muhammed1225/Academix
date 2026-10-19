import { createServer } from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const dataFile = resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'users.json');
const verificationDirectory = resolve(dirname(dataFile), 'verification-documents');
const sessions = new Map();
const users = new Map();
const port = Number(process.env.AUTH_PORT || 3001);

try {
  const saved = JSON.parse(await readFile(dataFile, 'utf8'));
  for (const user of saved) users.set(user.email, user);
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
    !['application/pdf', 'image/jpeg', 'image/png'].includes(document.mimeType) ||
    typeof document.base64 !== 'string' ||
    document.base64.length > Math.ceil((5 * 1024 * 1024) / 3) * 4
  ) {
    return null;
  }

  const content = Buffer.from(document.base64, 'base64');
  if (!content.length || content.length > 5 * 1024 * 1024 || content.toString('base64') !== document.base64) return null;

  const validSignature =
    (document.mimeType === 'application/pdf' && content.subarray(0, 5).toString() === '%PDF-') ||
    (document.mimeType === 'image/jpeg' && content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (document.mimeType === 'image/png' && content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));

  return validSignature ? content : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/auth/session') {
    const token = req.headers.cookie?.match(/(?:^|;\s*)academix_session=([^;]+)/)?.[1];
    const session = token && sessions.get(token);
    if (!session || session.expires < Date.now()) {
      if (token) sessions.delete(token);
      sendJson(res, 200, { authenticated: false });
    } else {
      sendJson(res, 200, { authenticated: true });
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

    if (url.pathname.endsWith('/register')) {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (name.split(/\s+/).filter(Boolean).length < 2) {
        sendJson(res, 400, { error: 'Enter your first and last name.' });
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
      if (isVerificationRequest && verificationMethod === 'edu_email' && !email.endsWith('.edu')) {
        sendJson(res, 400, { error: 'Use an institutional .edu email for this verification option.' });
        return;
      }
      const identityDocument = input.identityDocument ? decodeIdentityDocument(input.identityDocument) : null;
      if (input.identityDocument && !identityDocument) {
        sendJson(res, 400, { error: 'Upload a valid PDF, JPG, or PNG identity document no larger than 5 MB.' });
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
        email,
        name,
        role: input.role,
        verificationStatus: isVerificationRequest ? 'pending' : 'unverified',
        ...(isVerificationRequest
          ? { verificationRequest: { method: verificationMethod, submittedAt: new Date().toISOString() } }
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
    } else {
      const user = users.get(email);
      if (!user) {
        // Spend comparable work for unknown accounts to reduce email enumeration timing differences.
        await passwordHash(password, Buffer.alloc(16));
        sendJson(res, 401, { error: 'Email or password is incorrect.' });
        return;
      }
      const candidate = await passwordHash(password, Buffer.from(user.salt, 'hex'));
      if (!timingSafeEqual(candidate, Buffer.from(user.hash, 'hex'))) {
        sendJson(res, 401, { error: 'Email or password is incorrect.' });
        return;
      }
    }

    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { email, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const cookie = `academix_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    sendJson(res, 200, { ok: true, ...(url.pathname.endsWith('/register') ? { verificationStatus: input.verificationStatus } : {}) }, { 'Set-Cookie': cookie });
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
