/** Credential Protocol: ağdaki her hesabın doğrulama seviyesi. */
export type Verification = 'gold' | 'edu' | 'prospective' | 'unverified';

export const verificationLabel: Record<Verification, string> = {
  gold: 'Gold Verified',
  edu: 'Institution Verified',
  prospective: 'Prospective',
  unverified: 'Unverified Account',
};

export interface Person {
  id: string;
  name: string;
  subtitle: string;
  verification: Verification;
  avatar?: string;
  /** Rozet üzerindeki özel metin (ör. "Gold Verified Dean"). */
  badge?: string;
  interests?: string[];
  about?: string;
  location?: string;
  education?: string;
}

export interface Comment {
  author: Person;
  timeAgo: string;
  text: string;
}

export type FeedTab = 'trending' | 'latest' | 'essays';

export interface Post {
  id: string;
  author: Person;
  timeAgo: string;
  title?: string;
  body: string;
  channelId: string;
  universityId?: string;
  insight?: string;
  attachment?: { fileName: string; meta: string };
  image?: { fileName: string; src: string };
  votes: number;
  likes: number;
  dislikes: number;
  myVote: -1 | 0 | 1;
  commentCount: number;
  comments: Comment[];
  bookmarked: boolean;
  tabs: FeedTab[];
  /** Doğrulanmamış iddialar için topluluk denetim notu. */
  auditNote?: string;
}

export interface Channel {
  id: string;
  name: string;
  count: string;
  color: string;
}

export interface Ama {
  when: string;
  tag: string;
  title: string;
  host: string;
  cta: string;
  attending?: number;
}

export interface Stat {
  label: string;
  value: string;
  tag?: string;
  note?: string;
  icon: string;
}

export interface Mentor {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  college: string;
  collegeShort: string;
  program: string;
  tags: string[];
  quote: string;
  responseTime: string;
}

export interface Discussion {
  votes: number;
  dislikes: number;
  tags: string[];
  askedBy: string;
  question: string;
  answerer: string;
  answererRole: string;
  answeredAgo: string;
  answer: string;
  answers: number;
  accuracy: number;
}

export interface Deadline {
  kind: string;
  name: string;
  sub: string;
  date: string;
  notice: string;
}

export interface MajorMetric {
  label: string;
  value: string;
  lines: string[];
  icon: string;
}

export interface PeerProgram {
  name: string;
  location: string;
  rank: string;
  acceptance: string;
  sat: string;
  tuition: string;
  specialty: string;
}

export interface TitledText {
  title: string;
  body: string;
  icon?: string;
}

export interface CareerRole {
  title: string;
  employers: string;
  comp: string;
}

export interface RelatedMajor {
  overlap: number;
  school: string;
  name: string;
  note: string;
}

export interface Major {
  id: string;
  tag: string;
  name: string;
  school: string;
  category: string;
  salary: string;
  acceptance: string;
  dimStyleIllustrativeScores?: { year: number; points: number }[];
  summary: string;
  degree?: string;
  metrics?: MajorMetric[];
  philosophy?: string[];
  pillars?: TitledText[];
  coursework?: string[];
  testsAndEdge?: string[];
  peers?: PeerProgram[];
  careerTracks?: TitledText[];
  roles?: CareerRole[];
  employers?: string[];
  related?: RelatedMajor[];
}

export interface College {
  id: string;
  name: string;
  shortName: string;
  location: string;
  founded: string;
  kind: string;
  heroImage: string;
  description: string;
  mentorCount: number;
  questionCount: number;
  majorCount: number;
  address: string;
  stats: Stat[];
  mentors: Mentor[];
  discussions: Discussion[];
  deadlines: Deadline[];
  checklist: { label: string; required: boolean }[];
  salaries: { label: string; value: string; fraction: number }[];
  employers: string[];
  similar: { initials: string; name: string; meta: string }[];
  majorCategories: string[];
  majors: Major[];
}

export interface Message {
  author: string;
  time: string;
  text: string;
  isMe?: boolean;
}

export interface Ticket {
  id: string;
  category: string;
  timeAgo: string;
  title: string;
  preview: string;
  from: string;
  fromMeta: string;
  messages: Message[];
  resolved: boolean;
  unread: boolean;
  suggestedReply?: string;
}

export interface JourneySection {
  title: string;
  subtitle: string;
  icon: string;
  items: { title: string; subtitle: string; body?: string; trailing?: string }[];
}

export interface Workshop {
  date: string;
  attended: number;
  title: string;
  body: string;
}

export interface Review {
  name: string;
  avatar: string;
  badge: string;
  role: string;
  text: string;
  date: string;
  helpful: number;
}

export interface MentorProfile {
  id: string;
  name: string;
  avatar: string;
  cover: string;
  classOf: string;
  headline: string;
  degree: string;
  location: string;
  languages: string;
  stats: { value: string; label: string }[];
  about: string[];
  wishIKnew: string[];
  tracks: TitledText[];
  posts: Post[];
  journeyIntro: string;
  journey: JourneySection[];
  nextSession: Workshop & { seats: number };
  workshops: Workshop[];
  rating: number;
  reviewCount: number;
  ratingBreakdown: number[];
  reviews: Review[];
}
