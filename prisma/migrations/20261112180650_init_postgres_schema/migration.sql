-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "logoUrl" TEXT,
    "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hiringRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LEETCODE',
    "externalSlug" TEXT,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProblem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "frequency" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sourceName" TEXT NOT NULL DEFAULT 'leetcode-company-wise',
    "sourceSnapshotDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resources" JSONB NOT NULL DEFAULT '[]',
    "sampleQuestions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "rollNumber" TEXT,
    "rollVerified" BOOLEAN NOT NULL DEFAULT false,
    "collegeDomain" TEXT,
    "emailVerified" TIMESTAMP(3),
    "placedCompany" TEXT,
    "batch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drive" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "driveDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "branches" TEXT NOT NULL DEFAULT 'ALL',
    "minCgpa" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OaReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "driveId" TEXT,
    "hiringSeason" TEXT NOT NULL DEFAULT '2026-27',
    "graduatingBatch" INTEGER NOT NULL DEFAULT 2027,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "round" TEXT NOT NULL DEFAULT 'Online Assessment',
    "durationMin" INTEGER,
    "sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "embargoUntil" TIMESTAMP(3),
    "modNote" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "takedownReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAQuestion" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "statementMd" TEXT NOT NULL,
    "constraints" TEXT,
    "sampleIO" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT NOT NULL,
    "linkedProblemId" TEXT,
    "marks" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OaBody" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "OaBody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "hiringSeason" TEXT NOT NULL DEFAULT '2026-27',
    "graduatingBatch" INTEGER NOT NULL DEFAULT 2027,
    "role" TEXT NOT NULL,
    "offerStatus" TEXT NOT NULL DEFAULT 'OFFERED',
    "overallDifficulty" TEXT NOT NULL DEFAULT 'Medium',
    "tips" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "round" TEXT NOT NULL DEFAULT 'Full Loop',
    "platform" TEXT NOT NULL DEFAULT 'On-Campus',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "outcome" TEXT NOT NULL DEFAULT 'Cleared',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "modNote" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "takedownReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRound" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TECHNICAL',
    "durationMin" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" TEXT,
    "linkedProblemId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doubt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "company" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "takedownReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doubt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "doubtId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "takedownReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_normalizedName_key" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "Company_normalizedName_idx" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "Problem_difficulty_idx" ON "Problem"("difficulty");

-- CreateIndex
CREATE INDEX "Problem_title_idx" ON "Problem"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_source_externalSlug_key" ON "Problem"("source", "externalSlug");

-- CreateIndex
CREATE INDEX "CompanyProblem_companyId_window_idx" ON "CompanyProblem"("companyId", "window");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProblem_companyId_problemId_window_sourceName_key" ON "CompanyProblem"("companyId", "problemId", "window", "sourceName");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSet_slug_key" ON "PracticeSet"("slug");

-- CreateIndex
CREATE INDEX "PracticeSet_slug_idx" ON "PracticeSet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_rollVerified_idx" ON "User"("rollVerified");

-- CreateIndex
CREATE INDEX "Drive_companyId_status_idx" ON "Drive"("companyId", "status");

-- CreateIndex
CREATE INDEX "Drive_status_driveDate_idx" ON "Drive"("status", "driveDate");

-- CreateIndex
CREATE INDEX "OaReport_companyId_status_hiringSeason_idx" ON "OaReport"("companyId", "status", "hiringSeason");

-- CreateIndex
CREATE INDEX "OaReport_hiringSeason_createdAt_idx" ON "OaReport"("hiringSeason", "createdAt");

-- CreateIndex
CREATE INDEX "OaReport_status_createdAt_idx" ON "OaReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OaReport_authorId_idx" ON "OaReport"("authorId");

-- CreateIndex
CREATE INDEX "OAQuestion_reportId_order_idx" ON "OAQuestion"("reportId", "order");

-- CreateIndex
CREATE INDEX "OAQuestion_linkedProblemId_idx" ON "OAQuestion"("linkedProblemId");

-- CreateIndex
CREATE UNIQUE INDEX "OaBody_reportId_key" ON "OaBody"("reportId");

-- CreateIndex
CREATE INDEX "Experience_companyId_status_hiringSeason_idx" ON "Experience"("companyId", "status", "hiringSeason");

-- CreateIndex
CREATE INDEX "Experience_hiringSeason_createdAt_idx" ON "Experience"("hiringSeason", "createdAt");

-- CreateIndex
CREATE INDEX "Experience_status_createdAt_idx" ON "Experience"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Experience_authorId_idx" ON "Experience"("authorId");

-- CreateIndex
CREATE INDEX "InterviewRound_experienceId_order_idx" ON "InterviewRound"("experienceId", "order");

-- CreateIndex
CREATE INDEX "RoundQuestion_roundId_order_idx" ON "RoundQuestion"("roundId", "order");

-- CreateIndex
CREATE INDEX "RoundQuestion_linkedProblemId_idx" ON "RoundQuestion"("linkedProblemId");

-- CreateIndex
CREATE INDEX "Doubt_company_idx" ON "Doubt"("company");

-- CreateIndex
CREATE INDEX "Doubt_companyId_idx" ON "Doubt"("companyId");

-- CreateIndex
CREATE INDEX "Answer_doubtId_idx" ON "Answer"("doubtId");

-- CreateIndex
CREATE INDEX "Vote_targetType_targetId_idx" ON "Vote"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_targetType_targetId_key" ON "Vote"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "CoinLedger_userId_createdAt_idx" ON "CoinLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoinLedger_userId_reason_refId_key" ON "CoinLedger"("userId", "reason", "refId");

-- CreateIndex
CREATE INDEX "Unlock_userId_idx" ON "Unlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Unlock_userId_reportId_key" ON "Unlock"("userId", "reportId");

-- CreateIndex
CREATE INDEX "Flag_resolved_createdAt_idx" ON "Flag"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "Flag_targetType_targetId_idx" ON "Flag"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "ModerationLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_createdAt_idx" ON "ModerationLog"("moderatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProblem" ADD CONSTRAINT "CompanyProblem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProblem" ADD CONSTRAINT "CompanyProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drive" ADD CONSTRAINT "Drive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OaReport" ADD CONSTRAINT "OaReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OaReport" ADD CONSTRAINT "OaReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OaReport" ADD CONSTRAINT "OaReport_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "Drive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAQuestion" ADD CONSTRAINT "OAQuestion_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "OaReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAQuestion" ADD CONSTRAINT "OAQuestion_linkedProblemId_fkey" FOREIGN KEY ("linkedProblemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OaBody" ADD CONSTRAINT "OaBody_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "OaReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewRound" ADD CONSTRAINT "InterviewRound_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "InterviewRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_linkedProblemId_fkey" FOREIGN KEY ("linkedProblemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doubt" ADD CONSTRAINT "Doubt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doubt" ADD CONSTRAINT "Doubt_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_doubtId_fkey" FOREIGN KEY ("doubtId") REFERENCES "Doubt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinLedger" ADD CONSTRAINT "CoinLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unlock" ADD CONSTRAINT "Unlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unlock" ADD CONSTRAINT "Unlock_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "OaReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
