import { createHash } from "node:crypto";
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const denied = (code) => {
  throw Error(code);
};
export const isTeamMember = (p) =>
  p?.channel === "review-ui" && ["member", "reviewer"].includes(p.role);
// Constructed by the server, never from a request body or token role claim.
export function createPromotionPolicy({
  tenant,
  productionApprover = null,
  targets,
  readEvidence,
}) {
  const config = structuredClone({ tenant, productionApprover, targets });
  for (const environment of ["preview", "production"]) {
    const t = config.targets?.[environment];
    if (
      !t ||
      t.environment !== environment ||
      t.provider !== "cloudflare-pages" ||
      typeof t.project !== "string" ||
      !t.project ||
      typeof t.branch !== "string" ||
      !t.branch ||
      !Array.isArray(t.bindingIds) ||
      !t.bindingIds.length ||
      t.bindingIds.some((x) => typeof x !== "string" || !x)
    )
      denied("invalid_deployment_target");
    const u = new URL(t.origin);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash
    )
      denied("invalid_deployment_origin");
    t.origin = u.origin;
  }
  const a = config.targets.preview,
    b = config.targets.production;
  if (
    a.origin === b.origin ||
    a.branch === b.branch ||
    a.bindingIds.some((x) => b.bindingIds.includes(x))
  )
    denied("preview_production_isolation_required");
  // Plain Pages project credentials may span branches. Require separate projects
  // until an independently verified preview-only broker adapter exists.
  if (a.project === b.project)
    denied("separate_projects_or_verified_broker_required");
  const target = (environment) => {
    if (!Object.hasOwn(config.targets, environment))
      denied("unknown_destination");
    return structuredClone(config.targets[environment]);
  };
  function member(p) {
    if (p?.tenant !== tenant || !isTeamMember(p))
      denied("project_member_required");
  }
  function production(p) {
    member(p);
    const owner = config.productionApprover;
    if (!owner || p.issuer !== owner.issuer || p.subject !== owner.subject)
      denied("micah_production_approval_required");
  }
  function version(source) {
    const proof = readEvidence(tenant, source);
    if (
      !source.baseCommit ||
      !source.contentHash ||
      !source.deploymentVersion ||
      !proof ||
      proof.status !== "passed" ||
      proof.tenant !== tenant ||
      proof.deploymentVersionHash !== hash(source.deploymentVersion) ||
      proof.previewTargetHash !== hash(target("preview")) ||
      proof.sourceCommit !== source.baseCommit ||
      proof.sourceContentHash !== source.contentHash ||
      proof.kvContentHash !== source.deploymentVersion.kvContentHash ||
      typeof proof.id !== "string" ||
      !proof.id.trim()
    )
      denied("release_evidence_required");
    return {
      sourceHash: hash(source),
      sourceCommit: source.baseCommit,
      sourceContentHash: source.contentHash,
      deploymentVersion: source.deploymentVersion,
      evidenceHash: hash(proof),
      evidenceId: proof.id,
      previewVerified: proof.previewVerified === true,
      previewDeploymentId: proof.previewDeploymentId || null,
    };
  }
  return {
    member,
    production,
    version,
    target,
    describe: (p) => ({
      preview: isTeamMember(p) && p.tenant === tenant,
      productionApproval:
        !!config.productionApprover &&
        p.issuer === config.productionApprover.issuer &&
        p.subject === config.productionApprover.subject &&
        isTeamMember(p),
    }),
    assertRequest(a, v, environment) {
      if (a.sourceHash !== v.sourceHash || a.evidenceHash !== v.evidenceHash)
        denied("stale_release_version_or_evidence");
      if (a.targetHash !== hash(target(environment)))
        denied("stale_deployment_destination");
    },
    assertProductionEvidence(v) {
      if (
        !v.previewVerified ||
        typeof v.previewDeploymentId !== "string" ||
        !v.previewDeploymentId.trim()
      )
        denied("verified_preview_evidence_required");
    },
    // Internal executor preflight only. There is deliberately no Cloudflare call.
    plan(job, currentVersion, capability) {
      if (job.tenant !== tenant) denied("deployment_tenant_mismatch");
      const expected = target(job.environment);
      if (hash(job.destination) !== hash(expected))
        denied("deployment_destination_mismatch");
      if (hash(job.version) !== hash(currentVersion))
        denied("stale_deployment_job");
      if (
        capability?.tenant !== tenant ||
        capability.environment !== job.environment ||
        capability.project !== expected.project ||
        capability.targetHash !== hash(expected)
      )
        denied("credential_scope_mismatch");
      if (job.environment === "production") {
        const owner = config.productionApprover;
        if (
          !owner ||
          job.approval?.issuer !== owner.issuer ||
          job.approval?.subject !== owner.subject ||
          job.approval?.versionHash !== hash(currentVersion) ||
          job.approval?.targetHash !== hash(expected)
        )
          denied("production_approval_required");
      }
      return {
        environment: job.environment,
        destination: expected,
        version: currentVersion,
        execution: "not-executed",
        requiresExternalDeploymentAuthorization: true,
      };
    },
    hash,
  };
}
