/**
 * Seed script — realistic campus demo data.
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding…");
  await db.coinLedger.deleteMany();
  await db.unlock.deleteMany();
  await db.vote.deleteMany();
  await db.flag.deleteMany();
  await db.answer.deleteMany();
  await db.doubt.deleteMany();
  await db.experience.deleteMany();
  await db.oaBody.deleteMany();
  await db.oaReport.deleteMany();
  await db.drive.deleteMany();
  await db.user.deleteMany();

  // ---------- users ----------
  const admin = await db.user.create({
    data: {
      email: "ananya.rao.cph@gmail.com",
      name: "Ananya Rao",
      role: "ADMIN",
      rollNumber: "FAC-001",
      rollVerified: true,
      batch: "Faculty",
      image: null,
    },
  });
  const mod = await db.user.create({
    data: {
      email: "rohan.verma.cph@gmail.com",
      name: "Rohan Verma",
      role: "MOD",
      rollNumber: "CS22B0999",
      rollVerified: true,
      batch: "2027",
    },
  });
  const sneha = await db.user.create({
    data: {
      email: "sneha.iyer.2025@gmail.com",
      name: "Sneha Iyer",
      role: "SENIOR",
      rollNumber: "CS21B0456",
      rollVerified: true,
      placedCompany: "Amazon",
      batch: "2025",
    },
  });
  const arjun = await db.user.create({
    data: {
      email: "arjun.mehta.2025@gmail.com",
      name: "Arjun Mehta",
      role: "SENIOR",
      rollNumber: "CS21B0182",
      rollVerified: true,
      placedCompany: "Microsoft",
      batch: "2025",
    },
  });
  const kavya = await db.user.create({
    data: {
      email: "kavya.nair.2025@gmail.com",
      name: "Kavya Nair",
      role: "SENIOR",
      rollNumber: "CS21B0311",
      rollVerified: true,
      placedCompany: "Google",
      batch: "2025",
    },
  });
  const vikram = await db.user.create({
    data: {
      email: "vikram.singh.cse@gmail.com",
      name: "Vikram Singh",
      role: "STUDENT",
      rollNumber: "CS23B1001",
      rollVerified: true,
      batch: "2027",
    },
  });
  const priya = await db.user.create({
    data: {
      email: "priya.das.cse@gmail.com",
      name: "Priya Das",
      role: "STUDENT",
      rollNumber: "CS23B1042",
      rollVerified: true,
      batch: "2027",
    },
  });
  const rahul = await db.user.create({
    data: {
      email: "rahul.kumar.it@gmail.com",
      name: "Rahul Kumar",
      role: "STUDENT",
      rollNumber: "IT23B2015",
      rollVerified: true,
      batch: "2027",
    },
  });
  const ishita = await db.user.create({
    data: {
      email: "ishita.bose.ece@gmail.com",
      name: "Ishita Bose",
      role: "STUDENT",
      rollNumber: "EC23B3077",
      rollVerified: true,
      batch: "2027",
    },
  });
  // in mod verification queue
  const dev = await db.user.create({
    data: {
      email: "dev.malhotra@gmail.com",
      name: "Dev Malhotra",
      role: "STUDENT",
      rollNumber: "CS24B1023",
      rollVerified: false,
      batch: "2028",
    },
  });
  // fresh signup, hasn't submitted roll number yet
  await db.user.create({
    data: {
      email: "meera.joshi@gmail.com",
      name: "Meera Joshi",
      role: "STUDENT",
      rollVerified: false,
      batch: "2028",
    },
  });

  // welcome grants on verification
  const verified = [admin, mod, sneha, arjun, kavya, vikram, priya, rahul, ishita];
  for (const u of verified) {
    await db.coinLedger.create({
      data: { userId: u.id, amount: 25, reason: "WELCOME", refId: u.id, note: "Roll number verified" },
    });
  }

  // ---------- drives ----------
  const amazonDrive = await db.drive.create({
    data: {
      company: "amazon",
      role: "SDE Intern",
      driveDate: daysAgo(40),
      status: "CLOSED",
      branches: "CSE,IT",
      minCgpa: 7.0,
      notes: "On-campus drive, 2 profiles: SDE Intern 6-month + PPO.",
    },
  });
  const msDrive = await db.drive.create({
    data: {
      company: "microsoft",
      role: "SDE-1",
      driveDate: daysAgo(25),
      status: "CLOSED",
      branches: "CSE,IT,ECE",
      minCgpa: 7.5,
      notes: "FTE + internship composite drive.",
    },
  });
  const zohoDrive = await db.drive.create({
    data: {
      company: "zoho",
      role: "Member Technical",
      driveDate: daysAgo(15),
      status: "CLOSED",
      branches: "ALL",
      minCgpa: 6.0,
      notes: "Open to all branches, own OA platform.",
    },
  });
  const googleDrive = await db.drive.create({
    data: {
      company: "google",
      role: "SDE Intern",
      driveDate: daysAhead(12),
      status: "OPEN",
      branches: "CSE,IT",
      minCgpa: 7.5,
      notes: "OA slots running this week — reports stay under embargo until the drive closes.",
    },
  });
  const tcsDrive = await db.drive.create({
    data: {
      company: "tcs",
      role: "Ninja",
      driveDate: daysAhead(20),
      status: "OPEN",
      branches: "ALL",
      minCgpa: 6.0,
      notes: "Includes aptitude + verbal sections before coding.",
    },
  });
  const infosysDrive = await db.drive.create({
    data: {
      company: "infosys",
      role: "Specialist Programmer",
      driveDate: daysAhead(30),
      status: "OPEN",
      branches: "CSE,IT,ECE",
      minCgpa: 7.0,
      notes: "Power Programmer track has a harder OA.",
    },
  });
  const flipkartDrive = await db.drive.create({
    data: {
      company: "flipkart",
      role: "SDE-1",
      driveDate: daysAhead(45),
      status: "OPEN",
      branches: "CSE,IT",
      minCgpa: 7.0,
      notes: null,
    },
  });

  // ---------- OA reports ----------
  async function report(opts: {
    authorId: string;
    driveId: string;
    company: string;
    round: string;
    platform: string;
    topics: string[];
    difficulty: string;
    outcome: string;
    summary: string;
    body: string;
    status?: string;
    createdAt?: Date;
  }) {
    const r = await db.oaReport.create({
      data: {
        authorId: opts.authorId,
        driveId: opts.driveId,
        round: opts.round,
        platform: opts.platform,
        topics: JSON.stringify(opts.topics),
        difficulty: opts.difficulty,
        outcome: opts.outcome,
        summary: opts.summary,
        status: opts.status ?? "APPROVED",
        createdAt: opts.createdAt ?? daysAgo(10),
      },
    });
    await db.oaBody.create({ data: { reportId: r.id, text: opts.body } });
    if ((opts.status ?? "APPROVED") === "APPROVED") {
      await db.coinLedger.create({
        data: {
          userId: opts.authorId,
          amount: 50,
          reason: "REPORT_APPROVED",
          refId: r.id,
          note: `OA report approved (${opts.company})`,
        },
      });
    }
    return r;
  }

  const r1 = await report({
    authorId: sneha.id,
    driveId: amazonDrive.id,
    company: "amazon",
    round: "Online Assessment",
    platform: "HackerRank",
    topics: ["Arrays", "Two Pointers"],
    difficulty: "Medium",
    outcome: "Cleared",
    summary:
      "Standard Amazon OA pattern: Q1 was a sliding-window variant, Q2 a graph traversal. Both were LeetCode-medium level. Time was comfortable if you know the templates.",
    body: "Q1: Given an array of item ratings, find the longest contiguous stretch where every item's rating stays within a band of k — sliding window with a monotonic deque for min/max.\n\nQ2: A warehouse graph (grid) where robots must collect all packages in the minimum number of moves, with walls — BFS with state (position, collectedMask). Careful with the mask size.",
    createdAt: daysAgo(38),
  });
  const r2 = await report({
    authorId: vikram.id,
    driveId: amazonDrive.id,
    company: "amazon",
    round: "Online Assessment",
    platform: "HackerRank",
    topics: ["Graphs", "BFS"],
    difficulty: "Medium",
    outcome: "Cleared",
    summary:
      "Q1 easy greedy, Q2 BFS on grid. Worked through with 25 minutes to spare. Camera proctoring was active.",
    body: "Q1: Merge overlapping delivery time intervals after sorting — classic intervals.\n\nQ2: Shortest safe route in a grid where some cells get blocked over time — BFS over (row, col, time) states.",
    createdAt: daysAgo(37),
  });
  const r3 = await report({
    authorId: priya.id,
    driveId: amazonDrive.id,
    company: "amazon",
    round: "Online Assessment",
    platform: "HackerRank",
    topics: ["Dynamic Programming"],
    difficulty: "Hard",
    outcome: "Not cleared",
    summary:
      "Got a brutal DP on trees as Q2 with only 40 minutes left. Sharing so others prepare tree DP before this drive.",
    body: "Q1: Count subarrays with exactly k distinct values — two pointers.\n\nQ2: Tree DP — reroot a weighted tree to minimize the maximum delivery latency; needed in-out DP twice, hard to finish in time.",
    createdAt: daysAgo(36),
  });
  const r4 = await report({
    authorId: arjun.id,
    driveId: msDrive.id,
    company: "microsoft",
    round: "Online Assessment",
    platform: "Codility",
    topics: ["Dynamic Programming", "Strings"],
    difficulty: "Medium",
    outcome: "Cleared",
    summary:
      "Codility OA, 2 questions 90 minutes. String DP + a matrix question. Partial scoring, so attempt everything.",
    body: "Q1: Minimum insertions to make a string a palindrome — LCS-based DP.\n\nQ2: Count the number of islands that remain connected after removing one cell — brute force per removal passes given constraints.",
    createdAt: daysAgo(23),
  });
  const r5 = await report({
    authorId: rahul.id,
    driveId: msDrive.id,
    company: "microsoft",
    round: "Online Assessment",
    platform: "Codility",
    topics: ["Trees", "Recursion"],
    difficulty: "Medium",
    outcome: "Cleared",
    summary: "Both questions were textbook recursion on trees. Deterministic selection — friends in other slots got the same set.",
    body: "Q1: Compute the height-balanced check and diameter of an N-ary tree in one pass.\n\nQ2: Serialize and deserialize a binary search tree using preorder only — O(n) with bounds.",
    createdAt: daysAgo(22),
  });
  const r6 = await report({
    authorId: ishita.id,
    driveId: msDrive.id,
    company: "microsoft",
    round: "Online Assessment",
    platform: "Codility",
    topics: ["Arrays", "Math"],
    difficulty: "Medium",
    outcome: "Did not attempt",
    summary: "Couldn't attempt this drive ( clashed with Zoho ), submitting what friends reported for the record.",
    body: "Q1 (as reported): Maximize profit with at most two non-overlapping trades — state machine DP.\n\nQ2 (as reported): Rotate a matrix in place with a helper for layer-by-layer rotation.",
    createdAt: daysAgo(20),
    status: "PENDING",
  });
  const r7 = await report({
    authorId: priya.id,
    driveId: zohoDrive.id,
    company: "zoho",
    round: "Round 1 (Aptitude + Coding)",
    platform: "Zoho Own Platform",
    topics: ["Arrays", "Strings"],
    difficulty: "Easy",
    outcome: "Cleared",
    summary:
      "Zoho's own platform. 10 aptitude + 2 coding (one pattern printing, one string manipulation). No proctoring.",
    body: "Coding Q1: Print the number pyramid for n rows (pattern printing, exact output matching).\n\nCoding Q2: Given a sentence, reverse words that have an even length and replace vowels in odd-length words — pure string handling, no algorithms.",
    createdAt: daysAgo(13),
  });
  const r8 = await report({
    authorId: sneha.id,
    driveId: googleDrive.id,
    company: "google",
    round: "Online Assessment",
    platform: "HackerRank",
    topics: ["Graphs", "Dynamic Programming"],
    difficulty: "Hard",
    outcome: "Cleared",
    summary:
      "First slot of this week's Google OA. Under embargo — this stays hidden until the drive closes. Submitted within minutes of my slot.",
    body: "Q1: Count connected components in a grid that change after each query removal — DSU with rollback or offline processing.\n\nQ2: Digit DP counting numbers whose digit sum is divisible by k within [l, r].",
    createdAt: daysAgo(2),
  });
  const r9 = await report({
    authorId: kavya.id,
    driveId: googleDrive.id,
    company: "google",
    round: "Online Assessment",
    platform: "HackerRank",
    topics: ["Binary Search"],
    difficulty: "Medium",
    outcome: "Cleared",
    summary: "Slot 2, same platform. One binary search on answer, one implementation-heavy simulation.",
    body: "Q1: Minimum time to transport all packages given k robots with battery limits — binary search on answer.\n\nQ2: Simulate a text editor with undo groups; careful implementation, no algorithms.",
    createdAt: daysAgo(1),
    status: "PENDING",
  });
  const r10 = await report({
    authorId: vikram.id,
    driveId: tcsDrive.id,
    company: "tcs",
    round: "Round 1",
    platform: "TCS iON",
    topics: ["Aptitude"],
    difficulty: "Easy",
    outcome: "Cleared",
    summary: "TCS iON aptitude-heavy round from today's slot. Embargoed until the drive closes.",
    body: "Aptitude: percentages, time-speed-distance, seating puzzles. Coding Q: sum of digits until single digit (digit root).",
    createdAt: daysAgo(1),
    status: "PENDING",
  });

  // ---------- experiences ----------
  async function experience(opts: {
    authorId: string;
    company: string;
    role: string;
    round: string;
    platform: string;
    topics: string[];
    difficulty: string;
    outcome: string;
    body: string;
    status?: string;
    createdAt?: Date;
  }) {
    const e = await db.experience.create({
      data: {
        authorId: opts.authorId,
        company: opts.company,
        role: opts.role,
        round: opts.round,
        platform: opts.platform,
        topics: JSON.stringify(opts.topics),
        difficulty: opts.difficulty,
        outcome: opts.outcome,
        body: opts.body,
        status: opts.status ?? "APPROVED",
        createdAt: opts.createdAt ?? daysAgo(8),
      },
    });
    if ((opts.status ?? "APPROVED") === "APPROVED") {
      await db.coinLedger.create({
        data: {
          userId: opts.authorId,
          amount: 40,
          reason: "EXPERIENCE_APPROVED",
          refId: e.id,
          note: `Experience approved (${opts.company})`,
        },
      });
    }
    return e;
  }

  const e1 = await experience({
    authorId: sneha.id,
    company: "amazon",
    role: "SDE Intern",
    round: "Full loop",
    platform: "Chime + Whiteboard-style editor",
    topics: ["Arrays", "Trees", "Behavioral"],
    difficulty: "Medium",
    outcome: "Selected",
    body: "OA (covered in my report) → Tech 1: two LeetCode mediums, one on trees (deepest leaves LCA) and one array manipulation, then 15 min of LP questions on ownership. Tech 2: one hard-ish graph question but the interviewer nudged me to the optimal in stages; more LPs — have 2 stories per principle ready. HR was a formality. The interviews cared more about how you communicate while coding than raw speed.",
    createdAt: daysAgo(35),
  });
  const e2 = await experience({
    authorId: arjun.id,
    company: "microsoft",
    role: "SDE-1",
    round: "Full loop",
    platform: "Teams",
    topics: ["Dynamic Programming", "Strings", "Design"],
    difficulty: "Medium",
    outcome: "Selected",
    body: "Tech 1: string DP + discussion on my project's architecture. Tech 2: implement LRU cache from scratch, then extended it to TTL support — they love follow-ups. Tech 3 (AA): behavioral with one easy puzzle. Advice: they drill into why you chose your approach; know the complexity cold.",
    createdAt: daysAgo(21),
  });
  const e3 = await experience({
    authorId: vikram.id,
    company: "amazon",
    role: "SDE Intern",
    round: "Technical Interview",
    platform: "Chime",
    topics: ["Graphs", "BFS"],
    difficulty: "Medium",
    outcome: "Selected",
    body: "Single 45-min round after the OA. One BFS question (rotting oranges variant) and rapid-fire LP questions. My OA report had covered exactly the pattern — give-to-get unlocked everyone else's reports and that prep made the difference.",
    createdAt: daysAgo(30),
  });
  const e4 = await experience({
    authorId: priya.id,
    company: "zoho",
    role: "Member Technical",
    round: "Rounds 1-4",
    platform: "On-campus + machine test",
    topics: ["Arrays", "Strings", "OOP"],
    difficulty: "Easy",
    outcome: "Selected",
    body: "R1 aptitude+coding (see my OA report). R2 machine test: build a small CLI app with 3 iterations, they check working code at each stage. R3 tech HR: explain your machine test, add a feature live. R4 general HR. Zoho cares about working code over theory — no DS&A grill.",
    createdAt: daysAgo(12),
  });
  const e5 = await experience({
    authorId: rahul.id,
    company: "tcs",
    role: "Ninja",
    round: "Round 1 (iON platform)",
    platform: "TCS iON",
    topics: ["Aptitude", "Verbal", "SQL"],
    difficulty: "Easy",
    outcome: "Cleared Round 1",
    body: "TCS NQT pattern: numerical, verbal, and coding. Verbal was the time sink — practice para-jumbles. Coding section had 1 question, digit-based, easy if you know string/int handling. SQL-based MCQs appeared in the advanced track.",
    createdAt: daysAgo(6),
  });
  const e6 = await experience({
    authorId: ishita.id,
    company: "microsoft",
    role: "SDE-1",
    round: "Technical Interview 2",
    platform: "Teams",
    topics: ["Design"],
    difficulty: "Medium",
    outcome: "Not selected",
    body: "Reached tech 2 but fumbled the follow-up when they extended LRU to support TTL expiry — needed a min-heap of expiry times layered on the hashmap+DLL. Sharing so others prep 'extend your data structure' style follow-ups.",
    createdAt: daysAgo(18),
    status: "PENDING",
  });
  const e7 = await experience({
    authorId: ishita.id,
    company: "zoho",
    role: "Member Technical",
    round: "Rounds 1-2",
    platform: "On-campus",
    topics: ["Arrays", "Strings"],
    difficulty: "Easy",
    outcome: "Not selected",
    body: "Cleared R1 (aptitude + pattern printing) but the machine test got me — couldn't finish the third iteration of the CLI app in time. They check working code at every stage, so keep shipping small wins instead of waiting to perfect one part. See Priya's experience for how she approached it.",
    createdAt: daysAgo(11),
  });

  // ---------- doubts & answers ----------
  const d1 = await db.doubt.create({
    data: {
      authorId: vikram.id,
      company: "amazon",
      title: "Amazon OA — how strict is the camera proctoring?",
      body: "My OA is this weekend. Do they actually flag you for looking away, and can I use paper for rough work? Don't want a surprise disqualification.",
    },
  });
  const d2 = await db.doubt.create({
    data: {
      authorId: priya.id,
      company: "tcs",
      title: "TCS NQT verbal section — is it really elimination round?",
      body: "Posted anonymously. Seniors said verbal is the biggest cut in NQT. How much weight does it actually carry vs the coding question?",
      anonymous: true,
    },
  });
  const d3 = await db.doubt.create({
    data: {
      authorId: rahul.id,
      company: "google",
      title: "Google drive — eligibility for 7.4 CGPA with one backlog cleared?",
      body: "Drive says 7.5 minimum. I'm at 7.41 after a cleared backlog. Does the placement cell round up or is it a hard cutoff? Anyone been through this?",
    },
  });
  const d4 = await db.doubt.create({
    data: {
      authorId: ishita.id,
      company: "microsoft",
      title: "How to prepare 'extend your data structure' follow-ups?",
      body: "In my MS interview they kept extending LRU cache (TTL, capacity by bytes, etc.). How do you practice this style instead of just solving standalone problems?",
    },
  });

  const a1 = await db.answer.create({
    data: {
      doubtId: d1.id,
      authorId: sneha.id,
      body: "Paper is allowed but they see it on camera — show it clearly at the start. Looking away occasionally is fine; the flag is for face absence / tab switches. Tab focus-loss twice got a friend a re-attempt, not a ban. Do a system check the day before.",
    },
  });
  const a2 = await db.answer.create({
    data: {
      doubtId: d1.id,
      authorId: arjun.id,
      body: "They log every paste event. Typing speed that jumps to 400 WPM mid-test also gets reviewed. Solve templates by hand beforehand so you don't need to paste.",
    },
  });
  const a3 = await db.answer.create({
    data: {
      doubtId: d2.id,
      authorId: rahul.id,
      body: "Verbal is sectional — you need its cutoff too, but in practice the coding question decides the Ninja vs Digital gap. Do para-jumbles daily for a week, it's the highest ROI.",
    },
  });
  const a4 = await db.answer.create({
    data: {
      doubtId: d3.id,
      authorId: kavya.id,
      body: "Hard cutoff at my time — 7.49 got rejected while 7.50 went through, no rounding. Clear the backlog and apply for the next drive; Google comes every year and backlogs usually make you ineligible for the whole season, not just one drive.",
    },
  });
  const a5 = await db.answer.create({
    data: {
      doubtId: d4.id,
      authorId: arjun.id,
      body: "Take any problem you solved and ask: what if capacity was by bytes? what if items expire? what if reads outnumber writes 1000:1? Force yourself to redesign once per problem. Interviewers test whether you treat data structures as tools, not memorized solutions.",
      accepted: true,
    },
  });
  const a6 = await db.answer.create({
    data: {
      doubtId: d4.id,
      authorId: sneha.id,
      body: "Adding: practice saying your invariants out loud while coding. Half the assessment in these rounds is whether the interviewer can follow your redesign in real time.",
    },
  });

  // accept answer -> coin reward
  await db.coinLedger.create({
    data: {
      userId: arjun.id,
      amount: 30,
      reason: "ANSWER_ACCEPTED",
      refId: a5.id,
      note: "Answer accepted on doubt d4",
    },
  });

  // ---------- votes (distinct users, one row each) ----------
  async function upvote(targetType: string, targetId: string, voterId: string, authorId: string) {
    if (voterId === authorId) return;
    await db.vote.create({ data: { userId: voterId, targetType, targetId } });
    const refKey = `${targetType}:${targetId}:${voterId}`;
    const exists = await db.coinLedger.findUnique({
      where: { userId_reason_refId: { userId: authorId, reason: "UPVOTE_RECEIVED", refId: refKey } },
    });
    if (!exists) {
      await db.coinLedger.create({
        data: {
          userId: authorId,
          amount: 2,
          reason: "UPVOTE_RECEIVED",
          refId: refKey,
          note: `Upvote on ${targetType.toLowerCase()}`,
        },
      });
    }
  }

  const votePlan: Array<[string, string, string, string]> = [
    ["REPORT", r1.id, vikram.id, sneha.id],
    ["REPORT", r1.id, priya.id, sneha.id],
    ["REPORT", r1.id, rahul.id, sneha.id],
    ["REPORT", r2.id, sneha.id, vikram.id],
    ["REPORT", r2.id, rahul.id, vikram.id],
    ["REPORT", r4.id, rahul.id, arjun.id],
    ["REPORT", r5.id, vikram.id, rahul.id],
    ["REPORT", r7.id, ishita.id, priya.id],
    ["EXPERIENCE", e1.id, vikram.id, sneha.id],
    ["EXPERIENCE", e1.id, priya.id, sneha.id],
    ["EXPERIENCE", e1.id, rahul.id, sneha.id],
    ["EXPERIENCE", e1.id, ishita.id, sneha.id],
    ["EXPERIENCE", e2.id, vikram.id, arjun.id],
    ["EXPERIENCE", e2.id, ishita.id, arjun.id],
    ["EXPERIENCE", e3.id, priya.id, vikram.id],
    ["EXPERIENCE", e4.id, rahul.id, priya.id],
    ["EXPERIENCE", e4.id, ishita.id, priya.id],
    ["DOUBT", d1.id, priya.id, vikram.id],
    ["DOUBT", d3.id, ishita.id, rahul.id],
    ["DOUBT", d4.id, vikram.id, ishita.id],
    ["DOUBT", d4.id, priya.id, ishita.id],
    ["ANSWER", a1.id, vikram.id, sneha.id],
    ["ANSWER", a1.id, priya.id, sneha.id],
    ["ANSWER", a1.id, rahul.id, sneha.id],
    ["ANSWER", a1.id, ishita.id, sneha.id],
    ["ANSWER", a5.id, ishita.id, arjun.id],
    ["ANSWER", a4.id, rahul.id, kavya.id],
    ["ANSWER", a3.id, priya.id, rahul.id],
  ];
  const voteCount: Record<string, number> = {};
  for (const [type, id, voter, author] of votePlan) {
    await upvote(type, id, voter, author);
    voteCount[id] = (voteCount[id] ?? 0) + 1;
  }
  await db.oaReport.update({ where: { id: r1.id }, data: { upvoteCount: voteCount[r1.id] ?? 0 } });
  await db.oaReport.update({ where: { id: r2.id }, data: { upvoteCount: voteCount[r2.id] ?? 0 } });
  await db.oaReport.update({ where: { id: r4.id }, data: { upvoteCount: voteCount[r4.id] ?? 0 } });
  await db.oaReport.update({ where: { id: r5.id }, data: { upvoteCount: voteCount[r5.id] ?? 0 } });
  await db.oaReport.update({ where: { id: r7.id }, data: { upvoteCount: voteCount[r7.id] ?? 0 } });
  await db.experience.update({ where: { id: e1.id }, data: { upvoteCount: voteCount[e1.id] ?? 0 } });
  await db.experience.update({ where: { id: e2.id }, data: { upvoteCount: voteCount[e2.id] ?? 0 } });
  await db.experience.update({ where: { id: e3.id }, data: { upvoteCount: voteCount[e3.id] ?? 0 } });
  await db.experience.update({ where: { id: e4.id }, data: { upvoteCount: voteCount[e4.id] ?? 0 } });
  await db.doubt.update({ where: { id: d1.id }, data: { upvoteCount: voteCount[d1.id] ?? 0 } });
  await db.doubt.update({ where: { id: d3.id }, data: { upvoteCount: voteCount[d3.id] ?? 0 } });
  await db.doubt.update({ where: { id: d4.id }, data: { upvoteCount: voteCount[d4.id] ?? 0 } });
  await db.answer.update({ where: { id: a1.id }, data: { upvoteCount: voteCount[a1.id] ?? 0 } });
  await db.answer.update({ where: { id: a3.id }, data: { upvoteCount: voteCount[a3.id] ?? 0 } });
  await db.answer.update({ where: { id: a4.id }, data: { upvoteCount: voteCount[a4.id] ?? 0 } });
  await db.answer.update({ where: { id: a5.id }, data: { upvoteCount: voteCount[a5.id] ?? 0 } });

  // ---------- unlocks ----------
  // Rahul has an approved MS report -> give-to-get, free
  await db.unlock.create({ data: { userId: rahul.id, reportId: r4.id, free: true } });
  await db.coinLedger.create({
    data: { userId: rahul.id, amount: 0, reason: "GIVE_TO_GET", refId: r4.id, note: "Give-to-get unlock (microsoft)" },
  });
  // Ishita paid for two
  await db.unlock.create({ data: { userId: ishita.id, reportId: r1.id, free: false } });
  await db.coinLedger.create({
    data: { userId: ishita.id, amount: -25, reason: "UNLOCK_OA", refId: r1.id, note: "Unlocked amazon OA report" },
  });
  await db.unlock.create({ data: { userId: ishita.id, reportId: r5.id, free: false } });
  await db.coinLedger.create({
    data: { userId: ishita.id, amount: -25, reason: "UNLOCK_OA", refId: r5.id, note: "Unlocked microsoft OA report" },
  });
  // Vikram unlocked an amazon report via his own approved amazon report (give-to-get)
  await db.unlock.create({ data: { userId: vikram.id, reportId: r1.id, free: true } });
  await db.coinLedger.create({
    data: { userId: vikram.id, amount: 0, reason: "GIVE_TO_GET", refId: r1.id, note: "Give-to-get unlock (amazon)" },
  });

  // ---------- flags (mod queue) ----------
  await db.flag.create({
    data: {
      reporterId: rahul.id,
      targetType: "REPORT",
      targetId: r3.id,
      reason: "Summary mentions exact question wording — possible NDA concern, please double-check.",
    },
  });
  await db.flag.create({
    data: {
      reporterId: priya.id,
      targetType: "ANSWER",
      targetId: a2.id,
      reason: "Answer encourages evading proctoring monitoring. Should be removed.",
    },
  });

  // ---------- summary ----------
  const counts = {
    users: await db.user.count(),
    drives: await db.drive.count(),
    reports: await db.oaReport.count(),
    experiences: await db.experience.count(),
    doubts: await db.doubt.count(),
    answers: await db.answer.count(),
    votes: await db.vote.count(),
    flags: await db.flag.count(),
    ledger: await db.coinLedger.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
