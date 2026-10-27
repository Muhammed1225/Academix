import { colleges } from './mock';
import type { Mentor } from './types';

export interface DirectoryMentor extends Mentor {
  university: string;
  field: string;
  bio: string;
  verified: boolean;
}

export const mentorDirectory: DirectoryMentor[] = colleges.flatMap((college) =>
  (college.mentors ?? []).map((mentor) => ({
    ...mentor,
    university: college.name || 'University not listed',
    field: mentor.program || mentor.college || 'Academic mentor',
    bio: mentor.quote || 'A verified mentor ready to share their academic experience.',
    verified: true,
  })),
);
