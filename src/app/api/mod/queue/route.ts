import { db } from "@/lib/db";
import { fail, ok, requireMod } from "@/lib/auth";
import { safeParseTopics } from "@/lib/validation";
import { stringSimilarity } from "@/lib/company-utils";

function computeSla(createdAt: Date, targetHours = 24) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 3600);
  const remainingHours = Math.max(0, Math.round((targetHours - ageHours) * 10) / 10);
  const isOverdue = ageHours > targetHours;
  const status: "ON_TRACK" | "EXPIRING_SOON" | "OVERDUE" = isOverdue
    ? "OVERDUE"
    : remainingHours <= 6
      ? "EXPIRING_SOON"
      : "ON_TRACK";

  return {
    ageHours: Math.round(ageHours * 10) / 10,
    remainingHours,
    isOverdue,
    status,
  };
}

/** Comprehensive moderation dashboard: queues, duplicate detection, SLA metrics, logs. */
export async function GET() {
  try {
    await requireMod();
    const [
      pendingReports,
      pendingExperiences,
      pendingCompanies,
      openFlags,
      pendingVerifications,
      openDrives,
      approvedReports,
      recentLogs,
    ] = await Promise.all([
      db.oaReport.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          author: true,
          company: true,
          body: true,
          drive: { select: { company: true, role: true, status: true, driveDate: true } },
          questions: { orderBy: { order: "asc" } },
        },
      }),
      db.experience.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          author: true,
          companyRef: true,
          rounds: { include: { questions: true } },
        },
      }),
      db.company.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      }),
      db.flag.findMany({
        where: { resolved: false },
        orderBy: { createdAt: "asc" },
        include: { reporter: true },
      }),
      db.user.findMany({
        where: { rollNumber: { not: null }, rollVerified: false },
        orderBy: { createdAt: "asc" },
      }),
      db.drive.findMany({ where: { status: "OPEN" }, orderBy: { driveDate: "asc" } }),
      db.oaReport.findMany({
        where: { status: "APPROVED" },
        select: { id: true, companyId: true, summary: true },
        take: 150,
      }),
      db.moderationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        include: { moderator: { select: { name: true, email: true } } },
      }),
    ]);

    // Duplicate detection for pending reports
    const reportList = pendingReports.map((r) => {
      let maxSim = 0;
      let duplicateMatch: { id: string; similarity: number } | null = null;
      for (const a of approvedReports) {
        if (a.companyId === r.companyId) {
          const sim = stringSimilarity(r.summary, a.summary);
          if (sim > maxSim) {
            maxSim = sim;
            duplicateMatch = { id: a.id, similarity: Math.round(sim * 100) / 100 };
          }
        }
      }

      return {
        id: r.id,
        author: { id: r.author.id, name: r.author.name, email: r.author.email },
        company: r.drive?.company ?? r.company.slug,
        companyName: r.company.name,
        hiringSeason: r.hiringSeason,
        graduatingBatch: r.graduatingBatch,
        driveRole: r.drive?.role ?? r.role,
        driveStatus: r.drive?.status ?? "CLOSED",
        round: r.round,
        platform: r.platform,
        topics: safeParseTopics(r.topics),
        difficulty: r.difficulty,
        outcome: r.outcome,
        summary: r.summary,
        bodyText: r.body?.text ?? "",
        questionCount: r.questions.length,
        questions: r.questions.map((q) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          statementMd: q.statementMd,
          difficulty: q.difficulty,
        })),
        duplicateRisk: maxSim >= 0.65 ? duplicateMatch : null,
        sla: computeSla(r.createdAt),
        createdAt: r.createdAt,
      };
    });

    // Hydrate flags
    const idsByType = (type: string) =>
      [...new Set(openFlags.filter((f) => f.targetType === type).map((f) => f.targetId))];

    const reportIds = idsByType("REPORT");
    const expIds = idsByType("EXPERIENCE");
    const doubtIds = idsByType("DOUBT");
    const answerIds = idsByType("ANSWER");

    const [flaggedReports, flaggedExps, flaggedDoubts, flaggedAnswers] = await Promise.all([
      reportIds.length
        ? db.oaReport.findMany({ where: { id: { in: reportIds } }, select: { id: true, summary: true } })
        : [],
      expIds.length
        ? db.experience.findMany({ where: { id: { in: expIds } }, select: { id: true, body: true } })
        : [],
      doubtIds.length
        ? db.doubt.findMany({ where: { id: { in: doubtIds } }, select: { id: true, title: true, body: true } })
        : [],
      answerIds.length
        ? db.answer.findMany({ where: { id: { in: answerIds } }, select: { id: true, body: true } })
        : [],
    ]);

    const previewMap = new Map<string, string>();
    flaggedReports.forEach((r) => previewMap.set(`REPORT:${r.id}`, r.summary.slice(0, 140)));
    flaggedExps.forEach((e) => previewMap.set(`EXPERIENCE:${e.id}`, e.body.slice(0, 140)));
    flaggedDoubts.forEach((d) => previewMap.set(`DOUBT:${d.id}`, `${d.title} — ${d.body.slice(0, 100)}`));
    flaggedAnswers.forEach((a) => previewMap.set(`ANSWER:${a.id}`, a.body.slice(0, 140)));

    const hydratedFlags = openFlags.map((f) => {
      const preview = previewMap.get(`${f.targetType}:${f.targetId}`);
      return {
        id: f.id,
        targetType: f.targetType,
        targetId: f.targetId,
        reason: f.reason,
        createdAt: f.createdAt,
        reporter: f.reporter.name,
        targetPreview: preview ?? "(content not found)",
        targetExists: preview !== undefined,
        sla: computeSla(f.createdAt),
      };
    });

    return ok({
      pendingReports: reportList,
      pendingExperiences: pendingExperiences.map((e) => ({
        id: e.id,
        author: { id: e.author.id, name: e.author.name, email: e.author.email },
        company: e.company,
        companyName: e.companyRef.name,
        hiringSeason: e.hiringSeason,
        role: e.role,
        round: e.round,
        platform: e.platform,
        topics: safeParseTopics(e.topics),
        difficulty: e.difficulty,
        outcome: e.outcome,
        bodyText: e.body,
        roundCount: e.rounds.length,
        sla: computeSla(e.createdAt),
        createdAt: e.createdAt,
      })),
      pendingCompanies: pendingCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        website: c.website,
        sectors: c.sectors,
        hiringRoles: c.hiringRoles,
        aliases: c.aliases,
        proposedBy: c.createdBy?.name ?? "Unknown",
        createdAt: c.createdAt,
        sla: computeSla(c.createdAt),
      })),
      flags: hydratedFlags,
      verifications: pendingVerifications.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rollNumber: u.rollNumber,
        collegeDomain: u.collegeDomain,
        createdAt: u.createdAt,
        sla: computeSla(u.createdAt),
      })),
      openDrives: openDrives.map((d) => ({
        id: d.id,
        company: d.company,
        role: d.role,
        driveDate: d.driveDate,
        status: d.status,
      })),
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        moderatorName: l.moderator.name,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        reason: l.reason,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
