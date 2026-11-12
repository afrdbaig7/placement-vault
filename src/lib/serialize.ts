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
  if (anonymous) return { name: "Anonymous Student", placedCompany: null as string | null, isPlaced: false, role: "STUDENT" };
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
    questions?: Array<{
      id: string;
      type: string;
      title: string | null;
      statementMd: string;
      constraints: string | null;
      sampleIO: string | null;
      topics: string[];
      difficulty: string;
      linkedProblemId: string | null;
      marks: number | null;
    }>;
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

  // Hard embargo check: no OA question text or statements from an OPEN drive
  // is EVER returned to unauthorized viewers.
  const embargoActive = driveStatus === "OPEN" && !isAuthor && !isModRole;

  return {
    id: r.id,
    company: companySlug,
    driveId: r.driveId,
    driveRole: r.drive?.role ?? r.role,
    driveStatus,
    driveDate: r.drive?.driveDate ?? r.assessmentDate,
    hiringSeason: r.hiringSeason,
    graduatingBatch: r.graduatingBatch,
    round: r.round,
    platform: r.platform,
    sections: r.sections,
    topics: safeParseTopics(r.topics),
    difficulty: r.difficulty,
    outcome: r.outcome,
    summary: r.summary,
    status: r.status,
    isAnonymous: r.isAnonymous,
    upvoteCount: r.upvoteCount,
    createdAt: r.createdAt,
    author: authorDisplay(r.author, r.isAnonymous && !isAuthor && !isModRole),
    underEmbargo: driveStatus === "OPEN",
    gated: !canReadBody,
    body: !embargoActive && canReadBody && r.status === "APPROVED" ? r.body?.text ?? null : null,
    questions:
      !embargoActive && canReadBody && r.questions
        ? r.questions.map((q) => ({
            id: q.id,
            type: q.type,
            title: q.title,
            statementMd: q.statementMd,
            constraints: q.constraints,
            sampleIO: q.sampleIO,
            topics: safeParseTopics(q.topics),
            difficulty: q.difficulty,
            linkedProblemId: q.linkedProblemId,
            marks: q.marks,
          }))
        : [],
    questionCount: r.questions?.length ?? 0,
    unlockCost: free ? 0 : config.rates.unlockOa,
    freeUnlock: free && !isAuthor,
    myVote: viewer.votedSet.has(`REPORT:${r.id}`),
  };
}

export function experienceView(
  e: Experience & {
    author: User;
    companyRef?: { slug: string; name: string } | null;
    rounds?: Array<{
      id: string;
      order: number;
      name: string;
      type: string;
      durationMin: number | null;
      notes: string | null;
      questions?: Array<{
        id: string;
        text: string;
        topics: string[];
        difficulty: string | null;
        linkedProblemId: string | null;
      }>;
    }>;
  },
  viewer: Viewer
) {
  const isAuthor = viewer.user?.id === e.authorId;
  const isModRole = isMod(viewer.user?.role ?? "");
  if (e.status !== "APPROVED" && !isAuthor && !isModRole) return null;
  return {
    id: e.id,
    company: e.company,
    companyName: e.companyRef?.name ?? e.company,
    hiringSeason: e.hiringSeason,
    graduatingBatch: e.graduatingBatch,
    role: e.role,
    offerStatus: e.offerStatus,
    overallDifficulty: e.overallDifficulty,
    round: e.round,
    platform: e.platform,
    topics: safeParseTopics(e.topics),
    difficulty: e.difficulty,
    outcome: e.outcome,
    tips: e.tips,
    body: e.body,
    status: e.status,
    isAnonymous: e.isAnonymous,
    upvoteCount: e.upvoteCount,
    createdAt: e.createdAt,
    author: authorDisplay(e.author, e.isAnonymous && !isAuthor && !isModRole),
    rounds:
      e.rounds?.map((rd) => ({
        id: rd.id,
        order: rd.order,
        name: rd.name,
        type: rd.type,
        durationMin: rd.durationMin,
        notes: rd.notes,
        questions: rd.questions ?? [],
      })) ?? [],
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
