import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import { start } from "../server.mjs";
test("HTTP boundary: hostile origins, malformed requests, tool escalation, full browser workflow", async (t) => {
  const server = start({ port: 0, dbPath: ":memory:", quiet: true });
  await once(server, "listening");
  t.after(() => new Promise((r) => server.close(r)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const get = await fetch(`${origin}/api/context`);
  const c = await get.json();
  assert.match(
    get.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  const headers = {
    origin,
    "content-type": "application/json",
    "x-review-csrf": c.csrf,
  };
  const post = (path, a, extra = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: { ...headers, ...extra },
      body: JSON.stringify(a),
    });
  assert.equal(
    (await post("/api/feedback", {}, { origin: "https://evil.example" }))
      .status,
    403,
  );
  assert.equal(
    (await post("/api/feedback", {}, { "x-review-csrf": "wrong" })).status,
    403,
  );
  const hostileHost = await new Promise((resolve, reject) => {
    const req = request(
      origin + "/api/context",
      { headers: { Host: "evil.example" } },
      (r) => {
        r.resume();
        resolve(r.statusCode);
      },
    );
    req.on("error", reject);
    req.end();
  });
  assert.equal(hostileHost, 403);
  assert.equal(
    (await post("/api/tools/call", { name: "proposal.review", arguments: {} }))
      .status,
    400,
  );
  assert.equal((await post("/api/feedback", null)).status, 400);
  assert.equal(
    (await post("/api/feedback", { text: "x".repeat(9000) })).status,
    413,
  );
  const a = {
    page: c.source.page,
    component: c.source.component,
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const f = await (
    await post("/api/feedback", {
      ...a,
      text: "Clearer please",
      requestId: "f",
    })
  ).json();
  const q = await (
    await post("/api/tools/call", {
      name: "proposal.create",
      arguments: {
        ...a,
        feedbackId: f.id,
        replacement: "Measurable growth.",
        reason: "More direct",
        requestId: "p",
      },
    })
  ).json();
  assert.equal(q.status, "pending");
  assert.equal(
    (
      await post("/api/review", {
        id: q.id,
        digest: q.digest,
        decision: "approved",
        requestId: "r",
      })
    ).status,
    200,
  );
  assert.equal(
    (await post("/api/promote", { id: q.id, digest: q.digest, requestId: "m" }))
      .status,
    200,
  );
  const final = await (await fetch(origin + "/api/context")).json();
  assert.equal(final.source.version, 2);
  assert.equal(final.outbox.length, 1);
});
