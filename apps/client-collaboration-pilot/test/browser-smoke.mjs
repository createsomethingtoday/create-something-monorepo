import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { start } from "../server.mjs";
const require = createRequire(
  process.env.PILOT_DEPENDENCIES ||
    new URL("../../../package.json", import.meta.url),
);
const puppeteer = require("puppeteer-core");
const server = start({ port: 0, dbPath: ":memory:", quiet: true });
await once(server, "listening");
const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-first-run", "--disable-background-networking"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1440, height: 1100 });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() =>
    document.querySelector("#anchor").textContent.includes("Version"),
  );
  await page.type(
    "#feedback",
    "Make the headline more concrete about the client outcome.",
  );
  await page.click("#feedback-form button");
  await page.waitForFunction(
    () => document.querySelector("#feedback-id").options.length > 0,
  );
  await page.click("#proposal-form button");
  await page.waitForFunction(() =>
    document
      .querySelector("#proposals")
      .textContent.includes("Approve exact content"),
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/desktop-review.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/mobile-review.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewport({ width: 1440, height: 1100 });
  await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent === "Approve exact content")
      .click(),
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#proposals")
      .textContent.includes("Promote to local handoff"),
  );
  await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent === "Promote to local handoff")
      .click(),
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#handoffs")
      .textContent.includes("Local source handoff"),
  );
  await page.reload();
  await page.waitForFunction(() =>
    document.querySelector("#anchor").textContent.includes("Version 2"),
  );
  assert.equal(
    await page.$eval("#headline", (e) => e.textContent),
    "Turn ambitious goals into measurable growth.",
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/promoted-handoff.png", import.meta.url),
    ),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS desktop/mobile layout, feedback, proposal, approval, local handoff, reload persistence; no page errors.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
