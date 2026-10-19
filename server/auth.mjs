import { createServer } from 'node:http';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const dataFile = resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'users.json');
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

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new Error('Request too large');
  }
  return JSON.parse(body);
}

async function passwordHash(password, salt) {
  return scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
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
    const input = await readBody(req);
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
      if (password.length < 12) {
        sendJson(res, 400, { error: 'Use at least 12 characters for your password.' });
        return;
      }
      if (!['scholar', 'prospective', 'faculty'].includes(input.role)) {
        sendJson(res, 400, { error: 'Choose a valid account role.' });
        return;
      }
      if (users.has(email)) {
        sendJson(res, 409, { error: 'An account with that email already exists. Try signing in.' });
        return;
      }
      const salt = randomBytes(16).toString('hex');
      const hash = (await passwordHash(password, Buffer.from(salt, 'hex'))).toString('hex');
      users.set(email, { email, name, role: input.role, salt, hash });
      try {
        await saveUsers();
      } catch (error) {
        users.delete(email);
        throw error;
      }
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
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': cookie });
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
