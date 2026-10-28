import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { start } from "../server.mjs";
const require = createRequire(
  process.env.PILOT_DEPENDENCIES ||
    new URL("../../../package.json", import.meta.url),
);
const puppeteer = require("puppeteer-core");
const home = mkdtempSync(join(tmpdir(), "collab-browser-repo-"));
let interrupt = true;
const server = start({
  port: 0,
  repositoryHome: home,
  quiet: true,
  runtimeOptions: {
    beforeCommit: (action) => {
      if (interrupt && action === "proposal.promote") {
        interrupt = false;
        throw Error("Injected receipt write failure");
      }
    },
  },
});
await once(server, "listening");
const client = new Client(
  { name: "browser-acceptance-agent", version: "1.0.0" },
  { capabilities: {} },
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("../mcp-server.mjs", import.meta.url))],
  env: {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    COLLABORATION_HOME: home,
  },
  stderr: "pipe",
});
await client.connect(transport);
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
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin);
  await page.waitForFunction(() =>
    document.querySelector("#anchor").textContent.includes("Commit"),
  );
  await page.type("#feedback", "Make the chemistry outcome clearer.");
  await page.click("#feedback-form button");
  await page.waitForFunction(
    () => document.querySelector("#feedback-id").options.length > 0,
  );
  const context = JSON.parse(
    (await client.readResource({ uri: "collaboration://workspace/context" }))
      .contents[0].text,
  );
  const response = await client.callTool({
    name: "proposal.create",
    arguments: {
      page: "/",
      component: "hero.headline",
      baseVersion: context.source.version,
      baseHash: context.sourceHash,
      requestId: "browser-mcp-proposal",
      feedbackId: context.feedback[0].id,
      replacement: "Chemistry engineered for measurable outcomes.",
      reason: "Clarify the requested chemistry outcome.",
    },
  });
  assert.notEqual(response.isError, true);
  await page.click("#refresh");
  await page.waitForFunction(() =>
    document
      .querySelector("#proposals")
      .textContent.includes("Approve exact content"),
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/repository-review.png", import.meta.url),
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
      new URL("../evidence/repository-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewport({ width: 1440, height: 1100 });
  const click = (label) =>
    page.evaluate(
      (label) =>
        [...document.querySelectorAll("button")]
          .find((b) => b.textContent === label)
          .click(),
      label,
    );
  await click("Approve exact content");
  await page.waitForFunction(() =>
    document
      .querySelector("#proposals")
      .textContent.includes("Apply approved source edit"),
  );
  await click("Apply approved source edit");
  await page.waitForFunction(() =>
    document
      .querySelector("#notice")
      .textContent.includes("storage_unavailable"),
  );
  await page.reload();
  await page.waitForFunction(() =>
    document
      .querySelector("#proposals")
      .textContent.includes("Recover application receipt"),
  );
  await click("Recover application receipt");
  await page.waitForFunction(() =>
    document
      .querySelector("#handoffs")
      .textContent.includes("Applied source commit"),
  );
  await page.reload();
  await page.waitForFunction(() =>
    document.querySelector("#anchor").textContent.includes("Version 2"),
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/repository-applied.png", import.meta.url),
    ),
    fullPage: true,
  });
  const final = JSON.parse(
    (await client.readResource({ uri: "collaboration://workspace/context" }))
      .contents[0].text,
  );
  assert.equal(final.source.version, 2);
  assert.equal(final.outbox.length, 1);
  assert.equal(
    final.source.text,
    "Chemistry engineered for measurable outcomes.",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual MCP proposal → browser exact approval → Git source commit → injected SQLite failure → reload recovery → one source commit/receipt; desktop/mobile no overflow or page errors.",
  );
} finally {
  await browser.close();
  await client.close();
  await new Promise((r) => server.close(r));
  rmSync(home, { recursive: true, force: true });
}
