import { majors, universities } from './data/educationOptions';
import type { AuthenticatedUser } from './store';

export type PeopleRole = 'student' | 'prospective' | 'faculty';
export type PeopleYear = '1' | '2' | '3' | '4' | '5+' | 'graduate';
export type PeopleDegreeLevel = 'bachelors' | 'masters' | 'phd' | 'other';
export type PeopleSort = 'best-match' | 'same-university' | 'same-major' | 'year-ascending' | 'recently-active' | 'name-ascending';

export interface PeopleFilters {
  roles: PeopleRole[];
  universities: string[];
  majors: string[];
  years: PeopleYear[];
  levels: PeopleDegreeLevel[];
  interests: string[];
  query: string;
  sort: PeopleSort;
  location: string;
  graduationYears: string[];
  intakeYears: string[];
  languages: string[];
  openToMessages: boolean;
  openToMentoring: boolean;
  verifiedOnly: boolean;
}

export interface PeoplePerson {
  id: string;
  name: string;
  avatar: string;
  role: PeopleRole;
  universityId?: string;
  university?: string;
  universityShortName?: string;
  majorId?: string;
  major?: string;
  year?: number;
  programmeDurationYears?: number;
  graduatedYear?: number;
  degreeLevel?: PeopleDegreeLevel;
  title?: string;
  department?: string;
  sharedInterests: string[];
  openToMessages: boolean;
  openToMentoring: boolean;
  verified: boolean;
}

export interface PeopleFacet {
  id: string;
  name?: string;
  shortName?: string;
  count: number;
}

export interface PeopleResponse {
  items: PeoplePerson[];
  total: number;
  nextCursor: string | null;
  facets: {
    universities: PeopleFacet[];
    majors: PeopleFacet[];
    years: PeopleFacet[];
  };
}

const universityAliases: Record<string, string[]> = {
  'baku-higher-oil-school-bhos': ['BHOS', 'BANM', 'Baku Higher Oil School'],
  'ada-university': ['ADA'],
};

export function peopleOptionId(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function universitySearchKeywords(value: string) {
  return universityAliases[peopleOptionId(value)] ?? [];
}

function currentStudy(user: AuthenticatedUser) {
  if (user.role !== 'scholar' || user.showYearInSearch === false) return {};
  const duration = Number.isInteger(user.programmeDurationYears) ? user.programmeDurationYears : undefined;
  if (Number.isInteger(user.yearOfStudyOverride)) return { year: duration ? Math.min(user.yearOfStudyOverride!, duration) : user.yearOfStudyOverride };
  if (!Number.isInteger(user.enrollmentYear)) return {};
  const academicYear = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
  const year = academicYear - user.enrollmentYear! + 1;
  if (year < 1) return {};
  if (duration && year > duration) return { graduatedYear: user.expectedGraduationYear ?? user.enrollmentYear! + duration };
  return { year: duration ? Math.min(year, duration) : year };
}

function accountMatches(user: AuthenticatedUser, filters: PeopleFilters, excluding?: keyof PeopleFilters) {
  const role = user.role === 'scholar' ? 'student' : user.role;
  const universityId = user.universityId ?? (user.university ? peopleOptionId(user.university) : '');
  const majorId = user.majorId ?? (user.major ? peopleOptionId(user.major) : '');
  const study = currentStudy(user);
  if (excluding !== 'roles' && filters.roles.length && !filters.roles.includes(role)) return false;
  if (excluding !== 'universities' && filters.universities.length &&
    (user.showUniversityInSearch === false || !filters.universities.includes(universityId))) return false;
  if (excluding !== 'majors' && filters.majors.length && !filters.majors.includes(majorId)) return false;
  if (excluding !== 'years' && filters.years.length) {
    if (user.showYearInSearch === false) return false;
    const year = 'graduatedYear' in study
      ? 'graduate'
      : 'year' in study
        ? study.year! >= 5 ? '5+' : String(study.year)
        : '';
    if (!filters.years.includes(year as PeopleYear)) return false;
  }
  if (filters.levels.length && !filters.levels.includes(user.degreeLevel as PeopleDegreeLevel)) return false;
  if (excluding !== 'interests' && filters.interests.length &&
    !filters.interests.some((interest) => user.interests.some((value) => value.toLocaleLowerCase() === interest.toLocaleLowerCase()))) return false;
  if (filters.location && !user.location?.toLocaleLowerCase().includes(filters.location.toLocaleLowerCase())) return false;
  if (filters.graduationYears.length &&
    (user.showYearInSearch === false || !filters.graduationYears.includes(String(user.expectedGraduationYear ?? user.graduationYear ?? '')))) return false;
  if (filters.intakeYears.length &&
    (user.showYearInSearch === false || !filters.intakeYears.includes(String(user.enrollmentYear ?? '')))) return false;
  if (filters.languages.length &&
    !filters.languages.some((language) => user.languages?.some((value) => value.toLocaleLowerCase() === language.toLocaleLowerCase()))) return false;
  if (filters.openToMessages && user.openToMessages !== true) return false;
  if (filters.openToMentoring && user.openToMentoring !== true) return false;
  if (filters.verifiedOnly && user.verificationStatus !== 'verified') return false;
  const query = filters.query.trim().toLocaleLowerCase();
  return !query || [user.name, user.university, user.major].some((value) => value?.toLocaleLowerCase().includes(query));
}

function localPeopleSearch(filters: PeopleFilters, currentUserId: string, cursor?: string): PeopleResponse {
  let accounts: Record<string, AuthenticatedUser> = {};
  try {
    const raw: unknown = JSON.parse(localStorage.getItem('academix.test.accounts') ?? '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) accounts = raw as Record<string, AuthenticatedUser>;
  } catch {
    accounts = {};
  }
  const allAccounts = Object.values(accounts);
  const viewer = allAccounts.find((candidate) => candidate.id === currentUserId);
  const blockedUserIds = new Set(viewer?.blockedUserIds ?? []);
  const all = allAccounts.filter((user) =>
    user.id !== currentUserId &&
    !blockedUserIds.has(user.id) &&
    !user.blockedUserIds?.includes(currentUserId) &&
    user.discoverable === true && user.name.trim() !== '' && !user.name.includes('@'));
  const matched = all.filter((user) => accountMatches(user, filters));
  const count = (values: AuthenticatedUser[], key: (user: AuthenticatedUser) => string) => {
    const counts = new Map<string, number>();
    for (const user of values) {
      const id = key(user);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].map(([id, value]) => ({ id, count: value }));
  };
  const universityCounts = count(all.filter((user) => accountMatches(user, filters, 'universities')),
    (user) => user.showUniversityInSearch === false ? '' : user.universityId ?? (user.university ? peopleOptionId(user.university) : ''));
  const majorCounts = count(all.filter((user) => accountMatches(user, filters, 'majors')),
    (user) => user.majorId ?? (user.major ? peopleOptionId(user.major) : ''));
  const yearCounts = count(all.filter((user) => accountMatches(user, filters, 'years')), (user) => {
    if (user.showYearInSearch === false) return '';
    const study = currentStudy(user);
    return 'graduatedYear' in study ? 'graduate' : 'year' in study ? (study.year! >= 5 ? '5+' : String(study.year)) : '';
  });
  const universityLabels = new Map(universities.map((name) => [peopleOptionId(name), name]));
  const majorLabels = new Map(majors.map((name) => [peopleOptionId(name), name]));
  const items = matched.map((user): PeoplePerson => {
    const universityId = user.universityId ?? (user.university ? peopleOptionId(user.university) : '');
    const majorId = user.majorId ?? (user.major ? peopleOptionId(user.major) : '');
    const study = currentStudy(user);
    return {
      id: user.id,
      name: user.name,
      avatar: user.photo || '',
      role: user.role === 'scholar' ? 'student' : user.role,
      ...(user.showUniversityInSearch !== false && universityLabels.has(universityId) ? {
        universityId,
        university: universityLabels.get(universityId),
        universityShortName: universityId === 'baku-higher-oil-school-bhos' ? 'BHOS (BANM)' : universityId === 'ada-university' ? 'ADA' : universityLabels.get(universityId),
      } : {}),
      ...(majorLabels.has(majorId) ? { majorId, major: majorLabels.get(majorId) } : {}),
      ...(user.showYearInSearch !== false && 'year' in study ? { year: study.year, programmeDurationYears: user.programmeDurationYears } : {}),
      ...(user.showYearInSearch !== false && 'graduatedYear' in study ? { graduatedYear: study.graduatedYear } : {}),
      ...(user.degreeLevel ? { degreeLevel: user.degreeLevel } : {}),
      ...(user.role === 'faculty' ? { title: user.title ?? '', department: user.department ?? '' } : {}),
      sharedInterests: user.interests.filter((interest) => viewer?.interests.includes(interest)),
      openToMessages: user.openToMessages === true,
      openToMentoring: user.openToMentoring === true,
      verified: user.verificationStatus === 'verified',
    };
  });
  const sortBy = (first: PeoplePerson, second: PeoplePerson) => {
    const viewerUniversityId = viewer?.universityId ?? (viewer?.university ? peopleOptionId(viewer.university) : '');
    const viewerMajorId = viewer?.majorId ?? (viewer?.major ? peopleOptionId(viewer.major) : '');
    if (filters.sort === 'same-university' && viewerUniversityId) {
      const difference = Number(second.universityId === viewerUniversityId) - Number(first.universityId === viewerUniversityId);
      if (difference) return difference;
    }
    if (filters.sort === 'same-major' && viewerMajorId) {
      const difference = Number(second.majorId === viewerMajorId) - Number(first.majorId === viewerMajorId);
      if (difference) return difference;
    }
    if (filters.sort === 'name-ascending') return first.name.localeCompare(second.name);
    if (filters.sort === 'year-ascending') return (first.year ?? Number.MAX_SAFE_INTEGER) - (second.year ?? Number.MAX_SAFE_INTEGER);
    if (filters.sort === 'best-match') return second.sharedInterests.length - first.sharedInterests.length;
    const firstActive = Date.parse(all.find((user) => user.id === first.id)?.lastActiveAt ?? '');
    const secondActive = Date.parse(all.find((user) => user.id === second.id)?.lastActiveAt ?? '');
    return (Number.isFinite(secondActive) ? secondActive : 0) - (Number.isFinite(firstActive) ? firstActive : 0);
  };
  items.sort(sortBy);
  const offset = Number(cursor ?? 0);
  return {
    items: items.slice(offset, offset + 20),
    total: matched.length,
    nextCursor: offset + 20 < matched.length ? String(offset + 20) : null,
    facets: {
      universities: universityCounts.map(({ id, count: value }) => ({ id, name: universityLabels.get(id) ?? id, shortName: id === 'baku-higher-oil-school-bhos' ? 'BHOS (BANM)' : id === 'ada-university' ? 'ADA' : universityLabels.get(id), count: value })),
      majors: majorCounts.map(({ id, count: value }) => ({ id, name: majorLabels.get(id) ?? id, count: value })),
      years: yearCounts.map(({ id, count: value }) => ({ id, count: value })),
    },
  };
}

export async function searchPeople(
  filters: PeopleFilters,
  currentUserId: string,
  signal?: AbortSignal,
  cursor?: string,
): Promise<PeopleResponse> {
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false') {
    return localPeopleSearch(filters, currentUserId, cursor);
  }
  const params = new URLSearchParams();
  for (const role of filters.roles) params.append('roles', role);
  for (const id of filters.universities) params.append('universities', id);
  for (const id of filters.majors) params.append('majors', id);
  for (const year of filters.years) params.append('years', year);
  for (const level of filters.levels) params.append('levels', level);
  for (const interest of filters.interests) params.append('interests', interest);
  for (const year of filters.graduationYears) params.append('graduationYears', year);
  for (const year of filters.intakeYears) params.append('intakeYears', year);
  for (const language of filters.languages) params.append('languages', language);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.location.trim()) params.set('location', filters.location.trim());
  if (filters.openToMessages) params.set('openToMessages', 'true');
  if (filters.openToMentoring) params.set('openToMentoring', 'true');
  if (filters.verifiedOnly) params.set('verified', 'true');
  params.set('sort', filters.sort);
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/people?${params.toString()}`, { credentials: 'same-origin', signal });
  const result = await response.json() as PeopleResponse | { error?: string };
  if (!response.ok) throw new Error('error' in result ? result.error : 'Unable to search people.');
  return result as PeopleResponse;
}

export async function getPublicPerson(id: string, currentUserId: string, signal?: AbortSignal): Promise<PeoplePerson | null> {
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS !== 'false') {
    let accounts: Record<string, AuthenticatedUser> = {};
    try {
      const raw: unknown = JSON.parse(localStorage.getItem('academix.test.accounts') ?? '{}');
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) accounts = raw as Record<string, AuthenticatedUser>;
    } catch {
      accounts = {};
    }
    const viewer = Object.values(accounts).find((candidate) => candidate.id === currentUserId);
    const blockedUserIds = new Set(viewer?.blockedUserIds ?? []);
    const user = Object.values(accounts).find((candidate) =>
      candidate.id === id && candidate.id !== currentUserId && candidate.discoverable === true &&
      candidate.name.trim() !== '' && !candidate.name.includes('@') &&
      !blockedUserIds.has(candidate.id) &&
      !candidate.blockedUserIds?.includes(currentUserId));
    if (!user) return null;
    const universityId = user.universityId ?? (user.university ? peopleOptionId(user.university) : '');
    const majorId = user.majorId ?? (user.major ? peopleOptionId(user.major) : '');
    const study = currentStudy(user);
    const university = universities.find((name) => peopleOptionId(name) === universityId);
    const major = majors.find((name) => peopleOptionId(name) === majorId);
    return {
      id: user.id,
      name: user.name,
      avatar: user.photo || '',
      role: user.role === 'scholar' ? 'student' : user.role,
      ...(user.showUniversityInSearch !== false && university ? {
        universityId,
        university,
        universityShortName: universityId === 'baku-higher-oil-school-bhos' ? 'BHOS (BANM)' : universityId === 'ada-university' ? 'ADA' : university,
      } : {}),
      ...(major ? { majorId, major } : {}),
      ...(user.showYearInSearch !== false && 'year' in study ? { year: study.year, programmeDurationYears: user.programmeDurationYears } : {}),
      ...(user.showYearInSearch !== false && 'graduatedYear' in study ? { graduatedYear: study.graduatedYear } : {}),
      ...(user.degreeLevel ? { degreeLevel: user.degreeLevel } : {}),
      ...(user.role === 'faculty' ? { title: user.title ?? '', department: user.department ?? '' } : {}),
      sharedInterests: user.interests.filter((interest) => viewer?.interests.includes(interest)),
      openToMessages: user.openToMessages === true,
      openToMentoring: user.openToMentoring === true,
      verified: user.verificationStatus === 'verified',
    };
  }
  const response = await fetch(`/api/people/${encodeURIComponent(id)}`, { credentials: 'same-origin', signal });
  if (response.status === 404) return null;
  const result = await response.json() as PeoplePerson | { error?: string };
  if (!response.ok) throw new Error('error' in result ? result.error : 'Unable to load this profile.');
  return result as PeoplePerson;
}
