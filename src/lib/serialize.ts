import "server-only";
import { db } from "@/lib/db";
import { contributionCompanies } from "@/lib/coins";
import { safeParseTopics } from "@/lib/validation";
import { config, isMod } from "@/data/config";
import type { OaReport, OaBody, Experience, Doubt, Answer, User } from "@prisma/client";

export type Viewer = {
  user: User | null;
  unlockedSet: Set<string>;
  giveToGet: Set<string>;
  votedSet: Set<string>;
};

export async function buildViewer(userId: string | null): Promise<Viewer> {
  if (!userId) {
    return { user: null, unlockedSet: new Set(), giveToGet: new Set(), votedSet: new Set() };
  }
  const [user, unlocks, contribs, votes] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.unlock.findMany({ where: { userId }, select: { reportId: true } }),
    contributionCompanies(userId),
    db.vote.findMany({ where: { userId }, select: { targetType: true, targetId: true } }),
  ]);
  return {
    user,
    unlockedSet: new Set(unlocks.map((u) => u.reportId)),
    giveToGet: new Set(contribs),
    votedSet: new Set(votes.map((v) => `${v.targetType}:${v.targetId}`)),
  };
}

function authorDisplay(u: User | null, anonymous: boolean) {
  if (!u) return { name: "Unknown", placedCompany: null as string | null, isPlaced: false, role: "STUDENT" };
  if (anonymous) return { name: "Anonymous", placedCompany: null as string | null, isPlaced: false, role: "STUDENT" };
  return {
    name: u.name,
    placedCompany: u.placedCompany,
    isPlaced: Boolean(u.placedCompany),
    role: u.role,
  };
}

export function reportView(
  r: OaReport & {
    author: User;
    body?: OaBody | null;
    drive?: { company: string; status: string; role: string; driveDate: Date } | null;
    company?: { slug: string; name: string } | null;
  },
  viewer: Viewer
) {
  const isAuthor = viewer.user?.id === r.authorId;
  const isModRole = isMod(viewer.user?.role ?? "");
  const companySlug = r.drive?.company ?? r.company?.slug ?? "";
  const driveStatus = r.drive?.status ?? "CLOSED";
  const publiclyVisible = r.status === "APPROVED" && driveStatus === "CLOSED";
  if (!publiclyVisible && !isAuthor && !isModRole) return null;

  const canReadBody = isAuthor || isModRole || viewer.unlockedSet.has(r.id);
  const free = isAuthor || isModRole || (companySlug ? viewer.giveToGet.has(companySlug) : false);
  return {
    id: r.id,
    company: companySlug,
    driveId: r.driveId,
    driveRole: r.drive?.role ?? r.role,
    driveStatus,
    driveDate: r.drive?.driveDate ?? r.assessmentDate,
    round: r.round,
    platform: r.platform,
    topics: safeParseTopics(r.topics),
    difficulty: r.difficulty,
    outcome: r.outcome,
    summary: r.summary,
    status: r.status,
    upvoteCount: r.upvoteCount,
    createdAt: r.createdAt,
    author: authorDisplay(r.author, false),
    underEmbargo: driveStatus === "OPEN",
    gated: !canReadBody,
    body: canReadBody && r.status === "APPROVED" ? r.body?.text ?? null : null,
    unlockCost: free ? 0 : config.rates.unlockOa,
    freeUnlock: free && !isAuthor,
    myVote: viewer.votedSet.has(`REPORT:${r.id}`),
  };
}

export function experienceView(e: Experience & { author: User }, viewer: Viewer) {
  const isAuthor = viewer.user?.id === e.authorId;
  const isModRole = isMod(viewer.user?.role ?? "");
  if (e.status !== "APPROVED" && !isAuthor && !isModRole) return null;
  return {
    id: e.id,
    company: e.company,
    role: e.role,
    round: e.round,
    platform: e.platform,
    topics: safeParseTopics(e.topics),
    difficulty: e.difficulty,
    outcome: e.outcome,
    body: e.body,
    status: e.status,
    upvoteCount: e.upvoteCount,
    createdAt: e.createdAt,
    author: authorDisplay(e.author, false),
    myVote: viewer.votedSet.has(`EXPERIENCE:${e.id}`),
  };
}

export function doubtView(d: Doubt & { author: User; _count?: { answers: number } }, viewer: Viewer) {
  return {
    id: d.id,
    company: d.company,
    title: d.title,
    body: d.body,
    anonymous: d.anonymous,
    upvoteCount: d.upvoteCount,
    answerCount: d._count?.answers ?? 0,
    createdAt: d.createdAt,
    author: authorDisplay(d.author, d.anonymous),
    myVote: viewer.votedSet.has(`DOUBT:${d.id}`),
    canAccept: viewer.user?.id === d.authorId,
  };
}

export function answerView(a: Answer & { author: User }, viewer: Viewer) {
  return {
    id: a.id,
    doubtId: a.doubtId,
    body: a.body,
    accepted: a.accepted,
    upvoteCount: a.upvoteCount,
    createdAt: a.createdAt,
    author: authorDisplay(a.author, false),
    myVote: viewer.votedSet.has(`ANSWER:${a.id}`),
  };
}
