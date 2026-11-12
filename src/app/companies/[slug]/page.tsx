import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { config } from "@/data/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Calendar, FileText, CheckCircle2, Code2, Users } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await db.company.findUnique({
    where: { slug },
    select: { name: true, sectors: true, hiringRoles: true },
  });

  if (!company) {
    return { title: `Company Not Found — ${config.collegeName}` };
  }

  const title = `${company.name} Placement Preparation & 2026-27 OA Reports — ${config.collegeName}`;
  const description = `Prepare for ${company.name} on-campus drives at ${config.collegeName}. Browse verified 2026-27 Online Assessment questions, round-by-round interview experiences, and tagged coding problem frequencies.`;

  return {
    title,
    description,
    keywords: [
      company.name,
      `${company.name} OA questions`,
      `${company.name} interview experience`,
      `${company.name} 2026-27 batch`,
      "campus placement",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      siteName: `${config.collegeName} Placement Hub`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CompanySeoPage({ params }: Props) {
  const { slug } = await params;
  const company = await db.company.findUnique({
    where: { slug },
    include: {
      oaReports: {
        where: { status: "APPROVED" },
        select: { id: true, hiringSeason: true, role: true, platform: true, assessmentDate: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      experiences: {
        where: { status: "APPROVED" },
        select: { id: true, hiringSeason: true, role: true, offerStatus: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          oaReports: { where: { status: "APPROVED" } },
          experiences: { where: { status: "APPROVED" } },
          companyProblems: true,
          drives: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const count2027 = await db.oaReport.count({
    where: { companyId: company.id, hiringSeason: "2026-27", status: "APPROVED" },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    name: `${company.name} Placement Prep Hub`,
    description: `Placement archive and interview intelligence for ${company.name} at ${config.collegeName}`,
    recognizedBy: {
      "@type": "CollegeOrUniversity",
      name: config.collegeName,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-2xl">
              {company.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500" /> Verified Recruiter
                </Badge>
                {count2027 > 0 && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                    Latest 2026-27 Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {company.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "Official On-Campus Recruiter"
                )}
              </p>
            </div>
          </div>
          <Link href={`/?company=${company.slug}`}>
            <Button className="w-full sm:w-auto">Open Interactive Hub</Button>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <div className="text-2xl font-bold">{company._count.oaReports}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <FileText className="h-3 w-3" /> OA Reports
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <div className="text-2xl font-bold">{company._count.experiences}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Users className="h-3 w-3" /> Interview Loops
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <div className="text-2xl font-bold">{company._count.companyProblems}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Code2 className="h-3 w-3" /> Tagged Problems
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{count2027}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" /> 2026-27 Reports
            </div>
          </div>
        </div>

        {company.sectors.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Sectors:</span>
            {company.sectors.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Recent Approved Assessments
          </h2>
          {company.oaReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No approved OA reports yet for this company.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {company.oaReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <span className="font-medium">{r.role || "Software Development Engineer"}</span>
                    <span className="text-muted-foreground ml-2">({r.platform})</span>
                  </div>
                  <Badge variant={r.hiringSeason === "2026-27" ? "default" : "secondary"}>
                    {r.hiringSeason}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
