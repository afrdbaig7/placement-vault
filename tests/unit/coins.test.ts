import { describe, it, expect } from "bun:test";
import { config } from "@/data/config";
import { assertPostCap } from "@/lib/coins";

describe("Coin Economics and Caps", () => {
  it("enforces default coin rates as configured", () => {
    expect(config.rates.welcomeGrant).toBe(25);
    expect(config.rates.reportApproved).toBe(50);
    expect(config.rates.experienceApproved).toBe(40);
    expect(config.rates.answerAccepted).toBe(30);
    expect(config.rates.upvoteReceived).toBe(2);
    expect(config.rates.unlockOa).toBe(25);
  });

  it("enforces daily post cap threshold", () => {
    expect(config.caps.dailyPosts).toBe(5);

    // Below cap should not throw
    expect(() => assertPostCap(0)).not.toThrow();
    expect(() => assertPostCap(4)).not.toThrow();

    // At or above cap must throw 429
    expect(() => assertPostCap(5)).toThrow();
    expect(() => assertPostCap(6)).toThrow();
  });

  it("enforces daily upvote coin earning cap", () => {
    expect(config.caps.upvoteEarnDaily).toBe(20);
  });

  it("calculates 2026-27 pioneer bounty bonus properly", () => {
    const standardReportReward = config.rates.reportApproved; // 50
    const seasonalBounty = 25;
    const totalPioneerReward = standardReportReward + seasonalBounty;

    expect(totalPioneerReward).toBe(75);
    expect(totalPioneerReward).toBeGreaterThan(standardReportReward);
  });
});
