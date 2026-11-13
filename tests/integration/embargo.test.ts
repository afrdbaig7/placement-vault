import { describe, it, expect } from "bun:test";
import { reportView, type Viewer } from "@/lib/serialize";

describe("Drive Embargo Security & Tamper Resistance", () => {
  const authorUser = {
    id: "user_student_author",
    name: "Rohit Sharma",
    email: "rohit@college.edu",
    role: "STUDENT",
    rollVerified: true,
    image: null,
    collegeDomain: "college.edu",
    placedCompany: null,
    batch: "2027",
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: new Date(),
    rollNumber: "2027CS01",
  };

  const peerUser = {
    ...authorUser,
    id: "user_regular_peer",
    name: "Rahul Verma",
    email: "rahul@college.edu",
  };

  const modUser = {
    ...authorUser,
    id: "user_moderator",
    name: "Dr. Admin",
    role: "MOD",
  };

  const mockReport = {
    id: "rep_123",
    companyId: "comp_google",
    company: { slug: "google", name: "Google" },
    driveId: "drv_open",
    drive: {
      id: "drv_open",
      status: "OPEN", // Active on-campus drive under embargo
      company: "google",
      role: "Software Engineer",
      driveDate: new Date(),
    },
    role: "Software Engineer",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    round: "OA Round",
    platform: "HackerRank",
    sections: "Coding, Aptitude",
    topics: ["Arrays", "Dynamic Programming"],
    difficulty: "Hard",
    outcome: "Cleared",
    summary: "Two hard dynamic programming problems",
    status: "APPROVED",
    isAnonymous: false,
    upvoteCount: 5,
    createdAt: new Date(),
    assessmentDate: new Date(),
    authorId: "user_student_author",
    author: authorUser,
    body: {
      id: "body_123",
      reportId: "rep_123",
      text: "SECRET CONFIDENTIAL QUESTIONS: 1. Max Flow Min Cut. 2. Traveling Salesperson DP.",
    },
    questions: [
      {
        id: "q_1",
        reportId: "rep_123",
        title: "Optimal Pathfinding",
        statementMd: "You are given a directed acyclic graph...",
        type: "CODING",
        difficulty: "Hard",
        topics: ["Graph", "DP"],
        constraints: "N <= 10^5",
        sampleIO: "Input: [1, 2] -> Output: 3",
        linkedProblemId: null,
        marks: 50,
      },
    ],
  };

  it("BLOCKS regular students from seeing ANY report data from an OPEN drive (returns null)", () => {
    const regularStudentViewer: Viewer = {
      user: peerUser,
      unlockedSet: new Set(["rep_123"]), // Even if peer attempts to bypass
      giveToGet: new Set(["google"]),
      votedSet: new Set(),
    };

    // Serialize report for peer during OPEN drive: MUST return null
    const serialized = reportView(mockReport as any, regularStudentViewer);
    expect(serialized).toBeNull();
  });

  it("BLOCKS unauthenticated / public guests from accessing questions during OPEN drive", () => {
    const guestViewer: Viewer = {
      user: null,
      unlockedSet: new Set(),
      giveToGet: new Set(),
      votedSet: new Set(),
    };

    const serialized = reportView(mockReport as any, guestViewer);
    expect(serialized).toBeNull();
  });

  it("REVEALS questions once the drive status transitions to CLOSED", () => {
    const closedDriveReport = {
      ...mockReport,
      drive: {
        ...mockReport.drive,
        status: "CLOSED", // Moderator has closed the on-campus drive
      },
    };

    const regularStudentViewer: Viewer = {
      user: peerUser,
      unlockedSet: new Set(["rep_123"]),
      giveToGet: new Set(["google"]),
      votedSet: new Set(),
    };

    const serialized = reportView(closedDriveReport as any, regularStudentViewer);
    expect(serialized).not.toBeNull();

    // Embargo is lifted
    expect(serialized!.underEmbargo).toBe(false);

    // Questions and body are now visible
    expect(serialized!.questions.length).toBe(1);
    expect(serialized!.questions[0].title).toBe("Optimal Pathfinding");
    expect(serialized!.questions[0].statementMd).toBe("You are given a directed acyclic graph...");
    expect(serialized!.body).toContain("SECRET CONFIDENTIAL QUESTIONS");
  });

  it("ALLOWS authors to view their own submissions even while under embargo", () => {
    const authorViewer: Viewer = {
      user: authorUser, // Author of the report
      unlockedSet: new Set(),
      giveToGet: new Set(),
      votedSet: new Set(),
    };

    const serialized = reportView(mockReport as any, authorViewer);
    expect(serialized).not.toBeNull();
    expect(serialized!.underEmbargo).toBe(true);
    expect(serialized!.questions.length).toBe(1);
    expect(serialized!.body).toBeTruthy();
  });

  it("ALLOWS moderators and administrators to inspect questions during embargo for review", () => {
    const modViewer: Viewer = {
      user: modUser, // Moderator
      unlockedSet: new Set(),
      giveToGet: new Set(),
      votedSet: new Set(),
    };

    const serialized = reportView(mockReport as any, modViewer);
    expect(serialized).not.toBeNull();
    expect(serialized!.questions.length).toBe(1);
    expect(serialized!.body).toBeTruthy();
  });
});
