import { describe, it, expect } from "bun:test";
import {
  createCompanySchema,
  createReportSchema,
  createExperienceSchema,
  createOAQuestionSchema,
} from "@/lib/validation";

describe("Input Validation & Zod Schema Integrity", () => {
  it("validates company creation with valid inputs", () => {
    const valid = createCompanySchema.safeParse({
      name: "Stripe India",
      website: "https://stripe.com",
      sectors: ["Fintech", "Payments"],
      hiringRoles: ["Software Engineer", "Backend Intern"],
      aliases: ["Stripe"],
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.name).toBe("Stripe India");
      expect(valid.data.sectors).toEqual(["Fintech", "Payments"]);
    }
  });

  it("rejects invalid company inputs (short name or bad URL)", () => {
    const badName = createCompanySchema.safeParse({
      name: "A", // too short
    });
    expect(badName.success).toBe(false);

    const badUrl = createCompanySchema.safeParse({
      name: "Valid Corp",
      website: "not-a-url",
    });
    expect(badUrl.success).toBe(false);
  });

  it("validates OA Report schema with questions and NDA confirmation", () => {
    const validReport = createReportSchema.safeParse({
      company: "google",
      hiringSeason: "2026-27",
      graduatingBatch: 2027,
      platform: "HackerRank",
      difficulty: "Hard",
      outcome: "Cleared",
      summary: "Comprehensive OA covering 2 coding questions and aptitude section.",
      ndaConfirmation: true,
      questions: [
        {
          type: "CODING",
          title: "Graph Traversal",
          statementMd: "Find the shortest path in a weighted DAG...",
          difficulty: "Hard",
          topics: ["Graph", "BFS"],
          marks: 50,
        },
      ],
    });

    expect(validReport.success).toBe(true);
    if (validReport.success) {
      expect(validReport.data.hiringSeason).toBe("2026-27");
      expect(validReport.data.questions.length).toBe(1);
    }
  });

  it("rejects OA Report with invalid hiring season format", () => {
    const badSeason = createReportSchema.safeParse({
      company: "google",
      hiringSeason: "2026", // Invalid format, must be YYYY-YY
      platform: "HackerRank",
      difficulty: "Medium",
      outcome: "Cleared",
      summary: "This is a detailed summary of the online test taken.",
    });

    expect(badSeason.success).toBe(false);
  });

  it("validates interview experience loop schema", () => {
    const validExp = createExperienceSchema.safeParse({
      company: "amazon",
      hiringSeason: "2026-27",
      graduatingBatch: 2027,
      role: "SDE-1",
      offerStatus: "OFFERED",
      overallDifficulty: "Hard",
      text: "Full loop write-up detailing technical coding problems and leadership principles in depth.",
      ndaConfirmation: true,
      rounds: [
        {
          name: "Round 1 - Technical Coding",
          type: "TECHNICAL",
          durationMin: 60,
          questions: [{ text: "Implement LRU Cache with O(1) operations." }],
        },
      ],
    });

    expect(validExp.success).toBe(true);
  });
});
