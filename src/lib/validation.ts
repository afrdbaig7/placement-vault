import "server-only";
import { z } from "zod";
import { ApiError } from "@/lib/auth";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB cap on JSON payloads

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const idSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .max(64, "Invalid ID")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid ID format");

export const companySlugSchema = z
  .string()
  .trim()
  .min(1, "Pick a company")
  .max(64, "Invalid company")
  .regex(/^[a-z0-9-]+$/, "Invalid company slug format");

export const googleCredentialSchema = z.object({
  credential: z.string().trim().min(10, "Google ID token is required").max(8192),
});

export const demoLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
});

export const rollNumberSchema = z.object({
  rollNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,20}$/, "Enter a valid roll number (4-20 letters/digits)"),
});

export const createDriveSchema = z.object({
  company: companySlugSchema,
  role: trimmed(2, 100, "Role"),
  driveDate: z
    .string()
    .trim()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), "A valid drive date is required"),
  branches: z
    .string()
    .trim()
    .max(200, "Branches must be at most 200 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : "ALL")),
  minCgpa: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      const n = Number(val);
      return n;
    })
    .refine(
      (n) => n === null || (!Number.isNaN(n) && n >= 0 && n <= 10),
      "CGPA must be between 0 and 10"
    ),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (!val) return null;
      const t = val.trim();
      return t.length > 0 ? t : null;
    })
    .refine((val) => val === null || val.length <= 1000, "Notes must be at most 1000 characters"),
});

export const driveActionSchema = z.object({
  action: z.enum(["close", "reopen"]),
});

export const createCompanySchema = z.object({
  name: trimmed(2, 100, "Company name"),
  website: z.string().trim().url("Invalid website URL").optional().or(z.literal("")),
  sectors: z.array(trimmed(1, 50, "Sector")).max(10).default([]),
  hiringRoles: z.array(trimmed(1, 80, "Role")).max(15).default([]),
  aliases: z.array(trimmed(1, 50, "Alias")).max(10).default([]),
});

export const createOAQuestionSchema = z.object({
  type: z.enum(["CODING", "MCQ", "SQL", "APTITUDE", "SUBJECTIVE"]).default("CODING"),
  title: z.string().trim().max(200).optional(),
  statementMd: trimmed(5, 5000, "Question statement"),
  constraints: z.string().trim().max(1000).optional(),
  sampleIO: z.string().trim().max(2000).optional(),
  topics: z.array(trimmed(1, 40, "Topic")).max(15).default([]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  linkedProblemId: z.string().trim().max(64).optional().nullable(),
  marks: z.number().int().min(1).max(100).optional().nullable(),
});

export const createReportSchema = z.object({
  companySlug: companySlugSchema.optional(),
  company: companySlugSchema.optional(),
  driveId: idSchema.optional().nullable(),
  hiringSeason: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Season must be format YYYY-YY (e.g. 2026-27)")
    .default("2026-27"),
  graduatingBatch: z.number().int().min(2020).max(2035).default(2027),
  assessmentDate: z.string().trim().optional(),
  platform: trimmed(1, 80, "Platform"),
  role: trimmed(1, 100, "Role").optional(),
  durationMin: z.number().int().min(5).max(360).optional().nullable(),
  round: trimmed(1, 80, "Round").default("Online Assessment"),
  sections: z.array(trimmed(1, 50, "Section")).max(10).default([]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  outcome: z.enum(["Cleared", "Not cleared", "Did not attempt"]),
  topics: z.array(trimmed(1, 40, "Topic")).max(15, "Too many topics").default([]),
  summary: trimmed(20, 500, "Summary"),
  text: z.string().trim().max(10_000).optional().default(""),
  isAnonymous: z.boolean().default(false),
  ndaConfirmation: z.boolean().refine((v) => v === true, "You must confirm the non-disclosure policy").optional().default(true),
  questions: z.array(createOAQuestionSchema).max(25).default([]),
});

export const createRoundQuestionSchema = z.object({
  text: trimmed(5, 2000, "Question text"),
  topics: z.array(trimmed(1, 40, "Topic")).max(10).default([]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional().nullable(),
  linkedProblemId: z.string().trim().max(64).optional().nullable(),
});

export const createInterviewRoundSchema = z.object({
  name: trimmed(1, 100, "Round name"),
  type: z
    .enum(["TECHNICAL", "HR", "MANAGERIAL", "SYSTEM_DESIGN", "GROUP_DISCUSSION", "OTHER"])
    .default("TECHNICAL"),
  durationMin: z.number().int().min(5).max(360).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  questions: z.array(createRoundQuestionSchema).max(20).default([]),
});

export const createExperienceSchema = z.object({
  company: companySlugSchema,
  hiringSeason: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Season must be format YYYY-YY (e.g. 2026-27)")
    .default("2026-27"),
  graduatingBatch: z.number().int().min(2020).max(2035).default(2027),
  role: trimmed(1, 100, "Role"),
  offerStatus: z.enum(["OFFERED", "REJECTED", "WAITLISTED", "NO_OFFER"]).default("OFFERED"),
  overallDifficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  round: trimmed(1, 80, "Round").default("Full loop"),
  platform: trimmed(1, 80, "Platform").default("On-Campus"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  outcome: trimmed(1, 60, "Outcome").default("Cleared"),
  topics: z.array(trimmed(1, 40, "Topic")).max(15, "Too many topics").default([]),
  tips: z.string().trim().max(2000).optional().nullable(),
  text: trimmed(30, 15_000, "Experience write-up"),
  isAnonymous: z.boolean().default(false),
  ndaConfirmation: z.boolean().refine((v) => v === true, "You must confirm the non-disclosure policy").optional().default(true),
  rounds: z.array(createInterviewRoundSchema).max(10).default([]),
});

export const createDoubtSchema = z.object({
  company: companySlugSchema,
  title: trimmed(10, 200, "Title"),
  text: trimmed(20, 5_000, "Description"),
  anonymous: z.boolean().default(false),
});

export const createAnswerSchema = z.object({
  text: trimmed(10, 5_000, "Answer"),
});

export const targetTypeSchema = z.enum(["REPORT", "EXPERIENCE", "DOUBT", "ANSWER"]);

export const voteSchema = z.object({
  targetType: targetTypeSchema,
  targetId: idSchema,
});

export const unlockSchema = z.object({
  reportId: idSchema,
});

export const flagSchema = z.object({
  targetType: targetTypeSchema,
  targetId: idSchema,
  reason: trimmed(5, 1_000, "Reason"),
});

export const modReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  modNote: z
    .string()
    .trim()
    .max(1_000, "Moderator note must be at most 1000 characters")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const modVerifySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export const modFlagSchema = z.object({
  action: z.literal("resolve"),
  takedown: z.boolean().default(false),
});

export const companyFilterParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/)
  .optional();

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const lenHeader = req.headers.get("content-length");
  if (lenHeader) {
    const len = Number(lenHeader);
    if (!Number.isNaN(len) && len > MAX_BODY_BYTES) {
      throw new ApiError(413, "Request payload too large");
    }
  }

  const rawText = await req.text();
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    throw new ApiError(413, "Request payload too large");
  }

  let json: unknown = {};
  if (rawText.trim().length > 0) {
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new ApiError(400, "Invalid JSON request body");
    }
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new ApiError(400, firstIssue?.message ?? "Invalid request payload");
  }
  return parsed.data;
}

export function safeParseTopics(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

