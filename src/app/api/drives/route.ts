import { db } from "@/lib/db";
import { fail, ok, requireMod, ApiError } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createDriveSchema, parseBody } from "@/lib/validation";

export async function GET() {
  try {
    const drives = await db.drive.findMany({
      orderBy: { driveDate: "desc" },
      include: {
        _count: { select: { reports: true } },
      },
    });
    const counts = await db.oaReport.groupBy({
      by: ["driveId"],
      where: { status: "APPROVED" },
      _count: { _all: true },
    });
    const approvedByDrive = new Map(counts.map((c) => [c.driveId, c._count._all]));
    return ok({
      drives: drives.map((d) => ({
        id: d.id,
        company: d.company,
        role: d.role,
        driveDate: d.driveDate,
        status: d.status,
        branches: d.branches,
        minCgpa: d.minCgpa,
        notes: d.notes,
        approvedReports: approvedByDrive.get(d.id) ?? 0,
        totalReports: d._count.reports,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    await assertCsrf(req);
    const mod = await requireMod();
    enforceRateLimit(req, { bucket: "drives-create", limit: 20, windowMs: 60_000, keySuffix: mod.id });

    const { company, role, driveDate, branches, minCgpa, notes } = await parseBody(
      req,
      createDriveSchema
    );

    const companyRecord = await db.company.findUnique({ where: { slug: company } });
    if (!companyRecord) throw new ApiError(404, "Company not found");

    const drive = await db.drive.create({
      data: {
        companyId: companyRecord.id,
        company: companyRecord.slug,
        role,
        driveDate: new Date(driveDate),
        status: "OPEN",
        branches,
        minCgpa,
        notes,
      },
    });
    return ok({ drive });
  } catch (err) {
    return fail(err);
  }
}
