import { db } from "@/lib/db";
import { fail, ok } from "@/lib/auth";

/** Platform stats for the home page. */
export async function GET() {
  try {
    const problemsData = (await import("@/data/problems.json")).default;
    const problemCount = Object.values(problemsData).reduce((n: number, list) => n + (list as unknown[]).length, 0);

    const [students, approvedReports, approvedExperiences, doubts, openDrives, totalCoinsEarned] = await Promise.all([
      db.user.count({ where: { rollVerified: true } }),
      db.oaReport.count({ where: { status: "APPROVED" } }),
      db.experience.count({ where: { status: "APPROVED" } }),
      db.doubt.count(),
      db.drive.count({ where: { status: "OPEN" } }),
      db.coinLedger.aggregate({ where: { amount: { gt: 0 } }, _sum: { amount: true } }),
    ]);

    return ok({
      stats: {
        students,
        approvedReports,
        approvedExperiences,
        doubts,
        openDrives,
        problemCount,
        coinsInCirculation: totalCoinsEarned._sum.amount ?? 0,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
