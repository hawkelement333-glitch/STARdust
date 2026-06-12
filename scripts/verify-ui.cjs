const { chromium } = require("C:/Users/hawke/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseUrl = process.env.VYRL_TEST_URL || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: "artifacts/pulse-mobile.png", fullPage: true });
  await page.locator(".trend-card").first().click();
  await page.locator("#view-studio.active").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: "artifacts/studio-mobile.png", fullPage: true });

  await page.locator("#topic-input").fill("Personal style is replacing anonymous status dressing.");
  await page.locator('[data-next-step="person"]').click();
  await page.locator('[data-person="imani"]').click();
  await page.locator('[data-next-step="sound"]').click();
  await page.locator('[data-sound="stomp"]').click();
  await page.locator('[data-next-step="finish"]').click();
  await page.locator("#finish-summary").getByText("Imani").waitFor();
  await page.locator("#save-project").click();
  await page.locator('[data-nav="library"]').last().click();
  await page.locator(".project-card").waitFor();

  await page.locator('[data-nav="autopilot"]').last().click();
  await page.locator("#automation-live-dot.live").waitFor();
  await page.locator("#command-metrics strong").first().waitFor();
  await page.locator("#opportunity-list .opportunity-row").first().waitFor();
  const queueBefore = await page.locator(".queue-card").count();
  const generateResponse = page.waitForResponse((response) => response.url().endsWith("/api/automation/generate") && response.request().method() === "POST");
  await page.locator("#generate-batch").click();
  await generateResponse;
  await page.waitForFunction((count) => document.querySelectorAll(".queue-card").length > count, queueBefore);
  await page.locator('[data-queue-filter="needs_approval"]').click();
  const reviewCards = page.locator(".queue-card");
  if (await reviewCards.count()) {
    await reviewCards.first().locator(".queue-select").check();
    const bulkResponse = page.waitForResponse((response) => response.url().endsWith("/api/automation/bulk") && response.request().method() === "POST");
    await page.locator("#bulk-approve").click();
    await bulkResponse;
  }
  await page.locator('[data-queue-filter="all"]').click();
  await page.screenshot({ path: "artifacts/autopilot-mobile.png", fullPage: true });

  const result = {
    title: await page.title(),
    viewport: page.viewportSize(),
    trends: await page.locator(".trend-card").count(),
    savedProjects: await page.locator(".project-card").count(),
    queuedPosts: await page.locator(".queue-card").count(),
    intelligenceRows: await page.locator(".opportunity-row").count(),
    consoleErrors,
    screenshots: ["artifacts/pulse-mobile.png", "artifacts/studio-mobile.png", "artifacts/autopilot-mobile.png"]
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (consoleErrors.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
