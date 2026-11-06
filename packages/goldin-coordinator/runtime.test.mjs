import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import workerdPackage from "workerd";
import { spawnSync } from "node:child_process";
const compatibilityDate = readFileSync(
  new URL("./wrangler.jsonc", import.meta.url),
  "utf8",
).match(/"compatibility_date":\s*"(\d{4}-\d{2}-\d{2})"/)[1];
const runtimePath =
  process.env.MINIFLARE_WORKERD_PATH || workerdPackage.default;
const runtimeVersion = spawnSync(runtimePath, ["--version"], {
  encoding: "utf8",
});
const runtimeDate = runtimeVersion.stdout?.match(
  /workerd (\d{4}-\d{2}-\d{2})/,
)?.[1];
function requireTargetRuntime() {
  assert.equal(runtimeVersion.status, 0, "workerd must be executable");
  assert.ok(
    runtimeDate >= compatibilityDate,
    "workerd must support the configured compatibility date; no fallback permitted",
  );
}
process.env.MINIFLARE_WORKERD_PATH = runtimePath;
test(
  "runtime supports the exact deployment compatibility date",
  requireTargetRuntime,
);
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NotionAdapter } from "./notion.mjs";
import { POST as browserPOST } from "./dist/browser-route.mjs";
const fields = {
  source: "src",
  payment: "pay",
  production: "prod",
  delivery: "del",
  receipt: "receipt",
};
const mapping = { dataSourceId: "fixture-ds", fields };
// Ephemeral test-only signatures never authenticate to a real service. No keys are persisted.
async function identityFixture() {
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const pub = await crypto.subtle.exportKey("jwk", keys.publicKey);
  pub.kid = "test-only";
  pub.alg = "ES256";
  pub.use = "sig";
  return {
    jwks: { keys: [pub] },
    async token(overrides = {}) {
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub: "staff",
        email: "synthetic@example.test",
        tier: "agency",
        source: "io",
        kind: "identity_access_token",
        session_version: 2,
        email_verified: true,
        iss: "https://identity.example.test",
        aud: ["goldin-test"],
        iat: now,
        exp: now + 300,
        ...overrides,
      };
      const encode = (v) =>
        Buffer.from(JSON.stringify(v)).toString("base64url");
      const input =
        encode({ alg: "ES256", kid: pub.kid }) + "." + encode(claims);
      const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        keys.privateKey,
        new TextEncoder().encode(input),
      );
      return input + "." + Buffer.from(signature).toString("base64url");
    },
  };
}
function notionMock() {
  const pages = new Map();
  let next = 1,
    readFail = 0,
    writeMode = "",
    writes = 0;
  let queryPause;
  return {
    pages,
    pauseQuery() {
      let release, entered;
      const waiting = new Promise((resolve) => (release = resolve));
      const started = new Promise((resolve) => (entered = resolve));
      queryPause = { waiting, entered };
      return { release, started };
    },
    get writes() {
      return writes;
    },
    readFailure() {
      readFail = 1;
    },
    writeFailure(mode) {
      writeMode = mode;
    },
    async fetch(request) {
      const path = new URL(request.url).pathname;
      const body = request.method === "GET" ? null : await request.json();
      if (readFail && request.method === "GET") {
        readFail--;
        return Response.json({}, { status: 503 });
      }
      if (path === "/v1/data_sources/fixture-ds")
        return Response.json({
          id: "fixture-ds",
          properties: Object.fromEntries(
            Object.values(fields).map((id) => [id, { id, type: "rich_text" }]),
          ),
        });
      if (path.endsWith("/query")) {
        if (queryPause) {
          const pause = queryPause;
          queryPause = null;
          pause.entered();
          await pause.waiting;
        }
        const source = body.filter.rich_text.equals;
        return Response.json({
          results: [...pages.values()].filter(
            (p) =>
              Object.values(p.properties).find((x) => x.id === "src")
                ?.rich_text[0].text.content === source,
          ),
          has_more: false,
        });
      }
      if (path.startsWith("/v1/pages")) {
        writes++;
        if (writeMode === "reject") {
          writeMode = "";
          return Response.json({}, { status: 429 });
        }
        const id =
          path === "/v1/pages" ? `page-${next++}` : path.split("/").at(-1);
        const page = {
          id,
          parent: { data_source_id: "fixture-ds" },
          properties: {
            ...pages.get(id)?.properties,
            ...Object.fromEntries(
              Object.entries(body.properties).map(([key, value]) => [
                "Human label " + key,
                { ...value, id: key },
              ]),
            ),
          },
        };
        pages.set(id, page);
        if (writeMode === "timeout-after-commit") {
          writeMode = "";
          throw new Error("synthetic lost response");
        }
        return Response.json(page);
      }
      return Response.json({}, { status: 404 });
    },
  };
}
async function runtime(options = {}) {
  requireTargetRuntime();
  const identity = await identityFixture();
  const notion = notionMock();
  const dir = options.persist ?? mkdtempSync(join(tmpdir(), "goldin-workerd-"));
  const mf = new Miniflare({
    modules: true,
    script:
      readFileSync(new URL("./dist/worker.mjs", import.meta.url), "utf8") +
      (options.crashFixture
        ? '\nGoldinCoordinator.prototype.fixtureCrash = function(actor,id) { this.core.claim(actor,id); this.ctx.storage.sql.exec("UPDATE outbox SET next=0 WHERE tenant=? AND id=?",actor.tenant,id); };'
        : ""),
    compatibilityDate: compatibilityDate,
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    durableObjects: {
      COORDINATOR: { className: "GoldinCoordinator", useSQLite: true },
    },
    durableObjectsPersist: dir,
    bindings: {
      ENVIRONMENT: "local-test",
      PROJECTION_WRITES: "mock-only",
      IDENTITY_ISSUER: "https://identity.example.test",
      IDENTITY_JWKS_URL: "https://identity.example.test/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "goldin-test",
      OPERATOR_POLICY: JSON.stringify({
        staff: {
          tenant: "goldin",
          roles: ["operator", "pricing", "integration"],
        },
        reader: { tenant: "goldin", roles: ["operator"] },
        other: { tenant: "other", roles: ["operator", "pricing"] },
      }),
      NOTION_MAPPINGS: JSON.stringify({ goldin: mapping }),
      ...options.bindings,
    },
    outboundService: options.httpNotion
      ? (request) => notion.fetch(request)
      : options.publicJwks
        ? (request) => {
            assert.equal(
              request.url,
              "https://id.createsomething.space/.well-known/jwks.json",
            );
            return Response.json(identity.jwks);
          }
        : undefined,
    serviceBindings: {
      ...(options.publicJwks
        ? {}
        : { IDENTITY_KEYS: () => Response.json(identity.jwks) }),
      NOTION_MOCK: (r) => notion.fetch(r),
    },
  });
  const token = await identity.token();
  return {
    mf,
    identity,
    notion,
    dir,
    async call(command, auth = token, extra = {}) {
      return mf.dispatchFetch("https://pilot.example.test/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(auth ? { Authorization: "Bearer " + auth } : {}),
          ...extra,
        },
        body: JSON.stringify(command),
      });
    },
    async close() {
      await mf.dispose();
      if (!options.persist) rmSync(dir, { recursive: true, force: true });
    },
  };
}
const price = {
  version: "fixture-v1",
  currency: "USD",
  kind: "group",
  unit: 10000,
  deposit: 5000,
  min: 1,
  max: 7,
};
const input = (source = "s1", resource = "p1") => ({
  source,
  resource,
  priceVersion: "fixture-v1",
  count: 1,
  payer: "payer",
  participants: ["person-1"],
  start: new Date(Date.now() + 3600000).toISOString(),
  end: new Date(Date.now() + 7200000).toISOString(),
  holdMs: 60000,
});
async function ok(r) {
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
}
async function seed(r) {
  await ok(await r.call({ action: "price", price }));
  const i = input();
  await ok(await r.call({ action: "intake", input: i }));
  return i;
}
test("HTTP authentication, policy, tenant spoofing, request bounds and default-off writes", async () => {
  const r = await runtime();
  try {
    assert.equal(
      (await r.call({ action: "get", source: "s1" }, null)).status,
      401,
    );
    for (const changes of [
      { aud: ["wrong"] },
      { exp: 1 },
      { iss: "https://wrong.test" },
      { email_verified: false },
      { nbf: Math.floor(Date.now() / 1000) + 300 },
      { iat: Math.floor(Date.now() / 1000) - 2000 },
    ])
      assert.equal(
        (
          await r.call(
            { action: "get", source: "s1" },
            await r.identity.token(changes),
          )
        ).status,
        401,
      );
    assert.equal(
      (await r.call({ action: "get" }, "fake.token.signature")).status,
      401,
    );
    assert.equal(
      (
        await r.call(
          { action: "price", price },
          await r.identity.token({ sub: "reader" }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await r.call(
          { action: "get" },
          await r.identity.token({ sub: "unknown" }),
        )
      ).status,
      403,
    );
    assert.equal(
      (await r.call({ action: "intake", tenant: "other" })).status,
      400,
    );
    assert.equal(
      (
        await r.call({ action: "get" }, undefined, {
          Origin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await r.call({
          action: "intake",
          input: { padding: "x".repeat(70000) },
        })
      ).status,
      400,
    );
    await seed(r);
    assert.equal(
      (
        await r.call(
          { action: "get", source: "s1" },
          await r.identity.token({ sub: "other" }),
        )
      ).status,
      400,
    );
    const b = await ok(await r.call({ action: "get", source: "s1" }));
    assert.equal(b.booking.audit[0].operator, "staff");
  } finally {
    await r.close();
  }
  const disabled = await runtime({
    bindings: { ENVIRONMENT: "production", PROJECTION_WRITES: "mock-only" },
  });
  try {
    assert.equal((await disabled.call({ action: "price", price })).status, 503);
    assert.equal(
      (await disabled.call({ action: "drain", id: "irrelevant" })).status,
      503,
    );
    assert.equal(disabled.notion.writes, 0);
  } finally {
    await disabled.close();
  }
});
test("real Durable Object SQLite serializes racing holds, persists replay and atomic outbox", async () => {
  const r = await runtime();
  try {
    await ok(await r.call({ action: "price", price }));
    const i = input();
    const responses = await Promise.all([
      r.call({ action: "intake", input: i }),
      r.call({ action: "intake", input: { ...i, source: "s2" } }),
    ]);
    assert.deepEqual(responses.map((x) => x.status).sort(), [200, 400]);
    const winner = await responses.find((x) => x.status === 200).json();
    const same = { ...i, source: winner.source };
    await ok(await r.call({ action: "intake", input: same }));
    const outbox = await ok(await r.call({ action: "outbox" }));
    assert.equal(outbox.length, 1);
    const event = {
      id: "payment-1",
      type: "payment",
      revision: 1,
      paid: 10000,
      refunded: 0,
      disputed: false,
      reconciled: true,
      evidence: "fixture-provider",
    };
    const first = await ok(
      await r.call({ action: "event", source: winner.source, event }),
    );
    assert.deepEqual(
      await ok(await r.call({ action: "event", source: winner.source, event })),
      first,
    );
    assert.equal((await ok(await r.call({ action: "outbox" }))).length, 2);
    assert.equal(
      (
        await r.call({
          action: "event",
          source: winner.source,
          event: {
            id: "bad",
            type: "production",
            field: "rawVerified",
            value: true,
            evidence: "x",
          },
        })
      ).status,
      400,
    );
    assert.equal((await ok(await r.call({ action: "outbox" }))).length, 2);
  } finally {
    await r.close();
  }
});
test("mock Notion mapping, transient read failure, bounded retry and write receipts", async () => {
  const r = await runtime();
  try {
    await seed(r);
    assert.equal((await ok(await r.call({ action: "schema" }))).valid, true);
    let [item] = await ok(await r.call({ action: "outbox" }));
    r.notion.readFailure();
    let result = await ok(await r.call({ action: "drain", id: item.id }));
    assert.equal(result.status, "retry");
    assert.equal(r.notion.writes, 0);
    assert.equal((await r.call({ action: "drain", id: item.id })).status, 400);
    await new Promise((resolve) => setTimeout(resolve, 1050));
    result = await ok(await r.call({ action: "drain", id: item.id }));
    assert.equal(result.status, "done");
    assert.equal(result.receipt.mode, "mock-only");
    assert.equal(r.notion.pages.size, 1);
    assert.equal((await r.call({ action: "drain", id: item.id })).status, 400);
    assert.equal(r.notion.writes, 1);
  } finally {
    await r.close();
  }
});
test("unknown Notion write outcome stops retries and blocks newer projections", async () => {
  const r = await runtime();
  try {
    await seed(r);
    const [item] = await ok(await r.call({ action: "outbox" }));
    r.notion.writeFailure("timeout-after-commit");
    const result = await ok(await r.call({ action: "drain", id: item.id }));
    assert.equal(result.status, "uncertain");
    assert.equal(r.notion.pages.size, 1);
    assert.equal((await r.call({ action: "drain", id: item.id })).status, 400);
    await ok(
      await r.call({
        action: "event",
        source: "s1",
        event: { id: "reopen", type: "slot_reopened" },
      }),
    );
    const items = await ok(await r.call({ action: "outbox" }));
    assert.equal(
      (await r.call({ action: "drain", id: items[1].id })).status,
      400,
    );
    assert.equal(r.notion.writes, 1);
    const reconciled = await ok(
      await r.call({ action: "reconcile", id: item.id }),
    );
    assert.equal(reconciled.status, "done");
    assert.equal(reconciled.receipt.reconciled, true);
    await ok(await r.call({ action: "drain", id: items[1].id }));
    assert.equal(r.notion.pages.size, 1);
  } finally {
    await r.close();
  }
});
test("Notion schema contract rejects duplicate IDs, wrong types and production writes", async () => {
  const mock = notionMock();
  const transport = { fetch: (r) => mock.fetch(r) };
  const adapter = new NotionAdapter({ mapping, transport });
  await assert.rejects(() => adapter.project({}), /production/);
  await assert.rejects(
    () =>
      new NotionAdapter({
        mapping: { ...mapping, fields: { ...fields, payment: "src" } },
        transport,
      }).validate(),
    /unique/,
  );
  await assert.rejects(
    () =>
      new NotionAdapter({
        mapping,
        transport: {
          fetch: () =>
            Response.json({
              id: "fixture-ds",
              properties: { src: { id: "src", type: "number" } },
            }),
        },
      }).validate(),
    /rich_text/,
  );
  assert.equal(mock.writes, 0);
});

test("HTTP solo and group through review and mocked Notion projections preserve unrelated fields", async () => {
  const r = await runtime();
  try {
    await ok(await r.call({ action: "price", price }));
    await ok(
      await r.call({
        action: "price",
        price: { ...price, version: "solo-v1", kind: "solo", min: 1, max: 1 },
      }),
    );
    for (const count of [1, 3]) {
      const source = `end-to-end-${count}`;
      const i = {
        ...input(source, `photographer-${count}`),
        count,
        participants: Array.from(
          { length: count },
          (_, n) => `participant-${n}`,
        ),
        priceVersion: count === 1 ? "solo-v1" : "fixture-v1",
      };
      await ok(await r.call({ action: "intake", input: i }));
      const event = async (e) =>
        ok(await r.call({ action: "event", source, event: e }));
      await event({
        id: "pay",
        type: "payment",
        revision: 1,
        paid: 10000 * count,
        refunded: 0,
        disputed: false,
        reconciled: true,
        evidence: "synthetic-provider",
      });
      await event({ id: "confirm", type: "confirm" });
      const files = [
        { path: "card-1/0001.raw", bytes: 20, sha256: "a".repeat(64) },
      ];
      await event({
        id: "raw",
        type: "raw_manifest",
        expected: files,
        received: files,
        evidence: "synthetic-manifest",
      });
      await event({
        id: "docs",
        type: "production",
        field: "documents",
        value: true,
        evidence: "synthetic-docs",
      });
      await event({
        id: "gallery",
        type: "gallery_review",
        gallery: `gallery-${count}`,
        recipient: "payer",
        evidence: "synthetic-QA",
      });
      const reviewed = await event({
        id: "release",
        type: "release_review",
        gallery: `gallery-${count}`,
        recipient: "payer",
        approval: "synthetic-approval",
      });
      assert.equal(reviewed.delivery, "reviewed_no_send");
      assert.deepEqual(reviewed.externalEffects, []);
      const items = await ok(await r.call({ action: "outbox" }));
      for (const item of items.filter((x) => x.source === source)) {
        const projected = await ok(
          await r.call({ action: "drain", id: item.id }),
        );
        assert.equal(projected.status, "done");
        const page = r.notion.pages.get(projected.receipt.pageId);
        page.properties["Keep existing"] = {
          id: "unrelated",
          type: "rich_text",
          rich_text: [{ text: { content: "preserve" } }],
        };
      }
    }
    assert.equal(r.notion.pages.size, 2);
    for (const page of r.notion.pages.values()) {
      assert.equal(
        page.properties["Human label del"].rich_text[0].text.content,
        "reviewed_no_send",
      );
      assert.equal(
        page.properties["Keep existing"].rich_text[0].text.content,
        "preserve",
      );
    }
  } finally {
    await r.close();
  }
});

test("Durable Object storage survives runtime restart without duplicate outbox", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-restart-"));
  let r;
  try {
    r = await runtime({ persist: dir });
    const i = await seed(r);
    await r.close();
    r = await runtime({ persist: dir });
    await ok(await r.call({ action: "intake", input: i }));
    assert.equal((await ok(await r.call({ action: "outbox" }))).length, 1);
    assert.equal(
      (await ok(await r.call({ action: "get", source: "s1" }))).booking.source,
      "s1",
    );
  } finally {
    await r?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Notion receipt alone cannot reconcile corrupt mapped fields", async () => {
  const mock = notionMock();
  const adapter = new NotionAdapter({
    mapping,
    transport: { fetch: (r) => mock.fetch(r) },
    mode: "mock-only",
  });
  const item = {
    id: "projection",
    source: "source",
    body: {
      source: "source",
      payment: { paid: 100 },
      production: { documents: true },
      delivery: "blocked",
    },
  };
  const receipt = await adapter.project(item);
  const page = mock.pages.get(receipt.pageId);
  page.properties["Human label pay"].rich_text = [
    { text: { content: "CORRUPT" } },
  ];
  await assert.rejects(() => adapter.reconcile(item), /unresolved/);
  const repaired = await adapter.project(item);
  assert.equal(repaired.reconciled, false);
  assert.equal(mock.pages.size, 1);
  assert.equal((await adapter.reconcile(item)).reconciled, true);
});

test("new synthetic deployment denies access before identity configuration", async () => {
  const r = await runtime({
    bindings: {
      ENVIRONMENT: "synthetic",
      PROJECTION_WRITES: "disabled",
      OPERATOR_POLICY: "{}",
      IDENTITY_ISSUER: "",
      IDENTITY_AUDIENCE: "",
      IDENTITY_JWKS_URL: "",
    },
  });
  try {
    const result = await r.call({ action: "intake", input: input() });
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error, "identity unconfigured");
    assert.equal(r.notion.writes, 0);
  } finally {
    await r.close();
  }
});

test("temporary synthetic access admits only Micah and expires at a hard 30-minute maximum", async () => {
  const subject = "synthetic-test-only-operator";
  const base = {
    ENVIRONMENT: "synthetic",
    PROJECTION_WRITES: "disabled",
    IDENTITY_ISSUER: "https://id.createsomething.space",
    IDENTITY_JWKS_URL: "https://id.createsomething.space/.well-known/jwks.json",
    IDENTITY_AUDIENCE: "ona-agents",
    SYNTHETIC_TEST_STARTED_AT: new Date(Date.now() - 1000).toISOString(),
    SYNTHETIC_TEST_EXPIRES_AT: new Date(Date.now() + 60000).toISOString(),
    OPERATOR_POLICY: JSON.stringify({
      [subject]: {
        tenant: "goldin-synthetic-20261022",
        roles: ["operator", "pricing", "integration"],
      },
    }),
  };
  const r = await runtime({ bindings: base });
  try {
    const token = await r.identity.token({
      sub: subject,
      email: "synthetic.operator@example.test",
      iss: base.IDENTITY_ISSUER,
      aud: ["ona-agents"],
    });
    await ok(await r.call({ action: "price", price }, token));
    const other = await r.identity.token({
      iss: base.IDENTITY_ISSUER,
      aud: ["ona-agents"],
    });
    assert.equal((await r.call({ action: "outbox" }, other)).status, 403);
    const wrongEmail = await r.identity.token({
      sub: subject,
      email: "other@example.test",
      iss: base.IDENTITY_ISSUER,
      aud: ["ona-agents"],
    });
    assert.equal((await r.call({ action: "outbox" }, wrongEmail)).status, 403);
    assert.equal(r.notion.writes, 0);
  } finally {
    await r.close();
  }
  for (const overrides of [
    { SYNTHETIC_TEST_EXPIRES_AT: new Date(Date.now() - 1).toISOString() },
    { SYNTHETIC_TEST_STARTED_AT: new Date(Date.now() + 30000).toISOString() },
    { SYNTHETIC_TEST_STARTED_AT: new Date(Date.now() - 3600000).toISOString() },
    { SYNTHETIC_TEST_EXPIRES_AT: "bad" },
  ]) {
    const x = await runtime({ bindings: { ...base, ...overrides } });
    try {
      const token = await x.identity.token({
        sub: subject,
        email: "synthetic.operator@example.test",
        iss: base.IDENTITY_ISSUER,
        aud: ["ona-agents"],
      });
      assert.equal((await x.call({ action: "outbox" }, token)).status, 403);
      assert.equal(x.notion.writes, 0);
    } finally {
      await x.close();
    }
  }
});

test("actual SvelteKit route: cookie identity to bearer-only transactional Worker, CSRF and expiry", async () => {
  const { SYNTHETIC_SUBJECT } = await import("./synthetic-access.mjs");
  const start = new Date(Date.now() - 1000).toISOString();
  const end = new Date(Date.now() + 60000).toISOString();
  const policy = JSON.stringify({
    [SYNTHETIC_SUBJECT]: {
      tenant: "goldin-synthetic-20261022",
      roles: ["operator", "pricing", "integration"],
    },
  });
  const r = await runtime({
    bindings: {
      ENVIRONMENT: "synthetic",
      PROJECTION_WRITES: "disabled",
      IDENTITY_ISSUER: "https://id.createsomething.space",
      IDENTITY_JWKS_URL:
        "https://id.createsomething.space/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "ona-agents",
      OPERATOR_POLICY: policy,
      SYNTHETIC_TEST_STARTED_AT: start,
      SYNTHETIC_TEST_EXPIRES_AT: end,
    },
  });
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (url === "https://id.createsomething.space/.well-known/jwks.json")
      return Response.json(r.identity.jwks);
    assert.equal(
      url,
      "https://goldin-coordinator-synthetic-20261022.createsomething.workers.dev/",
    );
    assert.equal(init.redirect, "manual");
    assert.equal(init.headers.Cookie, undefined);
    assert.equal(init.headers.Origin, undefined);
    upstreamCalls++;
    return r.mf.dispatchFetch(url, init);
  };
  let identityReads = 0;
  const env = {
    GOLDIN_SYNTHETIC_ENABLED: "true",
    GOLDIN_SYNTHETIC_STARTED_AT: start,
    GOLDIN_SYNTHETIC_EXPIRES_AT: end,
  };
  const valid = {
    sub: SYNTHETIC_SUBJECT,
    email: "synthetic.operator@example.test",
    aud: ["ona-agents"],
    iss: "https://id.createsomething.space",
  };
  const token = await r.identity.token(valid);
  async function call({
    auth = token,
    headers = {},
    config = env,
    command = { action: "outbox" },
    url = "https://ona-agent-chat.pages.dev/api/goldin",
  } = {}) {
    return browserPOST({
      request: new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://ona-agent-chat.pages.dev",
          "Sec-Fetch-Site": "same-origin",
          ...headers,
        },
        body: JSON.stringify(command),
      }),
      cookies: {
        get: (name) => (name === "cs_access_token" ? auth : undefined),
      },
      fetch: async (url) => {
        assert.equal(
          url,
          "https://id.createsomething.space/.well-known/jwks.json",
        );
        identityReads++;
        return Response.json(r.identity.jwks);
      },
      platform: { env: config },
    });
  }
  try {
    const result = await call();
    assert.equal(result.status, 200);
    assert.ok(
      identityReads > 0,
      "use the established SvelteKit request fetch for public identity verification",
    );
    assert.equal(result.headers.get("set-cookie"), null);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.ok(!(await result.text()).includes(token));
    await ok(await call({ command: { action: "price", price } }));
    const intake = input("route-synthetic-booking");
    const first = await ok(
      await call({ command: { action: "intake", input: intake } }),
    );
    assert.deepEqual(
      await ok(await call({ command: { action: "intake", input: intake } })),
      first,
    );
    assert.equal(
      (
        await call({
          command: {
            action: "intake",
            input: { ...intake, source: "route-conflict" },
          },
        })
      ).status,
      400,
    );
    for (const claims of [
      { sub: "intruder" },
      { email: "wrong@example.test" },
      { aud: ["other"] },
      { iss: "https://wrong.example.test" },
      { exp: Math.floor(Date.now() / 1000) - 1 },
    ])
      assert.ok(
        [401, 403].includes(
          (
            await call({
              auth: await r.identity.token({ ...valid, ...claims }),
            })
          ).status,
        ),
      );
    const missing = await call({ auth: "" });
    assert.equal(missing.status, 401);
    assert.equal(missing.headers.get("X-Goldin-Auth-Check"), "credential");
    const longLife = await call({
      auth: await r.identity.token({
        ...valid,
        exp: Math.floor(Date.now() / 1000) + 1800,
      }),
    });
    assert.equal(longLife.status, 401);
    assert.equal(longLife.headers.get("X-Goldin-Auth-Check"), "lifetime");
    const count = upstreamCalls;
    assert.equal(
      (await call({ headers: { Origin: "https://evil.example.test" } })).status,
      403,
    );
    assert.equal(
      (await call({ headers: { "Sec-Fetch-Site": "cross-site" } })).status,
      403,
    );
    assert.equal(
      (await call({ headers: { Authorization: "Bearer ignored" } })).status,
      403,
    );
    assert.equal((await call({ headers: { Origin: "" } })).status, 403);
    assert.equal(
      (await call({ url: "https://preview.example.test/api/goldin" })).status,
      403,
    );
    assert.equal((await call({ config: {} })).status, 503);
    assert.equal(
      (await call({ config: { ...env, GOLDIN_SYNTHETIC_EXPIRES_AT: start } }))
        .status,
      403,
    );
    assert.equal(upstreamCalls, count);
    assert.equal(
      (await call({ command: { action: "outbox", tenant: "other" } })).status,
      400,
    );
    const before = upstreamCalls;
    let attempts = 0;
    let mode = "network";
    globalThis.fetch = async (url) => {
      if (url === "https://id.createsomething.space/.well-known/jwks.json")
        return Response.json(r.identity.jwks);
      attempts++;
      if (mode === "network")
        throw new Error("lost response after possible commit");
      if (mode === "oversize") return new Response("x".repeat(262145));
      return new Response(
        JSON.stringify({ token }).replaceAll(".", "\\u002e"),
        { headers: { "Set-Cookie": "must-not-pass=true" } },
      );
    };
    for (mode of ["network", "oversize", "echo-token"]) {
      const failed = await call();
      assert.equal(failed.status, 502);
      assert.ok(!(await failed.text()).includes(token));
      assert.equal(failed.headers.get("set-cookie"), null);
    }
    assert.equal(attempts, 3, "never retry unknown write outcomes");
    assert.equal(upstreamCalls, before);
    assert.equal(r.notion.writes, 0);
  } finally {
    globalThis.fetch = originalFetch;
    await r.close();
  }
});

test("generated Cloudflare Pages artifact reaches the coordinator through real Worker fetch", async () => {
  const { build } = await import("esbuild");
  await build({
    entryPoints: [
      new URL(
        "../ona-agents/.svelte-kit/cloudflare/_worker.js",
        import.meta.url,
      ).pathname,
    ],
    outfile: new URL("./dist/pages-artifact.mjs", import.meta.url).pathname,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["cloudflare:*", "node:*"],
  });
  const { SYNTHETIC_SUBJECT } = await import("./synthetic-access.mjs");
  const start = new Date(Date.now() - 1000).toISOString(),
    end = new Date(Date.now() + 60000).toISOString();
  const r = await runtime({
    publicJwks: true,
    bindings: {
      ENVIRONMENT: "synthetic",
      PROJECTION_WRITES: "disabled",
      IDENTITY_ISSUER: "https://id.createsomething.space",
      IDENTITY_JWKS_URL:
        "https://id.createsomething.space/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "ona-agents",
      OPERATOR_POLICY: JSON.stringify({
        [SYNTHETIC_SUBJECT]: {
          tenant: "goldin-synthetic-20261022",
          roles: ["operator", "pricing", "integration"],
        },
      }),
      SYNTHETIC_TEST_STARTED_AT: start,
      SYNTHETIC_TEST_EXPIRES_AT: end,
    },
  });
  const token = await r.identity.token({
    sub: SYNTHETIC_SUBJECT,
    email: "synthetic.operator@example.test",
    aud: ["ona-agents"],
    iss: "https://id.createsomething.space",
  });
  try {
    for (const scenario of [
      "success",
      "coordinator-redirect",
      "identity-redirect",
    ]) {
      let forwards = 0;
      const seen = [];
      const app = new Miniflare({
        modules: [
          {
            type: "ESModule",
            path: "pages.mjs",
            contents: readFileSync(
              new URL("./dist/pages-artifact.mjs", import.meta.url),
              "utf8",
            ),
          },
        ],
        compatibilityDate: "2024-12-01",
        compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
        bindings: {
          ENVIRONMENT: "production",
          GOLDIN_SYNTHETIC_ENABLED: "true",
          GOLDIN_SYNTHETIC_STARTED_AT: start,
          GOLDIN_SYNTHETIC_EXPIRES_AT: end,
        },
        serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) },
        outboundService: async (req) => {
          const u = new URL(req.url);
          seen.push(u.href);
          if (
            u.href === "https://id.createsomething.space/.well-known/jwks.json"
          ) {
            assert.equal(req.headers.get("Cookie"), null);
            assert.equal(req.headers.get("Authorization"), null);
            return scenario === "identity-redirect"
              ? new Response(null, {
                  status: 302,
                  headers: { Location: "https://unexpected.example.test/keys" },
                })
              : Response.json(r.identity.jwks);
          }
          assert.equal(
            u.href,
            "https://goldin-coordinator-synthetic-20261022.createsomething.workers.dev/",
          );
          forwards++;
          assert.equal(req.headers.get("Cookie"), null);
          assert.equal(req.headers.get("Origin"), null);
          if (scenario === "coordinator-redirect")
            return new Response(null, {
              status: 307,
              headers: { Location: "https://unexpected.example.test/mutation" },
            });
          return r.mf.dispatchFetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: await req.arrayBuffer(),
          });
        },
      });
      try {
        const call = (command, accessToken = token, headerOverrides = {}) =>
          app.dispatchFetch("https://ona-agent-chat.pages.dev/api/goldin", {
            method: "POST",
            headers: {
              Cookie: "cs_access_token=" + accessToken,
              Origin: "https://ona-agent-chat.pages.dev",
              "Sec-Fetch-Site": "same-origin",
              "Content-Type": "application/json",
              ...headerOverrides,
            },
            body: JSON.stringify(command),
          });
        const response = await call({ action: "outbox" });
        assert.equal(
          response.status,
          {
            success: 200,
            "coordinator-redirect": 502,
            "identity-redirect": 401,
          }[scenario],
          JSON.stringify({
            scenario,
            body: await response.clone().text(),
            forwards,
          }),
        );
        if (scenario === "success") {
          assert.equal(
            response.headers.get("X-Goldin-Boundary"),
            "coordinator",
          );
          const beforeNegatives = forwards;
          for (const claims of [
            { aud: ["wrong"] },
            { exp: Math.floor(Date.now() / 1000) - 1 },
          ]) {
            const invalid = await r.identity.token({
              sub: SYNTHETIC_SUBJECT,
              email: "synthetic.operator@example.test",
              aud: ["ona-agents"],
              iss: "https://id.createsomething.space",
              ...claims,
            });
            assert.equal(
              (await call({ action: "outbox" }, invalid)).status,
              401,
            );
          }
          const outsider = await r.identity.token({
            sub: "other",
            email: "other@example.test",
            aud: ["ona-agents"],
            iss: "https://id.createsomething.space",
          });
          assert.equal(
            (await call({ action: "outbox" }, outsider)).status,
            403,
          );
          assert.equal(
            (
              await call({ action: "outbox" }, token, {
                Origin: "https://unexpected.example.test",
              })
            ).status,
            403,
          );
          assert.equal(
            forwards,
            beforeNegatives,
            "identity/CSRF failures cannot reach coordinator",
          );
          await ok(await call({ action: "price", price }));
          const intake = input("artifact-synthetic");
          const first = await ok(
            await call({ action: "intake", input: intake }),
          );
          assert.deepEqual(
            await ok(await call({ action: "intake", input: intake })),
            first,
          );
          assert.equal(
            (await call({ action: "outbox", tenant: "other" })).status,
            400,
          );
        } else assert.equal(forwards, scenario === "identity-redirect" ? 0 : 1);
        assert.ok(
          !seen.some((url) =>
            url.startsWith("https://unexpected.example.test"),
          ),
          "no redirected request, especially no bearer forwarding",
        );
        assert.equal(response.headers.get("Location"), null);
        assert.equal(response.headers.get("Set-Cookie"), null);
      } finally {
        await app.dispose();
      }
    }
  } finally {
    await r.close();
  }
});

test("isolated generated Pages artifact reaches the coordinator through real Worker fetch", async () => {
  const { build } = await import("esbuild");
  await build({
    entryPoints: [
      new URL(
        "./isolated-app/.svelte-kit/cloudflare/_worker.js",
        import.meta.url,
      ).pathname,
    ],
    outfile: new URL("./dist/isolated-artifact.mjs", import.meta.url).pathname,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["cloudflare:*", "node:*"],
  });
  const { SYNTHETIC_SUBJECT } = await import("./synthetic-access.mjs");
  const start = new Date(Date.now() - 1000).toISOString(),
    end = new Date(Date.now() + 60000).toISOString();
  const r = await runtime({
    publicJwks: true,
    bindings: {
      ENVIRONMENT: "synthetic",
      PROJECTION_WRITES: "disabled",
      IDENTITY_ISSUER: "https://id.createsomething.space",
      IDENTITY_JWKS_URL:
        "https://id.createsomething.space/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "ona-agents",
      OPERATOR_POLICY: JSON.stringify({
        [SYNTHETIC_SUBJECT]: {
          tenant: "goldin-synthetic-20261022",
          roles: ["operator", "pricing", "integration"],
        },
      }),
      SYNTHETIC_TEST_STARTED_AT: start,
      SYNTHETIC_TEST_EXPIRES_AT: end,
    },
  });
  const token = await r.identity.token({
    sub: SYNTHETIC_SUBJECT,
    email: "synthetic.operator@example.test",
    aud: ["ona-agents"],
    iss: "https://id.createsomething.space",
  });
  try {
    for (const scenario of [
      "success",
      "coordinator-redirect",
      "identity-redirect",
    ]) {
      let forwards = 0;
      const seen = [];
      const app = new Miniflare({
        modules: [
          {
            type: "ESModule",
            path: "pages.mjs",
            contents: readFileSync(
              new URL("./dist/isolated-artifact.mjs", import.meta.url),
              "utf8",
            ),
          },
        ],
        compatibilityDate: "2026-10-22",
        compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
        bindings: {
          ENVIRONMENT: "production",
          GOLDIN_SYNTHETIC_ENABLED: "true",
          GOLDIN_LOGIN_ENABLED: "true",
          GOLDIN_SYNTHETIC_STARTED_AT: start,
          GOLDIN_SYNTHETIC_EXPIRES_AT: end,
        },
        serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) },
        outboundService: async (req) => {
          const u = new URL(req.url);
          seen.push(u.href);
          if (u.href === "https://id.createsomething.space/v1/auth/login") {
            const credentials = await req.json();
            assert.equal(credentials.audience, "ona-agents");
            assert.equal(credentials.email, "synthetic.operator@example.test");
            return Response.json({
              access_token: token,
              refresh_token: "local-fixture-refresh",
              expires_in: 900,
              user: { email: credentials.email },
            });
          }
          if (
            u.href === "https://id.createsomething.space/.well-known/jwks.json"
          ) {
            assert.equal(req.headers.get("Cookie"), null);
            assert.equal(req.headers.get("Authorization"), null);
            return scenario === "identity-redirect"
              ? new Response(null, {
                  status: 302,
                  headers: { Location: "https://unexpected.example.test/keys" },
                })
              : Response.json(r.identity.jwks);
          }
          assert.equal(
            u.href,
            "https://goldin-coordinator-synthetic-20261022.createsomething.workers.dev/",
          );
          forwards++;
          assert.equal(req.headers.get("Cookie"), null);
          assert.equal(req.headers.get("Origin"), null);
          if (scenario === "coordinator-redirect")
            return new Response(null, {
              status: 307,
              headers: { Location: "https://unexpected.example.test/mutation" },
            });
          return r.mf.dispatchFetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: await req.arrayBuffer(),
          });
        },
      });
      try {
        const call = (command, accessToken = token, headerOverrides = {}) =>
          app.dispatchFetch(
            "https://goldin-coordination-test.pages.dev/api/goldin",
            {
              method: "POST",
              headers: {
                Cookie: "cs_access_token=" + accessToken,
                Origin: "https://goldin-coordination-test.pages.dev",
                "Sec-Fetch-Site": "same-origin",
                "Content-Type": "application/json",
                ...headerOverrides,
              },
              body: JSON.stringify(command),
            },
          );
        if (scenario === "success") {
          const signIn = (
            email,
            origin = "https://goldin-coordination-test.pages.dev",
          ) =>
            app.dispatchFetch(
              "https://goldin-coordination-test.pages.dev/api/auth/login",
              {
                method: "POST",
                headers: {
                  Origin: origin,
                  "Sec-Fetch-Site": "same-origin",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password: "local-test-fixture" }),
              },
            );
          assert.equal((await signIn("other@example.test")).status, 403);
          assert.equal(
            (
              await signIn(
                "synthetic.operator@example.test",
                "https://ona-agent-chat.pages.dev",
              )
            ).status,
            403,
          );
          const login = await signIn("synthetic.operator@example.test");
          assert.equal(login.status, 200);
          const cookie = login.headers.get("Set-Cookie");
          assert.match(cookie, /HttpOnly/i);
          assert.match(cookie, /Secure/i);
          assert.match(cookie, /SameSite=Lax/i);
          assert.doesNotMatch(cookie, /Domain=/i);
        }
        const response = await call({ action: "outbox" });
        assert.equal(
          response.status,
          {
            success: 200,
            "coordinator-redirect": 502,
            "identity-redirect": 401,
          }[scenario],
          JSON.stringify({
            scenario,
            body: await response.clone().text(),
            forwards,
          }),
        );
        if (scenario === "success") {
          assert.equal(
            response.headers.get("X-Goldin-Boundary"),
            "coordinator",
          );
          const beforeNegatives = forwards;
          for (const claims of [
            { aud: ["wrong"] },
            { exp: Math.floor(Date.now() / 1000) - 1 },
          ]) {
            const invalid = await r.identity.token({
              sub: SYNTHETIC_SUBJECT,
              email: "synthetic.operator@example.test",
              aud: ["ona-agents"],
              iss: "https://id.createsomething.space",
              ...claims,
            });
            assert.equal(
              (await call({ action: "outbox" }, invalid)).status,
              401,
            );
          }
          const outsider = await r.identity.token({
            sub: "other",
            email: "other@example.test",
            aud: ["ona-agents"],
            iss: "https://id.createsomething.space",
          });
          assert.equal(
            (await call({ action: "outbox" }, outsider)).status,
            403,
          );
          assert.equal(
            (
              await call({ action: "outbox" }, token, {
                Origin: "https://unexpected.example.test",
              })
            ).status,
            403,
          );
          assert.equal(
            forwards,
            beforeNegatives,
            "identity/CSRF failures cannot reach coordinator",
          );
          await ok(await call({ action: "price", price }));
          const intake = input("artifact-synthetic");
          const first = await ok(
            await call({ action: "intake", input: intake }),
          );
          assert.deepEqual(
            await ok(await call({ action: "intake", input: intake })),
            first,
          );
          assert.equal(
            (await call({ action: "outbox", tenant: "other" })).status,
            400,
          );
        } else assert.equal(forwards, scenario === "identity-redirect" ? 0 : 1);
        assert.ok(
          !seen.some((url) =>
            url.startsWith("https://unexpected.example.test"),
          ),
          "no redirected request, especially no bearer forwarding",
        );
        assert.equal(response.headers.get("Location"), null);
        assert.equal(response.headers.get("Set-Cookie"), null);
      } finally {
        await app.dispose();
      }
    }
  } finally {
    await r.close();
  }
});

test("supervised intake uses authenticated operator and actual transactional storage", async () => {
  const r = await runtime();
  try {
    await ok(await r.call({ action: "price", price }));
    const booking = input();
    delete booking.source;
    const observation = {
      version: 1,
      tenant: "goldin",
      reviewedBy: "staff",
      provider: "pixieset-supervised",
      accountId: "fixture-account",
      bookingId: "fixture-booking",
      evidence: "fixture-staff-observation",
      observedAt: new Date().toISOString(),
      booking,
    };
    const first = await ok(
      await r.call({ action: "reviewed-intake", input: observation }),
    );
    assert.equal(first.provenance.reviewedBy, "staff");
    assert.equal(first.delivery, "blocked");
    const second = await ok(
      await r.call({
        action: "reviewed-intake",
        input: {
          ...observation,
          booking: Object.fromEntries(Object.entries(booking).reverse()),
        },
      }),
    );
    assert.equal(second.source, first.source);
    assert.equal((await ok(await r.call({ action: "outbox" }))).length, 1);
    assert.equal(
      (
        await r.call({
          action: "reviewed-intake",
          input: { ...observation, reviewedBy: "other" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await r.call({
          action: "reviewed-intake",
          input: { ...observation, tenant: "other" },
        })
      ).status,
      400,
    );
  } finally {
    await r.close();
  }
});

async function eventually(fn, expected) {
  for (let n = 0; n < 60; n++) {
    const value = await fn();
    if (value === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(await fn(), expected);
}
test("automatic DO alarms retry transient failure, survive restart, and stop without duplicates", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-alarm-"));
  let r;
  try {
    r = await runtime({ persist: dir });
    await seed(r);
    r.notion.readFailure();
    assert.equal(
      (await ok(await r.call({ action: "dispatch_start" }))).status,
      "armed",
    );
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[0].status,
      "done",
    );
    const [done] = await ok(await r.call({ action: "outbox" }));
    assert.equal(done.attempts, 2);
    assert.equal(r.notion.writes, 1);
    await r.close();
    r = await runtime({ persist: dir });
    assert.equal(
      (await ok(await r.call({ action: "dispatch_status" }))).enabled,
      true,
    );
    await ok(
      await r.call({
        action: "event",
        source: "s1",
        event: { id: "reopen-auto", type: "slot_reopened" },
      }),
    );
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[1].status,
      "done",
    );
    assert.equal(r.notion.writes, 1);
    await ok(await r.call({ action: "dispatch_stop" }));
    assert.deepEqual(await ok(await r.call({ action: "dispatch_status" })), {
      enabled: false,
      alarm: null,
      externalEffects: [],
    });
  } finally {
    await r?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("interrupted sending recovers to uncertain in real SQLite and blocks automatic rewrite", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-crash-"));
  let r;
  try {
    r = await runtime({ persist: dir, crashFixture: true });
    await seed(r);
    const [item] = await ok(await r.call({ action: "outbox" }));
    const ns = await r.mf.getDurableObjectNamespace("COORDINATOR");
    await ns
      .getByName("goldin")
      .fixtureCrash({ tenant: "goldin", operator: "staff" }, item.id);
    await r.close();
    r = await runtime({ persist: dir });
    await ok(await r.call({ action: "dispatch_start" }));
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[0].status,
      "uncertain",
    );
    assert.equal(r.notion.writes, 0);
    await ok(
      await r.call({
        action: "event",
        source: "s1",
        event: { id: "later-crash", type: "slot_reopened" },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(
      (await ok(await r.call({ action: "outbox" })))[1].status,
      "pending",
    );
    assert.equal(r.notion.writes, 0);
    await ok(await r.call({ action: "dispatch_stop" }));
  } finally {
    await r?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("Worker wires scoped HTTP transport to automatic dispatcher with mock public fetch", async () => {
  const now = Date.now();
  const r = await runtime({
    httpNotion: true,
    bindings: {
      PROJECTION_WRITES: "synthetic-http",
      NOTION_API_TOKEN: "fixture-only",
      NOTION_PROJECTION_GRANT: JSON.stringify({
        enabled: true,
        syntheticOnly: true,
        tenant: "goldin",
        dataSourceId: mapping.dataSourceId,
        fields,
        approvedBy: "staff",
        issuedAt: now,
        expiresAt: now + 60000,
      }),
    },
  });
  try {
    await seed(r);
    await ok(await r.call({ action: "dispatch_start" }));
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[0].status,
      "done",
    );
    const [item] = await ok(await r.call({ action: "outbox" }));
    assert.equal(item.receipt.mode, "synthetic-http");
    assert.equal(item.receipt.externalEffects.length, 1);
    assert.equal(r.notion.pages.size, 1);
    await ok(await r.call({ action: "dispatch_stop" }));
  } finally {
    await r.close();
  }
});

test("stopping dispatch during query prevents write and explicit restart safely recovers", async () => {
  const now = Date.now();
  const r = await runtime({
    httpNotion: true,
    bindings: {
      PROJECTION_WRITES: "synthetic-http",
      NOTION_API_TOKEN: "fixture-only",
      NOTION_PROJECTION_GRANT: JSON.stringify({
        enabled: true,
        syntheticOnly: true,
        tenant: "goldin",
        dataSourceId: mapping.dataSourceId,
        fields,
        approvedBy: "staff",
        issuedAt: now,
        expiresAt: now + 60000,
      }),
    },
  });
  const pause = r.notion.pauseQuery();
  try {
    await seed(r);
    await ok(await r.call({ action: "dispatch_start" }));
    await pause.started;
    await ok(await r.call({ action: "dispatch_stop" }));
    pause.release();
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[0].status,
      "retry",
    );
    assert.equal(r.notion.writes, 0);
    assert.equal(
      (await ok(await r.call({ action: "dispatch_status" }))).enabled,
      false,
    );
    await ok(await r.call({ action: "dispatch_start" }));
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[0].status,
      "done",
    );
    assert.equal(r.notion.writes, 1);
    await ok(await r.call({ action: "dispatch_stop" }));
  } finally {
    pause.release();
    await r.close();
  }
});

test("read-only schema discovery reveals IDs with writes disabled and rejects mutation without mapping", async () => {
  const now = Date.now();
  const r = await runtime({
    httpNotion: true,
    bindings: {
      PROJECTION_WRITES: "disabled",
      NOTION_SCHEMA_DISCOVERY: "true",
      NOTION_API_TOKEN: "fixture-only",
      NOTION_PROJECTION_GRANT: JSON.stringify({
        enabled: true,
        syntheticOnly: true,
        tenant: "goldin",
        dataSourceId: mapping.dataSourceId,
        approvedBy: "staff",
        issuedAt: now,
        expiresAt: now + 60000,
      }),
    },
  });
  try {
    const s = await ok(await r.call({ action: "schema_inspect" }));
    assert.equal(s.dataSourceId, mapping.dataSourceId);
    assert.equal(s.properties.length, 5);
    assert.equal(s.liveVerified, true);
    assert.equal(
      (await ok(await r.call({ action: "dispatch_start" }))).status,
      "disabled",
    );
    assert.equal(r.notion.writes, 0);
  } finally {
    await r.close();
  }
});

test("scoped hosted-test fault controls prove retry and lost-receipt reconciliation without prior-source writes", async () => {
  const now = Date.now();
  const r = await runtime({
    httpNotion: true,
    bindings: {
      PROJECTION_WRITES: "synthetic-http",
      SYNTHETIC_NOTION_FAULTS: "true",
      NOTION_API_TOKEN: "fixture-only",
      NOTION_PROJECTION_GRANT: JSON.stringify({
        enabled: true,
        syntheticOnly: true,
        tenant: "goldin",
        dataSourceId: mapping.dataSourceId,
        fields,
        sourcePrefix: "new-",
        approvedBy: "staff",
        issuedAt: now,
        expiresAt: now + 60000,
      }),
    },
  });
  try {
    await seed(r);
    await ok(
      await r.call({ action: "intake", input: input("new-retry", "other1") }),
    );
    await ok(
      await r.call({ action: "dispatch_start", testFault: "read_retry_once" }),
    );
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[1].status,
      "done",
    );
    let items = await ok(await r.call({ action: "outbox" }));
    assert.equal(items[0].status, "pending");
    assert.equal(items[1].attempts, 2);
    assert.equal(r.notion.writes, 1);
    await ok(await r.call({ action: "dispatch_stop" }));
    await ok(
      await r.call({
        action: "intake",
        input: input("new-uncertain", "other2"),
      }),
    );
    await ok(
      await r.call({
        action: "dispatch_start",
        testFault: "drop_write_receipt_once",
      }),
    );
    await eventually(
      async () => (await ok(await r.call({ action: "outbox" })))[2].status,
      "uncertain",
    );
    items = await ok(await r.call({ action: "outbox" }));
    assert.equal(r.notion.writes, 2);
    await ok(await r.call({ action: "reconcile", id: items[2].id }));
    assert.equal(
      (await ok(await r.call({ action: "outbox" })))[2].status,
      "done",
    );
    assert.equal(r.notion.pages.size, 2);
    await ok(await r.call({ action: "dispatch_stop" }));
  } finally {
    await r.close();
  }
});

test("isolated sign-in rejects a body completed after expiry before sending credentials", async () => {
  let forwards = 0;
  const start = new Date(Date.now() - 1000).toISOString();
  const app = new Miniflare({
    modules: [
      {
        type: "ESModule",
        path: "isolated-expiry.mjs",
        contents: readFileSync(
          new URL("./dist/isolated-artifact.mjs", import.meta.url),
          "utf8",
        ),
      },
    ],
    compatibilityDate: "2026-10-22",
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    bindings: {
      ENVIRONMENT: "production",
      GOLDIN_LOGIN_ENABLED: "true",
      GOLDIN_SYNTHETIC_STARTED_AT: start,
      GOLDIN_SYNTHETIC_EXPIRES_AT: new Date(Date.now() + 1500).toISOString(),
    },
    serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) },
    outboundService: () => {
      forwards++;
      return Response.json(
        { error: "unexpected credential forwarding" },
        { status: 500 },
      );
    },
  });
  try {
    await app.ready;
    const body = new ReadableStream({
      async start(controller) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              email: "synthetic.operator@example.test",
              password: "local-test-fixture",
            }),
          ),
        );
        controller.close();
      },
    });
    const response = await app.dispatchFetch(
      "https://goldin-coordination-test.pages.dev/api/auth/login",
      {
        method: "POST",
        headers: {
          Origin: "https://goldin-coordination-test.pages.dev",
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
        },
        body,
        duplex: "half",
      },
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      success: false,
      error: "Sign-in disabled",
    });
    assert.equal(forwards, 0);
  } finally {
    await app.dispose();
  }
});

test("authenticated health reports actual tenant storage without payloads; production fails closed", async () => {
  const r = await runtime();
  try {
    await seed(r);
    const health = await ok(await r.call({ action: "health" }));
    assert.equal(health.counts.pending, 1);
    assert.equal(health.enabled, false);
    assert.equal(health.alarm, null);
    assert.ok(!JSON.stringify(health).includes("payer"));
    const other = await r.identity.token({ sub: "other" });
    assert.equal((await r.call({ action: "health" }, other)).status, 403);
    assert.equal((await r.call({ action: "health" }, null)).status, 401);
  } finally {
    await r.close();
  }
  const p = await runtime({ bindings: { ENVIRONMENT: "production" } });
  try {
    for (const action of [
      "price",
      "intake",
      "event",
      "drain",
      "dispatch_start",
    ])
      assert.equal(
        (await p.call({ action, price, input: input() })).status,
        503,
      );
    assert.equal(
      (await ok(await p.call({ action: "health" }))).counts.pending,
      0,
    );
    assert.equal(
      (await ok(await p.call({ action: "dispatch_stop" }))).status,
      "stopped",
    );
    assert.equal(p.notion.writes, 0);
  } finally {
    await p.close();
  }
});

test("real DO persists approved fixed totals and serializes buffered capacity", async () => {
  const r = await runtime();
  try {
    const vip = {
      ...price,
      kind: "solo",
      basis: "fixed",
      min: 1,
      max: 2,
      unit: 32100,
      deposit: 9000,
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
    };
    await ok(await r.call({ action: "price", price: vip }));
    const i = { ...input("vip"), count: 2, participants: ["one", "two"] };
    const b = await ok(await r.call({ action: "intake", input: i }));
    assert.equal(b.price.total, 32100);
    const overlap = {
      ...i,
      source: "buffer-overlap",
      start: new Date(Date.parse(i.end) + 5 * 60000).toISOString(),
      end: new Date(Date.parse(i.end) + 65 * 60000).toISOString(),
    };
    assert.equal(
      (await r.call({ action: "intake", input: overlap })).status,
      400,
    );
    const next = {
      ...overlap,
      source: "next",
      start: new Date(Date.parse(i.end) + 15 * 60000).toISOString(),
      end: new Date(Date.parse(i.end) + 75 * 60000).toISOString(),
    };
    const results = await Promise.all(
      ["race-a", "race-b"].map((source) =>
        r.call({ action: "intake", input: { ...next, source } }),
      ),
    );
    assert.deepEqual(results.map((x) => x.status).sort(), [200, 400]);
  } finally {
    await r.close();
  }
});

function productionFixture() {
  const now = Date.now(),
    tenant = "goldin";
  const names = [
    "pricing",
    "feesAndTaxes",
    "capacity",
    "holdExpiry",
    "cancellationRefund",
    "documentsAndFiles",
    "releaseOwnership",
    "intakeMode",
    "operationalNotionSchema",
    "staffAccess",
    "monitoringRecovery",
    "rollback",
  ];
  const profile = {
    version: 1,
    status: "approved",
    tenant,
    approvedBy: "staff",
    evidence: "fixture://approval-only",
    issuedAt: now - 1000,
    expiresAt: now + 60000,
    intakeMode: "staff-reviewed",
    deliveryMode: "reviewed-no-send",
    releaseReviewers: ["staff"],
    staffEmails: ["synthetic@example.test"],
    appOrigin: "https://staff.example.test",
    coordinatorOrigin: "https://pilot.example.test",
    notion: { ...mapping, createPolicy: "existing-only" },
    prices: [price],
    decisions: Object.fromEntries(
      names.map((n) => [
        n,
        {
          status: "approved",
          owner: "fixture-owner",
          evidence: "fixture://policy",
          version: "1",
          approvedAt: new Date(now - 1000).toISOString(),
        },
      ]),
    ),
  };
  return {
    profile,
    bindings: {
      ENVIRONMENT: "production",
      PRODUCTION_ENABLED: "true",
      PRODUCTION_PROFILE: JSON.stringify(profile),
      PROJECTION_WRITES: "production-http",
      IDENTITY_ISSUER: "https://id.createsomething.space",
      IDENTITY_JWKS_URL:
        "https://id.createsomething.space/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "ona-agents",
      NOTION_API_TOKEN: "fixture-not-a-real-token",
      OPERATOR_POLICY: JSON.stringify({
        staff: { tenant, roles: ["operator", "pricing", "integration"] },
        reader: { tenant, roles: ["operator"] },
      }),
      NOTION_MAPPINGS: JSON.stringify({ [tenant]: mapping }),
      NOTION_PROJECTION_GRANT: JSON.stringify({
        enabled: true,
        productionOnly: true,
        syntheticOnly: false,
        tenant,
        approvedBy: "staff",
        issuedAt: profile.issuedAt,
        expiresAt: profile.expiresAt,
        dataSourceId: mapping.dataSourceId,
        fields,
        sourcePrefix: "pixieset-supervised:",
      }),
    },
  };
}

test("production profile drives actual browser service binding to DO and scoped Notion with fixtures only", async () => {
  const { bindings, profile } = productionFixture();
  const r = await runtime({ bindings, httpNotion: true });
  const token = await r.identity.token({
    iss: bindings.IDENTITY_ISSUER,
    aud: ["ona-agents"],
  });
  const app = new Miniflare({
    modules: true,
    scriptPath: new URL("./dist/production-browser.mjs", import.meta.url)
      .pathname,
    compatibilityDate,
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    bindings,
    serviceBindings: {
      IDENTITY_KEYS: () => Response.json(r.identity.jwks),
      COORDINATOR_SERVICE: async (request) =>
        r.mf.dispatchFetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: await request.arrayBuffer(),
        }),
    },
  });
  const call = (command, extra = {}, access = token) =>
    app.dispatchFetch(profile.appOrigin + "/api/goldin", {
      method: "POST",
      headers: {
        Cookie: "cs_access_token=" + access,
        Origin: profile.appOrigin,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        ...extra,
      },
      body: JSON.stringify(command),
    });
  try {
    await ok(await call({ action: "price", price }));
    const envelope = {
      version: 1,
      tenant: "goldin",
      reviewedBy: "staff",
      provider: "pixieset-supervised",
      accountId: "fixture-account",
      bookingId: "fixture-booking",
      observedAt: new Date().toISOString(),
      evidence: "fixture://supervised-record",
      booking: input(),
    };
    delete envelope.booking.source;
    const b = await ok(
      await call({ action: "reviewed-intake", input: envelope }),
    );
    assert.deepEqual(
      await ok(await call({ action: "reviewed-intake", input: envelope })),
      b,
    );
    // Production never invents a duplicate Session: staff link an existing row first.
    r.notion.pages.set("canonical-existing", {
      id: "canonical-existing",
      parent: { data_source_id: mapping.dataSourceId },
      properties: {
        Source: {
          id: fields.source,
          rich_text: [{ type: "text", text: { content: b.source } }],
        },
        Unrelated: {
          id: "unrelated",
          rich_text: [{ type: "text", text: { content: "preserved" } }],
        },
      },
    });
    r.notion.readFailure();
    await ok(await call({ action: "dispatch_start" }));
    await eventually(
      async () => (await ok(await call({ action: "outbox" })))[0].status,
      "done",
    );
    assert.equal(r.notion.pages.size, 1);
    assert.equal(r.notion.writes, 1);
    const first = (await ok(await call({ action: "outbox" })))[0];
    assert.equal(first.attempts, 2);
    assert.equal(first.receipt.mode, "production-http");
    assert.equal(
      r.notion.pages.get("canonical-existing").properties.Unrelated.rich_text[0]
        .text.content,
      "preserved",
    );
    await ok(await call({ action: "dispatch_stop" }));
    await ok(
      await call({
        action: "reviewed-intake",
        input: {
          ...envelope,
          bookingId: "unlinked-booking",
          booking: { ...envelope.booking, resource: "unlinked-resource" },
        },
      }),
    );
    const unlinked = (await ok(await call({ action: "outbox" }))).at(-1);
    assert.equal(
      (await ok(await call({ action: "drain", id: unlinked.id }))).status,
      "blocked",
    );
    assert.equal(r.notion.pages.size, 1);
    assert.equal(r.notion.writes, 1);
    assert.equal(
      (
        await call(
          { action: "health" },
          { Origin: "https://wrong.example.test" },
        )
      ).status,
      403,
    );
    assert.equal(
      (await call({ action: "health" }, { Authorization: "Bearer fixture" }))
        .status,
      403,
    );
    assert.equal((await call({ action: "health" }, {}, "")).status, 401);
    assert.equal(
      (
        await call(
          { action: "health" },
          {},
          await r.identity.token({
            iss: bindings.IDENTITY_ISSUER,
            aud: ["wrong"],
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (await call({ action: "intake", input: input() })).status,
      400,
    );
    assert.equal(
      (await call({ action: "price", price: { ...price, unit: 1 } })).status,
      400,
    );
    const reader = await r.identity.token({
      iss: bindings.IDENTITY_ISSUER,
      aud: ["ona-agents"],
      sub: "reader",
    });
    assert.equal(
      (
        await call(
          {
            action: "event",
            source: b.source,
            event: { id: "unauthorized-release", type: "release_review" },
          },
          {},
          reader,
        )
      ).status,
      403,
    );
    assert.equal(r.notion.writes, 1);
  } finally {
    await app.dispose();
    await r.close();
  }
});

test("expired or unapproved production profiles never mutate or dispatch", async () => {
  for (const change of [
    "expired",
    "proposed",
    "wrong-mapping",
    "synthetic-grant",
  ]) {
    const { bindings, profile } = productionFixture();
    if (change === "expired") profile.expiresAt = Date.now() - 1;
    if (change === "proposed") profile.decisions.pricing.status = "proposed";
    if (change === "wrong-mapping")
      profile.notion = { ...mapping, dataSourceId: "other" };
    if (change === "synthetic-grant") {
      const grant = JSON.parse(bindings.NOTION_PROJECTION_GRANT);
      grant.productionOnly = false;
      grant.syntheticOnly = true;
      bindings.NOTION_PROJECTION_GRANT = JSON.stringify(grant);
    }
    bindings.PRODUCTION_PROFILE = JSON.stringify(profile);
    const r = await runtime({ bindings, httpNotion: true });
    try {
      const access = await r.identity.token({
        iss: bindings.IDENTITY_ISSUER,
        aud: ["ona-agents"],
      });
      const response = await r.call({ action: "dispatch_start" }, access);
      if (change === "synthetic-grant")
        assert.equal((await ok(response)).status, "disabled");
      else assert.equal(response.status, 503);
      assert.equal(r.notion.writes, 0);
    } finally {
      await r.close();
    }
  }
});

test("production rejects conflicting persisted catalog for new intake but preserves old replay", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-catalog-"));
  const envelope = {
    version: 1,
    tenant: "goldin",
    reviewedBy: "staff",
    provider: "pixieset-supervised",
    accountId: "fixture-account",
    bookingId: "old-booking",
    observedAt: new Date().toISOString(),
    evidence: "fixture://record",
    booking: input(),
  };
  delete envelope.booking.source;
  let r;
  try {
    r = await runtime({ persist: dir });
    await ok(await r.call({ action: "price", price }));
    const old = await ok(
      await r.call({ action: "reviewed-intake", input: envelope }),
    );
    await r.close();
    const { bindings, profile } = productionFixture();
    profile.prices = [{ ...price, unit: 20000 }];
    bindings.PRODUCTION_PROFILE = JSON.stringify(profile);
    r = await runtime({ persist: dir, bindings, httpNotion: true });
    const access = await r.identity.token({
      iss: bindings.IDENTITY_ISSUER,
      aud: ["ona-agents"],
    });
    assert.equal(
      (
        await r.call(
          {
            action: "reviewed-intake",
            input: {
              ...envelope,
              bookingId: "new-booking",
              booking: { ...envelope.booking, resource: "other" },
            },
          },
          access,
        )
      ).status,
      400,
    );
    assert.deepEqual(
      await ok(
        await r.call({ action: "reviewed-intake", input: envelope }, access),
      ),
      old,
    );
    assert.equal(
      (await ok(await r.call({ action: "outbox" }, access))).length,
      1,
    );
    assert.equal(r.notion.writes, 0);
  } finally {
    if (r) await r.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generated production Pages artifact uses canonical login and fails closed on disabled/CSRF/expiry", async () => {
  const { build } = await import("esbuild");
  await build({
    entryPoints: [
      new URL(
        "./production-app/.svelte-kit/cloudflare/_worker.js",
        import.meta.url,
      ).pathname,
    ],
    outfile: new URL("./dist/production-artifact.mjs", import.meta.url)
      .pathname,
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["cloudflare:*", "node:*"],
  });
  const { bindings, profile } = productionFixture();
  const r = await runtime({ bindings, httpNotion: true });
  const token = await r.identity.token({
    iss: bindings.IDENTITY_ISSUER,
    aud: ["ona-agents"],
  });
  let identityCalls = 0;
  const appBindings = { ...bindings };
  delete appBindings.NOTION_API_TOKEN;
  delete appBindings.NOTION_PROJECTION_GRANT;
  const makeApp = (config) =>
    new Miniflare({
      modules: [
        {
          type: "ESModule",
          path: "pages.mjs",
          contents: readFileSync(
            new URL("./dist/production-artifact.mjs", import.meta.url),
            "utf8",
          ),
        },
      ],
      compatibilityDate,
      compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
      bindings: config,
      serviceBindings: {
        ASSETS: () => new Response(null, { status: 404 }),
        IDENTITY_KEYS: () => Response.json(r.identity.jwks),
        COORDINATOR_SERVICE: async (request) =>
          r.mf.dispatchFetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: await request.arrayBuffer(),
          }),
      },
      outboundService: async (request) => {
        assert.equal(
          request.url,
          "https://id.createsomething.space/v1/auth/login",
        );
        identityCalls++;
        const credentials = await request.json();
        assert.equal(credentials.email, "synthetic@example.test");
        assert.equal(credentials.audience, "ona-agents");
        return Response.json({
          access_token: token,
          refresh_token: "fixture-refresh-only",
          expires_in: 900,
          user: { email: credentials.email },
        });
      },
    });
  const headers = {
    Origin: profile.appOrigin,
    "Sec-Fetch-Site": "same-origin",
    "Content-Type": "application/json",
  };
  const credentials = JSON.stringify({
    email: "synthetic@example.test",
    password: "fixture-never-real",
  });
  const app = makeApp(appBindings);
  let disabled, expiring;
  try {
    const response = await app.dispatchFetch(
      profile.appOrigin + "/api/auth/login",
      { method: "POST", headers, body: credentials },
    );
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("Set-Cookie").includes("HttpOnly"));
    assert.ok(response.headers.get("Set-Cookie").includes("Secure"));
    assert.ok(!(await response.text()).includes(token));
    assert.equal(identityCalls, 1);
    assert.equal(
      (
        await app.dispatchFetch(profile.appOrigin + "/api/goldin", {
          method: "POST",
          headers: { ...headers, Cookie: "cs_access_token=" + token },
          body: JSON.stringify({ action: "health" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await app.dispatchFetch(profile.appOrigin + "/api/auth/login", {
          method: "POST",
          headers: { ...headers, Origin: "https://wrong.example.test" },
          body: credentials,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await app.dispatchFetch(profile.appOrigin + "/api/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: "outsider@example.test",
            password: "fixture",
          }),
        })
      ).status,
      403,
    );
    assert.equal(identityCalls, 1);
    disabled = makeApp({ ...appBindings, PRODUCTION_ENABLED: "false" });
    assert.equal(
      (
        await disabled.dispatchFetch(profile.appOrigin + "/api/auth/login", {
          method: "POST",
          headers,
          body: credentials,
        })
      ).status,
      503,
    );
    const short = {
      ...profile,
      issuedAt: Date.now() - 1000,
      expiresAt: Date.now() + 1000,
    };
    expiring = makeApp({
      ...appBindings,
      PRODUCTION_PROFILE: JSON.stringify(short),
    });
    const slow = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          new TextEncoder().encode('{"email":"synthetic@example.test",'),
        );
        await new Promise((resolve) => setTimeout(resolve, 1600));
        controller.enqueue(new TextEncoder().encode('"password":"fixture"}'));
        controller.close();
      },
    });
    const expired = await expiring.dispatchFetch(
      profile.appOrigin + "/api/auth/login",
      {
        method: "POST",
        headers,
        body: slow,
        duplex: "half",
      },
    );
    assert.ok([400, 503].includes(expired.status));
    assert.equal(identityCalls, 1);
    assert.equal(r.notion.writes, 0);
  } finally {
    await app.dispose();
    if (disabled) await disabled.dispose();
    if (expiring) await expiring.dispose();
    await r.close();
  }
});
