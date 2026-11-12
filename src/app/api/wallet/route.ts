import { db } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/auth";
import { balanceOf, contributionCompanies } from "@/lib/coins";
import { config } from "@/data/config";

export async function GET() {
  try {
    const user = await requireUser();
    const [balance, ledger, unlocks, contribs] = await Promise.all([
      balanceOf(user.id),
      db.coinLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.unlock.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          report: {
            select: {
              id: true,
              role: true,
              round: true,
              platform: true,
              difficulty: true,
              company: { select: { slug: true, name: true } },
              drive: { select: { company: true, role: true, status: true } },
            },
          },
        },
      }),
      contributionCompanies(user.id),
    ]);

    return ok({
      balance,
      ledger: ledger.map((l) => ({
        id: l.id,
        amount: l.amount,
        reason: l.reason,
        note: l.note,
        createdAt: l.createdAt,
      })),
      unlocks: unlocks.map((u) => ({
        id: u.id,
        free: u.free,
        createdAt: u.createdAt,
        report: {
          id: u.report.id,
          company: u.report.drive?.company ?? u.report.company.slug,
          driveRole: u.report.drive?.role ?? u.report.role,
          round: u.report.round,
          platform: u.report.platform,
          difficulty: u.report.difficulty,
        },
      })),
      contributionCompanies: contribs,
      rates: config.rates,
      caps: config.caps,
    });
  } catch (err) {
    return fail(err);
  }
}
