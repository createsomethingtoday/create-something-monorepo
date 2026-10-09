import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";
import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = new URL("../../../", import.meta.url);
const bundle = await build({
  stdin: {
    contents: `export * from './hosted/identity';export * from './hosted/persistence';export * from './hosted/service';export * from './hosted/http';export * from './hosted/common';export * from './hosted/version';export * from './hosted/observation-reader';export * from './hosted/publisher';`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
    loader: "ts",
  },
  bundle: true,
  platform: "neutral",
  format: "esm",
  write: false,
  alias: {
    "@create-something/canon/auth/server": fileURLToPath(
      new URL("packages/canon/src/lib/auth/server.ts", root),
    ),
    "@create-something/auth-platform": fileURLToPath(
      new URL("packages/auth-platform/src/index.ts", root),
    ),
  },
});
const mod = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const issuer = "https://id.createsomething.space";
const roster = [
  "vanessa.ortiz@maverickx.com",
  "estefania.fernandez@maverickx.com",
  "rajat.sehgal@maverickenergy.com",
];
const target = {
  project: "synthetic-preview-isolated",
  origin: "https://preview.fixture.invalid",
  branch: "preview",
  contentBinding: "synthetic-preview-content",
};
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "collab-d1-"));
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("isolated");}}',
    compatibilityDate: "2026-07-08",
    d1Databases: ["DB"],
    d1Persist: dir,
  });
  const db = await mf.getD1Database("DB");
  await db.exec(
    readFileSync(
      new URL("../hosted/migrations/0001_collaboration.sql", import.meta.url),
      "utf8",
    )
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join(" "),
  );
  await db.exec(
    readFileSync(
      new URL("../hosted/migrations/0002_publications.sql", import.meta.url),
      "utf8",
    )
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join(" "),
  );
  t.after(async () => {
    await mf.dispose();
    rmSync(dir, { recursive: true, force: true });
  });
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const kid = randomUUID();
  let seconds = Math.floor(Date.now() / 1000);
  const verification = {
    issuer,
    audience: "client-workspace",
    jwksUrl: "https://jwks.fixture.invalid/" + kid,
    fetch: async () =>
      Response.json({
        keys: [
          {
            ...publicKey.export({ format: "jwk" }),
            kid,
            alg: "ES256",
            use: "sig",
          },
        ],
      }),
  };
  const identity = mod.membershipBoundary(db, verification, () => seconds);
  const token = (email = roster[0], sub = "subject-vanessa", claims = {}) => {
    const e = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const input =
      e({ alg: "ES256", kid }) +
      "." +
      e({
        iss: issuer,
        sub,
        email,
        email_verified: true,
        kind: "identity_access_token",
        session_version: 2,
        aud: ["client-workspace"],
        iat: seconds,
        exp: seconds + 900,
        ...claims,
      });
    return (
      input +
      "." +
      sign("sha256", Buffer.from(input), {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      }).toString("base64url")
    );
  };
  const request = (jwt = token()) =>
    new Request("https://workspace.fixture.invalid/api/collaboration", {
      headers: { authorization: "Bearer " + jwt },
    });
  const member = await identity.resolve(request(), "maverickx");
  let observation = {
    project: "maverickx",
    repository: "create-something-monorepo:maverick",
    path: "content/home.json",
    sourceCommit: "a".repeat(40),
    deploymentCommit: "a".repeat(40),
    deploymentId: "preview-0",
    sourceRaw: JSON.stringify({
      hero: { title: "Chemistry That Outperforms", subtitle: "Keep this" },
      other: "preserve",
    }),
    rawKV: JSON.stringify({
      hero: { title: "Chemistry That Outperforms", subtitle: "Keep this" },
      other: "preserve",
    }),
    target,
    observedAt: Date.now(),
  };
  const store = mod.persistence(db, identity.accepts, () => seconds);
  const options = {
    store,
    project: "maverickx",
    repository: observation.repository,
    target,
    readObservation: async () => structuredClone(observation),
  };
  const service = mod.collaborationService(options);
  const http = mod.httpBoundary({
    origin: "https://workspace.fixture.invalid",
    project: "maverickx",
    identity,
    service,
  });
  async function task() {
    const context = await service.query(member);
    const feedback = await service.feedback(member, {
      requestId: randomUUID(),
      versionHash: context.version.hash,
      text: "Clarify the chemistry outcome",
    });
    const task = await service.requestAgent(member, {
      requestId: randomUUID(),
      versionHash: context.version.hash,
      feedbackId: feedback.id,
    });
    return {
      task,
      agent: service.agentTools(member, task.id),
      version: context.version,
    };
  }
  return {
    db,
    mf,
    dir,
    identity,
    member,
    token,
    request,
    store,
    service,
    http,
    task,
    options,
    observation: () => observation,
    change: (o) => {
      observation = { ...observation, ...o };
    },
    advance: (n) => {
      seconds += n;
    },
  };
}
test("D1 exact approved roster binds verified subjects; email/domain spoofing, takeover, foreign project and revocation fail", async (t) => {
  const f = await fixture(t);
  for (const [i, email] of roster.entries()) {
    const p = await f.identity.resolve(
      f.request(f.token(email, i === 0 ? "subject-vanessa" : "subject-" + i)),
      "maverickx",
    );
    assert.equal(p.email, email);
    assert.equal(await f.identity.accepts(p), true);
  }
  for (const token of [
    f.token("someone@maverickx.com"),
    f.token("vanessa.ortiz@maverickenergy.com"),
    f.token(roster[0], "attacker"),
    f.token(roster[0], "subject-vanessa", { email_verified: false }),
    f.token(roster[0], "subject-vanessa", { aud: ["agency"] }),
    f.token(roster[0], "subject-vanessa", { exp: 0 }),
  ])
    await assert.rejects(() =>
      f.identity.resolve(f.request(token), "maverickx"),
    );
  await assert.rejects(() => f.identity.resolve(f.request(), "other-client"));
  assert.equal(await f.identity.accepts({ ...f.member }), false);
  await f.db
    .prepare(
      "UPDATE collaboration_members SET active=0,revision=revision+1 WHERE project=? AND email=?",
    )
    .bind("maverickx", roster[0])
    .run();
  await assert.rejects(
    () => f.service.query(f.member),
    /project_membership_required/,
  );
  const actual = await f.db
    .prepare("SELECT email FROM collaboration_members ORDER BY email")
    .all();
  assert.deepEqual(
    actual.results.map((x) => x.email),
    [...roster, "micah@createsomething.io"].sort(),
  );
});
test("bounded agent proposes once; human review produces durable exact preview job and verified Git/KV receipt", async (t) => {
  const f = await fixture(t);
  const { agent, version, task } = await f.task();
  assert.deepEqual(Object.keys(agent).sort(), ["propose", "readContext"]);
  const args = {
    requestId: "proposal-1",
    versionHash: version.hash,
    replacement: "Chemistry with measurable outcomes.",
    reason: "Clearer outcome",
  };
  const q = await agent.propose(args);
  assert.deepEqual(await agent.propose(args), q);
  await assert.rejects(
    () => agent.propose({ ...args, requestId: "second" }),
    /agent_task_unavailable/,
  );
  await assert.rejects(
    () => agent.propose({ ...args, replacement: "Different" }),
    /idempotency_conflict/,
  );
  const request = {
    requestId: "preview-1",
    id: q.id,
    digest: q.digest,
    targetHash: await mod.hash(target),
  };
  await assert.rejects(
    () => f.service.requestPreview(f.member, request),
    /review_required/,
  );
  await f.service.review(f.member, {
    requestId: "review-1",
    id: q.id,
    digest: q.digest,
    decision: "approved",
  });
  const job = await f.service.requestPreview(f.member, request);
  assert.equal(job.execution, "not-executed");
  assert.equal(JSON.parse(job.candidate.raw).other, "preserve");
  const reopened = mod.collaborationService({
    ...f.options,
    store: mod.persistence(f.db, f.identity.accepts),
  });
  assert.deepEqual(await reopened.requestPreview(f.member, request), job);
  await assert.rejects(
    () =>
      f.service.approveProduction(f.member, {
        requestId: "prod",
        jobId: job.id,
        evidenceHash: "claimed",
      }),
    /micah_production_approval_required/,
  );
  const observed = {
    ...f.observation(),
    sourceCommit: "b".repeat(40),
    deploymentCommit: "b".repeat(40),
    deploymentId: "preview-1",
    sourceRaw: job.candidate.raw,
    rawKV: job.candidate.raw,
    observedAt: Date.now(),
  };
  await assert.rejects(
    () =>
      f.service.recordPreview(
        f.member,
        { requestId: "bad", jobId: job.id },
        { ...observed, rawKV: f.observation().rawKV },
      ),
    /source_runtime_diverged/,
  );
  const receipt = await f.service.recordPreview(
    f.member,
    { requestId: "receipt", jobId: job.id },
    observed,
  );
  assert.equal(receipt.status, "verified");
  assert.equal(
    receipt.evidence.version.kvContentHash,
    job.candidate.contentHash,
  );
  const context = await f.service.query(f.member);
  assert.equal(context.jobs.filter((x) => x.kind === "preview").length, 1);
  assert.equal(context.jobs.find((x) => x.id === task.id).status, "proposed");
});
test("D1 CAS prevents lost updates and rechecks membership atomically at mutation commit", async (t) => {
  const f = await fixture(t);
  let arrivals = 0,
    release;
  const barrier = new Promise((r) => (release = r));
  const mutate = (id) =>
    f.store.mutate(f.member, "race", { requestId: id }, async (state) => {
      arrivals++;
      if (arrivals === 2) release();
      await barrier;
      const r = { id };
      state.feedback.push(r);
      return r;
    });
  const result = await Promise.allSettled([mutate("a"), mutate("b")]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await f.store.load(f.member)).state.feedback.length, 1);
  await assert.rejects(
    () =>
      f.store.mutate(f.member, "revoke", { requestId: "revoke" }, async (s) => {
        await f.db
          .prepare(
            "UPDATE collaboration_members SET active=0,revision=revision+1 WHERE project=? AND email=?",
          )
          .bind("maverickx", roster[0])
          .run();
        s.feedback.push({ id: "bad" });
        return { id: "bad" };
      }),
    /project_membership_required/,
  );
  const row = await f.db
    .prepare("SELECT state FROM collaboration_projects WHERE id=?")
    .bind("maverickx")
    .first();
  assert.equal(JSON.parse(row.state).feedback.length, 1);
});
test("Git, deployment-only, KV-only and target drift invalidate anchored proposals; task expiry and bounds enforced", async (t) => {
  const f = await fixture(t);
  const { agent, version } = await f.task();
  const a = {
    requestId: "p",
    versionHash: version.hash,
    replacement: "A clearer outcome.",
    reason: "clarity",
  };
  f.change({ deploymentId: "new-deployment" });
  await assert.rejects(() => agent.propose(a), /stale_version/);
  f.change({ deploymentId: "preview-0", rawKV: " " + f.observation().rawKV });
  await assert.rejects(() => agent.propose(a), /stale_version/);
  f.change({ rawKV: f.observation().sourceRaw, sourceCommit: "b".repeat(40) });
  await assert.rejects(() => agent.propose(a), /source_runtime_diverged/);
  f.change({
    sourceCommit: "a".repeat(40),
    target: { ...target, contentBinding: "production" },
  });
  await assert.rejects(() => agent.propose(a), /version_scope_mismatch/);
  f.change({ target });
  await assert.rejects(
    () => agent.propose({ ...a, replacement: "x".repeat(161) }),
    /invalid_text/,
  );
  f.advance(901);
  await assert.rejects(() => agent.propose(a), /project_membership_required/);
});
test("HTTP uses verified project membership, rejects cross-site writes and has no agent-approval or executor route", async (t) => {
  const f = await fixture(t);
  const base = "https://workspace.fixture.invalid";
  assert.equal(
    (await f.http.fetch(new Request(base + "/api/collaboration"))).status,
    401,
  );
  assert.equal((await f.http.fetch(f.request())).status, 200);
  const post = (path, args, origin = base) =>
    new Request(base + "/api/collaboration/" + path, {
      method: "POST",
      headers: {
        authorization: "Bearer " + f.token(),
        origin,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    });
  assert.equal(
    (await f.http.fetch(post("feedback", {}, "https://attacker.invalid")))
      .status,
    403,
  );
  for (const path of ["agent/proposal", "deploy", "membership", "__proto__"])
    assert.equal((await f.http.fetch(post(path, {}))).status, 404);
  assert.equal(
    (await f.http.fetch(post("feedback", { text: "x".repeat(17000) }))).status,
    413,
  );
  const v = (await f.service.query(f.member)).version;
  assert.equal(
    (
      await f.http.fetch(
        post("feedback", {
          requestId: "http",
          versionHash: v.hash,
          text: "Outcome",
          tenant: "other-client",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.http.fetch(
        post("feedback", {
          requestId: "http",
          versionHash: v.hash,
          text: "Outcome",
        }),
      )
    ).status,
    200,
  );
});
test("headline edit cannot overwrite divergent unreviewed runtime fields", async (t) => {
  const f = await fixture(t);
  const record = f.observation();
  const runtime = JSON.parse(record.rawKV);
  runtime.hero.subtitle = "New approved subtitle";
  runtime.featureEnabled = true;
  f.change({ rawKV: JSON.stringify(runtime) });
  await assert.rejects(
    () => f.service.query(f.member),
    /source_runtime_diverged/,
  );
});
test("fixed Git/Pages/KV read ports bind exact deployment commit and detect changes between reads", async () => {
  const deployed = {
    id: "deployment-1",
    commit: "a".repeat(40),
    branch: target.branch,
    project: target.project,
  };
  const raw = JSON.stringify({ hero: { title: "Chemistry" } });
  const reads = [];
  let drift = false,
    kvReads = 0;
  const read = mod.previewObservationReader({
    project: "maverickx",
    repository: "canonical",
    target,
    deployment: { read: async () => deployed },
    git: {
      readManifest: async (commit) => {
        reads.push(commit);
        return {
          commit,
          repository: "canonical",
          path: "content/home.json",
          raw,
        };
      },
    },
    kv: {
      get: async (key) => {
        assert.equal(key, "content:home");
        kvReads++;
        return drift && kvReads % 2 === 0 ? " " + raw : raw;
      },
    },
  });
  const observation = await read();
  assert.equal(observation.sourceCommit, deployed.commit);
  assert.deepEqual(reads, [deployed.commit]);
  drift = true;
  await assert.rejects(read, /observation_changed_retry/);
});
test("D1 state and idempotency survive workerd restart, while foreign project data is unchanged", async () => {
  const dir = mkdtempSync(join(tmpdir(), "collab-restart-"));
  let mf;
  const start = async () => {
    mf = new Miniflare({
      modules: true,
      script: 'export default {fetch(){return new Response("isolated")}}',
      compatibilityDate: "2026-07-08",
      d1Databases: ["DB"],
      d1Persist: dir,
    });
    return mf.getD1Database("DB");
  };
  try {
    let db = await start();
    await db.exec(
      readFileSync(
        new URL("../hosted/migrations/0001_collaboration.sql", import.meta.url),
        "utf8",
      )
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join(" "),
    );
    const p = {
      project: "maverickx",
      issuer,
      subject: "subject",
      email: roster[0],
      revision: 1,
      expiresAt: Math.floor(Date.now() / 1000) + 900,
    };
    await db
      .prepare(
        "UPDATE collaboration_members SET subject=?,revision=1 WHERE project=? AND email=?",
      )
      .bind(p.subject, p.project, p.email)
      .run();
    await db
      .prepare("INSERT INTO collaboration_projects(id,state) VALUES (?,?)")
      .bind("unrelated", '{"keep":"unchanged"}')
      .run();
    const store = mod.persistence(db, async (v) => v === p);
    const args = { requestId: "restart" };
    const result = await store.mutate(p, "example", args, async (s) => {
      const r = { id: "one" };
      s.feedback.push(r);
      return r;
    });
    await mf.dispose();
    db = await start();
    const reopened = mod.persistence(db, async (v) => v === p);
    assert.deepEqual(
      await reopened.mutate(p, "example", args, async () => {
        throw Error("must not repeat");
      }),
      result,
    );
    assert.equal(
      (
        await db
          .prepare("SELECT state FROM collaboration_projects WHERE id=?")
          .bind("unrelated")
          .first()
      ).state,
      '{"keep":"unchanged"}',
    );
  } finally {
    await mf?.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("actual MCP SDK round trip exposes only task context and one proposal tool, never approval", async (t) => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } =
    await import("@modelcontextprotocol/sdk/inMemory.js");
  const { hostedProposalMcp } = await import("../hosted/mcp.mjs");
  const f = await fixture(t);
  const { agent, version } = await f.task();
  const server = hostedProposalMcp(agent),
    client = new Client(
      { name: "synthetic-operator-client", version: "1.0.0" },
      { capabilities: {} },
    );
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(left);
  await client.connect(right);
  t.after(async () => {
    await client.close();
    await server.close();
  });
  assert.deepEqual(
    (await client.listTools()).tools.map((t) => t.name),
    ["proposal.create"],
  );
  const context = JSON.parse(
    (await client.readResource({ uri: "collaboration://workspace/context" }))
      .contents[0].text,
  );
  assert.equal(context.project, "maverickx");
  assert.equal(context.untrustedFeedback, true);
  const result = await client.callTool({
    name: "proposal.create",
    arguments: {
      requestId: "sdk",
      versionHash: version.hash,
      replacement: "Chemistry with measurable outcomes.",
      reason: "Clearer",
    },
  });
  assert.equal(JSON.parse(result.content[0].text).status, "proposed");
  assert.equal(
    (await client.callTool({ name: "proposal.approve", arguments: {} }))
      .isError,
    true,
  );
  assert.equal(
    (await client.callTool({ name: "deploy", arguments: {} })).isError,
    true,
  );
});
test(
  "team browser shows exact proposal and records human review/preview request with synthetic D1",
  {
    skip:
      process.platform !== "darwin" && !process.env.PILOT_BROWSER_EXECUTABLE,
  },
  async (t) => {
    const { createRequire } = await import("node:module");
    const require = createRequire(
      process.env.PILOT_DEPENDENCIES ||
        new URL("../../../package.json", import.meta.url),
    );
    const puppeteer = require("puppeteer-core");
    const f = await fixture(t);
    const { agent, version } = await f.task();
    await agent.propose({
      requestId: "browser-proposal",
      versionHash: version.hash,
      replacement: "Chemistry with measurable outcomes.",
      reason: "Clarity",
    });
    const expiredTask = await f.task();
    await f.db
      .prepare(
        "UPDATE collaboration_projects SET state=json_set(state,'$.jobs[1].expiresAt',0),revision=revision+1 WHERE id=?",
      )
      .bind("maverickx")
      .run();
    const browser = await puppeteer.launch({
      executablePath:
        process.env.PILOT_BROWSER_EXECUTABLE ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
      args: ["--no-sandbox"],
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setRequestInterception(true);
    const staticPaths = {
      "/collaboration/": ["../hosted/public/index.html", "text/html"],
      "/collaboration/app.js": ["../hosted/public/app.js", "text/javascript"],
      "/collaboration/style.css": ["../hosted/public/style.css", "text/css"],
      "/canon.css": [
        "../../../packages/canon/src/lib/styles/tokens.css",
        "text/css",
      ],
    };
    page.on("request", async (request) => {
      try {
        const path = new URL(request.url()).pathname;
        const asset = staticPaths[path];
        if (asset)
          return await request.respond({
            status: 200,
            contentType: asset[1],
            body: readFileSync(new URL(asset[0], import.meta.url)),
          });
        if (path.startsWith("/api/collaboration")) {
          const response = await f.http.fetch(
            new Request("https://workspace.fixture.invalid" + path, {
              method: request.method(),
              headers: {
                authorization: "Bearer " + f.token(),
                origin: "https://workspace.fixture.invalid",
                "content-type": "application/json",
              },
              ...(request.method() === "POST"
                ? { body: request.postData() }
                : {}),
            }),
          );
          return await request.respond({
            status: response.status,
            body: await response.text(),
          });
        }
        await request.respond({ status: 404, body: "" });
      } catch (e) {
        errors.push(e.message);
        await request.respond({ status: 500, body: "{}" });
      }
    });
    await page.setViewport({ width: 1200, height: 1000 });
    await page.goto("http://127.0.0.1:4329/collaboration/");
    await page.waitForFunction(() =>
      document
        .querySelector("#proposals")
        .textContent.includes("Chemistry with measurable outcomes."),
    );
    const click = (label) =>
      page.evaluate(
        (label) =>
          [...document.querySelectorAll("button")]
            .find((b) => b.textContent === label)
            .click(),
        label,
      );
    await click("Request a new agent proposal");
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].some(
          (b) => b.textContent === "Request a new agent proposal",
        ),
    );
    assert.equal(
      (await f.service.query(f.member)).jobs.filter(
        (j) =>
          j.kind === "agent-proposal" &&
          j.feedbackId === expiredTask.task.feedbackId,
      ).length,
      2,
    );
    await click("Approve this edit");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (b) => b.textContent === "Request preview",
      ),
    );
    await page.screenshot({
      path: new URL("../evidence/hosted-team-review.png", import.meta.url)
        .pathname,
      fullPage: true,
    });
    await click("Request preview");
    await page.waitForFunction(() =>
      document.querySelector("#jobs").textContent.includes("awaiting executor"),
    );
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: new URL("../evidence/hosted-team-mobile.png", import.meta.url)
        .pathname,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    const c = await f.service.query(f.member);
    assert.equal(c.proposals[0].status, "approved");
    assert.equal(
      c.jobs.find((j) => j.kind === "preview").execution,
      "not-executed",
    );
  },
);
async function publishingFixture(t) {
  const f = await fixture(t);
  const base = (await f.service.query(f.member)).version;
  const content = new Map(),
    results = new Map();
  let created = 0;
  let failAfterCreate = false,
    tamper = false,
    missing = false,
    revoke = false;
  const ports = {
    currentBase: async () => ({
      hash: base.hash,
      sourceCommit: base.sourceCommit,
    }),
    prepare: async (job, key) => {
      if (!results.has(job.id)) {
        created++;
        content.set(key, job.candidate.raw);
        results.set(job.id, {
          jobId: job.id,
          project: "maverickx",
          targetHash: job.targetHash,
          parentCommit: job.base.sourceCommit,
          commit: "b".repeat(40),
          manifestHash: job.candidate.contentHash,
          deploymentId: "immutable-" + job.id,
          deploymentCommit: "b".repeat(40),
          kvKey: key,
          kvContentHash: job.candidate.contentHash,
          ready: true,
        });
      }
      if (revoke)
        await f.db
          .prepare(
            "UPDATE collaboration_members SET active=0,revision=revision+1 WHERE email=?",
          )
          .bind(roster[0])
          .run();
      if (failAfterCreate) {
        failAfterCreate = false;
        throw Error("unknown_provider_outcome");
      }
    },
    inspect: async (job) => ({
      ...results.get(job.id),
      ...(tamper ? { parentCommit: "c".repeat(40) } : {}),
    }),
    readContent: async (key) => (missing ? null : content.get(key) || null),
  };
  const make = () =>
    mod.previewPublisher({ db: f.db, project: "maverickx", target, ports });
  const job = async () => {
    const { agent, version } = await f.task();
    const q = await agent.propose({
      requestId: randomUUID(),
      versionHash: version.hash,
      replacement: "Chemistry with measurable outcomes.",
      reason: "Clarity",
    });
    await f.service.review(f.member, {
      requestId: randomUUID(),
      id: q.id,
      digest: q.digest,
      decision: "approved",
    });
    return f.service.requestPreview(f.member, {
      requestId: randomUUID(),
      id: q.id,
      digest: q.digest,
      targetHash: await mod.hash(target),
    });
  };
  return {
    ...f,
    ports,
    make,
    job,
    created: () => created,
    fail: () => {
      failAfterCreate = true;
    },
    tamper: (v) => {
      tamper = v;
    },
    missing: (v) => {
      missing = v;
    },
    revoke: () => {
      revoke = true;
    },
  };
}
test("publisher recovers unknown provider outcome by job identity and verifies immutable provenance before visibility", async (t) => {
  const f = await publishingFixture(t);
  const job = await f.job();
  f.fail();
  await assert.rejects(() => f.make().run(job.id), /unknown_provider_outcome/);
  await assert.rejects(() => f.make().readPublished(), /preview_not_published/);
  const result = await f.make().run(job.id);
  assert.equal(result.visibility, "published");
  assert.equal(f.created(), 1);
  assert.deepEqual(await f.make().run(job.id), result);
  assert.equal(f.created(), 1);
  assert.equal(
    (await f.make().readPublished()).content.hero.title,
    "Chemistry with measurable outcomes.",
  );
  f.missing(true);
  await assert.rejects(
    () => f.make().readPublished(),
    /preview_content_unavailable/,
  );
});
test("publisher denies bad Git ancestry, stale base, missing immutable KV and revocation during preparation", async (t) => {
  const f = await publishingFixture(t);
  const job = await f.job();
  f.tamper(true);
  await assert.rejects(() => f.make().run(job.id), /executor_result_mismatch/);
  f.tamper(false);
  f.missing(true);
  await assert.rejects(
    () => f.make().run(job.id),
    /immutable_content_not_ready/,
  );
  f.missing(false);
  const base = f.ports.currentBase;
  f.ports.currentBase = async () => ({
    hash: "stale",
    sourceCommit: "c".repeat(40),
  });
  await assert.rejects(() => f.make().run(job.id), /stale_publication_base/);
  f.ports.currentBase = base;
  f.revoke();
  await assert.rejects(
    () => f.make().run(job.id),
    /publication_conflict_or_access_revoked/,
  );
  await assert.rejects(() => f.make().readPublished(), /preview_not_published/);
});
test("two competing approved previews have one atomic visible winner", async (t) => {
  const f = await publishingFixture(t);
  const first = await f.job(),
    second = await f.job();
  let arrived = 0,
    release;
  const barrier = new Promise((r) => (release = r));
  const prepare = f.ports.prepare;
  f.ports.prepare = async (...args) => {
    await prepare(...args);
    if (++arrived === 2) release();
    await barrier;
  };
  const outcomes = await Promise.allSettled([
    f.make().run(first.id),
    f.make().run(second.id),
  ]);
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  const row = await f.db
    .prepare("SELECT revision FROM collaboration_publications WHERE project=?")
    .bind("maverickx")
    .first();
  assert.equal(row.revision, 1);
  assert.equal((await f.make().readPublished()).publication.revision, 1);
  const loser = outcomes[0].status === "rejected" ? first : second;
  await assert.rejects(() => f.make().run(loser.id), /publication_conflict/);
});
test("publisher stable replay survives job reconciliation; sequential old-base jobs and pre-revoked actors cannot prepare", async (t) => {
  const f = await publishingFixture(t);
  const first = await f.job(),
    second = await f.job();
  const receipt = await f.make().run(first.id);
  const state = (await f.store.load(f.member)).state;
  const j = state.jobs.find((x) => x.id === first.id);
  j.status = "verified";
  j.execution = "operator-reported";
  j.evidence = { extra: "reconciled" };
  await f.db
    .prepare(
      "UPDATE collaboration_projects SET state=?,revision=revision+1 WHERE id=?",
    )
    .bind(JSON.stringify(state), "maverickx")
    .run();
  assert.deepEqual(await f.make().run(first.id), receipt);
  await assert.rejects(() => f.make().run(second.id), /stale_publication_base/);
  assert.equal(f.created(), 1);
  await f.db
    .prepare(
      "UPDATE collaboration_members SET active=0,revision=revision+1 WHERE email=?",
    )
    .bind(roster[0])
    .run();
  await assert.rejects(
    () => f.make().run(second.id),
    /publication_access_revoked/,
  );
  assert.equal(f.created(), 1);
});
