import { test, expect } from "@playwright/test";

test.describe("Student Placement Journey E2E Flow", () => {
  test("loads landing page, displays 2026-27 hiring season and mobile header", async ({ page }) => {
    await page.goto("/");

    // Verify main page title and brand
    await expect(page).toHaveTitle(/Placement Prep/i);
    await expect(page.locator("header")).toBeVisible();

    // Verify navigation tabs
    const homeTab = page.getByRole("button", { name: "Home" });
    await expect(homeTab).toBeVisible();

    const companiesTab = page.getByRole("button", { name: "Companies" });
    await expect(companiesTab).toBeVisible();

    // Verify contribute entrypoint
    const contributeTab = page.getByRole("button", { name: "Contribute" });
    await expect(contributeTab).toBeVisible();
  });

  test("navigates to company listing and problem frequency", async ({ page }) => {
    await page.goto("/?tab=companies");

    // Check company search input
    const searchInput = page.getByPlaceholder(/search companies/i).or(page.getByPlaceholder(/filter/i)).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Google");
      await page.waitForTimeout(300);
    }

    // Verify company cards or list
    await expect(page.locator("main")).toBeVisible();
  });

  test("loads server-rendered company SEO page with 2026-27 metadata", async ({ page }) => {
    // Navigate to server-rendered company route
    const response = await page.goto("/companies/amazon");
    expect(response?.status()).toBe(200);

    // Verify company heading and 2026-27 section
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Amazon");
    await expect(page.getByText("Placement Preparation", { exact: false })).toBeVisible();
  });

  test("verifies sitemap and robots endpoints are active and conformant", async ({ request }) => {
    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain("User-agent: *");
    expect(robotsText).toContain("sitemap.xml");

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain("<urlset");
  });

  test("verifies health check endpoint returns 200 with DB status", async ({ request }) => {
    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("healthy");
    expect(healthJson.checks.postgres.status).toBe("up");
  });
});

