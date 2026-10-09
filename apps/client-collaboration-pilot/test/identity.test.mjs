import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { identityFixture } from "./identity-fixture.mjs";
import { start } from "../server.mjs";
import { openRuntime } from "../runtime.mjs";
import { principals } from "../store.mjs";

test("actual Canon verifier checks signature/issuer/audience/session; policy owns roles and revocation", async () => {
  const f = await identityFixture();
  const p = await f.boundary.resolve(f.request(f.token()));
  assert.equal(p.role, "reviewer");
  assert.equal(f.boundary.accepts({ ...p }), false);
  for (const overrides of [
    { iss: "https://foreign.invalid" },
    { aud: ["agency"] },
    { aud: ["client-workspace", "agency"] },
    { exp: 0 },
    { email_verified: false },
    { session_version: 1 },
    { kind: "other" },
    { iat: 9999999999 },
    { sub: "outsider" },
    { exp: Math.floor(Date.now() / 1000) + 10000 },
  ])
    assert.equal(await f.boundary.resolve(f.request(f.token(overrides))), null);
  const valid = f.token();
  const [h, payload, sig] = valid.split(".");
  const corrupt = Buffer.from(sig, "base64url");
  corrupt[0] ^= 1;
  assert.equal(
    await f.boundary.resolve(
      f.request(`${h}.${payload}.${corrupt.toString("base64url")}`),
    ),
    null,
  );
  assert.equal(
    await f.boundary.resolve(f.request(f.token({}, { alg: "none" }))),
    null,
  );
  assert.equal(await f.boundary.resolve(f.request(valid + ".extra")), null);
  const contributor = await f.boundary.resolve(
    f.request(
      f.token({
        sub: "contributor",
        role: "reviewer",
        tenant_id: "other-client",
      }),
    ),
  );
  assert.equal(contributor.role, "contributor");
  assert.equal(contributor.tenant, "maverickx");
  f.memberships.set("reviewer", { active: false, role: "reviewer" });
  assert.equal(f.boundary.accepts(p), false);
  f.memberships.set("reviewer", { active: true, role: "reviewer" });
  f.advance(901);
  assert.equal(f.boundary.accepts(p), false);
});

test("HTTP integration rejects claimed roles and permits only verified member approval", async (t) => {
  const f = await identityFixture();
  const home = mkdtempSync(join(tmpdir(), "collab-identity-"));
  const runtime = openRuntime(home);
  const c = runtime.store.context(principals.agent);
  const a = {
    page: "/",
    component: "hero.headline",
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const note = runtime.store.feedback(principals.agent, {
    ...a,
    text: "Clarify outcome",
    requestId: "f",
  });
  const q = runtime.store.propose(principals.agent, {
    ...a,
    feedbackId: note.id,
    replacement: "Chemistry with measurable outcomes.",
    reason: "Clearer",
    requestId: "p",
  });
  runtime.store.close();
  const server = start({
    port: 0,
    repositoryHome: home,
    reviewerBoundary: f.boundary,
    quiet: true,
  });
  await once(server, "listening");
  t.after(async () => {
    await new Promise((r) => server.close(r));
    rmSync(home, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const get = (token) =>
    fetch(origin + "/api/context", {
      headers: token
        ? { authorization: "Bearer " + token }
        : { "x-role": "reviewer", "x-tenant": "maverickx" },
    });
  assert.equal((await get()).status, 401);
  assert.equal((await get(f.token({ aud: ["agency"] }))).status, 401);
  const reviewerToken = f.token();
  const context = await (await get(reviewerToken)).json();
  assert.equal(context.tenant, "maverickx");
  assert.equal(JSON.stringify(context).includes(reviewerToken), false);
  const post = (token, path, args) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        origin,
        "content-type": "application/json",
        "x-review-csrf": context.csrf,
        "x-role": "reviewer",
      },
      body: JSON.stringify(args),
    });
  const args = {
    id: q.id,
    digest: q.digest,
    decision: "approved",
    requestId: "review",
  };
  assert.equal(
    (
      await post(
        f.token({ sub: "contributor", role: "reviewer" }),
        "/api/review",
        args,
      )
    ).status,
    403,
  );
  assert.equal((await post(reviewerToken, "/api/tools/call", {})).status, 403);
  assert.equal((await post(reviewerToken, "/api/review", args)).status, 200);
  f.memberships.set("reviewer", { active: false, role: "reviewer" });
  assert.equal(
    (
      await post(reviewerToken, "/api/promote", {
        id: q.id,
        digest: q.digest,
        requestId: "apply",
      })
    ).status,
    401,
  );
});
