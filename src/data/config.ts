// Platform-wide config. One file to tweak the whole economy.

export const config = {
  collegeName: "Campus Placement Hub",
  collegeShort: "CPH",
  tagline: "Company-wise OAs, interview experiences and doubts — built by students, for students.",
  repoUrl: process.env.NEXT_PUBLIC_REPO_URL || "",

  // Coin economy (coins enforced server-side, never in the UI alone)
  rates: {
    welcomeGrant: 25, // granted when a mod verifies the roll number
    reportApproved: 50, // approved OA report
    experienceApproved: 40, // approved interview experience
    answerAccepted: 30, // accepted doubt answer
    upvoteReceived: 2, // per distinct upvoter, daily-capped
    unlockOa: 25, // cost to unlock one OA report body
  },

  // Anti-farming caps (enforced in the API, the DB is the final gate)
  caps: {
    dailyPosts: 5, // reports + experiences + doubts + answers per user per day
    upvoteEarnDaily: 20, // max coins a user can earn from upvotes per day
  },

  // Moderation
  roles: ["STUDENT", "SENIOR", "MOD", "ADMIN"] as const,
} as const;

export type Role = (typeof config.roles)[number];

export function isMod(role: string) {
  return role === "MOD" || role === "ADMIN";
}
