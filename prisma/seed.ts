/**
 * Seed script — Comprehensive campus database seed for PostgreSQL.
 * Populates Companies, Problems, CompanyProblems, PracticeSets, Users,
 * Placement Drives, OA Reports with granular OAQuestions, Interview Experiences
 * with InterviewRounds, Doubts, Votes, Flags, and ModerationLogs.
 *
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import companiesData from "../src/data/companies.json";
import problemsData from "../src/data/problems.json";
import setsData from "../src/data/sets.json";
import { normalizeCompanyName, KNOWN_COMPANY_ALIASES } from "../src/lib/company-utils";

const db = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding database...");

  // 1. Clean existing records in reverse dependency order
  await db.moderationLog.deleteMany();
  await db.coinLedger.deleteMany();
  await db.unlock.deleteMany();
  await db.vote.deleteMany();
  await db.flag.deleteMany();
  await db.answer.deleteMany();
  await db.doubt.deleteMany();
  await db.roundQuestion.deleteMany();
  await db.interviewRound.deleteMany();
  await db.experience.deleteMany();
  await db.oAQuestion.deleteMany();
  await db.oaBody.deleteMany();
  await db.oaReport.deleteMany();
  await db.drive.deleteMany();
  await db.companyProblem.deleteMany();
  await db.problem.deleteMany();
  await db.company.deleteMany();
  await db.practiceSet.deleteMany();
  await db.user.deleteMany();

  // 2. Seed Users
  console.log("Seeding users...");
  const admin = await db.user.create({
    data: {
      email: "ananya.rao.cph@gmail.com",
      name: "Ananya Rao",
      role: "ADMIN",
      rollNumber: "FAC-001",
      rollVerified: true,
      collegeDomain: "nitt.edu",
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
      collegeDomain: "nitt.edu",
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
      collegeDomain: "nitt.edu",
      batch: "2025",
    },
  });

  const arjun = await db.user.create({
    data: {
      email: "arjun.nair.cse@gmail.com",
      name: "Arjun Nair",
      role: "STUDENT",
      rollNumber: "CS23B1042",
      rollVerified: true,
      collegeDomain: "nitt.edu",
      batch: "2027",
    },
  });

  const kavya = await db.user.create({
    data: {
      email: "kavya.sharma.it@gmail.com",
      name: "Kavya Sharma",
      role: "STUDENT",
      rollNumber: "IT23B2011",
      rollVerified: true,
      collegeDomain: "nitt.edu",
      batch: "2027",
    },
  });

  const vikram = await db.user.create({
    data: {
      email: "vikram.singh.2025@gmail.com",
      name: "Vikram Singh",
      role: "SENIOR",
      rollNumber: "CS21B0112",
      rollVerified: true,
      placedCompany: "Microsoft",
      collegeDomain: "nitt.edu",
      batch: "2025",
    },
  });

  const priya = await db.user.create({
    data: {
      email: "priya.deshmukh.cse@gmail.com",
      name: "Priya Deshmukh",
      role: "STUDENT",
      rollNumber: "CS23B1088",
      rollVerified: true,
      collegeDomain: "nitt.edu",
      batch: "2027",
    },
  });

  const rahul = await db.user.create({
    data: {
      email: "rahul.mehta.ece@gmail.com",
      name: "Rahul Mehta",
      role: "STUDENT",
      rollNumber: "EC23B3004",
      rollVerified: true,
      collegeDomain: "nitt.edu",
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
      collegeDomain: "nitt.edu",
      batch: "2027",
    },
  });

  // Pending user in mod queue
  const devUser = await db.user.create({
    data: {
      email: "dev.malhotra@gmail.com",
      name: "Dev Malhotra",
      role: "STUDENT",
      rollNumber: "CS24B1023",
      rollVerified: false,
      collegeDomain: "nitt.edu",
      batch: "2028",
    },
  });

  // Welcome coin ledger entries
  const verifiedUsers = [admin, mod, sneha, arjun, kavya, vikram, priya, rahul, ishita];
  for (const u of verifiedUsers) {
    await db.coinLedger.create({
      data: {
        userId: u.id,
        amount: 25,
        reason: "WELCOME",
        refId: u.id,
        note: "Roll number verified",
      },
    });
  }

  // 3. Seed Companies from static JSON
  console.log("Seeding companies...");
  const companyMap = new Map<string, string>(); // slug -> id

  for (const c of companiesData as Array<{
    slug: string;
    name: string;
    region?: string;
    tier?: string;
    type?: string;
    typicalRoles?: string[];
  }>) {
    const norm = normalizeCompanyName(c.name);
    const aliases = KNOWN_COMPANY_ALIASES[c.slug] ?? [c.name];
    const sectors = [c.type, c.tier, c.region].filter(Boolean) as string[];

    const created = await db.company.create({
      data: {
        slug: c.slug,
        name: c.name,
        normalizedName: norm,
        aliases,
        website: `https://${c.slug}.com`,
        logoUrl: `/logos/${c.slug}.svg`,
        sectors,
        hiringRoles: c.typicalRoles ?? ["Software Engineer"],
        status: "VERIFIED",
        createdById: admin.id,
      },
    });
    companyMap.set(c.slug, created.id);
  }

  // 4. Seed Practice Sets
  console.log("Seeding practice sets...");
  for (const s of setsData as Array<{
    slug: string;
    name: string;
    icon?: string;
    description: string;
    topics: string[];
    resources: Array<{ name: string; url: string }>;
    sampleQuestions: Array<{ q: string; answer: string }>;
  }>) {
    await db.practiceSet.create({
      data: {
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        description: s.description,
        topics: s.topics,
        resources: s.resources,
        sampleQuestions: s.sampleQuestions,
      },
    });
  }

  // 5. Seed Problems & CompanyProblem relations
  console.log("Seeding problems and company-problem mappings...");
  const problemCache = new Map<string, string>(); // slug -> id
  const problemsByCompany = problemsData as Record<
    string,
    Array<{
      title: string;
      slug: string;
      difficulty: string;
      window?: string;
    }>
  >;

  for (const [companySlug, problems] of Object.entries(problemsByCompany)) {
    const companyId = companyMap.get(companySlug);
    if (!companyId) continue;

    for (const p of problems) {
      let problemId = problemCache.get(p.slug);
      if (!problemId) {
        const createdProblem = await db.problem.upsert({
          where: {
            source_externalSlug: {
              source: "LEETCODE",
              externalSlug: p.slug,
            },
          },
          update: {},
          create: {
            source: "LEETCODE",
            externalSlug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            topics: ["Algorithms", "Data Structures"],
            url: `https://leetcode.com/problems/${p.slug}/`,
          },
        });
        problemId = createdProblem.id;
        problemCache.set(p.slug, problemId);
      }

      await db.companyProblem.upsert({
        where: {
          companyId_problemId_window_sourceName: {
            companyId,
            problemId,
            window: p.window || "6M",
            sourceName: "leetcode-company-wise",
          },
        },
        update: {},
        create: {
          companyId,
          problemId,
          window: p.window || "6M",
          frequency: 1.0,
          sourceName: "leetcode-company-wise",
          sourceSnapshotDate: new Date("2026-10-01"),
        },
      });
    }
  }

  // 6. Seed Placement Drives
  console.log("Seeding placement drives...");
  const amazonCompanyId = companyMap.get("amazon")!;
  const microsoftCompanyId = companyMap.get("microsoft")!;
  const googleCompanyId = companyMap.get("google")!;
  const tcsCompanyId = companyMap.get("tcs")!;
  const infosysCompanyId = companyMap.get("infosys")!;
  const flipkartCompanyId = companyMap.get("flipkart")!;

  const amazonDrive = await db.drive.create({
    data: {
      companyId: amazonCompanyId,
      company: "amazon",
      role: "SDE Intern",
      driveDate: daysAgo(40),
      status: "CLOSED",
      branches: "CSE,IT",
      minCgpa: 7.0,
      notes: "On-campus drive, 2 profiles: SDE Intern 6-month + PPO.",
    },
  });

  const microsoftDrive = await db.drive.create({
    data: {
      companyId: microsoftCompanyId,
      company: "microsoft",
      role: "Software Engineer",
      driveDate: daysAgo(25),
      status: "CLOSED",
      branches: "CSE,IT,ECE",
      minCgpa: 7.5,
      notes: "Direct campus hiring for IDC Bangalore / Hyderabad.",
    },
  });

  const googleDrive = await db.drive.create({
    data: {
      companyId: googleCompanyId,
      company: "google",
      role: "SWE Intern (Winter/Summer)",
      driveDate: daysAgo(15),
      status: "CLOSED",
      branches: "CSE,IT,ECE",
      minCgpa: 8.0,
      notes: "Summer 2027 internship loop.",
    },
  });

  const tcsDrive = await db.drive.create({
    data: {
      companyId: tcsCompanyId,
      company: "tcs",
      role: "Prime / Digital",
      driveDate: daysAhead(20),
      status: "OPEN",
      branches: "ALL",
      minCgpa: 6.0,
      notes: "Includes aptitude + verbal sections before coding.",
    },
  });

  const infosysDrive = await db.drive.create({
    data: {
      companyId: infosysCompanyId,
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
      companyId: flipkartCompanyId,
      company: "flipkart",
      role: "SDE-1",
      driveDate: daysAhead(45),
      status: "OPEN",
      branches: "CSE,IT",
      minCgpa: 7.0,
      notes: "Upcoming campus hiring drive.",
    },
  });

  // 7. Seed OA Reports & granular OAQuestions
  console.log("Seeding OA reports & questions...");

  async function createOaReport(opts: {
    companyId: string;
    companySlug: string;
    authorId: string;
    driveId?: string;
    role: string;
    round?: string;
    platform: string;
    durationMin: number;
    sections: string[];
    topics: string[];
    difficulty: string;
    outcome: string;
    summary: string;
    status?: string;
    hiringSeason?: string;
    graduatingBatch?: number;
    createdAt?: Date;
    questions: Array<{
      type: string;
      title: string;
      statementMd: string;
      constraints?: string;
      sampleIO?: string;
      topics: string[];
      difficulty: string;
      marks?: number;
    }>;
  }) {
    const report = await db.oaReport.create({
      data: {
        companyId: opts.companyId,
        authorId: opts.authorId,
        driveId: opts.driveId,
        hiringSeason: opts.hiringSeason ?? "2026-27",
        graduatingBatch: opts.graduatingBatch ?? 2027,
        assessmentDate: opts.createdAt ?? daysAgo(10),
        platform: opts.platform,
        role: opts.role,
        round: opts.round ?? "Online Assessment",
        durationMin: opts.durationMin,
        sections: opts.sections,
        topics: opts.topics,
        difficulty: opts.difficulty,
        outcome: opts.outcome,
        summary: opts.summary,
        status: opts.status ?? "APPROVED",
        createdAt: opts.createdAt ?? daysAgo(10),
      },
    });

    // Create legacy body container
    const combinedText = opts.questions.map((q, i) => `### Q${i + 1}: ${q.title}\n\n${q.statementMd}`).join("\n\n---\n\n");
    await db.oaBody.create({
      data: {
        reportId: report.id,
        text: combinedText,
      },
    });

    // Create structured questions
    for (let i = 0; i < opts.questions.length; i++) {
      const q = opts.questions[i];
      await db.oAQuestion.create({
        data: {
          reportId: report.id,
          type: q.type,
          title: q.title,
          statementMd: q.statementMd,
          constraints: q.constraints,
          sampleIO: q.sampleIO,
          topics: q.topics,
          difficulty: q.difficulty,
          marks: q.marks,
          order: i,
        },
      });
    }

    if ((opts.status ?? "APPROVED") === "APPROVED") {
      await db.coinLedger.create({
        data: {
          userId: opts.authorId,
          amount: 50,
          reason: "REPORT_APPROVED",
          refId: report.id,
          note: `OA report approved (${opts.companySlug})`,
        },
      });

      await db.moderationLog.create({
        data: {
          moderatorId: mod.id,
          targetType: "OA_REPORT",
          targetId: report.id,
          action: "APPROVE",
          reason: "Verified question structure and season",
        },
      });
    }

    return report;
  }

  // Amazon OA Report (Class of 2027, 2026-27 Season)
  const r1 = await createOaReport({
    companyId: amazonCompanyId,
    companySlug: "amazon",
    authorId: sneha.id,
    driveId: amazonDrive.id,
    role: "SDE Intern",
    platform: "HackerRank",
    durationMin: 120,
    sections: ["Coding", "Work Simulation / LP"],
    topics: ["Arrays", "Sliding Window", "BFS", "Graphs"],
    difficulty: "Medium",
    outcome: "Cleared",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    createdAt: daysAgo(38),
    summary: "Standard Amazon 2026-27 OA: Q1 was a sliding-window array variant, Q2 a warehouse grid BFS traversal.",
    questions: [
      {
        type: "CODING",
        title: "Longest Band Stretch",
        statementMd: "Given an array of item ratings, find the length of the longest contiguous subarray where the difference between maximum and minimum rating is at most k.",
        constraints: "N <= 10^5, k <= 10^9, 0 <= rating[i] <= 10^9",
        sampleIO: "Input: ratings = [8, 2, 4, 7], k = 4\nOutput: 2",
        topics: ["Arrays", "Sliding Window", "Monotonic Deque"],
        difficulty: "Medium",
        marks: 50,
      },
      {
        type: "CODING",
        title: "Warehouse Package Collection",
        statementMd: "A grid warehouse has packages and walls. Calculate the minimum steps for a robot to collect all packages starting from (0,0).",
        constraints: "Rows, Cols <= 20, Packages <= 8",
        sampleIO: "Input: grid with 4 packages\nOutput: 14 steps",
        topics: ["Graphs", "BFS", "Bitmask"],
        difficulty: "Medium",
        marks: 50,
      },
    ],
  });

  // Microsoft OA Report (Class of 2027, 2026-27 Season)
  await createOaReport({
    companyId: microsoftCompanyId,
    companySlug: "microsoft",
    authorId: arjun.id,
    driveId: microsoftDrive.id,
    role: "Software Engineer",
    platform: "Codility",
    durationMin: 90,
    sections: ["Coding"],
    topics: ["Strings", "Dynamic Programming"],
    difficulty: "Medium",
    outcome: "Cleared",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    createdAt: daysAgo(24),
    summary: "Codility 2026-27 test: Q1 string frequency manipulation, Q2 minimum cost grid path with direction rules.",
    questions: [
      {
        type: "CODING",
        title: "Minimum Deletions for Unique Frequencies",
        statementMd: "Given a string s, find the minimum characters to delete so that no two distinct characters have the same frequency.",
        constraints: "s.length <= 10^5, lowercase English letters",
        sampleIO: "Input: 'aab'\nOutput: 0",
        topics: ["Strings", "Greedy", "Hash Table"],
        difficulty: "Easy",
        marks: 50,
      },
      {
        type: "CODING",
        title: "Grid Traversal Cost with Restricted Turns",
        statementMd: "Find the minimum cost path from top-left to bottom-right cell in a weighted matrix when turning carries an additional cost.",
        constraints: "M, N <= 500",
        sampleIO: "Input: 3x3 matrix\nOutput: 18",
        topics: ["Dynamic Programming", "Graphs", "Dijkstra"],
        difficulty: "Medium",
        marks: 50,
      },
    ],
  });

  // Google OA Report (Class of 2027, 2026-27 Season)
  await createOaReport({
    companyId: googleCompanyId,
    companySlug: "google",
    authorId: kavya.id,
    driveId: googleDrive.id,
    role: "SWE Intern",
    platform: "Google Form / Sandbox",
    durationMin: 60,
    sections: ["Coding"],
    topics: ["Trees", "Binary Search"],
    difficulty: "Hard",
    outcome: "Cleared",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    createdAt: daysAgo(14),
    summary: "Google 2026-27 Winter Intern OA: 2 problems, heavy focus on clean invariants and asymptotic bounds.",
    questions: [
      {
        type: "CODING",
        title: "Max Path Sum on Colored Tree",
        statementMd: "Given a tree with alternating node colors, compute the maximum path weight where colors alternate strictly.",
        constraints: "N <= 10^5",
        sampleIO: "Input: tree with 5 nodes\nOutput: 32",
        topics: ["Trees", "DFS", "Dynamic Programming"],
        difficulty: "Hard",
        marks: 100,
      },
    ],
  });

  // Embargoed reports on OPEN drives
  await createOaReport({
    companyId: tcsCompanyId,
    companySlug: "tcs",
    authorId: rahul.id,
    driveId: tcsDrive.id,
    role: "Prime / Digital",
    platform: "TCS iON",
    durationMin: 120,
    sections: ["Aptitude", "Verbal", "Coding"],
    topics: ["Aptitude", "Arrays", "Math"],
    difficulty: "Medium",
    outcome: "Cleared",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    createdAt: daysAgo(1),
    summary: "TCS Digital / Prime 2026-27 round: Aptitude was tight on time, coding was standard math/arrays.",
    questions: [
      {
        type: "APTITUDE",
        title: "Work & Time Relative Speed",
        statementMd: "Two pipes fill a tank in 12 and 15 hours. If opened alternately for 1 hour each, how long until full?",
        topics: ["Aptitude", "Time & Work"],
        difficulty: "Easy",
        marks: 20,
      },
      {
        type: "CODING",
        title: "Subarray Sum Equals K Variant",
        statementMd: "Find the total count of contiguous subarrays whose sum modulo M equals zero.",
        topics: ["Arrays", "Prefix Sum", "Math"],
        difficulty: "Medium",
        marks: 80,
      },
    ],
  });

  // 8. Seed Interview Experiences with InterviewRounds
  console.log("Seeding interview experiences...");

  async function createExperience(opts: {
    companyId: string;
    companySlug: string;
    authorId: string;
    role: string;
    offerStatus: string;
    overallDifficulty: string;
    tips: string;
    body: string;
    topics: string[];
    hiringSeason?: string;
    graduatingBatch?: number;
    status?: string;
    rounds: Array<{
      name: string;
      type: string;
      durationMin: number;
      notes: string;
      questions: Array<{ text: string; topics: string[]; difficulty?: string }>;
    }>;
  }) {
    const exp = await db.experience.create({
      data: {
        companyId: opts.companyId,
        company: opts.companySlug,
        authorId: opts.authorId,
        hiringSeason: opts.hiringSeason ?? "2026-27",
        graduatingBatch: opts.graduatingBatch ?? 2027,
        role: opts.role,
        offerStatus: opts.offerStatus,
        overallDifficulty: opts.overallDifficulty,
        tips: opts.tips,
        body: opts.body,
        topics: opts.topics,
        status: opts.status ?? "APPROVED",
        round: `${opts.rounds.length} Rounds`,
      },
    });

    for (let rIndex = 0; rIndex < opts.rounds.length; rIndex++) {
      const r = opts.rounds[rIndex];
      const createdRound = await db.interviewRound.create({
        data: {
          experienceId: exp.id,
          order: rIndex + 1,
          name: r.name,
          type: r.type,
          durationMin: r.durationMin,
          notes: r.notes,
        },
      });

      for (let qIndex = 0; qIndex < r.questions.length; qIndex++) {
        const q = r.questions[qIndex];
        await db.roundQuestion.create({
          data: {
            roundId: createdRound.id,
            text: q.text,
            topics: q.topics,
            difficulty: q.difficulty,
            order: qIndex + 1,
          },
        });
      }
    }

    if ((opts.status ?? "APPROVED") === "APPROVED") {
      await db.coinLedger.create({
        data: {
          userId: opts.authorId,
          amount: 40,
          reason: "EXPERIENCE_APPROVED",
          refId: exp.id,
          note: `Interview experience approved (${opts.companySlug})`,
        },
      });

      await db.moderationLog.create({
        data: {
          moderatorId: mod.id,
          targetType: "EXPERIENCE",
          targetId: exp.id,
          action: "APPROVE",
          reason: "Complete multi-round experience with actionable tips",
        },
      });
    }

    return exp;
  }

  // Amazon SDE Intern full loop (Class of 2025/2026, 2026-27 hiring season)
  await createExperience({
    companyId: amazonCompanyId,
    companySlug: "amazon",
    authorId: sneha.id,
    role: "SDE Intern",
    offerStatus: "OFFERED",
    overallDifficulty: "Medium",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    tips: "Prepare 2-3 STAR stories per Leadership Principle. Explain edge cases before writing code.",
    body: "3-round virtual on-campus loop. First technical round focused on tree traversals, second round was a Bar Raiser with deep LP probing, third round was HR/LP alignment. Received the offer letter 4 days later.",
    topics: ["Trees", "Leadership Principles", "Graphs"],
    rounds: [
      {
        name: "Technical Interview 1",
        type: "TECHNICAL",
        durationMin: 60,
        notes: "Interviewer was very friendly. Spent first 15 mins on 'Customer Obsession' and 'Deliver Results'.",
        questions: [
          { text: "Serialize and deserialize a binary tree.", topics: ["Trees", "BFS"], difficulty: "Medium" },
          { text: "How would you handle NULL pointers and corrupted inputs?", topics: ["Clean Code"], difficulty: "Easy" },
        ],
      },
      {
        name: "Technical Interview 2 (Bar Raiser)",
        type: "TECHNICAL",
        durationMin: 60,
        notes: "Senior Bar Raiser from AWS team. Very strict on STAR format and algorithmic complexity.",
        questions: [
          { text: "Find the median of a stream of integers.", topics: ["Heaps", "Design"], difficulty: "Hard" },
          { text: "Tell me about a time you had to make a decision without full information.", topics: ["Leadership Principles", "Bias for Action"], difficulty: "Medium" },
        ],
      },
      {
        name: "HR & Culture Fit",
        type: "HR",
        durationMin: 30,
        notes: "Discussion on relocation, team preferences, and internship timeline.",
        questions: [
          { text: "Why Amazon over other offers?", topics: ["HR"], difficulty: "Easy" },
        ],
      },
    ],
  });

  // Microsoft SWE full loop
  await createExperience({
    companyId: microsoftCompanyId,
    companySlug: "microsoft",
    authorId: vikram.id,
    role: "Software Engineer",
    offerStatus: "OFFERED",
    overallDifficulty: "Medium",
    hiringSeason: "2026-27",
    graduatingBatch: 2027,
    tips: "Revise OS concepts (virtual memory, page tables, deadlock) and practice clean C++/Java OOP implementations.",
    body: "Full day virtual interview. 2 technical rounds covering DP and OS fundamentals, followed by a Director round discussing system design and career goals.",
    topics: ["Dynamic Programming", "Operating Systems", "System Design"],
    rounds: [
      {
        name: "Technical Round 1",
        type: "TECHNICAL",
        durationMin: 45,
        notes: "Coding on Microsoft Teams whiteboard.",
        questions: [
          { text: "Longest Increasing Subsequence with binary search O(N log N).", topics: ["Dynamic Programming", "Binary Search"], difficulty: "Medium" },
          { text: "Explain how virtual memory is mapped to physical RAM.", topics: ["Operating Systems"], difficulty: "Medium" },
        ],
      },
      {
        name: "Technical Round 2",
        type: "TECHNICAL",
        durationMin: 60,
        notes: "Deep dive into DBMS ACID properties and concurrency control.",
        questions: [
          { text: "Design an LRU Cache with O(1) operations.", topics: ["Hash Table", "Doubly Linked List"], difficulty: "Medium" },
        ],
      },
      {
        name: "Director Round",
        type: "MANAGERIAL",
        durationMin: 45,
        notes: "High-level architecture and mindset discussion.",
        questions: [
          { text: "Design a URL shortener service for a campus event.", topics: ["System Design"], difficulty: "Medium" },
        ],
      },
    ],
  });

  // 9. Seed Peer Doubts & Answers
  console.log("Seeding doubts & answers...");
  const d1 = await db.doubt.create({
    data: {
      companyId: amazonCompanyId,
      company: "amazon",
      authorId: rahul.id,
      title: "Does Amazon test Leadership Principles in the OA work-simulation?",
      body: "In the 2026-27 OA, there is a 20-minute work simulation section. Do they check specific LPs like 'Customer Obsession' and 'Ownership' here?",
      anonymous: false,
      upvoteCount: 4,
    },
  });

  await db.answer.create({
    data: {
      doubtId: d1.id,
      authorId: sneha.id,
      body: "Yes, 100%. The work-simulation is scored automatically against Amazon's LP rubric. Always prioritize the customer and take long-term ownership rather than quick shortcuts.",
      accepted: true,
      upvoteCount: 5,
    },
  });

  // Grant answer accept reward
  await db.coinLedger.create({
    data: {
      userId: sneha.id,
      amount: 30,
      reason: "ANSWER_ACCEPTED",
      refId: d1.id,
      note: "Accepted answer on Amazon doubt",
    },
  });

  // 10. Seed Unlocks
  console.log("Seeding unlocks...");
  await db.unlock.create({
    data: {
      userId: kavya.id,
      reportId: r1.id,
      free: false,
    },
  });

  await db.coinLedger.create({
    data: {
      userId: kavya.id,
      amount: -25,
      reason: "UNLOCK_OA",
      refId: r1.id,
      note: "Unlocked Amazon OA report",
    },
  });

  // 11. Seed Moderation Flags
  console.log("Seeding flags...");
  await db.flag.create({
    data: {
      reporterId: ishita.id,
      targetType: "DOUBT",
      targetId: d1.id,
      reason: "Duplicate question already answered in prep guide",
      resolved: false,
    },
  });

  console.log("Database seeded successfully with PostgreSQL relations!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
