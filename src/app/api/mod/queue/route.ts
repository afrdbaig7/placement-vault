import { db } from "@/lib/db";
import { fail, ok, requireMod } from "@/lib/auth";
import { safeParseTopics } from "@/lib/validation";

/** Everything a mod needs in one call: queues, flags, open drives. */
export async function GET() {
  try {
    await requireMod();
    const [pendingReports, pendingExperiences, openFlags, pendingVerifications, openDrives] = await Promise.all([
      db.oaReport.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          author: true,
          body: true,
          drive: { select: { company: true, role: true, status: true, driveDate: true } },
        },
      }),
      db.experience.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { author: true },
      }),
      db.flag.findMany({
        where: { resolved: false },
        orderBy: { createdAt: "asc" },
        include: { reporter: true },
      }),
      db.user.findMany({ where: { rollNumber: { not: null }, rollVerified: false }, orderBy: { createdAt: "asc" } }),
      db.drive.findMany({ where: { status: "OPEN" }, orderBy: { driveDate: "asc" } }),
    ]);

    // Batch-fetch flagged target previews to avoid N+1 queries
    const idsByType = (type: string) =>
      [...new Set(openFlags.filter((f) => f.targetType === type).map((f) => f.targetId))];

    const reportIds = idsByType("REPORT");
    const expIds = idsByType("EXPERIENCE");
    const doubtIds = idsByType("DOUBT");
    const answerIds = idsByType("ANSWER");

    const [reports, exps, doubts, answers] = await Promise.all([
      reportIds.length ? db.oaReport.findMany({ where: { id: { in: reportIds } }, select: { id: true, summary: true } }) : [],
      expIds.length ? db.experience.findMany({ where: { id: { in: expIds } }, select: { id: true, body: true } }) : [],
      doubtIds.length ? db.doubt.findMany({ where: { id: { in: doubtIds } }, select: { id: true, title: true, body: true } }) : [],
      answerIds.length ? db.answer.findMany({ where: { id: { in: answerIds } }, select: { id: true, body: true } }) : [],
    ]);

    const previewMap = new Map<string, string>();
    reports.forEach((r) => previewMap.set(`REPORT:${r.id}`, r.summary.slice(0, 140)));
    exps.forEach((e) => previewMap.set(`EXPERIENCE:${e.id}`, e.body.slice(0, 140)));
    doubts.forEach((d) => previewMap.set(`DOUBT:${d.id}`, `${d.title} — ${d.body.slice(0, 100)}`));
    answers.forEach((a) => previewMap.set(`ANSWER:${a.id}`, a.body.slice(0, 140)));

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
      };
    });

    return ok({
      pendingReports: pendingReports.map((r) => ({
        id: r.id,
        author: { id: r.author.id, name: r.author.name },
        company: r.drive.company,
        driveRole: r.drive.role,
        driveStatus: r.drive.status,
        round: r.round,
        platform: r.platform,
        topics: safeParseTopics(r.topics),
        difficulty: r.difficulty,
        outcome: r.outcome,
        summary: r.summary,
        bodyText: r.body?.text ?? "",
        createdAt: r.createdAt,
      })),
      pendingExperiences: pendingExperiences.map((e) => ({
        id: e.id,
        author: { id: e.author.id, name: e.author.name },
        company: e.company,
        role: e.role,
        round: e.round,
        platform: e.platform,
        topics: safeParseTopics(e.topics),
        difficulty: e.difficulty,
        outcome: e.outcome,
        bodyText: e.body,
        createdAt: e.createdAt,
      })),
      flags: hydratedFlags,
      verifications: pendingVerifications.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rollNumber: u.rollNumber,
        createdAt: u.createdAt,
      })),
      openDrives: openDrives.map((d) => ({
        id: d.id,
        company: d.company,
        role: d.role,
        driveDate: d.driveDate,
        status: d.status,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
