import { colleges, mentorProfiles } from './mock';
import { universities } from './educationOptions';
import type { Major, MentorProfile, Post } from './types';

export type SearchCategory = 'universities' | 'programmes' | 'people' | 'posts';

export interface SearchItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  content: string;
  href: string;
  image?: string;
  university?: string;
  location?: string;
  institutionType?: string;
  discipline?: string;
  degree?: string;
  role?: string;
  channelId?: string;
  major?: Major;
  mentor?: MentorProfile;
  post?: Post;
}

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('az')
  .replace(/[ıİ]/g, 'i')
  .replace(/\s+/g, ' ')
  .trim();

export function matchesSearch(content: string, query: string) {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const normalizedContent = normalize(content);
  return tokens.every((token) => normalizedContent.includes(token));
}

export function relevanceScore(item: SearchItem, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const title = normalize(item.title);
  const content = normalize(item.content);
  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 60;
  if (title.includes(normalizedQuery)) return 40;
  const titleMatches = tokens.filter((token) => title.includes(token)).length;
  if (titleMatches === tokens.length) return 35;
  if (titleMatches) return 20 + titleMatches;
  if (tokens.every((token) => content.includes(token))) return 10;
  return content.includes(normalizedQuery) ? 20 : 0;
}

function normalizeUniversityName(name: string) {
  return normalize(name.replace(/\s*\([^)]*\)/g, ''));
}

export function createSearchCatalog(posts: Post[]): SearchItem[] {
  const collegeByName = new Map<string, (typeof colleges)[number]>();
  for (const college of colleges) {
    collegeByName.set(normalizeUniversityName(college.name), college);
    collegeByName.set(normalizeUniversityName(college.shortName), college);
  }

  const universityItems: SearchItem[] = universities.map((name) => {
    const college = collegeByName.get(normalizeUniversityName(name));
    return {
      id: `university:${name}`,
      category: 'universities',
      title: name,
      subtitle: college ? 'University profile available in Academix' : 'University listing',
      content: `${name} ${college?.shortName ?? ''}`,
      href: college ? `/colleges/${college.id}` : `/colleges?university=${encodeURIComponent(name)}`,
      university: name,
    };
  });

  const programmeItems: SearchItem[] = colleges.flatMap((college) =>
    college.majors.map((major) => ({
      id: `programme:${college.id}:${major.id}`,
      category: 'programmes',
      title: major.name,
      subtitle: `${college.name} · ${major.school}`,
      content: `${major.name} ${major.school} ${major.category} ${major.summary} ${major.degree ?? ''}`,
      href: `/colleges/${college.id}/majors/${major.id}`,
      university: college.name,
      discipline: major.category,
      degree: major.degree,
      major,
    })),
  );

  const peopleItems: SearchItem[] = Object.values(mentorProfiles).map((mentor) => ({
    id: `person:${mentor.id}`,
    category: 'people',
    title: mentor.name,
    subtitle: `${mentor.headline} · ${mentor.location}`,
    content: `${mentor.name} ${mentor.headline} ${mentor.degree} ${mentor.location} ${mentor.about.join(' ')} ${mentor.tracks.map((track) => `${track.title} ${track.body}`).join(' ')}`,
    href: `/mentors/${mentor.id}`,
    image: mentor.avatar,
    university: 'Carnegie Mellon University',
    location: mentor.location,
    role: 'Mentor',
    mentor,
  }));

  const postItems: SearchItem[] = posts.map((post) => {
    const university = colleges.find((college) => college.id === post.universityId);
    const query = post.title ?? post.body.slice(0, 100);
    return {
      id: `post:${post.id}`,
      category: 'posts',
      title: post.title ?? 'Community discussion',
      subtitle: `${post.author.name} · ${post.timeAgo}${university ? ` · ${university.name}` : ''}`,
      content: `${post.title ?? ''} ${post.body} ${post.author.name} ${post.author.subtitle} ${post.channelId} ${university?.name ?? ''} ${post.comments.map((comment) => comment.text).join(' ')}`,
      href: `/search?q=${encodeURIComponent(query)}&type=posts`,
      university: university?.name,
      channelId: post.channelId,
      post,
    };
  });

  return [...universityItems, ...programmeItems, ...peopleItems, ...postItems];
}

const recentQueries: string[] = [];

export function rememberSearch(query: string) {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  if (!trimmed) return;
  const previous = recentQueries.findIndex((item) => normalize(item) === normalize(trimmed));
  if (previous >= 0) recentQueries.splice(previous, 1);
  recentQueries.unshift(trimmed);
  recentQueries.splice(6);
}

export function getRecentSearches() {
  return [...recentQueries];
}
