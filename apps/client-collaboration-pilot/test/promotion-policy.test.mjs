import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openRuntime } from "../runtime.mjs";
import { createPromotionPolicy } from "../promotion-policy.mjs";
import { identityFixture } from "./identity-fixture.mjs";
const targets = {
  preview: {
    environment: "preview",
    provider: "cloudflare-pages",
    project: "synthetic-maverick-preview",
    branch: "preview",
    origin: "https://preview.fixture.invalid",
    bindingIds: ["preview-content", "preview-db"],
  },
  production: {
    environment: "production",
    provider: "cloudflare-pages",
    project: "synthetic-maverick-production",
    branch: "main",
    origin: "https://production.fixture.invalid",
    bindingIds: ["production-content", "production-db"],
  },
};
async function setup(t, { owner = true } = {}) {
  const home = mkdtempSync(join(tmpdir(), "collab-promotion-"));
  const f = await identityFixture();
  f.memberships.set("member", { active: true, role: "member" });
  f.memberships.set("micah", { active: true, role: "member" });
  const member = await f.boundary.resolve(
    f.request(f.token({ sub: "member", role: "production-approver" })),
  );
  const micah = await f.boundary.resolve(f.request(f.token({ sub: "micah" })));
  let evidenceSequence = 1,
    previewVerified = true;
  const policy = createPromotionPolicy({
    tenant: "maverickx",
    productionApprover: owner
      ? { issuer: micah.issuer, subject: micah.subject }
      : null,
    targets,
    readEvidence: (_, s) => ({
      id: "synthetic-proof-" + evidenceSequence,
      status: "passed",
      tenant: "maverickx",
      deploymentVersionHash: policy.hash(s.deploymentVersion),
      previewTargetHash: policy.hash(policy.target("preview")),
      sourceCommit: s.baseCommit,
      sourceContentHash: s.contentHash,
      kvContentHash: s.deploymentVersion.kvContentHash,
      previewVerified,
      previewDeploymentId: previewVerified ? "synthetic-preview-1" : null,
    }),
  });
  const snapshots = Object.fromEntries(
    ["maverickx", "other-client"].map((tenant) => [
      tenant,
      () => ({
        tenant,
        page: "/",
        kvKey: "content:home",
        field: "hero.title",
        deploymentCommit: "a".repeat(40),
        observedAt: Date.now(),
        rawKV: JSON.stringify({
          hero: { title: "Chemistry That Outperforms" },
        }),
      }),
    ]),
  );
  const options = {
    authorizePrincipal: f.boundary.accepts,
    promotionPolicy: policy,
    deploymentSnapshots: snapshots,
  };
  const r = openRuntime(home, options);
  t.after(() => {
    r.store.close();
    rmSync(home, { recursive: true, force: true });
  });
  const args = (requestId, environment = "production") => {
    const { version } = r.store.releaseContext(member);
    return {
      requestId,
      sourceHash: version.sourceHash,
      evidenceHash: version.evidenceHash,
      targetHash: policy.hash(policy.target(environment)),
    };
  };
  const capability = (environment) => {
    const target = policy.target(environment);
    return {
      tenant: "maverickx",
      environment,
      project: target.project,
      targetHash: policy.hash(target),
    };
  };
  return {
    ...r,
    home,
    options,
    f,
    member,
    micah,
    policy,
    args,
    capability,
    changeEvidence: () => evidenceSequence++,
    unverify: () => {
      previewVerified = false;
    },
  };
}
test("authenticated member can request preview, but cannot approve production or forge membership", async (t) => {
  const { store: s, member, micah, args, f, capability } = await setup(t);
  const job = s.requestPreview(member, args("preview", "preview"));
  assert.equal(job.environment, "preview");
  assert.equal(job.execution, "not-executed");
  assert.equal(
    s.deploymentPlan(member, { id: job.id }, capability("preview")).environment,
    "preview",
  );
  assert.throws(
    () => s.approveProduction(member, args("prod")),
    /micah_production_approval_required/,
  );
  assert.throws(
    () => s.requestPreview({ ...member }, args("forged")),
    /unauthorized/,
  );
  assert.throws(
    () =>
      s.requestPreview({ ...member, tenant: "other-client" }, args("foreign")),
    /project_member_required/,
  );
  assert.throws(
    () =>
      s.requestPreview(member, {
        ...args("target"),
        environment: "production",
      }),
    /unknown_argument/,
  );
  const production = s.approveProduction(micah, args("prod-micah"));
  assert.equal(production.approval.subject, "micah");
  assert.throws(
    () =>
      s.deploymentPlan(member, { id: production.id }, capability("preview")),
    /credential_scope_mismatch/,
  );
  assert.equal(
    s.deploymentPlan(member, { id: production.id }, capability("production"))
      .execution,
    "not-executed",
  );
  f.memberships.delete("member");
  assert.throws(
    () =>
      s.requestPreview(member, {
        requestId: "revoked",
        sourceHash: "x",
        evidenceHash: "y",
      }),
    /unauthorized/,
  );
});
test("approval binds evidence/version/destination; replay persists and does not approve changed evidence", async (t) => {
  const {
    store: s,
    member,
    micah,
    args,
    capability,
    policy,
    home,
    options,
    changeEvidence,
  } = await setup(t);
  const request = args("production");
  assert.throws(
    () =>
      s.approveProduction(micah, {
        ...request,
        targetHash: "old-target",
        requestId: "target-changed",
      }),
    /stale_deployment_destination/,
  );
  const job = s.approveProduction(micah, request);
  assert.deepEqual(s.approveProduction(micah, request), job);
  const reopened = openRuntime(home, options);
  assert.deepEqual(reopened.store.approveProduction(micah, request), job);
  reopened.store.close();
  const version = s.releaseContext(member).version;
  assert.throws(
    () =>
      policy.plan(
        { ...job, destination: { ...job.destination, branch: "preview" } },
        version,
        capability("production"),
      ),
    /deployment_destination_mismatch/,
  );
  assert.throws(
    () =>
      policy.plan(
        { ...job, tenant: "other-client" },
        version,
        capability("production"),
      ),
    /deployment_tenant_mismatch/,
  );
  changeEvidence();
  assert.throws(
    () => s.approveProduction(micah, { ...request, requestId: "stale" }),
    /stale_release_version_or_evidence/,
  );
  assert.throws(
    () => s.deploymentPlan(member, { id: job.id }, capability("production")),
    /stale_deployment_job/,
  );
  assert.throws(
    () => s.approveProduction(micah, { ...request, evidenceHash: "changed" }),
    /idempotency_conflict/,
  );
});
test("missing Micah mapping and unverified preview evidence block production", async (t) => {
  const noOwner = await setup(t, { owner: false });
  assert.throws(
    () =>
      noOwner.store.approveProduction(noOwner.micah, noOwner.args("no-owner")),
    /micah_production_approval_required/,
  );
  const r = await setup(t);
  r.unverify();
  assert.throws(
    () => r.store.approveProduction(r.micah, r.args("unverified")),
    /verified_preview_evidence_required/,
  );
});
test("configuration rejects shared bindings/projects, production aliases and ambiguous destinations", () => {
  const build = (t) =>
    createPromotionPolicy({
      tenant: "maverickx",
      targets: t,
      readEvidence: () => null,
    });
  assert.throws(
    () =>
      build({
        ...targets,
        production: { ...targets.production, bindingIds: ["preview-db"] },
      }),
    /preview_production_isolation_required/,
  );
  assert.throws(
    () =>
      build({
        ...targets,
        production: { ...targets.production, project: targets.preview.project },
      }),
    /separate_projects_or_verified_broker_required/,
  );
  assert.throws(
    () =>
      build({
        ...targets,
        preview: { ...targets.preview, origin: targets.production.origin },
      }),
    /preview_production_isolation_required/,
  );
  assert.throws(
    () =>
      build({
        ...targets,
        preview: {
          ...targets.preview,
          origin: "https://PRODUCTION.fixture.invalid/",
        },
      }),
    /preview_production_isolation_required/,
  );
  assert.throws(
    () =>
      build({
        ...targets,
        preview: {
          ...targets.preview,
          origin: "https://preview.fixture.invalid/?target=production",
        },
      }),
    /invalid_deployment_origin/,
  );
});
test("team member can review and apply scoped source proposals, distinct from production approval", async (t) => {
  const { store: s, member } = await setup(t);
  const c = s.context(member);
  const a = {
    page: "/",
    component: "hero.headline",
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const f = s.feedback(member, {
    ...a,
    text: "Clarify outcome",
    requestId: "f",
  });
  const q = s.propose(member, {
    ...a,
    feedbackId: f.id,
    replacement: "Chemistry with measurable outcomes.",
    reason: "Clearer",
    requestId: "p",
  });
  s.review(member, {
    id: q.id,
    digest: q.digest,
    decision: "approved",
    requestId: "r",
  });
  const receipt = s.promote(member, {
    id: q.id,
    digest: q.digest,
    requestId: "apply",
  });
  assert.equal(receipt.deployment, "not-authorized");
});
test("source change invalidates approved deployment; agent channel cannot request or approve releases", async (t) => {
  const { store: s, member, micah, args, capability, policy } = await setup(t);
  const job = s.approveProduction(micah, args("before-source-change"));
  assert.throws(
    () => policy.member({ ...member, channel: "agent" }),
    /project_member_required/,
  );
  assert.throws(
    () => policy.production({ ...micah, channel: "agent" }),
    /project_member_required/,
  );
  const c = s.context(member),
    anchor = {
      page: "/",
      component: "hero.headline",
      baseVersion: c.source.version,
      baseHash: c.sourceHash,
    };
  const f = s.feedback(member, {
    ...anchor,
    text: "Change the source",
    requestId: "change-f",
  });
  const q = s.propose(member, {
    ...anchor,
    feedbackId: f.id,
    replacement: "Chemistry with measurable outcomes.",
    reason: "Clarity",
    requestId: "change-p",
  });
  s.review(member, {
    id: q.id,
    digest: q.digest,
    decision: "approved",
    requestId: "change-r",
  });
  s.promote(member, { id: q.id, digest: q.digest, requestId: "change-apply" });
  assert.throws(
    () => s.deploymentPlan(member, { id: job.id }, capability("production")),
    /stale_deployment_job/,
  );
});
test("recorded evidence cannot carry across runtime deployment, tenant, or preview target changes", () => {
  let proof;
  const p = createPromotionPolicy({
    tenant: "maverickx",
    targets,
    readEvidence: () => proof,
  });
  const source = {
    baseCommit: "a".repeat(40),
    contentHash: "content-hash",
    deploymentVersion: {
      deploymentCommit: "b".repeat(40),
      kvContentHash: "kv-hash",
    },
  };
  proof = {
    id: "recorded-proof",
    status: "passed",
    tenant: "maverickx",
    sourceCommit: source.baseCommit,
    sourceContentHash: source.contentHash,
    kvContentHash: "kv-hash",
    deploymentVersionHash: p.hash(source.deploymentVersion),
    previewTargetHash: p.hash(p.target("preview")),
    previewVerified: true,
    previewDeploymentId: "preview-1",
  };
  p.assertProductionEvidence(p.version(source));
  assert.throws(
    () =>
      p.version({
        ...source,
        deploymentVersion: {
          ...source.deploymentVersion,
          deploymentCommit: "c".repeat(40),
        },
      }),
    /release_evidence_required/,
  );
  const original = { ...proof };
  proof = { ...original, tenant: "other-client" };
  assert.throws(() => p.version(source), /release_evidence_required/);
  proof = { ...original, previewTargetHash: "other-target" };
  assert.throws(() => p.version(source), /release_evidence_required/);
  proof = { ...original, previewDeploymentId: " " };
  assert.throws(
    () => p.assertProductionEvidence(p.version(source)),
    /verified_preview_evidence_required/,
  );
});
