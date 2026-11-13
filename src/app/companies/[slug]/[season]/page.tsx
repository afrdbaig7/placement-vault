import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { config } from "@/data/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText, Sparkles } from "lucide-react";

interface Props {
  params: Promise<{ slug: string; season: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, season } = await params;
  const normalizedSeason = season.replace(/^oa-/, "");
  const company = await db.company.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!company) {
    return { title: `Company Not Found — ${config.collegeName}` };
  }

  const title = `${company.name} ${normalizedSeason} Online Assessment (OA) Reports — ${config.collegeName}`;
  const description = `Verified ${normalizedSeason} batch OA questions, technical patterns, and test formats for ${company.name} at ${config.collegeName}.`;

  return {
    title,
    description,
    keywords: [
      company.name,
      `${company.name} ${normalizedSeason}`,
      `${company.name} OA questions`,
      "coding rounds",
    ],
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function CompanySeasonPage({ params }: Props) {
  const { slug, season } = await params;
  const hiringSeason = season.replace(/^oa-/, "");

  const company = await db.company.findUnique({
    where: { slug },
    include: {
      oaReports: {
        where: { status: "APPROVED", hiringSeason },
        include: {
          questions: {
            select: { id: true, type: true, difficulty: true, topics: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/companies/${company.slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {company.name} Overview
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {company.name} — {hiringSeason} OA Reports
              </h1>
              {hiringSeason === "2026-27" && (
                <Badge className="bg-emerald-600 text-white">
                  <Sparkles className="mr-1 h-3 w-3" /> Class of 2027 Priority
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Curated assessments submitted by verified candidates and reviewed by student moderators.
            </p>
          </div>
          <Link href={`/?company=${company.slug}&tab=oa`}>
            <Button>Launch Interactive Hub</Button>
          </Link>
        </div>

        <div className="mt-6">
          {company.oaReports.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h3 className="mt-3 text-base font-semibold">No {hiringSeason} OA reports submitted yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to share your experience and earn a +25 pioneer bounty!
              </p>
              <div className="mt-4">
                <Link href="/?tab=contribute">
                  <Button variant="outline" size="sm">Contribute OA Report</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {company.oaReports.map((report) => (
                <div key={report.id} className="rounded-lg border p-4 hover:border-foreground/30 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-base">{report.role || "Software Engineer"}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Platform: {report.platform} • Duration: {report.durationMin || 60} mins • Sections: {report.sections}
                      </div>
                    </div>
                    <Badge variant="outline">{report.difficulty}</Badge>
                  </div>

                  {report.questions.length > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Questions Included ({report.questions.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.questions.map((q, idx) => (
                          <Badge key={q.id} variant="secondary" className="text-xs">
                            Q{idx + 1}: {q.type} ({q.difficulty})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

