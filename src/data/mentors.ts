import { colleges, mentorProfiles } from './mock';
import type { Mentor, MentorProfile } from './types';

export interface DirectoryMentor extends Mentor {
  university: string;
  major: string;
  field: string;
  bio: string;
  verified: boolean;
}

export const mentorDirectory: DirectoryMentor[] = colleges.flatMap((college) =>
  (college.mentors ?? []).map((mentor) => ({
    ...mentor,
    university: college.name || 'University not listed',
    // TODO: Replace these mock-derived fields with the mentor profile API fields.
    major: mentor.major || 'Major not listed',
    field: mentor.program || mentor.college || 'Academic mentor',
    bio: mentor.quote || 'A verified mentor ready to share their academic experience.',
    verified: true,
  })),
);

const directoryProfile = (mentor: DirectoryMentor): MentorProfile => ({
  id: mentor.id,
  name: mentor.name,
  avatar: mentor.avatar,
  cover: '',
  university: mentor.university,
  classOf: mentor.program.match(/Class of '[^•]+/)?.[0] ?? 'Verified mentor',
  headline: mentor.field,
  degree: mentor.major,
  location: 'Azerbaijan',
  languages: 'English',
  tags: mentor.tags,
  stats: [
    { value: '—', label: 'Major GPA' },
    { value: mentor.rating.toFixed(1), label: 'Helpful Rating' },
    { value: String(mentor.reviews), label: 'Scholars Mentored' },
    { value: mentor.responseTime, label: 'Response Time' },
  ],
  about: [mentor.bio],
  wishIKnew: [],
  tracks: [],
  posts: [],
  journeyIntro: `Sharing practical experience from ${mentor.university}.`,
  journey: [],
  workshops: [],
  rating: mentor.rating,
  reviewCount: mentor.reviews,
  ratingBreakdown: [0.8, 0.15, 0.05, 0, 0],
  reviews: [],
});

// TODO: Replace these front-end profile records with complete mentor data from the back end.
export const mentorProfilesById: Record<string, MentorProfile> = {
  ...Object.fromEntries(mentorDirectory.map((mentor) => [mentor.id, directoryProfile(mentor)])),
  maya: mentorProfiles.maya,
};
