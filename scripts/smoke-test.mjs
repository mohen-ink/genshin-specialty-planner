import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const viteBin = resolve(appRoot, "node_modules/vite/bin/vite.js");
const port = 4174;
const url = `http://127.0.0.1:${port}/`;

const browserCandidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  console.error("Chrome or Edge was not found. Set CHROME_PATH to run the smoke test.");
  process.exit(1);
}

const server = spawn(
  process.execPath,
  [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Preview server exited early.\n${serverOutput}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Preview server did not become ready.\n${serverOutput}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "创建第一份规划" }).click();
  const search = page.getByPlaceholder("搜索角色、特产、元素或武器");
  await search.fill("甘雨");
  await page.locator(".character-option").filter({ hasText: "甘雨" }).click();
  await page.getByRole("button", { name: "贴入手帐" }).click();

  await page.getByRole("button", { name: "＋ 贴一张新的规划便签" }).click();
  const secondSearch = page.getByPlaceholder("搜索角色、特产、元素或武器");
  await secondSearch.fill("申鹤");
  await page.locator(".character-option").filter({ hasText: "申鹤" }).click();
  await page.getByRole("button", { name: "贴入手帐" }).click();

  await page.getByText("甘雨", { exact: true }).first().waitFor();
  const qingxinCards = page.locator(".specialty-card").filter({ hasText: "清心" });
  if (await qingxinCards.count() !== 1) throw new Error("Characters sharing 清心 were not merged into one card.");

  await qingxinCards.getByRole("button", { name: "盖章：本轮采集完成" }).click();
  await qingxinCards.getByText("休息中", { exact: true }).waitFor();
  const cooldownText = await qingxinCards.textContent();
  if (!cooldownText?.includes("46 小时") || cooldownText.includes("46 小时 01 分")) {
    throw new Error("The exact 46 hour cooldown did not start.");
  }

  await page.reload({ waitUntil: "networkidle" });
  const persistedCard = page.locator(".specialty-card").filter({ hasText: "清心" });
  await persistedCard.getByText("休息中", { exact: true }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Mobile layout overflows horizontally by ${overflow}px.`);

  await persistedCard.getByRole("button", { name: "撤销标记" }).click();
  await persistedCard.getByRole("button", { name: "盖章：本轮采集完成" }).waitFor();

  if (runtimeErrors.length > 0) throw new Error(`Runtime errors:\n${runtimeErrors.join("\n")}`);
  console.log("Smoke test passed: plan creation, specialty merge, cooldown persistence, undo, and mobile layout.");
} finally {
  await browser?.close();
  server.kill();
}
