import { test } from "node:test";
import assert from "node:assert/strict";
import { operationalHealth, assertEnvironmentAction } from "./operations.mjs";
import { scenario, readiness } from "./policy-model.mjs";

test("operational health isolates counts from sensitive outbox bodies", () => {
  const result = operationalHealth(
    [
      {
        status: "pending",
        next: 50,
        source: "private",
        body: { payer: "private" },
      },
      { status: "uncertain", next: 0 },
      { status: "blocked", next: 0 },
      { status: "retry", next: 200 },
      { status: "done", next: 0 },
    ],
    { enabled: false, alarm: null },
    100,
  );
  assert.equal(result.overdue, 1);
  assert.equal(result.counts.uncertain, 1);
  assert.deepEqual(result.attention, [
    "reconcile_uncertain_before_retry",
    "review_blocked_projection",
    "inspect_retry_budget",
    "dispatcher_not_scheduled",
  ]);
  assert.ok(!JSON.stringify(result).includes("private"));
});
test("production cannot inherit harness mutations; stop and health remain available", () => {
  for (const action of ["intake", "event", "price", "drain", "dispatch_start"])
    assert.throws(() =>
      assertEnvironmentAction({ ENVIRONMENT: "production" }, action),
    );
  for (const action of ["health", "dispatch_stop", "dispatch_status"])
    assert.doesNotThrow(() =>
      assertEnvironmentAction({ ENVIRONMENT: "production" }, action),
    );
  for (const env of [undefined, "Production", "staging"])
    assert.throws(() =>
      assertEnvironmentAction({ ENVIRONMENT: env }, "intake"),
    );
});
const assumption = {
  count: 3,
  unitCents: 15000,
  depositCents: 20000,
  durationMinutes: 90,
  bufferMinutes: 15,
  feeBps: 300,
  feeTreatment: "added",
  photographerCentsPerHour: 5000,
  editingCentsPerPerson: 2000,
  fixedCostCents: 3000,
};
test("scenario economics expose assumptions and do not approve business terms", () => {
  const x = scenario(assumption);
  assert.equal(x.baseCents, 45000);
  assert.equal(x.feeCents, 1350);
  assert.equal(x.totalCents, 46350);
  assert.equal(x.assumedCostCents, 17750);
  assert.equal(x.balanceCents, 26350);
  assert.equal(x.approved, false);
  assert.equal(x.taxIncluded, false);
  assert.equal(
    scenario({ ...assumption, feeTreatment: "included" }).totalCents,
    45000,
  );
  assert.throws(() =>
    scenario({ ...assumption, photographerCentsPerHour: undefined }),
  );
  assert.throws(() =>
    scenario({ ...assumption, count: Number.MAX_SAFE_INTEGER }),
  );
});
test("fictional package fixed total is modeled for one/two without assuming group rate", () => {
  const vip = {
    ...assumption,
    unitCents: undefined,
    fixedTotalCents: 32100,
    depositCents: 9000,
    durationMinutes: 60,
  };
  for (const count of [1, 2])
    assert.equal(scenario({ ...vip, count }).baseCents, 32100);
});
test("proposals/future approvals never satisfy readiness or enable production", () => {
  const result = readiness({ decisions: { pricing: { status: "proposed" } } });
  assert.ok(result.blockers.includes("pricing"));
  const decisions = Object.fromEntries(
    result.blockers.map((name) => [
      name,
      {
        status: "approved",
        owner: "fixture",
        evidence: "fixture://approval",
        version: "1",
        approvedAt: "2026-01-01T00:00:00Z",
      },
    ]),
  );
  assert.equal(
    readiness({ decisions }, Date.parse("2026-10-23")).decisionsComplete,
    true,
  );
  assert.equal(readiness({ decisions }).productionEnabled, false);
  decisions.pricing.approvedAt = "2099-01-01T00:00:00Z";
  assert.ok(readiness({ decisions }).blockers.includes("pricing"));
});

test("exhausted retries remain visible and exact large intermediate math preserves cents", () => {
  const health = operationalHealth([{ status: "exhausted", next: 0 }], {
    enabled: false,
    alarm: null,
  });
  assert.equal(health.counts.exhausted, 1);
  assert.ok(health.attention.includes("approved_retry_reset_required"));
  const exact = scenario({
    ...assumption,
    count: 1,
    unitCents: 100000003590,
    feeBps: 100000001,
    feeTreatment: "added",
    depositCents: 0,
    photographerCentsPerHour: 0,
    editingCentsPerPerson: 0,
    fixedCostCents: 0,
  });
  assert.equal(exact.feeCents, 1000000045900000);
  assert.throws(() => scenario({ ...assumption, fixedTotalCents: -1 }));
  assert.throws(() => scenario({ ...assumption, fixedTotalCents: null }));
});

test("health consumes tenant SQL aggregates without expanding payload/history rows", () => {
  const h = operationalHealth(
    [
      { status: "retry", count: 1000, due: 900 },
      { status: "exhausted", count: 2, due: 0 },
    ],
    { enabled: true, alarm: 10 },
  );
  assert.equal(h.counts.retry, 1000);
  assert.equal(h.counts.exhausted, 2);
  assert.equal(h.overdue, 900);
  assert.throws(() =>
    operationalHealth([{ status: "retry", count: 1, due: 2 }], {}),
  );
});

test("operational write guard rejects production activation without complete profile", () => {
  assert.throws(() =>
    assertEnvironmentAction(
      {
        ENVIRONMENT: "production",
        PRODUCTION_ENABLED: "true",
        PRODUCTION_PROFILE: JSON.stringify({ status: "proposed" }),
      },
      "dispatch_start",
    ),
  );
});
