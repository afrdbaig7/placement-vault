// Shared client-side types matching the API responses.

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: "STUDENT" | "SENIOR" | "MOD" | "ADMIN";
  rollNumber: string | null;
  rollVerified: boolean;
  placedCompany: string | null;
  batch: string | null;
  createdAt: string;
};

export type Session = {
  user: SessionUser | null;
  balance: number;
  contributionCompanies: string[];
  postsToday: number;
  rates: {
    welcomeGrant: number;
    reportApproved: number;
    experienceApproved: number;
    answerAccepted: number;
    upvoteReceived: number;
    unlockOa: number;
  };
  caps: { dailyPosts: number; upvoteEarnDaily: number };
  csrfToken?: string;
  authConfig?: { googleEnabled: boolean; devDemoEnabled: boolean };
};

export type Company = {
  slug: string;
  name: string;
  color: string;
  type: "product" | "service";
  region: "Global" | "Indian";
  tier: "FAANG" | "Product" | "Service" | "Finance" | "Fintech";
  tagline: string;
  typicalRoles: string[];
  rounds: { name: string; details: string }[];
  oaPattern: { platform: string; duration: string; questions: string; note: string };
  topicsFocus: string[];
};

export type Problem = { title: string; slug: string; difficulty: "Easy" | "Medium" | "Hard"; window: "6mo" | "1yr" | "older" };

export type PracticeSet = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  topics: string[];
  resources: { name: string; url: string }[];
  sampleQuestions: { q: string; answer: string }[];
};

export type AuthorInfo = { name: string; placedCompany: string | null; isPlaced: boolean; role: string };

export type ReportView = {
  id: string;
  company: string;
  driveId: string;
  driveRole: string;
  driveStatus: string;
  driveDate: string;
  round: string;
  platform: string;
  topics: string[];
  difficulty: string;
  outcome: string;
  summary: string;
  status: string;
  upvoteCount: number;
  createdAt: string;
  author: AuthorInfo;
  underEmbargo: boolean;
  gated: boolean;
  body: string | null;
  unlockCost: number;
  freeUnlock: boolean;
  myVote: boolean;
};

export type ExperienceView = {
  id: string;
  company: string;
  role: string;
  round: string;
  platform: string;
  topics: string[];
  difficulty: string;
  outcome: string;
  body: string;
  status: string;
  upvoteCount: number;
  createdAt: string;
  author: AuthorInfo;
  myVote: boolean;
};

export type DoubtView = {
  id: string;
  company: string;
  title: string;
  body: string;
  anonymous: boolean;
  upvoteCount: number;
  answerCount: number;
  createdAt: string;
  author: AuthorInfo;
  myVote: boolean;
  canAccept: boolean;
};

export type AnswerView = {
  id: string;
  doubtId: string;
  body: string;
  accepted: boolean;
  upvoteCount: number;
  createdAt: string;
  author: AuthorInfo;
  myVote: boolean;
};

export type DriveView = {
  id: string;
  company: string;
  role: string;
  driveDate: string;
  status: "OPEN" | "CLOSED";
  branches: string;
  minCgpa: number | null;
  notes: string | null;
  approvedReports?: number;
  totalReports?: number;
  reportCount?: number;
};

export type HubData = {
  company: Company;
  drives: DriveView[];
  aggregates: {
    approvedReports: number;
    approvedExperiences: number;
    doubts: number;
    platforms: string[];
    rounds: string[];
    difficultyDist: Record<string, number>;
    topicFreq: { topic: string; count: number }[];
  };
};

export type WalletData = {
  balance: number;
  ledger: { id: string; amount: number; reason: string; note: string | null; createdAt: string }[];
  unlocks: {
    id: string;
    free: boolean;
    createdAt: string;
    report: { id: string; company: string; driveRole: string; round: string; platform: string; difficulty: string };
  }[];
  contributionCompanies: string[];
};

export type ModQueueData = {
  pendingReports: {
    id: string;
    author: { id: string; name: string };
    company: string;
    driveRole: string;
    driveStatus: string;
    round: string;
    platform: string;
    topics: string[];
    difficulty: string;
    outcome: string;
    summary: string;
    bodyText: string;
    createdAt: string;
  }[];
  pendingExperiences: {
    id: string;
    author: { id: string; name: string };
    company: string;
    role: string;
    round: string;
    platform: string;
    topics: string[];
    difficulty: string;
    outcome: string;
    bodyText: string;
    createdAt: string;
  }[];
  flags: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    createdAt: string;
    reporter: string;
    targetPreview: string;
    targetExists: boolean;
  }[];
  verifications: { id: string; name: string; email: string; rollNumber: string | null; createdAt: string }[];
  openDrives: { id: string; company: string; role: string; driveDate: string; status: string }[];
};

export type StatsData = {
  stats: {
    students: number;
    approvedReports: number;
    approvedExperiences: number;
    doubts: number;
    openDrives: number;
    problemCount: number;
    coinsInCirculation: number;
  };
};
