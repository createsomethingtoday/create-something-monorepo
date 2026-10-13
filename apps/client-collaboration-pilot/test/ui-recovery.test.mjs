import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
test("UI retries committed mutation with same ID when refresh fails", async () => {
  const source = readFileSync(
    new URL("../public/app.js", import.meta.url),
    "utf8",
  );
  // Exercise the real send implementation without mounting UI or loading its startup fetches.
  const sendSource = source.slice(
    source.indexOf("async function send("),
    source.indexOf("async function run("),
  );
  const ids = [];
  let calls = 0;
  let id = 0;
  const context = {
    state: { csrf: "test" },
    pending: undefined,
    crypto: { randomUUID: () => String(++id) },
    fetch: async (_, req) => {
      ids.push(JSON.parse(req.body).requestId);
      return { ok: true, json: async () => ({ id: "saved" }) };
    },
    refresh: async () => {
      if (++calls === 1) throw Error("context unavailable");
    },
  };
  runInNewContext(sendSource + ";globalThis.send=send", context);
  await assert.rejects(
    context.send("/api/feedback", { text: "Same feedback" }),
    /context unavailable/,
  );
  await context.send("/api/feedback", { text: "Same feedback" });
  assert.deepEqual(ids, ["1", "1"]);
});
