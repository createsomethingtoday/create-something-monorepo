import { test } from "node:test";
import assert from "node:assert/strict";
import { NotionHttpTransport } from "./notion-http.mjs";
import { NotionAdapter } from "./notion.mjs";
import { reviewedIntake } from "./reviewed-intake.mjs";
import { Coordinator } from "./coordinator.mjs";
const fields = {
  source: "src",
  payment: "pay",
  production: "prod",
  delivery: "del",
  receipt: "rec",
};
const mapping = { dataSourceId: "test-ds", fields };
const grant = {
  enabled: true,
  syntheticOnly: true,
  tenant: "a",
  dataSourceId: "test-ds",
  fields,
  approvedBy: "test-reviewer",
  issuedAt: 1000,
  expiresAt: 2000,
};
function setup(overrides = {}) {
  let now = 1500;
  let writes = 0;
  const pages = [];
  const transport = new NotionHttpTransport({
    credential: "fixture-only",
    grant,
    tenant: "a",
    clock: () => now,
    fetcher: async (request) => {
      assert.equal(request.redirect, "manual");
      assert.equal(request.headers.get("authorization"), "Bearer fixture-only");
      const path = new URL(request.url).pathname;
      if (request.method === "GET")
        return Response.json({
          id: "test-ds",
          properties: Object.fromEntries(
            Object.values(fields).map((id) => [id, { id, type: "rich_text" }]),
          ),
        });
      if (path.endsWith("query"))
        return Response.json({ results: pages, has_more: false });
      const body = await request.json();
      writes++;
      const page = {
        id: "p1",
        parent: { data_source_id: "test-ds" },
        properties: Object.fromEntries(
          Object.entries(body.properties).map(([id, p]) => [id, { id, ...p }]),
        ),
      };
      pages.splice(0, pages.length, page);
      return Response.json(page);
    },
    ...overrides,
  });
  return { transport, writes: () => writes, advance: () => (now = 2001) };
}
const item = {
  id: "outbox1",
  source: "source1",
  body: {
    source: "source1",
    payment: { paid: 100 },
    production: {},
    delivery: "blocked",
  },
};
test("scoped HTTP candidate projects and reconciles replay with accurate external receipt", async () => {
  const s = setup();
  const adapter = new NotionAdapter({
    mapping,
    transport: s.transport,
    mode: "synthetic-http",
  });
  const first = await adapter.project(item);
  assert.deepEqual(first.externalEffects, [
    { operation: "create", pageId: "p1" },
  ]);
  assert.equal((await adapter.project(item)).reconciled, true);
  assert.equal(s.writes(), 1);
  s.advance();
  await assert.rejects(() => adapter.project(item), /denied/);
});
test("missing grant, wrong tenant, arbitrary target, redirects and unknown page denied", async () => {
  for (const options of [
    { grant: undefined },
    { tenant: "b" },
    { grant: { ...grant, syntheticOnly: false } },
  ]) {
    const s = setup(options);
    await assert.rejects(
      () =>
        s.transport.fetch(
          new Request("https://api.notion.com/v1/data_sources/test-ds"),
        ),
      /denied/,
    );
  }
  const s = setup();
  for (const [url, method] of [
    ["https://evil.test/v1/data_sources/test-ds", "GET"],
    ["https://api.notion.com/v1/pages/unknown", "PATCH"],
    ["https://api.notion.com/v1/data_sources/other", "GET"],
  ])
    await assert.rejects(
      () => s.transport.fetch(new Request(url, { method })),
      /denied/,
    );
  const redirect = setup({
    fetcher: async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.test" },
      }),
  });
  await assert.rejects(
    () =>
      redirect.transport.fetch(
        new Request("https://api.notion.com/v1/data_sources/test-ds"),
      ),
    /denied/,
  );
});
test("supervised observation is tenant-bound, canonical and requires approved price", () => {
  const actor = { tenant: "a", operator: "staff" };
  const booking = {
    priceVersion: "fixture",
    count: 1,
    payer: "p",
    participants: ["p"],
    start: "2026-11-10T10:00:00-06:00",
    end: "2026-11-10T11:00:00-06:00",
    resource: "r",
    holdMs: 60000,
  };
  const envelope = {
    version: 1,
    tenant: "a",
    reviewedBy: "staff",
    provider: "pixieset-supervised",
    accountId: "account",
    bookingId: "booking",
    evidence: "staff-visible-session-record",
    observedAt: "2026-10-23T00:00:00Z",
    booking,
  };
  const normalized = reviewedIntake(actor, envelope);
  assert.deepEqual(
    reviewedIntake(actor, {
      ...envelope,
      booking: Object.fromEntries(Object.entries(booking).reverse()),
    }),
    normalized,
  );
  assert.throws(() => reviewedIntake({ ...actor, tenant: "b" }, envelope));
  assert.throws(() =>
    reviewedIntake(actor, { ...envelope, booking: { ...booking, paid: 100 } }),
  );
  const c = new Coordinator(":memory:", () =>
    Date.parse("2026-10-23T00:00:00Z"),
  );
  assert.throws(() => c.intake(actor, normalized), /approved pricing/);
  c.approvePrice(actor, {
    version: "fixture",
    currency: "USD",
    kind: "solo",
    unit: 100,
    deposit: 50,
    min: 1,
    max: 1,
  });
  const result = c.intake(actor, normalized);
  assert.equal(result.provenance.reviewedBy, "staff");
  assert.equal(result.delivery, "blocked");
  assert.deepEqual(c.intake(actor, normalized), result);
});

test("approved semantic mapping cannot be swapped and update uses only reconciled page", async () => {
  const s = setup();
  const swapped = {
    ...mapping,
    fields: {
      ...fields,
      payment: fields.production,
      production: fields.payment,
    },
  };
  await assert.rejects(
    () =>
      new NotionAdapter({
        mapping: swapped,
        transport: s.transport,
        mode: "synthetic-http",
      }).project(item),
    /denied/,
  );
  const adapter = new NotionAdapter({
    mapping,
    transport: s.transport,
    mode: "synthetic-http",
  });
  await adapter.project(item);
  const update = await adapter.project({
    ...item,
    id: "outbox2",
    body: { ...item.body, delivery: "reviewed_no_send" },
  });
  assert.equal(update.externalEffects[0].operation, "update");
  assert.equal(s.writes(), 2);
});

test("HTTP status, lost write response and body bounds retain retry/uncertain classification", async () => {
  for (const [status, expected] of [
    [429, "retry"],
    [503, "uncertain"],
  ]) {
    const s = setup();
    const normal = s.transport.fetch.bind(s.transport);
    const wrapped = {
      permits: (m) => s.transport.permits(m),
      fetch: (request) =>
        request.url.endsWith("/pages")
          ? Promise.resolve(new Response(null, { status }))
          : normal(request),
    };
    await assert.rejects(
      () =>
        new NotionAdapter({
          mapping,
          transport: wrapped,
          mode: "synthetic-http",
        }).project(item),
      (error) => error.kind === expected,
    );
  }
  for (const fault of ["lost", "large"]) {
    const s = setup({
      fetcher: async (request) => {
        if (request.method === "GET")
          return Response.json({
            id: "test-ds",
            properties: Object.fromEntries(
              Object.values(fields).map((id) => [
                id,
                { id, type: "rich_text" },
              ]),
            ),
          });
        if (request.url.endsWith("/query"))
          return Response.json({ results: [], has_more: false });
        if (fault === "lost") throw new Error("fixture after-commit timeout");
        return new Response("x".repeat(262145));
      },
    });
    await assert.rejects(
      () =>
        new NotionAdapter({
          mapping,
          transport: s.transport,
          mode: "synthetic-http",
        }).project(item),
      (error) => error.kind === "uncertain",
    );
  }
});
