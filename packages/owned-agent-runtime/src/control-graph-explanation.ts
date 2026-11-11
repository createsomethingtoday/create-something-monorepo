import {
  parseWorkflowRuntimeManifest,
  type RuntimeDigest,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimeStepDefinition
} from '@createsomething/workflow-runtime';
import {
  ControlRunConflictError,
  type ControlActorRole,
  type ControlRunRecord,
  type ControlRunRepository,
  type ControlScope
} from './control.js';
import { D1ControlRunRepository } from './control-store.js';
import {
  RegisteredControlGraphBindings,
  type ControlGraphBinding,
  type ControlGraphBindingAuthority
} from './control-graph-bindings.js';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';
import {
  D1VerifiedBuildWorkflowRuntimeProofReader,
  type WorkflowRuntimeProofProjection
} from './workflow-runtime-proof-projection.js';

type Freshness = 'current' | 'stale' | 'unknown';
export interface ControlGraphLinearObservation {
  scope: ControlScope;
  id: string;
  identifier: string;
  assigneeId: string | null;
  revision: string;
  observedAt: string | null;
  evidenceRef: string;
}
export interface ControlGraphSubstrateObservation {
  scope: ControlScope;
  id: string;
  snapshotSha256: RuntimeDigest;
  observedAt: string | null;
  evidenceRef: string;
}
/** Read ports come from authenticated owning-source adapters, never request JSON. */
export interface ControlGraphSources {
  linear: {
    find(scope: ControlScope, issueId: string): Promise<ControlGraphLinearObservation | undefined>;
  };
  substrate: {
    find(
      scope: ControlScope,
      nodeId: string
    ): Promise<ControlGraphSubstrateObservation | undefined>;
  };
}
export interface ControlGraphExplanation {
  schema: 'create-something/control-graph-explanation@1';
  authority: 'read_only';
  scopeProvenance: 'scoped_control_reader' | 'identity_and_scoped_control_reader';
  authorization: 'owning_host_required';
  asOf: string;
  run: { id: string; version: number; status: ControlRunRecord['status'] };
  runtime: {
    runVersion: number;
    status: string;
    runtimeManifestSha256: RuntimeDigest;
    artifactManifestSha256: RuntimeDigest;
    buildBindingSha256: RuntimeDigest;
  };
  reason: { code: string; detail: 'observed' | 'redacted' | 'unknown' };
  frontier: { stepId: string; actionId: string; status: string; recovery: string } | null;
  nextOwner: { state: 'known' | 'unknown'; id: string | null; source: 'linear_assignee' | null };
  requiredActorRoles: ControlActorRole[];
  requirements: Array<{
    kind: string;
    status: 'observed' | 'missing' | 'unknown';
    digest: string | null;
    evidenceRef: string | null;
  }>;
  links: {
    linear:
      | (Omit<ControlGraphLinearObservation, 'scope' | 'assigneeId'> & {
          freshness: Freshness;
          snapshotSha256: RuntimeDigest;
        })
      | null;
    substrate: (Omit<ControlGraphSubstrateObservation, 'scope'> & { freshness: Freshness }) | null;
  };
  relationships: Array<{
    source: string;
    target: string;
    relation: 'declared_linear_binding' | 'declared_substrate_binding';
    bindingSha256: RuntimeDigest;
  }>;
  evidence: {
    proofSha256: RuntimeDigest;
    receipts: Array<{ id: string; sha256: RuntimeDigest; eventType: string }>;
    bindingSha256: RuntimeDigest | null;
  };
  unresolved: string[];
}
export interface ControlGraphExplanationReader {
  /** Owning transport must authorize the run through ControlRunService.get first. */
  find(input: { scope: ControlScope; runId: string }): Promise<ControlGraphExplanation | undefined>;
}
export interface ControlGraphExplanationDependencies extends ControlGraphSources {
  runs: Pick<ControlRunRepository, 'find'>;
  proofs: Pick<D1VerifiedBuildWorkflowRuntimeProofReader, 'find'>;
  manifests: WorkflowRuntimeManifestAuthority;
  bindings: ControlGraphBindingAuthority;
  approvalPolicySha256: RuntimeDigest;
  approvalPolicies: Readonly<Record<string, readonly ControlActorRole[]>>;
  clock: () => string;
  maximumAgeMs: number;
}

/** Trusted host composition only. It has no mutation, credential or executor port. */
export function createControlGraphExplanationReader(
  dependencies: ControlGraphExplanationDependencies
): ControlGraphExplanationReader {
  const policies = structuredClone(dependencies.approvalPolicies);
  const maximumAgeMs = dependencies.maximumAgeMs;
  const approvalPolicySha256 = dependencies.approvalPolicySha256;
  if (!/^sha256:[a-f0-9]{64}$/.test(approvalPolicySha256))
    throw new Error('control_graph_approval_policy_invalid');
  if (!Number.isSafeInteger(maximumAgeMs) || maximumAgeMs <= 0)
    throw new Error('control_graph_age_policy_invalid');
  for (const roles of Object.values(policies)) {
    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      roles.some((role) => !['account_owner', 'agency_operator'].includes(role))
    )
      throw new Error('control_graph_approval_roles_invalid');
  }
  return {
    async find(input) {
      const request = structuredClone(input);
      const parent = structuredClone(await dependencies.runs.find(request.scope, request.runId));
      if (!parent || !sameScope(parent, request.scope)) return undefined;
      const proof = structuredClone(await dependencies.proofs.find(request));
      if (!proof) return undefined;
      if (
        proof.schema !== 'create-something/workflow-runtime-proof@2' ||
        parent.id !== request.runId ||
        proof.run.id !== request.runId ||
        !proof.run.registration
      )
        throw new Error('control_graph_proof_identity_mismatch');
      const manifestValue = await dependencies.manifests.findByRuntimeManifestSha256(
        proof.run.runtimeManifestSha256
      );
      if (!manifestValue) throw new Error('control_graph_manifest_unavailable');
      const manifest = parseWorkflowRuntimeManifest(manifestValue);
      if (
        canonical(manifest.workflow) !== canonical(proof.run.workflow) ||
        proof.run.activation.id !== parent.activation.id ||
        proof.run.activation.version !== parent.activation.activationVersion ||
        proof.run.activation.policySha256 !== `sha256:${parent.activation.policySha256}` ||
        proof.run.registration.buildReleaseId !== parent.activation.buildReleaseId ||
        proof.run.registration.contractSha256 !== `sha256:${parent.activation.contractSha256}` ||
        proof.run.registration.runtimePolicySha256 !== `sha256:${parent.activation.policySha256}`
      )
        throw new Error('control_graph_parent_binding_mismatch');
      const lookup = {
        scope: request.scope,
        workflowId: manifest.workflow.id,
        workflowVersion: manifest.workflow.version,
        runtimeManifestSha256: proof.run.runtimeManifestSha256,
        artifactManifestSha256: proof.run.artifactManifestSha256,
        ...proof.run.registration
      };
      const found = await dependencies.bindings.find(lookup);
      // Revalidate host registrations and every lookup field even for custom ports.
      const binding = found
        ? await new RegisteredControlGraphBindings([found]).find(lookup)
        : undefined;
      if (found && !binding) throw new Error('control_graph_source_binding_mismatch');
      if (
        binding?.stepOwners.some(
          (owner) =>
            !manifest.steps.some(
              (step) => step.id === owner.stepId && step.actionId === owner.actionId
            )
        )
      )
        throw new Error('control_graph_step_binding_mismatch');
      const unresolved: string[] = [];
      const sourceReads = binding
        ? await Promise.allSettled([
            dependencies.linear.find(request.scope, binding.linearIssueId),
            dependencies.substrate.find(request.scope, binding.substrateNodeId)
          ])
        : null;
      const linear =
        sourceReads?.[0].status === 'fulfilled' ? structuredClone(sourceReads[0].value) : undefined;
      const substrate =
        sourceReads?.[1].status === 'fulfilled' ? structuredClone(sourceReads[1].value) : undefined;
      if (!binding) unresolved.push('runtime_to_linear', 'runtime_to_substrate');
      else {
        if (!linear) unresolved.push('linear_source_unavailable');
        if (!substrate) unresolved.push('substrate_source_unavailable');
      }
      if (
        linear &&
        (!sameScope(linear.scope, request.scope) ||
          linear.id !== binding!.linearIssueId ||
          linear.identifier !== binding!.linearIdentifier)
      )
        throw new Error('control_graph_linear_scope_or_identity_mismatch');
      if (
        substrate &&
        (!sameScope(substrate.scope, request.scope) || substrate.id !== binding!.substrateNodeId)
      )
        throw new Error('control_graph_substrate_scope_or_identity_mismatch');
      if (linear) {
        nonempty(linear.revision);
        nonempty(linear.evidenceRef);
        if (linear.assigneeId !== null) nonempty(linear.assigneeId);
      }
      if (substrate) {
        nonempty(substrate.evidenceRef);
        if (!/^sha256:[a-f0-9]{64}$/.test(substrate.snapshotSha256))
          throw new Error('control_graph_substrate_digest_invalid');
      }
      const [repeatedProof, repeatedParent] = await Promise.all([
        dependencies.proofs.find(request),
        dependencies.runs.find(request.scope, request.runId)
      ]);
      if (
        !repeatedProof ||
        !repeatedParent ||
        canonical(repeatedProof) !== canonical(proof) ||
        canonical(repeatedParent) !== canonical(parent)
      )
        throw new ControlRunConflictError('Control graph evidence changed during read');
      const asOf = dependencies.clock();
      const now = time(asOf);
      const freshness = (observedAt: string | null): Freshness => {
        if (observedAt === null) return 'unknown';
        const observed = time(observedAt);
        if (observed > now) throw new Error('control_graph_future_observation');
        return now - observed > maximumAgeMs ? 'stale' : 'current';
      };
      const linearFreshness = linear ? freshness(linear.observedAt) : 'unknown';
      const substrateFreshness = substrate ? freshness(substrate.observedAt) : 'unknown';
      if (linear && linearFreshness !== 'current') unresolved.push(`linear_${linearFreshness}`);
      if (substrate && substrateFreshness !== 'current')
        unresolved.push(`substrate_${substrateFreshness}`);
      const ordered = serialOrder(manifest);
      const frontier = ordered.find(
        (step) => proof.steps.find((record) => record.id === step.id)?.status !== 'succeeded'
      );
      const state = frontier ? proof.steps.find((step) => step.id === frontier.id) : undefined;
      if (frontier && !state) throw new Error('control_graph_frontier_missing');
      const result: ControlGraphExplanation = {
        schema: 'create-something/control-graph-explanation@1',
        authority: 'read_only',
        scopeProvenance: 'scoped_control_reader',
        authorization: 'owning_host_required',
        asOf,
        run: { id: parent.id, version: parent.version, status: parent.status },
        runtime: {
          runVersion: proof.run.version,
          status: proof.run.status,
          runtimeManifestSha256: proof.run.runtimeManifestSha256,
          artifactManifestSha256: proof.run.artifactManifestSha256,
          buildBindingSha256: proof.buildBinding.bindingSha256 as RuntimeDigest
        },
        reason: { code: 'ready_for_host_evaluation', detail: 'observed' },
        frontier:
          frontier && state
            ? {
                stepId: frontier.id,
                actionId: frontier.actionId,
                status: state.status,
                recovery: frontier.recovery
              }
            : null,
        nextOwner: { state: 'unknown', id: null, source: null },
        requiredActorRoles: [],
        requirements: [],
        links: {
          linear: linear
            ? {
                id: linear.id,
                identifier: linear.identifier,
                revision: linear.revision,
                observedAt: linear.observedAt,
                evidenceRef: linear.evidenceRef,
                freshness: linearFreshness,
                snapshotSha256: await hash(linear)
              }
            : null,
          substrate: substrate
            ? {
                id: substrate.id,
                snapshotSha256: substrate.snapshotSha256,
                observedAt: substrate.observedAt,
                evidenceRef: substrate.evidenceRef,
                freshness: substrateFreshness
              }
            : null
        },
        relationships: [],
        evidence: {
          proofSha256: await hash(proof),
          receipts: proof.receipts.map((receipt) => ({
            id: receipt.id,
            sha256: receipt.receiptSha256,
            eventType: receipt.eventType
          })),
          bindingSha256: binding ? await hash(binding) : null
        },
        unresolved
      };
      if (binding && result.evidence.bindingSha256) {
        const source = `control://runs/${encodeURIComponent(parent.id)}`;
        result.relationships.push(
          {
            source,
            target: `linear://issues/${encodeURIComponent(binding.linearIssueId)}`,
            relation: 'declared_linear_binding',
            bindingSha256: result.evidence.bindingSha256
          },
          {
            source,
            target: binding.substrateNodeId,
            relation: 'declared_substrate_binding',
            bindingSha256: result.evidence.bindingSha256
          }
        );
      }
      const required = (
        kind: string,
        status: 'observed' | 'missing' | 'unknown',
        digest: string | null = null,
        evidenceRef: string | null = null
      ) => result.requirements.push({ kind, status, digest, evidenceRef });
      required(
        'verified_build_binding',
        'observed',
        proof.buildBinding.bindingSha256,
        `control://runs/${encodeURIComponent(parent.id)}/proof`
      );
      required(
        'linear_binding',
        linearFreshness === 'current' ? 'observed' : 'unknown',
        null,
        linear?.evidenceRef ?? null
      );
      required(
        'substrate_binding',
        substrateFreshness === 'current' ? 'observed' : 'unknown',
        substrate?.snapshotSha256 ?? null,
        substrate?.evidenceRef ?? null
      );
      if (frontier && state) {
        const owner = binding?.stepOwners.find(
          (owner) => owner.stepId === frontier.id && owner.actionId === frontier.actionId
        );
        if (
          linearFreshness === 'current' &&
          substrateFreshness === 'current' &&
          linear?.assigneeId &&
          owner?.ownerId === linear.assigneeId
        )
          result.nextOwner = { state: 'known', id: linear.assigneeId, source: 'linear_assignee' };
        else
          result.unresolved.push(
            owner && linear?.assigneeId && owner.ownerId !== linear.assigneeId
              ? 'work_owner_conflict'
              : 'work_owner_unknown'
          );
        required(
          'compiled_step_evidence',
          'missing',
          frontier.evidenceDigest,
          `control://runs/${encodeURIComponent(parent.id)}/steps/${encodeURIComponent(frontier.id)}`
        );
      }
      const ambiguous =
        proof.steps.some((step) =>
          step.attempts.some((attempt) =>
            ['effect_ambiguous', 'abandoned'].includes(attempt.status)
          )
        ) ||
        proof.capabilityObservations.some((observation) => observation.status === 'effect_unknown');
      const rejected = frontier
        ? proof.approvals.find(
            (approval) => approval.stepId === frontier.id && approval.decision === 'rejected'
          )
        : undefined;
      const setReason = (
        code: string,
        detail: 'observed' | 'redacted' | 'unknown' = 'observed'
      ) => {
        result.reason = { code, detail };
      };
      if (ambiguous) {
        setReason('effect_reconciliation_required');
        required('source_reconciliation', 'missing');
      } else if (rejected && state?.status === 'blocked') {
        setReason('approval_rejected');
        required('owning_host_recovery_review', 'missing', rejected.bindingSha256);
      } else if (parent.status === 'stopped') setReason('run_stopped', 'redacted');
      else if (['completed', 'cancelled', 'terminated', 'failed'].includes(parent.status)) {
        setReason(parent.status);
        result.frontier = null;
        result.nextOwner = { state: 'unknown', id: null, source: null };
        result.requirements = result.requirements.filter(
          (item) => item.kind !== 'compiled_step_evidence'
        );
        result.unresolved = result.unresolved.filter(
          (item) => !['work_owner_unknown', 'work_owner_conflict'].includes(item)
        );
      } else if (
        parent.status === 'fallback_required' ||
        ['recovering', 'recovered'].includes(parent.status) ||
        state?.status === 'retryable_failure' ||
        proof.run.status === 'retryable_failure'
      ) {
        setReason('recovery_review_required');
        required('owning_host_recovery_review', 'missing');
      } else if (frontier && state) {
        if (frontier.disposition === 'stop') {
          setReason('compiled_stop');
          required('owning_host_policy_review', 'missing', frontier.evidenceDigest);
        } else if (state.pendingApproval) {
          const approval = state.pendingApproval;
          if (time(approval.expiresAt) <= now) {
            setReason('approval_expired');
            required('fresh_bound_approval', 'missing', approval.bindingSha256);
          } else {
            setReason('pending_approval');
            required(
              'bound_approval_decision',
              'missing',
              approval.bindingSha256,
              `control://runs/${encodeURIComponent(parent.id)}/approvals/${encodeURIComponent(approval.id)}`
            );
          }
          const roles =
            approvalPolicySha256 === proof.run.activation.policySha256 &&
            Object.hasOwn(policies, approval.policyId)
              ? policies[approval.policyId]
              : undefined;
          if (roles) result.requiredActorRoles = [...new Set(roles)].sort();
          else result.unresolved.push('approval_policy_roles_unknown');
        } else if (
          state.status === 'running' ||
          state.attempts.some((attempt) => attempt.status === 'prepared')
        ) {
          setReason('awaiting_capability_evidence');
          required('verified_attempt_outcome', 'missing');
        } else if (['blocked', 'failed', 'cancelled'].includes(state.status))
          setReason('blocked_detail_redacted', 'redacted');
      } else if (proof.run.status === 'completed') setReason('completed');
      else setReason('incomplete_evidence', 'unknown');
      result.unresolved = [...new Set(result.unresolved)].sort();
      return result;
    }
  };
}

function nonempty(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024)
    throw new Error('control_graph_source_field_invalid');
}
function time(value: string): number {
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new Error('control_graph_timestamp_invalid');
  return Date.parse(value);
}
function sameScope(a: ControlScope, b: ControlScope): boolean {
  return (
    a.accountId === b.accountId &&
    a.tenantId === b.tenantId &&
    a.workspaceAccountId === b.workspaceAccountId
  );
}
function canonical(value: unknown): string {
  const sorted = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(sorted)
      : input && typeof input === 'object'
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([key, value]) => [key, sorted(value)])
          )
        : input;
  return JSON.stringify(sorted(value));
}
async function hash(value: unknown): Promise<RuntimeDigest> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
function serialOrder(manifest: WorkflowRuntimeManifest) {
  const ordered: WorkflowRuntimeStepDefinition[] = [];
  let step = manifest.steps.find((step) => step.dependsOn.length === 0);
  while (step) {
    ordered.push(step);
    const current = step.id;
    step = manifest.steps.find((step) => step.dependsOn.includes(current));
  }
  return ordered;
}

/** Uses real scoped D1/Build verification independently of any execution host. */
export function createD1ControlGraphExplanationReader(
  input: Omit<ControlGraphExplanationDependencies, 'runs' | 'proofs'> & { database: D1Database }
): ControlGraphExplanationReader {
  return createControlGraphExplanationReader({
    ...input,
    runs: new D1ControlRunRepository(input.database),
    proofs: new D1VerifiedBuildWorkflowRuntimeProofReader(input.database, input.manifests)
  });
}
