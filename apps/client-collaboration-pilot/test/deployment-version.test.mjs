import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRuntime } from "../runtime.mjs";
import { principals as p } from "../store.mjs";
const record = (tenant) => ({
  tenant,
  page: "/",
  kvKey: "content:home",
  field: "hero.title",
  deploymentCommit: "a".repeat(40),
  rawKV: JSON.stringify({ hero: { title: "Chemistry That Outperforms" } }),
  observedAt: Date.now(),
});
const setup = (t, options = {}) => {
  const home = mkdtempSync(join(tmpdir(), "collab-kv-"));
  const records = {
    maverickx: record("maverickx"),
    "other-client": record("other-client"),
  };
  const r = openRuntime(home, {
    deploymentSnapshots: Object.fromEntries(
      Object.keys(records).map((tenant) => [tenant, () => records[tenant]]),
    ),
    ...options,
  });
  t.after(() => {
    r.store.close();
    rmSync(home, { recursive: true, force: true });
  });
  return { ...r, records };
};
function proposal(s) {
  const c = s.context(p.agent);
  const a = {
    page: "/",
    component: "hero.headline",
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const f = s.feedback(p.agent, {
    ...a,
    text: "Clarify chemistry",
    requestId: "f",
  });
  return s.propose(p.agent, {
    ...a,
    feedbackId: f.id,
    replacement: "Chemistry with measurable outcomes.",
    reason: "Clearer",
    requestId: "p",
  });
}
const approve = (s, q) =>
  s.review(p.reviewer, {
    id: q.id,
    digest: q.digest,
    decision: "approved",
    requestId: "r",
  });
const apply = (s, q) =>
  s.promote(p.reviewer, { id: q.id, digest: q.digest, requestId: "a" });
test("KV-only drift and deployment-only drift block approved source application", (t) => {
  const { store: s, records, repositories } = setup(t);
  const q = proposal(s);
  approve(s, q);
  const before = repositories.maverickx.snapshot().baseCommit;
  records.maverickx.rawKV += " ";
  assert.throws(() => apply(s, q), /stale_or_unknown_anchor/);
  records.maverickx.rawKV = records.maverickx.rawKV.trim();
  records.maverickx.deploymentCommit = "b".repeat(40);
  assert.throws(() => apply(s, q), /stale_or_unknown_anchor/);
  assert.equal(repositories.maverickx.snapshot().baseCommit, before);
});
test("late KV drift blocks ref update; missing/old/foreign evidence fails closed", (t) => {
  let recordsRef;
  const {
    store: s,
    records,
    repositories,
  } = setup(t, {
    repositoryOptions: {
      beforeRefUpdate: () => {
        recordsRef.maverickx.rawKV += " ";
      },
    },
  });
  recordsRef = records;
  const q = proposal(s);
  approve(s, q);
  const before = repositories.maverickx.snapshot().baseCommit;
  assert.throws(() => apply(s, q), /deployment_drift/);
  assert.equal(repositories.maverickx.snapshot().baseCommit, before);
  records.maverickx.observedAt = 0;
  assert.throws(() => s.context(p.agent), /stale_deployment_evidence/);
  records.maverickx.observedAt = Date.now();
  records.maverickx.tenant = "other-client";
  assert.throws(() => s.context(p.agent), /invalid_deployment_evidence/);
});
test("repository/runtime divergence blocks edits; source-only commit does not publish KV", (t) => {
  const { store: s, records, repositories } = setup(t);
  const q = proposal(s);
  approve(s, q);
  const receipt = apply(s, q);
  assert.equal(receipt.deploymentVersion.kvKey, "content:home");
  assert.equal(receipt.deployment, "not-authorized");
  assert.equal(s.context(p.agent).source.mappingReady, false);
  assert.equal(
    JSON.parse(records.maverickx.rawKV).hero.title,
    "Chemistry That Outperforms",
  );
  assert.equal(repositories.maverickx.snapshot().text, q.content.after);
});
test("configured evidence mode requires own callable readers for every tenant; absent records fail closed", (t) => {
  const home = mkdtempSync(join(tmpdir(), "collab-missing-evidence-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  for (const deploymentSnapshots of [
    null,
    {},
    { maverickx: () => record("maverickx") },
    { maverickx: null, "other-client": () => record("other-client") },
  ])
    assert.throws(
      () => openRuntime(home, { deploymentSnapshots }),
      /deployment_reader_required/,
    );
  assert.throws(
    () =>
      openRuntime(home, {
        deploymentSnapshots: {
          maverickx: () => undefined,
          "other-client": () => record("other-client"),
        },
      }),
    /invalid_deployment_evidence/,
  );
});
