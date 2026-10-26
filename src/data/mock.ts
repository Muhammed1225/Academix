import type { Ama, Channel, College, Major, MentorProfile, Person, Post, Ticket } from './types';

/** Marka adı tek yerden yönetilir. */
export const BRAND = 'Academix';

const img = (name: string) => `/images/${name}`;

export const people: Record<string, Person> = {
  maya: {
    id: 'maya',
    name: 'Maya Patel',
    subtitle: "B.S. Computer Science '25 • Carnegie Mellon",
    verification: 'edu',
    avatar: img('avatar_maya_patel.jpg'),
    badge: 'Institution Verified Scholar',
    interests: ['Computer Science', 'Research', 'Robotics'],
  },
  arisThorne: {
    id: 'aris',
    name: 'Dr. Aris Thorne',
    subtitle: 'Vice Chair of Admissions • Carnegie Mellon University',
    verification: 'gold',
    avatar: img('avatar_aris_thorne.jpg'),
    badge: 'Gold Verified Dean',
    interests: ['Computer Science', 'Admissions', 'Mentorship'],
  },
  sarahLin: {
    id: 'sarah-lin',
    name: 'Sarah Lin',
    subtitle: 'Prospective Computer Science student',
    verification: 'prospective',
    avatar: img('avatar_sarah_jenkins.jpg'),
    location: 'United States',
    education: 'Applying Early Decision',
    interests: ['Computer Science', 'Admissions'],
  },
  jordanVance: {
    id: 'jordan-vance',
    name: 'Jordan Vance',
    subtitle: 'Incoming Computer Science student',
    verification: 'prospective',
    avatar: img('avatar_jordan_chen.jpg'),
    location: 'United States',
    education: 'Freshman admit',
    interests: ['Computer Science', 'Course planning'],
  },
  alexRivera: {
    id: 'alex-rivera',
    name: 'Alex Rivera',
    subtitle: 'Computer Science sophomore',
    verification: 'edu',
    avatar: img('avatar_alex_chen.jpg'),
    location: 'Pittsburgh, PA',
    education: 'Sophomore',
    interests: ['Computer Science', 'Research'],
  },
  kevLin: {
    id: 'kevlin',
    name: 'KevLin_Applicant',
    subtitle: 'Prospective Scholar',
    verification: 'prospective',
    interests: ['Computer Science', 'Campus life', 'Admissions'],
  },
  anonymousIvy: {
    id: 'anon-ivy',
    name: 'Anonymous_IvyApplicant_24',
    subtitle: 'No institutional identity verified',
    verification: 'unverified',
  },
  anonymous: {
    id: 'anon',
    name: 'Anonymous Scholar',
    subtitle: 'Identity hidden • Institution Verified',
    verification: 'edu',
  },
};

export const channels: Channel[] = [
  { id: 'all', name: 'All Global Academic Stream', count: '24k', color: '#0051d5' },
  { id: 'admissions', name: 'Admissions & Portfolio Reviews', count: '1.2k', color: '#f59e0b' },
  { id: 'research', name: 'Research Lab Openings', count: '430', color: '#10b981' },
  { id: 'grad', name: 'Graduate School Teardowns', count: '89', color: '#8b5cf6' },
];

export const posts: Post[] = [
  {
    id: 'p1',
    author: people.arisThorne,
    timeAgo: '3h ago',
    channelId: 'admissions',
    tabs: ['trending', 'essays'],
    title: 'The Fatal Flaw in 85% of Early Decision CS Supplemental Statements',
    body:
      'Every November, our committee reads hundreds of essays beginning with: "Ever since I wrote my first line of ' +
      'Python at age twelve...". This is biographical noise. We already know your timeline from the activities list. ' +
      'What we evaluate is epistemic curiosity under failure. Detail a problem where your hypothesis completely ' +
      'collapsed and how you calibrated your formal logic.',
    insight:
      'We rank essays along three orthogonal axes: Cognitive Persistence (40%), Domain Nuance (35%), and Collegiate ' +
      'Generosity (25%).',
    votes: 482,
    likes: 482,
    dislikes: 0,
    myVote: 0,
    commentCount: 47,
    bookmarked: false,
    comments: [
      {
        author: people.maya,
        timeAgo: '1h ago',
        text:
          'Could not agree more. When I applied to SCS, I specifically broke down why my 15-112 term project memory ' +
          'leaks taught me more about invariants than any classroom lab.',
      },
    ],
  },
  {
    id: 'p2',
    author: people.maya,
    timeAgo: '5h ago',
    channelId: 'research',
    tabs: ['trending', 'latest'],
    title: 'Open-Sourcing My 4-Year CMU Course Schedule & Research Roadmap',
    body:
      'Just uploaded the complete course syllabus breakdown for 15-213 (Computer Systems), 15-451 (Algorithms), and ' +
      'my undergraduate research timeline at the Language Technologies Institute. Hope this demystifies the actual ' +
      'weekly workload for incoming freshmen.',
    attachment: { fileName: 'CMU_SCS_CourseSchedule_Plan_Patel.pdf', meta: 'PDF Document • 2.4 MB • 1,320 Downloads' },
    votes: 712,
    likes: 712,
    dislikes: 0,
    myVote: 0,
    commentCount: 83,
    bookmarked: false,
    comments: [
      {
        author: people.kevLin,
        timeAgo: '3h ago',
        text: 'Did taking 15-150 in the first semester feel overwhelming alongside the math requirement?',
      },
    ],
  },
  {
    id: 'p3',
    author: people.anonymousIvy,
    timeAgo: '6h ago',
    channelId: 'admissions',
    tabs: ['trending', 'latest'],
    body:
      '"I heard directly from a Cornell CS advisor that if you submit a test-optional application with a 3.8 GPA you ' +
      'are automatically routed to the transfer option pool."',
    auditNote: '3 Verified Admissions Mentors flagged this claim as inaccurate.',
    votes: 12,
    likes: 12,
    dislikes: 0,
    myVote: 0,
    commentCount: 9,
    bookmarked: false,
    comments: [],
  },
];

export const amas: Ama[] = [
  {
    when: 'Tomorrow • 4:00 PM EST',
    tag: 'Verified AMA',
    title: 'MIT CSAIL Lab Admissions Breakdown',
    host: 'Host: Prof. Liam Vance (Robotics & Vision)',
    cta: 'Set Reminder',
    attending: 428,
  },
  {
    when: 'Friday • 7:00 PM EST',
    tag: 'Collegiate Hack',
    title: 'TartanHacks 2025 Team Matching',
    host: 'Co-hosted by CMU Computer Science Council',
    cta: 'Join Roster',
  },
];

export const composerForums = [
  'Undergrad Admissions & Essays',
  'Computer Science & Engineering',
  'Process Automation Engineering',
  'Information Security',
  'Finance',
  'Business Administration',
  'Petroleum Engineering',
  'Chemical Engineering',
  'Research Lab Recruitment',
  'Campus Life & Housing',
];

const csMajor: Major = {
  id: 'cs',
  tag: 'SCS • TOP 1%',
  name: 'B.S. in Computer Science',
  school: 'School of Computer Science',
  category: 'Computer Science & AI',
  salary: '$138.5k',
  acceptance: '4.2%',
  dimStyleIllustrativeScores: [
    { year: 2023, points: 685 },
    { year: 2024, points: 690 },
    { year: 2025, points: 695 },
  ],
  degree: 'Bachelor of Science (4-Year Track) • ABET Computing Accredited',
  summary:
    'An internationally distinguished curriculum combining rigorous mathematical reasoning, algorithmic design, ' +
    'machine architecture, and collaborative low-level engineering.',
  metrics: [
    { label: 'Test scores', value: 'SAT 1550 - 1580', lines: ['Math 790-800 • ACT 35-36', 'Avg GPA: 3.96 Unweighted'], icon: 'bar_chart' },
    { label: 'Selectivity', value: '~4.2% Rate', lines: ['Most Selective at CMU', '210 Seats / 5,000+ Apps'], icon: 'target' },
    { label: 'Instruction', value: 'English (100%)', lines: ['Full Immersion Cohort', 'TOEFL 102+ • IELTS 7.5+'], icon: 'translate' },
    { label: 'Median outcome', value: '$138,500', lines: ['Base Starting Salary', '+ $45k Sign-on / Equity Avg'], icon: 'payments' },
  ],
  philosophy: [
    'The Carnegie Mellon Computer Science undergraduate curriculum is engineered around the principle that ' +
      'theoretical mastery and hands-on systems construction are intrinsically indivisible.',
    'During their four years, undergraduates traverse a foundational core encompassing algorithmic complexity, ' +
      'functional paradigms in Standard ML, low-level C programming, and memory-managed systems.',
  ],
  pillars: [
    {
      icon: 'code_blocks',
      title: 'The "Systems Track"',
      body: 'Every graduate must design a preemptive kernel or production-grade proxy cache, developing relentless debugging intuition across byte-level memory.',
    },
    {
      icon: 'functions',
      title: 'Discrete Mathematical Rigor',
      body: 'Heavy emphasis on combinatorics, probability theory, graph algorithms, and formal structural induction before high-level electives.',
    },
    {
      icon: 'hub',
      title: 'Interdisciplinary Minors',
      body: 'A mandatory minor ensures CS students apply computational frameworks to robotics, philosophy, cognitive science, music technology, or drama.',
    },
  ],
  coursework: [
    '4 Years of Mathematics: Must reach Differential & Integral Calculus (AP Calculus BC, IB Math HL, or Multivariable).',
    '1 Year of Physics: Calculus-based physics strongly preferred (AP Physics C Mechanics & E&M).',
    '1 Year Chemistry or Biology: Laboratory science baseline.',
    '4 Years of English Literature & Composition: Clear analytical writing.',
    '2-3 Years of World Language: Sequential proficiency.',
  ],
  testsAndEdge: [
    'Target AP/IB Scores: AP Calc BC (5), AP CS A (5), AP Physics C (5).',
    'Algorithmic Contests: USACO Gold/Platinum, AIME qualification, AMC 10/12 distinction.',
    'Open Source & Research: GitHub repository submission, peer-reviewed co-authorship.',
    'Non-Academic Character: Curiosity, hackathon collaboration, educational outreach.',
  ],
  peers: [
    { name: 'Carnegie Mellon (SCS)', location: 'Pittsburgh, PA', rank: '#1 Tie', acceptance: '~4.2%', sat: '1550 - 1580', tuition: '$64,596', specialty: 'Systems & AI' },
    { name: 'MIT (Course 6-3)', location: 'Cambridge, MA', rank: '#1 Tie', acceptance: '~3.9%', sat: '1530 - 1580', tuition: '$61,990', specialty: 'Hardware & Theoretical CS' },
    { name: 'Stanford University', location: 'Stanford, CA', rank: '#1 Tie', acceptance: '~3.6%', sat: '1520 - 1570', tuition: '$65,127', specialty: 'Venture & Foundation Models' },
    { name: 'UC Berkeley (EECS/CDSS)', location: 'Berkeley, CA', rank: '#1 Tie', acceptance: '~2.9% OOS', sat: 'Test-Blind', tuition: '$48,465 (OOS)', specialty: 'Distributed Computing / DB' },
    { name: 'UIUC (Grainger CS)', location: 'Urbana-Champaign, IL', rank: '#5', acceptance: '~6.7%', sat: '1510 - 1560', tuition: '$40,384 (OOS)', specialty: 'Compilers & HPC' },
  ],
  careerTracks: [
    { icon: 'memory', title: 'Low-Level Systems & Kernel Engineering', body: 'Operating systems, hyperscale storage engines, hypervisors, and custom silicon drivers.' },
    { icon: 'psychology', title: 'Frontier AI / ML Infrastructure', body: 'Large language model distributed training, tensor parallelism, and inference acceleration.' },
    { icon: 'query_stats', title: 'Quantitative Development', body: 'Microsecond execution platforms, statistical arbitrage engines, and order-book matching.' },
    { icon: 'precision_manufacturing', title: 'Autonomous Robotics', body: 'Perception SLAM, spatial compute, robotic manipulation, and aerospace autonomy.' },
  ],
  roles: [
    { title: 'Quantitative Strat / Dev', employers: 'Jane Street, Citadel Securities, Hudson River Trading', comp: '$210,000 - $350,000 Total' },
    { title: 'Machine Learning Research Engineer', employers: 'OpenAI, NVIDIA AI, Google DeepMind, Anthropic', comp: '$165,000 Base ($230k Total)' },
    { title: 'Distributed Systems / Cloud Architect', employers: 'Amazon AWS, Apple CoreOS, Microsoft Azure, Snowflake', comp: '$155,000 Base' },
    { title: 'Site Reliability & Infrastructure Engineer', employers: 'Meta Production Eng, Stripe, Cloudflare', comp: '$148,000 Base' },
    { title: 'Full-Stack Core Product Engineer', employers: 'Figma, Notion, Datadog, Uber, Airbnb', comp: '$132,000 Base' },
  ],
  employers: ['NVIDIA', 'Jane Street', 'Google', 'Apple', 'Microsoft', 'Citadel', 'OpenAI', 'AWS'],
  related: [
    { overlap: 85, school: 'SCS Department', name: 'B.S. in Artificial Intelligence', note: 'Machine perception, NLP, and deep RL. Replaces compiler design with LTI courses.' },
    { overlap: 65, school: 'College of Engineering', name: 'B.S. in Electrical & Computer Eng.', note: 'Hardware-software co-design, embedded systems, and computer architecture.' },
    { overlap: 55, school: 'HCI Institute', name: 'B.S. in Human-Computer Interaction', note: 'Design research and prototyping on top of a programming core.' },
  ],
};

const otherMajors: Major[] = [
  {
    id: 'ece',
    tag: 'ENGINEERING • #4',
    name: 'B.S. in Electrical & Computer Eng.',
    school: 'College of Engineering (CIT)',
    category: 'Engineering & Robotics',
    salary: '$126.0k',
    acceptance: '6.8%',
    dimStyleIllustrativeScores: [
      { year: 2023, points: 650 },
      { year: 2024, points: 660 },
      { year: 2025, points: 670 },
    ],
    summary: 'Hardware-software co-design spanning circuits, signal processing, embedded systems, and computer architecture.',
  },
  {
    id: 'ai',
    tag: 'SCS • FIRST IN US',
    name: 'B.S. in Artificial Intelligence',
    school: 'School of Computer Science',
    category: 'Computer Science & AI',
    salary: '$142.0k',
    acceptance: '3.9%',
    dimStyleIllustrativeScores: [
      { year: 2023, points: 680 },
      { year: 2024, points: 685 },
      { year: 2025, points: 690 },
    ],
    summary: 'The first undergraduate AI degree in the US: machine perception, NLP, deep reinforcement learning, and AI ethics.',
  },
  {
    id: 'is',
    tag: 'DIETRICH & HEINZ',
    name: 'B.S. in Information Systems',
    school: 'Interdisciplinary IS Program',
    category: 'Business & Info Systems',
    salary: '$115.0k',
    acceptance: '11.4%',
    dimStyleIllustrativeScores: [
      { year: 2023, points: 600 },
      { year: 2024, points: 610 },
      { year: 2025, points: 620 },
    ],
    summary: 'Technology strategy, data analytics, and software development applied to organizations and policy.',
  },
  {
    id: 'cb',
    tag: 'SCS & MCS DUAL',
    name: 'B.S. in Computational Bio',
    school: 'Ray & Stephanie Lane Center',
    category: 'Natural Sciences',
    salary: '$121.0k',
    acceptance: '7.1%',
    dimStyleIllustrativeScores: [
      { year: 2023, points: 640 },
      { year: 2024, points: 650 },
      { year: 2025, points: 660 },
    ],
    summary: 'Algorithms and machine learning applied to genomics, protein structure, and systems biology.',
  },
];

export const colleges: College[] = [
  {
    id: 'cmu',
    name: 'Baku Higher Oil School',
    shortName: 'BHOS',
    location: 'Pittsburgh, PA',
    founded: 'Founded 1900',
    kind: 'Private R1 Research',
    heroImage: img('bhos-campus.jpg'),
    description:
      'World-renowned private research university pioneering computing, artificial intelligence, robotics, ' +
      'computational biology, and interdisciplinary fine arts.',
    mentorCount: 184,
    questionCount: 342,
    majorCount: 93,
    address: '5000 Forbes Ave • Oakland / Squirrel Hill Corridor',
    stats: [
      { label: 'Acceptance Rate', value: '11%', tag: 'Highly Selective', note: 'Class of 2028 baseline admissions', icon: 'pie_chart' },
      { label: 'Student-to-Faculty', value: '6:1', tag: 'Ultra Low Ratio', note: 'High personalized research access', icon: 'group' },
      { label: 'Avg Financial Aid', value: '$54,200', tag: 'Need-based Grant', note: '52% of undergraduates receive aid', icon: 'payments' },
      { label: 'Student Body', value: '15,818', tag: 'Undergrad & Grad', note: 'Representation from 115+ countries', icon: 'school' },
    ],
    mentors: [
      {
        id: 'evelyn',
        name: 'Evelyn Chen',
        role: 'scholar',
        avatar: img('avatar_evelyn_chen.jpg'),
        rating: 4.9,
        reviews: 42,
        college: 'School of Computer Science (SCS)',
        collegeShort: 'SCS',
        program: "B.S. Artificial Intelligence • Class of '26",
        tags: ['15-122 Rigor', 'FAANG Internships', 'SCS Supplemental Essay'],
        quote: 'Happy to unpack the real workload of SCS freshmen year, choosing between AI vs CS track, and optimizing portfolio projects.',
        responseTime: '~2h',
      },
      {
        id: 'marcus',
        name: 'Marcus Vance',
        role: 'scholar',
        avatar: img('avatar_marcus_vance.jpg'),
        rating: 5.0,
        reviews: 28,
        college: 'Tepper School of Business',
        collegeShort: 'Tepper',
        program: "B.S. Business Admin & Stats • Class of '25",
        tags: ['Wall St Recruiting', 'Quantitative Track', 'Transfer Admissions'],
        quote: 'Can detail how Tepper blends hardcore analytics into business. Interned at Morgan Stanley & McKinsey.',
        responseTime: '~45m',
      },
      {
        id: 'aarohi',
        name: 'Aarohi Nair',
        role: 'scholar',
        avatar: img('avatar_aarohi_nair.jpg'),
        rating: 4.9,
        reviews: 64,
        college: 'College of Engineering (CIT)',
        collegeShort: 'Engineering',
        program: "B.S. MechE / Robotics Minor • Class of '25",
        tags: ['Robotics Institute Labs', 'First-Year Dorms', 'Formula SAE'],
        quote: 'Ask me about hands-on prototyping facilities, maker pass access, and landing hardware engineering co-ops early.',
        responseTime: '~1h',
      },
      {
        id: 'julian',
        name: 'Julian Rossi',
        role: 'scholar',
        avatar: img('avatar_julian_rossi.jpg'),
        rating: 4.8,
        reviews: 19,
        college: 'Dietrich College of Humanities',
        collegeShort: 'Dietrich',
        program: "B.S. Decision Science & HCI • Class of '26",
        tags: ['Product Design (HCI)', 'Dietrich Flexibility', 'Oakland Food Scene'],
        quote: 'Dietrich allows you to connect behavioral psych with bleeding-edge UX engineering. Ask me how to build this hybrid minor.',
        responseTime: '~5h',
      },
    ],
    discussions: [
      {
        votes: 389,
        dislikes: 14,
        tags: ['Campus Culture', 'Mental Health'],
        askedBy: 'Asked by prospective CS applicant',
        question: "Is the infamous 'CMU stress culture' as overwhelming as Reddit claims? How do you cope?",
        answerer: 'Devin K.',
        answererRole: 'Verified Junior (ECE)',
        answeredAgo: '4 days ago',
        answer:
          'Here is the objective truth: the curriculum will push you to your absolute ceiling, especially in CS and ' +
          'Engineering core semesters (21-127 and 15-213). However, it is never toxic competition between peers — ' +
          'people collaborate in Sorrells Library until 2 AM doing joint p-sets with immense camaraderie. Set ' +
          'boundaries, treat weekends with care, and avoid taking 5 STEM courses at once.',
        answers: 48,
        accuracy: 92,
      },
      {
        votes: 241,
        dislikes: 9,
        tags: ['Student Life', 'Housing & Oakland'],
        askedBy: 'Asked by incoming Sophomore',
        question: 'Best off-campus neighborhoods for students: Squirrel Hill vs. Shadyside vs. South Oakland?',
        answerer: 'Maya Sterling',
        answererRole: 'Verified Senior (Design)',
        answeredAgo: '2 weeks ago',
        answer:
          "Avoid South Oakland if you enjoy sound sleep (it's mainly loud undergrad housing). Squirrel Hill is quiet, " +
          'safe, has the best Asian grocers and Murray Ave food, plus the 61 buses drop you at the Cohon Center in 6 ' +
          'minutes. Shadyside is pricier but very walkable to Walnut Street coffee shops.',
        answers: 31,
        accuracy: 96,
      },
      {
        votes: 178,
        dislikes: 6,
        tags: ['Student Life', 'Getting Started'],
        askedBy: 'Asked by an incoming student',
        question: 'What helped you feel at home during your first semester?',
        answerer: 'Student Contributor',
        answererRole: 'Student perspective',
        answeredAgo: '1 week ago',
        answer: 'Joining one or two student groups and making time to talk with classmates helped me build a routine and meet people. Give yourself time to settle in, and ask your peers or student support offices for help when you need it.',
        answers: 22,
        accuracy: 94,
      },
      {
        votes: 132,
        dislikes: 5,
        tags: ['Course Planning', 'Academics'],
        askedBy: 'Asked by a prospective student',
        question: 'How do you balance a demanding course load with activities outside class?',
        answerer: 'Student Contributor',
        answererRole: 'Student perspective',
        answeredAgo: '3 days ago',
        answer: 'Plan the week around fixed deadlines, leave time between classes for breaks, and avoid taking on every opportunity at once. Classmates can also be a good resource for comparing study strategies and workload expectations.',
        answers: 17,
        accuracy: 91,
      },
      {
        votes: 96,
        dislikes: 3,
        tags: ['Campus Life', 'Advice'],
        askedBy: 'Asked by an incoming student',
        question: 'What is one thing you wish you had known before starting university?',
        answerer: 'Student Contributor',
        answererRole: 'Student perspective',
        answeredAgo: '5 days ago',
        answer: 'You do not need to have everything figured out on day one. Explore your options, talk to students in different programs, and use campus resources early rather than waiting until you feel stuck.',
        answers: 13,
        accuracy: 97,
      },
    ],
    deadlines: [
      { kind: 'Binding', name: 'Early Decision I (ED1)', sub: 'Application Deadline', date: 'Nov 1', notice: 'Dec 15 Notice' },
      { kind: 'Binding', name: 'Early Decision II (ED2)', sub: 'Application Deadline', date: 'Jan 3', notice: 'Feb 15 Notice' },
      { kind: 'Non-Binding', name: 'Regular Decision', sub: 'Final Fall Cycle', date: 'Jan 3', notice: 'Apr 1 Notice' },
    ],
    checklist: [
      { label: 'Common Application or Coalition', required: true },
      { label: '3 CMU-specific Short Essays (300w each)', required: true },
      { label: 'Official Transcripts + Counselor Evaluation', required: true },
      { label: 'Test Optional (Standardized SAT/ACT)', required: false },
      { label: 'Portfolio submission (Design, Drama, Art only)', required: false },
    ],
    salaries: [
      { label: 'Computer Science (SCS)', value: '$142,000', fraction: 1 },
      { label: 'Engineering (CIT)', value: '$108,000', fraction: 0.76 },
      { label: 'Tepper Business', value: '$98,500', fraction: 0.69 },
    ],
    employers: ['Google', 'Apple', 'Microsoft', 'Jane Street', 'Meta', 'Amazon AWS', 'Goldman Sachs', 'McKinsey'],
    similar: [
      { initials: 'MIT', name: 'Massachusetts Institute of Tech', meta: 'Cambridge, MA • 4% Acceptance' },
      { initials: 'CU', name: 'Cornell University', meta: 'Ithaca, NY • 7% Acceptance' },
      { initials: 'GT', name: 'Georgia Institute of Tech', meta: 'Atlanta, GA • 13% Acceptance' },
      { initials: 'UM', name: 'University of Michigan', meta: 'Ann Arbor, MI • 18% Acceptance' },
    ],
    majorCategories: ['All Disciplines', 'Computer Science & AI', 'Engineering & Robotics', 'Business & Info Systems', 'Natural Sciences'],
    majors: [csMajor, ...otherMajors],
  },
];

export const tickets: Ticket[] = [
  {
    id: 't1',
    category: 'Essay Review',
    timeAgo: '15m ago',
    title: 'Feedback on CMU "Why SCS" Essay Draft',
    preview: 'Here is my revised draft focusing on parallel distributed computing labs...',
    from: 'Sarah Lin',
    contactId: people.sarahLin.id,
    contactAvatar: img('avatar_sarah_jenkins.jpg'),
    contactRole: 'Student',
    contactProfileSubtitle: 'Prospective student • Applying Early Decision',
    fromMeta: 'SAT 1540 • Applying ED',
    resolved: false,
    unread: true,
    messages: [
      {
        author: 'Sarah Lin',
        time: '15m ago',
        text:
          'Hi Maya! I watched your YouTube panel on SCS course trajectories. I drafted my 300-word "Why Carnegie Mellon ' +
          'SCS" response. Could you specifically check if my mention of the Parallel Data Lab feels natural or if it ' +
          'sounds like name-dropping? Here is the excerpt: "Collaborating within the Parallel Data Lab on non-volatile ' +
          'memory consistency represents the nexus of my interests in computer architecture..."',
      },
    ],
    suggestedReply:
      "Hi Sarah! Mentioning the PDL is fantastic, but rather than stating 'it represents the nexus', connect it to a bug " +
      'or experiment you already encountered. For example: mention what specific hardware constraints made you curious ' +
      'about non-volatile persistence.',
  },
  {
    id: 't2',
    category: 'Course Planning',
    timeAgo: '2h ago',
    title: 'Skipping 15-112 via Placement Test',
    preview: 'Does placing directly into 15-122 leave any major conceptual gaps for data structures?',
    from: 'Jordan Vance',
    contactId: people.jordanVance.id,
    contactAvatar: img('avatar_jordan_chen.jpg'),
    contactRole: 'Student',
    contactProfileSubtitle: 'Incoming student • Carnegie Mellon University',
    fromMeta: 'Freshman Admit',
    resolved: false,
    unread: true,
    messages: [
      {
        author: 'Jordan Vance',
        time: '2h ago',
        text: 'Does placing directly into 15-122 leave any major conceptual gaps for data structures? I did AP CS A in Java but have never written C.',
      },
    ],
  },
  {
    id: 't3',
    category: 'Research Advising',
    timeAgo: 'Yesterday',
    title: 'Cold Emailing LTI Professors for Lab Openings',
    preview: 'How specific should I be when referencing recent arXiv publications?',
    from: 'Alex Rivera',
    contactId: people.alexRivera.id,
    contactAvatar: img('avatar_alex_chen.jpg'),
    contactRole: 'Student',
    contactProfileSubtitle: 'Computer Science student • Carnegie Mellon University',
    fromMeta: 'Sophomore',
    resolved: false,
    unread: false,
    messages: [
      {
        author: 'Alex Rivera',
        time: 'Yesterday',
        text: 'How specific should I be when referencing recent arXiv publications? I do not want to sound like I only skimmed the abstract.',
      },
    ],
  },
];

const mayaSystems: Person = { ...people.maya, subtitle: 'Carnegie Mellon SCS • Systems Researcher', badge: undefined };

const profilePost = (p: Pick<Post, 'id' | 'timeAgo' | 'title' | 'body' | 'votes' | 'commentCount'>): Post => ({
  ...p,
  likes: p.votes,
  dislikes: 0,
  author: mayaSystems,
  channelId: 'research',
  myVote: 0,
  comments: [],
  bookmarked: false,
  tabs: [],
});

export const mentorProfiles: Record<string, MentorProfile> = {
  maya: {
    id: 'maya',
    name: 'Maya Patel',
    avatar: img('avatar_maya_patel.jpg'),
    cover: img('campus_gates_center.jpg'),
    classOf: 'CMU SCS • Class of 2025',
    headline: 'Undergraduate Researcher @ Language Technologies Institute • Incoming SWE @ Jane Street',
    degree: 'B.S. in Computer Science • Minor in Human-Computer Interaction',
    location: 'Pittsburgh, PA',
    languages: 'English, Gujarati, French',
    stats: [
      { value: '4.00', label: 'Major GPA' },
      { value: '98%', label: 'Helpful Rating' },
      { value: '240+', label: 'Scholars Mentored' },
      { value: '< 3 hrs', label: 'Response Time' },
    ],
    about: [
      'I entered Carnegie Mellon University with standard imposter syndrome: I had attended a public high school where ' +
        'AP Computer Science was the only programming coursework available. My first semester in 15-112 felt like ' +
        'jumping onto a moving bullet train.',
      'What transformed my academic trajectory was finding collegiate mentors who taught me how to read systems papers, ' +
        'navigate office hours strategically, and pitch research ideas to faculty. Now, as a senior teaching assistant ' +
        'and researcher, I dedicate 6 hours a week to helping applicants demystify top-tier CS programs.',
    ],
    wishIKnew: [
      'Holistic scoring is real: Having 15 programming projects matters far less than one deep, well-documented project that solved a concrete community issue.',
      'The SCS math placement: Prioritize discrete math reasoning and proofs over memorizing calculus formulas.',
    ],
    tracks: [
      { icon: 'description', title: 'SCS Essay Deep Teardown', body: 'Line-by-line critique of supplemental essays, highlighting authentic technical curiosity and impact.' },
      { icon: 'terminal', title: 'Portfolio & GitHub Review', body: 'Curate your code repositories and README files to stand out to admissions committees.' },
    ],
    posts: [
      profilePost({
        id: 'mp1',
        timeAgo: 'May 18, 2025',
        title: "Demystifying 15-213 and the CMU Systems Core: What They Don't Tell You",
        body:
          'Every prospective applicant asks what separates CMU SCS from others. It truly comes down to the rigor of ' +
          'early systems immersion. Writing cache simulators, heap allocators (malloc lab!), and proxy servers in raw ' +
          'C strips away magical abstractions. If you are preparing in high school, practice defensive debugging and ' +
          'build an intuitive feel for memory pointers.',
        votes: 486,
        commentCount: 92,
      }),
      profilePost({
        id: 'mp2',
        timeAgo: 'May 10, 2025',
        title: 'From CoreOS Kernel at Apple to Jane Street Quant Engineering: Navigating SWE Interviews',
        body:
          'When pivoting from low-level systems engineering to high-throughput quantitative infrastructure, the hiring ' +
          'teams were not testing algorithmic trivia memorization. They interrogated operational tradeoffs: cache ' +
          'locality, lock-free queues, and how operating systems handle scheduling latency under jitter.',
        votes: 620,
        commentCount: 118,
      }),
      profilePost({
        id: 'mp3',
        timeAgo: 'Apr 26, 2025',
        title: 'Undergraduate Research Fellowship at CMU LTI: How to Cold-Email Faculty Successfully',
        body:
          'Professors receive dozens of automated template emails daily. The ones that cut through synthesize a ' +
          '2-sentence thesis on their latest arXiv publication, propose a concrete edge case experiment, and attach a ' +
          'GitHub portfolio containing clean reproducible benchmarks.',
        votes: 312,
        commentCount: 45,
      }),
    ],
    journeyIntro:
      '"I entered computing not through early game modding, but through mathematical proof competitions where ' +
      'intuition collides with formal truth. At CMU, I found that operating systems and distributed algorithms share ' +
      'that same thrilling aesthetic: building rock-solid foundations so that complex human ideas can scale gracefully."',
    journey: [
      {
        title: 'Formal Academic Education',
        subtitle: 'Undergraduate coursework and scholastic standing',
        icon: 'school',
        items: [
          {
            title: 'Carnegie Mellon University',
            subtitle: 'School of Computer Science — B.S. in Computer Science',
            body: "Minor in Human-Computer Interaction • Dean's List High Honors (All Semesters)",
            trailing: 'GPA 4.00',
          },
          { title: '15-213 Intro to Computer Systems', subtitle: 'Memory hierarchy, virtual memory, concurrent networking in C.' },
          { title: '15-451 Algorithm Design & Analysis', subtitle: 'Randomized algorithms, amortized complexity, graph flows.' },
          { title: '15-445 Database Systems', subtitle: 'Relational query execution, B+ trees, ACID write-ahead logging.' },
        ],
      },
      {
        title: 'Industry & Research Appointments',
        subtitle: 'Software engineering internships and research fellowships',
        icon: 'work',
        items: [
          { title: 'Jane Street Capital • New York, NY', subtitle: 'Quantitative Trading / Software Engineering Intern', body: 'Engineered ultra-low latency execution pipelines in OCaml; benchmarked kernel bypass techniques.', trailing: 'Summer 2024' },
          { title: 'Apple Inc. • Cupertino, CA', subtitle: 'Software Engineering Intern — CoreOS Kernel Architecture', body: 'Contributed patches to XNU kernel subsystems; optimized spinlock contention.', trailing: 'Summer 2023' },
          { title: 'CMU Language Technologies Institute', subtitle: 'Undergraduate Research Fellow', body: 'Distributed training dynamics for sparse transformer layers; co-authored paper under review.', trailing: 'Fall 2023 – Present' },
        ],
      },
      {
        title: 'High School Pre-Collegiate Extracurriculars',
        subtitle: 'What framed my college applications and early leadership',
        icon: 'psychology',
        items: [
          { title: 'USAMO Qualifier', subtitle: 'Top 0.5% in United States Mathematical Olympiad competitions.' },
          { title: 'FIRST Robotics Team Captain', subtitle: 'Lead autonomy programmer; vision-tracking control with Kalman filters and OpenCV.' },
          { title: 'Regional Girls Who Code Founder', subtitle: 'Launched 4 county chapters mentoring 120+ middle school girls.' },
        ],
      },
      {
        title: 'Selective Scholarships & Honors',
        subtitle: 'Institutional and national merit recognitions',
        icon: 'military_tech',
        items: [
          { title: 'Palantir Women in Tech', subtitle: 'Selected as 1 of 10 national scholars honoring computing excellence.', trailing: 'National Award' },
          { title: "CMU SCS Dean's Fellowship", subtitle: 'Merit award recognizing top performers in SCS.', trailing: 'Institutional' },
          { title: 'Presidential Scholar', subtitle: "One of the nation's highest honors for graduating seniors.", trailing: 'Federal Level' },
        ],
      },
    ],
    nextSession: {
      date: 'Thursday, Nov 27, 2025 • 6:00 PM – 7:30 PM EST',
      attended: 0,
      seats: 14,
      title: 'Cracking CMU SCS Admissions & Systems Research AMA',
      body:
        'Deep dive into how Carnegie Mellon evaluates high school rigor, how to articulate technical projects on the ' +
        'Common App without buzzwords, and live Q&A on college life as a Tartan CS major.',
    },
    workshops: [
      { date: 'Oct 14, 2025', attended: 215, title: 'Demystifying Distributed Systems & Concurrency', body: 'Explained consensus protocols (Paxos vs Raft) using visual blackboard animations and real-world outage examples.' },
      { date: 'Sep 28, 2025', attended: 340, title: 'Technical Resume Teardowns: What FAANG & Prop Shops Look For', body: 'Live line-by-line review of 8 anonymized student resumes. Bullet point optimization formulas and impact metrics.' },
      { date: 'Aug 19, 2025', attended: 410, title: 'Landing Tier-1 Tech Internships as an Underclassman', body: 'Application timelines, cold outreach scripts, handling rejection spirals, and interview preparation cadence.' },
    ],
    rating: 4.98,
    reviewCount: 142,
    ratingBreakdown: [0.98, 0.02, 0, 0, 0],
    reviews: [
      {
        name: 'Alex Chen',
        avatar: img('avatar_alex_chen.jpg'),
        badge: 'Verified Student',
        role: 'Freshman at Stanford CS (Accepted to CMU SCS)',
        text:
          "Maya's perspective during the admissions cycle was invaluable. She did not feed me generic buzzwords or " +
          'hollow formulas; she forced me to identify why my robotics systems project actually mattered to me.',
        date: 'Oct 29, 2024',
        helpful: 48,
      },
      {
        name: 'Priya Sharma',
        avatar: img('avatar_priya_sharma.jpg'),
        badge: 'Verified Student',
        role: 'High School Senior, Class of 2029',
        text:
          "Attending Maya's AMA on high school math contests and how to weave competition math into engineering essays " +
          'demystified the whole process. A role model for women entering systems computing.',
        date: 'Nov 04, 2024',
        helpful: 33,
      },
      {
        name: 'Marcus Vance',
        avatar: img('avatar_marcus_vance.jpg'),
        badge: 'Former Mentee',
        role: 'Software Engineer at Google',
        text:
          'Maya mentored me when I was transitioning from non-traditional CS into low-level systems coursework. Her ' +
          'advice on memory allocators and operating systems gave me the exact foundation I needed.',
        date: 'Sep 12, 2024',
        helpful: 61,
      },
      {
        name: 'Elena Rostova',
        avatar: img('avatar_elena_rostova.jpg'),
        badge: 'Verified Student',
        role: 'Sophomore at CMU CS',
        text:
          'As my Head TA in 15-122, Maya turned intimidating pointer invariants into intuitive concepts. Her public ' +
          `sessions on ${BRAND} are equally generous and detailed. CMU is lucky to have her!`,
        date: 'Aug 15, 2024',
        helpful: 29,
      },
    ],
  },
};
