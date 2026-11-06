import { test } from "node:test";
import assert from "node:assert/strict";
import { Coordinator } from "./coordinator.mjs";
test("requires approved pricing before intake", () => {
  const c = new Coordinator(":memory:");
  assert.throws(() => c.intake({ tenant: "a", operator: "staff" }, {}));
});
import { notionPlan } from "./coordinator.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const a = { tenant: "goldin", operator: "reviewer" };
const price = {
  version: "test-only-v1",
  currency: "USD",
  kind: "group",
  unit: 10000,
  deposit: 5000,
  min: 1,
  max: 7,
};
const input = (source = "booking-1", count = 1) => ({
  source,
  priceVersion: price.version,
  count,
  payer: "payer-id",
  participants: Array.from({ length: count }, (_, i) => `person-${i}`),
  start: "2026-11-01T01:30:00-04:00",
  end: "2026-11-01T01:30:00-05:00",
  resource: "photographer-1",
  holdMs: 60000,
});
function setup(path = ":memory:") {
  let now = Date.parse("2026-10-31T00:00:00Z");
  const c = new Coordinator(path, () => now);
  c.approvePrice(a, price);
  return { c, advance: (n) => (now += n) };
}
const pay = (c, revision = 1, paid = 10000, refunded = 0, disputed = false) =>
  c.event(a, "booking-1", {
    id: `pay-${revision}`,
    type: "payment",
    revision,
    paid,
    refunded,
    disputed,
    reconciled: true,
    evidence: "manual-provider-reconciliation",
  });
const files = [
  { path: "card-1/DCIM/0001.RAW", bytes: 100, sha256: "a".repeat(64) },
  { path: "card-2/DCIM/0001.RAW", bytes: 200, sha256: "b".repeat(64) },
];
function ready(c, count = 1) {
  c.intake(a, input("booking-1", count));
  pay(c, 1, 10000 * count);
  c.event(a, "booking-1", { id: "confirm", type: "confirm" });
  c.event(a, "booking-1", {
    id: "manifest",
    type: "raw_manifest",
    expected: files,
    received: files,
    evidence: "staff-manifest",
  });
  c.event(a, "booking-1", {
    id: "gallery",
    type: "gallery_review",
    gallery: "gallery-1",
    recipient: "payer-id",
    evidence: "staff-gallery-check",
  });
  c.event(a, "booking-1", {
    id: "docs",
    type: "production",
    field: "documents",
    value: true,
    evidence: "staff-doc-check",
  });
}
for (const count of [1, 3])
  test(`controlled ${count === 1 ? "individual" : "group"} path retains one payer and never sends`, () => {
    const { c } = setup();
    ready(c, count);
    const b = c.get(a, "booking-1");
    assert.equal(b.price.total, count * 10000);
    assert.equal(b.count, count);
    assert.equal(c.eligibility(b).eligible, true);
    const r = c.event(a, b.source, {
      id: "review",
      type: "release_review",
      recipient: b.payer,
      gallery: "gallery-1",
      approval: "operator-receipt",
    });
    assert.equal(r.delivery, "reviewed_no_send");
    assert.deepEqual(r.externalEffects, []);
  });
test("deposit, refund and dispute block release independently", () => {
  const { c } = setup();
  ready(c);
  pay(c, 2, 5000);
  assert.equal(c.eligibility(c.get(a, "booking-1")).eligible, false);
  for (const [rev, refund, dispute] of [
    [3, 1000, false],
    [4, 10000, false],
    [5, 0, true],
  ]) {
    pay(c, rev, 10000, refund, dispute);
    assert.equal(c.eligibility(c.get(a, "booking-1")).eligible, false);
  }
});
test("duplicates, stale snapshots, conflicts, rollback and durable replay", () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-"));
  const path = join(dir, "pilot.sqlite");
  const { c } = setup(path);
  c.intake(a, input());
  const r = pay(c, 2);
  assert.deepEqual(pay(c, 2), r);
  pay(c, 1, 0);
  assert.equal(c.get(a, "booking-1").payment.paid, 10000);
  assert.throws(() => pay(c, 2, 999));
  assert.throws(() =>
    c.event(a, "booking-1", {
      id: "bad",
      type: "production",
      field: "rawVerified",
      value: true,
      evidence: "x",
    }),
  );
  assert.equal(c.get(a, "booking-1").production.rawVerified, false);
  c.close();
  const reopened = new Coordinator(path);
  assert.deepEqual(pay(reopened, 2), r);
  reopened.close();
  rmSync(dir, { recursive: true });
});
test("capacity across connections, timezone overlap and expiry", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-"));
  const path = join(dir, "pilot.sqlite");
  const { c, advance } = setup(path);
  const other = new Coordinator(path, () => Date.parse("2026-10-31T00:00:00Z"));
  const attempts = await Promise.allSettled([
    Promise.resolve().then(() => c.intake(a, input())),
    Promise.resolve().then(() => other.intake(a, input("second"))),
  ]);
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  advance(60001);
  assert.throws(() =>
    c.event(a, "booking-1", { id: "expired", type: "confirm" }),
  );
  c.intake(a, input("replacement"));
  other.close();
  c.close();
  rmSync(dir, { recursive: true });
});
test("slot reopening preserves real booking and money; cancellation explicit", () => {
  const { c } = setup();
  ready(c);
  c.event(a, "booking-1", { id: "reopen", type: "slot_reopened" });
  assert.equal(c.get(a, "booking-1").status, "confirmed");
  assert.throws(() => c.intake(a, input("overlap")));
  assert.throws(() =>
    c.event(a, "booking-1", { id: "cancel", type: "cancel" }),
  );
  c.event(a, "booking-1", {
    id: "cancel",
    type: "cancel",
    reason: "staff verified",
    approval: "receipt",
  });
  assert.equal(c.get(a, "booking-1").payment.refunded, 0);
  c.intake(a, input("new"));
});
test("missing files/documents, wrong recipient and tenant boundary fail closed", () => {
  const { c } = setup();
  c.intake(a, input());
  pay(c);
  c.event(a, "booking-1", { id: "confirm", type: "confirm" });
  assert.equal(c.eligibility(c.get(a, "booking-1")).eligible, false);
  assert.throws(() => c.get({ ...a, tenant: "other" }, "booking-1"));
  assert.throws(() =>
    c.event(a, "booking-1", {
      id: "release",
      type: "release_review",
      approval: "yes",
      recipient: "wrong",
      gallery: "x",
    }),
  );
  assert.throws(() =>
    c.intake(a, { ...input("local-time"), start: "2026-11-01T01:30:00" }),
  );
  assert.throws(() => c.intake(a, { ...input(), count: 2 }));
});
test("Notion simulation requires validated mapping and does not mutate source", () => {
  const { c } = setup();
  ready(c);
  const b = c.get(a, "booking-1");
  assert.throws(() => notionPlan(b, {}, {}));
  const p = notionPlan(
    b,
    {
      verified: true,
      databaseId: "fixture",
      fields: { source: "source-id", payment: "payment-id" },
    },
    { databaseId: "fixture", propertyIds: ["source-id", "payment-id"] },
  );
  assert.equal(p.mode, "simulation");
  assert.deepEqual(p.externalEffects, []);
  p.properties["payment-id"].paid = 0;
  assert.equal(b.payment.paid, 10000);
});

test("incomplete raw transfer and gallery mismatch block release", () => {
  const { c } = setup();
  ready(c);
  c.event(a, "booking-1", {
    id: "missing-card",
    type: "raw_manifest",
    expected: files,
    received: files.slice(0, 1),
    evidence: "count-verified",
  });
  assert.equal(c.get(a, "booking-1").production.rawVerified, false);
  assert.throws(() =>
    c.event(a, "booking-1", {
      id: "wrong-gallery",
      type: "release_review",
      approval: "yes",
      recipient: "payer-id",
      gallery: "other",
    }),
  );
  assert.throws(() =>
    c.event(a, "booking-1", {
      id: "same-rev-conflict",
      type: "payment",
      revision: 1,
      paid: 1,
      refunded: 0,
      disputed: false,
      reconciled: true,
      evidence: "x",
    }),
  );
});
import { Worker } from "node:worker_threads";
test("simultaneous independent workers cannot overbook", async () => {
  const dir = mkdtempSync(join(tmpdir(), "goldin-race-"));
  const path = join(dir, "pilot.sqlite");
  const { c } = setup(path);
  c.close();
  const workers = [1, 2].map(
    (n) =>
      new Worker(new URL("./capacity-worker.mjs", import.meta.url), {
        workerData: { path, actor: a, input: input(`race-${n}`) },
      }),
  );
  try {
    await Promise.all(
      workers.map(
        (w) =>
          new Promise((resolve, reject) => {
            w.once("message", resolve);
            w.once("error", reject);
          }),
      ),
    );
    const pending = workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          w.once("message", resolve);
          w.once("error", reject);
        }),
    );
    workers.forEach((w) => w.postMessage("start"));
    const results = await Promise.all(pending);
    assert.equal(results.filter((x) => x === "held").length, 1);
    assert.equal(results.filter((x) => x === "capacity conflict").length, 1);
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
    rmSync(dir, { recursive: true });
  }
});

test("release review binds evidence and invalidates on changed gallery", () => {
  const { c } = setup();
  ready(c);
  c.event(a, "booking-1", {
    id: "review",
    type: "release_review",
    recipient: "payer-id",
    gallery: "gallery-1",
    approval: "approval-123",
  });
  let b = c.get(a, "booking-1");
  assert.equal(b.releaseReview.approval, "approval-123");
  assert.equal(b.production.documentsEvidence.reference, "staff-doc-check");
  assert.equal(
    b.audit.find((e) => e.event === "review").payload.gallery,
    "gallery-1",
  );
  c.event(a, "booking-1", {
    id: "replace-gallery",
    type: "gallery_review",
    gallery: "gallery-2",
    recipient: "payer-id",
    evidence: "new-QA",
  });
  b = c.get(a, "booking-1");
  assert.equal(b.delivery, "blocked");
  assert.ok(b.releaseReview.invalidatedAt);
  c.event(a, "booking-1", {
    id: "cancel",
    type: "cancel",
    reason: "client request verified",
    approval: "cancel-123",
  });
  assert.equal(c.get(a, "booking-1").cancellation.approval, "cancel-123");
});
test("Notion duplicate destination IDs are rejected", () => {
  const { c } = setup();
  ready(c);
  assert.throws(
    () =>
      notionPlan(
        c.get(a, "booking-1"),
        {
          verified: true,
          databaseId: "fixture",
          fields: { source: "same", payment: "same" },
        },
        { databaseId: "fixture", propertyIds: ["same"] },
      ),
    /duplicate/,
  );
});

test("solo package enforces exactly one participant", () => {
  const { c } = setup();
  c.approvePrice(a, {
    ...price,
    version: "solo-test-v1",
    kind: "solo",
    min: 1,
    max: 1,
  });
  const solo = { ...input("solo-booking"), priceVersion: "solo-test-v1" };
  assert.equal(c.intake(a, solo).price.kind, "solo");
  assert.throws(
    () =>
      c.intake(a, {
        ...input("invalid-solo", 3),
        priceVersion: "solo-test-v1",
      }),
    /structured payer/,
  );
});

test("external event named intake has a separate atomic outbox identity", () => {
  const { c } = setup();
  c.intake(a, input());
  c.event(a, "booking-1", { id: "intake", type: "slot_reopened" });
  assert.equal(c.outbox(a).length, 2);
  assert.notEqual(c.outbox(a)[0].id, c.outbox(a)[1].id);
});

test("known no-write retry exhaustion has an audited bounded recovery path", () => {
  const { c, advance } = setup();
  c.intake(a, input());
  const id = c.outbox(a)[0].id;
  for (let n = 0; n < 3; n++) {
    c.claim(a, id);
    c.settle(a, id, "retry", { error: "retry", externalEffects: [] });
    advance(1001);
  }
  assert.equal(c.outbox(a)[0].status, "exhausted");
  assert.throws(() => c.claim(a, id));
  assert.throws(() => c.resetRetry(a, id, ""));
  const reset = c.resetRetry(a, id, "operator-reviewed-read-failures");
  assert.equal(reset.receipt.resets[0].operator, a.operator);
  assert.equal(reset.attempts, 0);
  assert.equal(c.claim(a, id).attempts, 1);
  c.settle(a, id, "uncertain", { error: "uncertain" });
  assert.equal(
    c.outbox(a)[0].history.find((r) => r.action === "retry_reset").approval,
    "operator-reviewed-read-failures",
  );
  assert.throws(() => c.resetRetry(a, id, "must-not-retry-unknown"));
});

test("versioned fixed solo pricing preserves fixture fixed-package one/two rule without inventing 3+ price", () => {
  const { c } = setup();
  const vip = {
    ...price,
    version: "fixed-fixture-approved-v1",
    kind: "solo",
    basis: "fixed",
    unit: 32100,
    deposit: 9000,
    min: 1,
    max: 2,
    durationMinutes: 60,
  };
  c.approvePrice(a, vip);
  for (const count of [1, 2]) {
    const b = c.intake(a, {
      ...input("vip-" + count, count),
      priceVersion: vip.version,
      resource: "vip-photographer-" + count,
    });
    assert.equal(b.price.total, 32100);
    assert.equal(b.price.deposit, 9000);
  }
  assert.throws(() =>
    c.intake(a, { ...input("vip-3", 3), priceVersion: vip.version }),
  );
  assert.throws(() =>
    c.approvePrice(a, { ...vip, version: "bad", basis: "guess" }),
  );
  c.close();
});
test("approved duration and buffers protect both sides of capacity including legacy reservations", () => {
  const { c } = setup();
  const p = {
    ...price,
    version: "buffer-fixture",
    durationMinutes: 60,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
  };
  c.approvePrice(a, p);
  const i = { ...input(), priceVersion: p.version };
  c.intake(a, i);
  const next = {
    ...i,
    source: "next",
    start: "2026-11-01T01:40:00-05:00",
    end: "2026-11-01T02:40:00-05:00",
  };
  assert.throws(() => c.intake(a, next), /capacity conflict/);
  assert.doesNotThrow(() =>
    c.intake(a, {
      ...next,
      start: "2026-11-01T02:00:00-05:00",
      end: "2026-11-01T03:00:00-05:00",
    }),
  );
  assert.throws(
    () =>
      c.intake(a, {
        ...i,
        source: "wrong-duration",
        resource: "other",
        end: "2026-11-01T03:30:00-05:00",
      }),
    /duration/,
  );
  c.close();
});
