import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const dataFile = resolve(process.env.AUTH_DATA_FILE || resolve(dirname(fileURLToPath(import.meta.url)), 'data', 'users.json'));
const notificationsFile = resolve(dirname(dataFile), 'notifications.json');
const verificationDirectory = resolve(dirname(dataFile), 'verification-documents');
const catalogDirectory = resolve(dirname(dirname(fileURLToPath(import.meta.url))), 'data');
const [universityNames, majorNames] = await Promise.all([
  readFile(resolve(catalogDirectory, 'universities.txt'), 'utf8'),
  readFile(resolve(catalogDirectory, 'majors.txt'), 'utf8'),
]).then(([universitiesText, majorsText]) => [
  universitiesText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
  majorsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
]);
const sessions = new Map();
const users = new Map();
const peopleIndexes = { universities: new Map(), majors: new Map(), enrollmentYears: new Map() };
let notificationData = { items: [], preferences: {}, readConversations: {} };
let notificationSaveQueue = Promise.resolve();
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

function optionId(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const universityById = new Map(universityNames.map((name) => [optionId(name), name]));
const majorById = new Map(majorNames.map((name) => [optionId(name), name]));
const universityAliases = new Map([
  ['banm', 'Baku Higher Oil School (BHOS)'],
  ['bhos', 'Baku Higher Oil School (BHOS)'],
  ['baku higher oil school', 'Baku Higher Oil School (BHOS)'],
  ['ada', 'ADA University'],
]);

function universityId(value) {
  const normalized = value.trim().normalize('NFC').toLocaleLowerCase('en');
  const alias = universityAliases.get(normalized);
  const canonical = alias ?? universityNames.find((name) => name.toLocaleLowerCase('en') === normalized);
  return canonical ? optionId(canonical) : '';
}

function refreshPeopleIndexes() {
  for (const index of Object.values(peopleIndexes)) index.clear();
  for (const user of users.values()) {
    if (!user.discoverable) continue;
    for (const [index, value] of [
      [peopleIndexes.universities, user.universityId],
      [peopleIndexes.majors, user.majorId],
      [peopleIndexes.enrollmentYears, user.enrollmentYear],
    ]) {
      if (!value) continue;
      const key = String(value);
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(user.id);
    }
  }
}

try {
  const saved = JSON.parse(await readFile(dataFile, 'utf8'));
  let migrated = false;
  for (const user of saved) {
    if (!user.id) {
      user.id = randomUUID();
      migrated = true;
    }
    if (user.university && !user.universityId) {
      user.universityId = universityId(user.university) || optionId(user.university);
      migrated = true;
    }
    if (user.major && !user.majorId) {
      user.majorId = optionId(user.major);
      migrated = true;
    }
    users.set(user.email, user);
  }
  if (migrated) await saveUsers();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
refreshPeopleIndexes();

try {
  const saved = JSON.parse(await readFile(notificationsFile, 'utf8'));
  if (saved && Array.isArray(saved.items) && saved.preferences && typeof saved.preferences === 'object') {
    notificationData = {
      ...saved,
      items: saved.items.map((item) => {
        if (item.conversationId || !item.ticketId) return item;
        const { ticketId, ...notification } = item;
        return { ...notification, conversationId: ticketId };
      }),
      readConversations: saved.readConversations && typeof saved.readConversations === 'object' && !Array.isArray(saved.readConversations)
        ? saved.readConversations
        : saved.readTickets && typeof saved.readTickets === 'object' && !Array.isArray(saved.readTickets)
          ? saved.readTickets
          : {},
    };
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

async function saveUsers() {
  const tempFile = `${dataFile}.tmp`;
  await mkdir(dirname(dataFile), { recursive: true, mode: 0o700 });
  await writeFile(tempFile, JSON.stringify([...users.values()]), { mode: 0o600 });
  await rename(tempFile, dataFile);
}

function saveNotifications() {
  const snapshot = JSON.stringify(notificationData);
  const save = notificationSaveQueue.then(async () => {
    const tempFile = `${notificationsFile}.${randomUUID()}.tmp`;
    await mkdir(dirname(notificationsFile), { recursive: true, mode: 0o700 });
    await writeFile(tempFile, snapshot, { mode: 0o600 });
    await rename(tempFile, notificationsFile);
  });
  notificationSaveQueue = save.catch(() => {});
  return save;
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
    ...(user.universityId ? { universityId: user.universityId } : {}),
    ...(user.major ? { major: user.major } : {}),
    ...(user.majorId ? { majorId: user.majorId } : {}),
    ...(user.graduationYear ? { graduationYear: user.graduationYear } : {}),
    ...(user.expectedGraduationYear ? { expectedGraduationYear: user.expectedGraduationYear } : {}),
    ...(user.degreeLevel ? { degreeLevel: user.degreeLevel } : {}),
    ...(user.programmeDurationYears ? { programmeDurationYears: user.programmeDurationYears } : {}),
    ...(user.enrollmentYear ? { enrollmentYear: user.enrollmentYear } : {}),
    ...(user.yearOfStudyOverride ? { yearOfStudyOverride: user.yearOfStudyOverride } : {}),
    ...(typeof user.discoverable === 'boolean' ? { discoverable: user.discoverable } : {}),
    ...(typeof user.showUniversityInSearch === 'boolean' ? { showUniversityInSearch: user.showUniversityInSearch } : {}),
    ...(typeof user.showYearInSearch === 'boolean' ? { showYearInSearch: user.showYearInSearch } : {}),
    ...(Array.isArray(user.languages) ? { languages: user.languages } : {}),
    ...(typeof user.openToMessages === 'boolean' ? { openToMessages: user.openToMessages } : {}),
    ...(typeof user.openToMentoring === 'boolean' ? { openToMentoring: user.openToMentoring } : {}),
    ...(user.title ? { title: user.title } : {}),
    ...(user.department ? { department: user.department } : {}),
    ...(Array.isArray(user.blockedUserIds) ? { blockedUserIds: user.blockedUserIds } : {}),
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

function currentStudy(user, now = new Date()) {
  if (user.role !== 'scholar' || user.showYearInSearch === false) return null;
  const duration = Number.isInteger(user.programmeDurationYears) ? user.programmeDurationYears : null;
  if (Number.isInteger(user.yearOfStudyOverride)) {
    return { year: duration ? Math.min(user.yearOfStudyOverride, duration) : user.yearOfStudyOverride, duration };
  }
  if (!Number.isInteger(user.enrollmentYear)) return null;
  const academicYear = now.getFullYear() - (now.getMonth() < 8 ? 1 : 0);
  const year = academicYear - user.enrollmentYear + 1;
  if (year < 1) return null;
  if (duration && year > duration) {
    return { year: null, duration, graduatedYear: user.expectedGraduationYear ?? user.enrollmentYear + duration };
  }
  return { year: duration ? Math.min(year, duration) : year, duration };
}

function parsePeopleList(url, key, max = 10) {
  const values = url.searchParams.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  if (values.length > max || values.some((value) => value.length > 100)) return null;
  return [...new Set(values)];
}

function peopleShortUniversity(name) {
  return name
    .replace(/^Baku Higher Oil School \(BHOS\)$/i, 'BHOS (BANM)')
    .replace(/\s+University of .+$/i, '')
    .replace(/\s+University$/i, '')
    .replace(/^ADA University$/i, 'ADA');
}

function peopleRole(user) {
  return user.role === 'scholar' ? 'student' : user.role;
}

function serializePeoplePerson(candidate, viewerInterests) {
  const study = currentStudy(candidate);
  const universityVisible = candidate.showUniversityInSearch !== false &&
    candidate.universityId && universityById.has(candidate.universityId);
  const majorVisible = candidate.majorId && majorById.has(candidate.majorId);
  return {
    id: candidate.id,
    name: candidate.name.trim(),
    avatar: candidate.photo || '',
    role: peopleRole(candidate),
    ...(universityVisible ? {
      universityId: candidate.universityId,
      university: universityById.get(candidate.universityId),
      universityShortName: peopleShortUniversity(universityById.get(candidate.universityId)),
    } : {}),
    ...(majorVisible ? { majorId: candidate.majorId, major: majorById.get(candidate.majorId) } : {}),
    ...(candidate.showYearInSearch !== false && study ? {
      year: study.year,
      programmeDurationYears: study.duration,
      ...(study.graduatedYear ? { graduatedYear: study.graduatedYear } : {}),
    } : {}),
    ...(candidate.degreeLevel ? { degreeLevel: candidate.degreeLevel } : {}),
    ...(candidate.role === 'faculty' ? {
      title: typeof candidate.title === 'string' ? candidate.title : '',
      department: typeof candidate.department === 'string' ? candidate.department : '',
    } : {}),
    sharedInterests: (candidate.interests ?? []).filter((interest) => viewerInterests.has(interest.toLocaleLowerCase())),
    openToMessages: candidate.openToMessages === true,
    openToMentoring: candidate.openToMentoring === true,
    verified: candidate.verificationStatus === 'verified',
  };
}

async function handlePeople(req, res, url) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET to search people.' }, { Allow: 'GET' });
    return;
  }
  const roles = parsePeopleList(url, 'roles', 3);
  const rawUniversities = parsePeopleList(url, 'universities');
  const rawMajors = parsePeopleList(url, 'majors');
  const years = parsePeopleList(url, 'years', 6);
  const levels = parsePeopleList(url, 'levels', 3);
  const interests = parsePeopleList(url, 'interests', 30);
  const graduationYears = parsePeopleList(url, 'graduationYears', 10);
  const intakeYears = parsePeopleList(url, 'intakeYears', 10);
  const languages = parsePeopleList(url, 'languages', 20);
  const allowedRoles = new Set(['student', 'scholar', 'prospective', 'faculty']);
  const allowedYears = new Set(['1', '2', '3', '4', '5+', 'graduate']);
  const query = (url.searchParams.get('q') ?? '').trim();
  const location = (url.searchParams.get('location') ?? '').trim();
  const openToMessages = url.searchParams.get('openToMessages') === 'true';
  const openToMentoring = url.searchParams.get('openToMentoring') === 'true';
  const verifiedOnly = url.searchParams.get('verified') === 'true';
  const sort = url.searchParams.get('sort') ?? 'best-match';
  const cursor = url.searchParams.get('cursor') ?? '';
  if (!roles || !rawUniversities || !rawMajors || !years || !levels || !interests || !graduationYears || !intakeYears || !languages ||
    roles.some((role) => !allowedRoles.has(role)) ||
    rawUniversities.some((id) => !universityById.has(id)) ||
    rawMajors.some((id) => !majorById.has(id)) ||
    years.some((year) => !allowedYears.has(year)) ||
    levels.some((level) => !['bachelors', 'masters', 'phd'].includes(level)) ||
    interests.some((interest) => interest.length > 80) ||
    graduationYears.some((year) => !/^(?:19|20|21)\d{2}$/.test(year)) ||
    intakeYears.some((year) => !/^(?:19|20|21)\d{2}$/.test(year)) ||
    languages.some((language) => language.length > 60) ||
    query.length > 100 || location.length > 100 ||
    !['true', 'false'].includes(url.searchParams.get('openToMessages') ?? 'false') ||
    !['true', 'false'].includes(url.searchParams.get('openToMentoring') ?? 'false') ||
    !['true', 'false'].includes(url.searchParams.get('verified') ?? 'false') ||
    !['best-match', 'same-university', 'same-major', 'year-ascending', 'recently-active', 'name-ascending'].includes(sort) ||
    (cursor && (!/^\d+$/.test(cursor) || Number(cursor) > 100000))) {
    sendJson(res, 400, { error: 'One or more people search filters are invalid.' });
    return;
  }

  const { user: viewer } = authenticatedSession(req);
  const viewerInterests = new Set((Array.isArray(viewer?.interests) ? viewer.interests : []).map((value) => value.toLocaleLowerCase()));
  const viewerUniversityId = viewer?.universityId || (viewer?.university ? universityId(viewer.university) : '');
  const viewerMajorId = viewer?.majorId || (viewer?.major ? optionId(viewer.major) : '');
  const currentUserId = viewer?.id;
  const blockedUserIds = new Set(Array.isArray(viewer?.blockedUserIds) ? viewer.blockedUserIds : []);
  const commonCandidates = [...users.values()].filter((candidate) =>
    candidate.discoverable === true &&
    candidate.id !== currentUserId &&
    !blockedUserIds.has(candidate.id) &&
    !(Array.isArray(candidate.blockedUserIds) && candidate.blockedUserIds.includes(currentUserId)) &&
    typeof candidate.name === 'string' &&
    candidate.name.trim() !== '' &&
    !candidate.name.includes('@'),
  );
  const normalizedInterests = interests.map((value) => value.toLocaleLowerCase());
  const baseMatches = (candidate, excludedFilter = '') => {
    const candidateRole = peopleRole(candidate);
    if (excludedFilter !== 'roles' && roles.length && !roles.some((role) => role === candidateRole || (role === 'scholar' && candidateRole === 'student'))) return false;
    if (excludedFilter !== 'universities' && rawUniversities.length &&
      (candidate.showUniversityInSearch === false || !rawUniversities.includes(candidate.universityId))) return false;
    if (excludedFilter !== 'majors' && rawMajors.length && !rawMajors.includes(candidate.majorId)) return false;
    const study = currentStudy(candidate);
    if (excludedFilter !== 'years' && years.length) {
      if (candidate.showYearInSearch === false) return false;
      const yearIds = study?.graduatedYear ? ['graduate'] : study?.year ? [study.year >= 5 ? '5+' : String(study.year)] : [];
      if (!years.some((year) => yearIds.includes(year))) return false;
    }
    if (levels.length && !levels.includes(candidate.degreeLevel)) return false;
    if (excludedFilter !== 'interests' && normalizedInterests.length &&
      !normalizedInterests.some((interest) => (candidate.interests ?? []).some((value) => value.toLocaleLowerCase() === interest))) return false;
    if (location && !candidate.location?.toLocaleLowerCase().includes(location.toLocaleLowerCase())) return false;
    if (graduationYears.length &&
      (candidate.showYearInSearch === false || !graduationYears.includes(String(candidate.expectedGraduationYear ?? candidate.graduationYear ?? '')))) return false;
    if (intakeYears.length &&
      (candidate.showYearInSearch === false || !intakeYears.includes(String(candidate.enrollmentYear ?? '')))) return false;
    if (languages.length && !languages.some((language) => (candidate.languages ?? []).some((value) => value.toLocaleLowerCase() === language.toLocaleLowerCase()))) return false;
    if (openToMessages && candidate.openToMessages !== true) return false;
    if (openToMentoring && candidate.openToMentoring !== true) return false;
    if (verifiedOnly && candidate.verificationStatus !== 'verified') return false;
    if (query) {
      const searchable = [candidate.name, candidate.university, candidate.major].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!searchable.includes(query.toLocaleLowerCase())) return false;
    }
    return true;
  };
  let indexedCandidates = commonCandidates;
  for (const [ids, index] of [
    [rawUniversities, peopleIndexes.universities],
    [rawMajors, peopleIndexes.majors],
  ]) {
    if (!ids.length) continue;
    const matchingIds = new Set(ids.flatMap((id) => [...(index.get(id) ?? [])]));
    indexedCandidates = indexedCandidates.filter((candidate) => matchingIds.has(candidate.id));
  }
  if (years.length) {
    const matchingIds = new Set();
    for (const ids of peopleIndexes.enrollmentYears.values()) {
      for (const candidateId of ids) {
        const candidate = [...users.values()].find((item) => item.id === candidateId);
        const study = candidate && currentStudy(candidate);
        const candidateYear = study?.graduatedYear ? 'graduate' : study?.year ? (study.year >= 5 ? '5+' : String(study.year)) : '';
        if (candidateYear && years.includes(candidateYear)) matchingIds.add(candidateId);
      }
    }
    for (const candidate of commonCandidates) {
      if (Number.isInteger(candidate.yearOfStudyOverride)) matchingIds.add(candidate.id);
    }
    indexedCandidates = indexedCandidates.filter((candidate) => matchingIds.has(candidate.id));
  }
  const filtered = indexedCandidates.filter((candidate) => baseMatches(candidate));
  const countFacets = (candidates, keyOf) => {
    const counts = new Map();
    for (const candidate of candidates) {
      const key = keyOf(candidate);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const universityCounts = countFacets(commonCandidates.filter((candidate) => baseMatches(candidate, 'universities')), (candidate) =>
    candidate.showUniversityInSearch === false ? '' : candidate.universityId);
  const majorCounts = countFacets(commonCandidates.filter((candidate) => baseMatches(candidate, 'majors')), (candidate) => candidate.majorId);
  const yearCounts = countFacets(commonCandidates.filter((candidate) => baseMatches(candidate, 'years')), (candidate) => {
    if (candidate.showYearInSearch === false) return '';
    const study = currentStudy(candidate);
    return study?.graduatedYear ? 'graduate' : study?.year ? (study.year >= 5 ? '5+' : String(study.year)) : '';
  });

  const sharedInterests = (candidate) => (candidate.interests ?? [])
    .filter((interest) => viewerInterests.has(interest.toLocaleLowerCase()));
  const sorted = [...filtered].sort((first, second) => {
    if (sort === 'same-university' && viewerUniversityId) {
      const difference = Number(second.showUniversityInSearch !== false && second.universityId === viewerUniversityId) -
        Number(first.showUniversityInSearch !== false && first.universityId === viewerUniversityId);
      if (difference) return difference;
    }
    if (sort === 'same-major' && viewerMajorId) {
      const difference = Number(second.majorId === viewerMajorId) - Number(first.majorId === viewerMajorId);
      if (difference) return difference;
    }
    if (sort === 'year-ascending') {
      const firstYear = currentStudy(first)?.year ?? Number.MAX_SAFE_INTEGER;
      const secondYear = currentStudy(second)?.year ?? Number.MAX_SAFE_INTEGER;
      if (firstYear !== secondYear) return firstYear - secondYear;
    }
    if (sort === 'name-ascending') return first.name.localeCompare(second.name);
    if (sort === 'best-match') {
      const difference = sharedInterests(second).length - sharedInterests(first).length;
      if (difference) return difference;
    }
    const firstActive = Date.parse(first.lastActiveAt ?? first.updatedAt ?? '');
    const secondActive = Date.parse(second.lastActiveAt ?? second.updatedAt ?? '');
    return (Number.isFinite(secondActive) ? secondActive : 0) - (Number.isFinite(firstActive) ? firstActive : 0);
  });
  const offset = Number(cursor || 0);
  const pageSize = 20;
  const items = sorted.slice(offset, offset + pageSize)
    .map((candidate) => serializePeoplePerson(candidate, viewerInterests));
  sendJson(res, 200, {
    items,
    total: filtered.length,
    nextCursor: offset + pageSize < sorted.length ? String(offset + pageSize) : null,
    facets: {
      universities: [...universityCounts].map(([id, count]) => ({ id, name: universityById.get(id) ?? id, shortName: peopleShortUniversity(universityById.get(id) ?? id), count })),
      majors: [...majorCounts].map(([id, count]) => ({ id, name: majorById.get(id) ?? id, count })),
      years: [...yearCounts].map(([id, count]) => ({ id, count })),
    },
  });
}

function handlePublicPerson(req, res, personId) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET to view a public profile.' }, { Allow: 'GET' });
    return;
  }
  if (!/^[\w-]{1,100}$/.test(personId)) {
    sendJson(res, 400, { error: 'Invalid profile id.' });
    return;
  }
  const { user: viewer } = authenticatedSession(req);
  const candidate = [...users.values()].find((user) => user.id === personId);
  if (!candidate || candidate.id === viewer?.id || candidate.discoverable !== true ||
    (Array.isArray(viewer?.blockedUserIds) && viewer.blockedUserIds.includes(candidate.id)) ||
    (Array.isArray(candidate.blockedUserIds) && candidate.blockedUserIds.includes(viewer?.id)) ||
    typeof candidate.name !== 'string' || !candidate.name.trim() || candidate.name.includes('@')) {
    sendJson(res, 404, { error: 'Profile not found.' });
    return;
  }
  const interests = new Set((Array.isArray(viewer?.interests) ? viewer.interests : []).map((value) => value.toLocaleLowerCase()));
  sendJson(res, 200, serializePeoplePerson(candidate, interests));
}

function notificationUser(req) {
  const { user } = authenticatedSession(req);
  if (user) return user;
  const testUserId = req.headers['x-academix-test-user'];
  if (allowTestLogin && typeof testUserId === 'string' && /^test-[\w-]{1,100}$/.test(testUserId)) {
    return { id: testUserId };
  }
  return null;
}

function notificationSummary(userId) {
  const userItems = notificationData.items.filter((item) => item.userId === userId);
  return {
    totalCount: userItems.length,
    unreadCount: userItems.filter((item) => !item.readAt).length,
    unreadMessageCount: userItems.filter((item) => item.type === 'message' && !item.readAt).length,
  };
}

async function handleNotifications(req, res, url) {
  const user = notificationUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Sign in to view notifications.' });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/notifications') {
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const notificationType = ['message', 'system'].includes(url.searchParams.get('type'))
      ? url.searchParams.get('type')
      : null;
    const items = notificationData.items
      .filter((item) => item.userId === user.id && (!unreadOnly || !item.readAt) && (!notificationType || item.type === notificationType))
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
    sendJson(res, 200, {
      items: items.slice(offset, offset + limit).map(({ userId, ...item }) => item),
      hasMore: offset + limit < items.length,
      ...notificationSummary(user.id),
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/notifications/preferences') {
    sendJson(res, 200, {
      preferences: notificationData.preferences[user.id] ?? { messages: true, mentions: true, updates: true },
    });
    return true;
  }

  if (req.method === 'PUT' && url.pathname === '/api/notifications/preferences') {
    try {
      const input = await readBody(req, 4096);
      if (!input || typeof input !== 'object' || Array.isArray(input) ||
          ['messages', 'mentions', 'updates'].some((key) => typeof input[key] !== 'boolean')) {
        sendJson(res, 400, { error: 'Choose valid notification preferences.' });
        return true;
      }
      notificationData.preferences[user.id] = {
        messages: input.messages,
        mentions: input.mentions,
        updates: input.updates,
      };
      await saveNotifications();
      sendJson(res, 200, { preferences: notificationData.preferences[user.id] });
    } catch (error) {
      if (error instanceof SyntaxError || error.message === 'Request too large') {
        sendJson(res, 400, { error: 'Invalid notification preferences.' });
      } else {
        console.error('Unable to save notification preferences:', error);
        sendJson(res, 500, { error: 'Unable to save notification preferences.' });
      }
    }
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/notifications') {
    try {
      const input = await readBody(req, 8192);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        sendJson(res, 400, { error: 'Invalid notification.' });
        return true;
      }
      const id = typeof input.id === 'string' && /^[\w-]{1,120}$/.test(input.id) ? input.id : '';
      const senderName = typeof input.senderName === 'string' ? input.senderName.trim() : '';
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      const type = input.type === 'message' || input.type === 'system' ? input.type : '';
      const href = typeof input.href === 'string' && /^\/(inbox|people|notifications)(\/[\w-]+)?$/.test(input.href) ? input.href : '';
      const conversationId = input.conversationId ?? input.ticketId;
      if (!id || !senderName || senderName.length > 100 || senderName.includes('@') ||
          !text || text.length > 240 || !type || !href ||
          (input.senderAvatar !== undefined && (typeof input.senderAvatar !== 'string' || input.senderAvatar.length > 2048)) ||
          (conversationId !== undefined && (typeof conversationId !== 'string' || conversationId.length > 120))) {
        sendJson(res, 400, { error: 'Invalid notification.' });
        return true;
      }
      const existing = notificationData.items.find((item) => item.id === id && item.userId === user.id);
      const preferences = notificationData.preferences[user.id] ?? { messages: true, mentions: true, updates: true };
      if ((type === 'message' && !preferences.messages) || (type === 'system' && !preferences.updates)) {
        sendJson(res, 202, { notification: null, ...notificationSummary(user.id) });
        return true;
      }
      const notification = existing ?? {
        id,
        type,
        senderName,
        ...(input.senderAvatar ? { senderAvatar: input.senderAvatar } : {}),
        text,
        href,
        ...(conversationId ? { conversationId } : {}),
        createdAt: new Date().toISOString(),
        readAt: conversationId && id === `seed-${conversationId}` &&
          notificationData.readConversations[user.id]?.includes(conversationId)
          ? new Date().toISOString()
          : null,
      };
      if (!existing) {
        notificationData.items.push({
          userId: user.id,
          ...notification,
        });
        await saveNotifications();
      }
      sendJson(res, 201, { notification, ...notificationSummary(user.id) });
    } catch (error) {
      if (error instanceof SyntaxError || error.message === 'Request too large') {
        sendJson(res, 400, { error: 'Invalid notification.' });
      } else {
        console.error('Unable to create notification:', error);
        sendJson(res, 500, { error: 'Unable to create notification.' });
      }
    }
    return true;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/notifications/read-all') {
    const now = new Date().toISOString();
    notificationData.items = notificationData.items.map((item) =>
      item.userId === user.id && !item.readAt ? { ...item, readAt: now } : item,
    );
    notificationData.readConversations[user.id] = [
      ...new Set([
        ...(notificationData.readConversations[user.id] ?? []),
        ...notificationData.items.filter((item) => item.userId === user.id && item.conversationId).map((item) => item.conversationId),
      ]),
    ];
    try {
      await saveNotifications();
      sendJson(res, 200, notificationSummary(user.id));
    } catch (error) {
      console.error('Unable to mark notifications read:', error);
      sendJson(res, 500, { error: 'Unable to update notifications.' });
    }
    return true;
  }

  const conversationReadMatch = url.pathname.match(/^\/api\/notifications\/(?:conversation|ticket)\/([\w-]+)\/read$/);
  if (req.method === 'PATCH' && conversationReadMatch) {
    notificationData.readConversations[user.id] = [
      ...new Set([...(notificationData.readConversations[user.id] ?? []), conversationReadMatch[1]]),
    ];
    notificationData.items = notificationData.items.map((item) =>
      item.userId === user.id && item.conversationId === conversationReadMatch[1] && !item.readAt
        ? { ...item, readAt: new Date().toISOString() }
        : item,
    );
    try {
      await saveNotifications();
      sendJson(res, 200, notificationSummary(user.id));
    } catch (error) {
      console.error('Unable to mark conversation notifications read:', error);
      sendJson(res, 500, { error: 'Unable to update notifications.' });
    }
    return true;
  }

  const readMatch = url.pathname.match(/^\/api\/notifications\/([\w-]+)\/read$/);
  if (req.method === 'PATCH' && readMatch) {
    const item = notificationData.items.find((entry) => entry.id === readMatch[1] && entry.userId === user.id);
    if (!item) {
      sendJson(res, 404, { error: 'Notification not found.' });
      return true;
    }
    item.readAt = item.readAt || new Date().toISOString();
    if (item.conversationId) {
      notificationData.readConversations[user.id] = [
        ...new Set([...(notificationData.readConversations[user.id] ?? []), item.conversationId]),
      ];
    }
    try {
      await saveNotifications();
      sendJson(res, 200, { ...notificationSummary(user.id), conversationId: item.conversationId ?? null });
    } catch (error) {
      console.error('Unable to mark notification read:', error);
      sendJson(res, 500, { error: 'Unable to update notification.' });
    }
    return true;
  }

  sendJson(res, 404, { error: 'Not found.' });
  return true;
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
  if (url.pathname.startsWith('/api/people/')) {
    handlePublicPerson(req, res, url.pathname.slice('/api/people/'.length));
    return;
  }
  if (url.pathname === '/api/people') {
    await handlePeople(req, res, url);
    return;
  }
  if (url.pathname.startsWith('/api/notifications')) {
    await handleNotifications(req, res, url);
    return;
  }
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
    let verificationDocumentPath;
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
      if (updated.university) {
        const canonicalUniversityId = universityId(updated.university);
        if (canonicalUniversityId) {
          updated.university = universityById.get(canonicalUniversityId);
          updated.universityId = canonicalUniversityId;
        } else {
          delete updated.universityId;
        }
      } else {
        delete updated.universityId;
      }
      if (updated.major) {
        const canonicalMajorId = optionId(updated.major);
        if (majorById.has(canonicalMajorId)) {
          updated.major = majorById.get(canonicalMajorId);
          updated.majorId = canonicalMajorId;
        } else {
          delete updated.majorId;
        }
      } else {
        delete updated.majorId;
      }
      if (input.degreeLevel !== undefined) {
        if (!['bachelors', 'masters', 'phd', 'other'].includes(input.degreeLevel)) {
          sendJson(res, 400, { error: 'Choose a valid degree level.' });
          return;
        }
        updated.degreeLevel = input.degreeLevel;
      }
      if (input.programmeDurationYears !== undefined) {
        if (input.programmeDurationYears === null || input.programmeDurationYears === '') {
          delete updated.programmeDurationYears;
        } else if (!Number.isInteger(input.programmeDurationYears) || input.programmeDurationYears < 1 || input.programmeDurationYears > 12) {
          sendJson(res, 400, { error: 'Programme length must be between 1 and 12 years.' });
          return;
        } else {
          updated.programmeDurationYears = input.programmeDurationYears;
        }
      }
      for (const field of ['enrollmentYear', 'expectedGraduationYear']) {
        if (input[field] === undefined) continue;
        if (input[field] === null || input[field] === '') {
          delete updated[field];
        } else if (!Number.isInteger(input[field]) || input[field] < 1900 || input[field] > new Date().getFullYear() + 12) {
          sendJson(res, 400, { error: `Enter a valid ${field === 'enrollmentYear' ? 'enrollment' : 'expected graduation'} year.` });
          return;
        } else {
          updated[field] = input[field];
        }
      }
      if (input.yearOfStudyOverride !== undefined) {
        if (input.yearOfStudyOverride === null || input.yearOfStudyOverride === '') {
          delete updated.yearOfStudyOverride;
        } else if (!Number.isInteger(input.yearOfStudyOverride) || input.yearOfStudyOverride < 1 || input.yearOfStudyOverride > 12) {
          sendJson(res, 400, { error: 'Enter a valid current year of study.' });
          return;
        } else {
          updated.yearOfStudyOverride = input.yearOfStudyOverride;
        }
      }
      for (const field of ['discoverable', 'showUniversityInSearch', 'showYearInSearch', 'openToMessages', 'openToMentoring']) {
        if (input[field] === undefined) continue;
        if (typeof input[field] !== 'boolean') {
          sendJson(res, 400, { error: 'Profile visibility settings must be true or false.' });
          return;
        }
        updated[field] = input[field];
      }
      if (input.languages !== undefined) {
        if (!Array.isArray(input.languages) || input.languages.length > 20 ||
          input.languages.some((language) => typeof language !== 'string' || !language.trim() || language.trim().length > 60)) {
          sendJson(res, 400, { error: 'Choose up to 20 valid spoken languages.' });
          return;
        }
        updated.languages = [...new Set(input.languages.map((language) => language.trim()))];
      }
      for (const field of ['title', 'department']) {
        if (input[field] === undefined) continue;
        if (typeof input[field] !== 'string' || input[field].trim().length > 120) {
          sendJson(res, 400, { error: `${field === 'title' ? 'Title' : 'Department'} must be 120 characters or fewer.` });
          return;
        }
        if (input[field].trim()) updated[field] = input[field].trim();
        else delete updated[field];
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
        if (!['scholar', 'prospective', 'faculty'].includes(input.role) || input.role === user.role) {
          sendJson(res, 400, { error: 'Choose a different valid account role.' });
          return;
        }
        const university = typeof input.university === 'string' ? input.university.trim() : '';
        const major = typeof input.major === 'string' ? input.major.trim() : '';
        if (input.role !== 'prospective' && (!university || !major)) {
          sendJson(res, 400, { error: 'Choose your university and major or subject.' });
          return;
        }
        if (input.role === 'scholar' &&
          (!Number.isInteger(input.graduationYear) || input.graduationYear < 2000 || input.graduationYear > 2100)) {
          sendJson(res, 400, { error: 'Choose a valid graduation year.' });
          return;
        }
        const isVerificationRequest = input.requestGoldVerification === true;
        if (input.requestGoldVerification !== undefined && typeof input.requestGoldVerification !== 'boolean') {
          sendJson(res, 400, { error: 'Invalid Gold verification request.' });
          return;
        }
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
        updated.role = input.role;
        if (university) updated.university = university;
        else delete updated.university;
        if (major) updated.major = major;
        else delete updated.major;
        if (input.role === 'scholar') updated.graduationYear = input.graduationYear;
        else delete updated.graduationYear;
        updated.verificationStatus = isVerificationRequest ? 'pending' : 'unverified';
        delete updated.verificationRequest;
        delete updated.verificationDocument;
        if (isVerificationRequest) {
          updated.verificationRequest = {
            method: verificationMethod,
            ...(verificationMethod === 'edu_email' ? { eduEmail } : {}),
            submittedAt: new Date().toISOString(),
          };
          if (identityDocument) {
            const extension = input.identityDocument.mimeType === 'image/png' ? '.png' : '.jpg';
            const fileName = `${randomBytes(16).toString('hex')}${extension}`;
            await mkdir(verificationDirectory, { recursive: true, mode: 0o700 });
            const filePath = resolve(verificationDirectory, fileName);
            await writeFile(filePath, identityDocument, { flag: 'wx', mode: 0o600 });
            verificationDocumentPath = filePath;
            updated.verificationDocument = {
              fileName,
              type: input.identityDocument.type,
              submittedAt: new Date().toISOString(),
            };
          }
        }
      } else if (
        input.requestGoldVerification !== undefined ||
        input.verificationMethod !== undefined ||
        input.eduEmail !== undefined ||
        input.identityDocument !== undefined
      ) {
        if (input.requestGoldVerification !== true) {
          sendJson(res, 400, { error: 'Submit a valid Gold verification request.' });
          return;
        }
        if (!['scholar', 'faculty'].includes(user.role)) {
          sendJson(res, 400, { error: 'Gold verification is available for student / scholar and faculty / representative accounts.' });
          return;
        }
        if (user.verificationStatus === 'pending') {
          sendJson(res, 409, { error: 'A Gold verification request is already pending.' });
          return;
        }
        if (user.verificationStatus === 'verified') {
          sendJson(res, 409, { error: 'Your account is already Gold verified.' });
          return;
        }
        const verificationMethod = input.verificationMethod;
        if (!['identity_document', 'edu_email'].includes(verificationMethod)) {
          sendJson(res, 400, { error: 'Choose a valid verification method.' });
          return;
        }
        const eduEmail = typeof input.eduEmail === 'string' ? input.eduEmail.trim().toLowerCase() : '';
        if (verificationMethod === 'edu_email' && !/^[^@\s]+@[^@\s]+\.edu$/.test(eduEmail)) {
          sendJson(res, 400, { error: 'Enter a valid institutional .edu email for this verification option.' });
          return;
        }
        const identityDocument = input.identityDocument ? decodeIdentityDocument(input.identityDocument) : null;
        if (identityDocument && input.identityDocument.type !== (user.role === 'faculty' ? 'work_card' : 'student_card')) {
          sendJson(res, 400, { error: 'Choose the identity document type that matches your account role.' });
          return;
        }
        if (input.identityDocument && !identityDocument) {
          sendJson(res, 400, { error: 'Upload a valid JPG or PNG identity document no larger than 5 MB.' });
          return;
        }
        if (verificationMethod === 'identity_document' && !identityDocument) {
          sendJson(res, 400, {
            error: user.role === 'faculty'
              ? 'Upload a faculty or work ID to request Gold verification.'
              : 'Upload a student or work card to request Gold verification.',
          });
          return;
        }
        if (verificationMethod === 'edu_email' && identityDocument) {
          sendJson(res, 400, { error: 'Choose either .edu email review or a student/work card.' });
          return;
        }

        updated.verificationStatus = 'pending';
        updated.verificationRequest = {
          method: verificationMethod,
          ...(verificationMethod === 'edu_email' ? { eduEmail } : {}),
          submittedAt: new Date().toISOString(),
        };
        delete updated.verificationDocument;
        if (identityDocument) {
          const extension = input.identityDocument.mimeType === 'image/png' ? '.png' : '.jpg';
          const fileName = `${randomBytes(16).toString('hex')}${extension}`;
          await mkdir(verificationDirectory, { recursive: true, mode: 0o700 });
          const filePath = resolve(verificationDirectory, fileName);
          await writeFile(filePath, identityDocument, { flag: 'wx', mode: 0o600 });
          verificationDocumentPath = filePath;
          updated.verificationDocument = {
            fileName,
            type: input.identityDocument.type,
            submittedAt: new Date().toISOString(),
          };
        }
      }
      if (updated.discoverable === true && updated.role === 'scholar' &&
        (!updated.universityId || !updated.majorId || !Number.isInteger(updated.enrollmentYear) || !Number.isInteger(updated.programmeDurationYears))) {
        sendJson(res, 400, { error: 'Add a valid university, major, enrollment year, and programme length before appearing in student search.' });
        return;
      }
      updated.updatedAt = new Date().toISOString();
      if (session.testOnly) {
        session.user = updated;
      } else {
        users.set(user.email, updated);
        try {
          await saveUsers();
          refreshPeopleIndexes();
        } catch (error) {
          users.set(user.email, user);
          refreshPeopleIndexes();
          if (verificationDocumentPath) {
            await unlink(verificationDocumentPath).catch((cleanupError) => {
              console.error('Unable to remove uncommitted verification document:', cleanupError);
            });
            verificationDocumentPath = undefined;
          }
          throw error;
        }
      }
      sendJson(res, 200, { ok: true, user: publicUser(updated) });
    } catch (error) {
      if (verificationDocumentPath) {
        await unlink(verificationDocumentPath).catch((cleanupError) => {
          console.error('Unable to remove uncommitted verification document:', cleanupError);
        });
      }
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
        ...(typeof input.university === 'string' && universityId(input.university) ? { universityId: universityId(input.university) } : {}),
        ...(typeof input.major === 'string' && majorById.has(optionId(input.major)) ? { majorId: optionId(input.major) } : {}),
        ...(input.role === 'scholar' ? { graduationYear: Number(input.graduationYear) } : {}),
        discoverable: false,
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
        refreshPeopleIndexes();
      } catch (error) {
        users.delete(email);
        refreshPeopleIndexes();
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

    if (!testOnly && users.has(authenticatedUser.email)) {
      authenticatedUser.lastActiveAt = new Date().toISOString();
      users.set(authenticatedUser.email, authenticatedUser);
      await saveUsers();
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
