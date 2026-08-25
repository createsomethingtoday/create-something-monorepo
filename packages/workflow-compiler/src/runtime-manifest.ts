import { createHash } from 'node:crypto';

import type {
  CompiledDecisionV0_3,
  CompiledWorkflowBundle,
  CompiledWorkflowBundleV0_3
} from './types.js';

export interface WorkflowRuntimeManifestArtifact {
  schemaVersion: 'workflow_runtime_manifest.v0.1';
  runtimeCompatibility: 'workflow-runtime.v0.1';
  target: 'create-something/control-runtime.v1';
  workflow: {
    id: string;
    version: string;
    definitionHash: string;
    compilerVersion: string;
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3';
  };
  artifacts: {
    governedInteractionSha256: string;
    decisionInventorySha256: string;
    approvalSurfacesSha256: string;
    toolContractsSha256: string;
  };
  steps: Array<
    | {
        id: string;
        actionId: string;
        dependsOn: string[];
        disposition: 'pass';
        capability: { id: string; parameterDigest: string };
        evidenceDigest: string;
        recovery: 'manual_fallback';
      }
    | {
        id: string;
        actionId: string;
        dependsOn: string[];
        disposition: 'wait';
        approval: { policyId: string; expiresAt: string };
        evidenceDigest: string;
        recovery: 'manual_fallback';
      }
    | {
        id: string;
        actionId: string;
        dependsOn: string[];
        disposition: 'stop';
        reason: string;
        evidenceDigest: string;
        recovery: 'manual_fallback';
      }
  >;
}

export interface WorkflowRuntimeManifestInput {
  schemaVersion: 'workflow_runtime_manifest_input.v0.1';
  target: 'create-something/control-runtime.v1';
  approvalExpiresAt: string;
  steps: Array<{ id: string; actionId: string; dependsOn: string[] }>;
}

export class WorkflowRuntimeManifestError extends Error {
  constructor(
    readonly code: 'INVALID_RUNTIME_MANIFEST_INPUT' | 'UNSUPPORTED_RUNTIME_SOURCE',
    message: string
  ) {
    super(message);
  }
}

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function content(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(content(value)).digest('hex')}`;
}

function digest(value: unknown): string {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')}`;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      `${label} must be a non-empty bounded string`
    );
  }
  return value.trim();
}

function sortedIds(value: unknown, label: string): string[] {
  if (!Array.isArray(value))
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      `${label} must be an array`
    );
  const result = value.map((entry) => text(entry, `${label} entry`));
  if (
    new Set(result).size !== result.length ||
    result.some((entry, index) => index > 0 && result[index - 1] >= entry)
  ) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      `${label} must be sorted and unique`
    );
  }
  return result;
}

function runtimeBundle(bundle: CompiledWorkflowBundle): CompiledWorkflowBundleV0_3 {
  if (bundle.schemaVersion !== 'compiled_workflow_bundle.v0.3') {
    throw new WorkflowRuntimeManifestError(
      'UNSUPPORTED_RUNTIME_SOURCE',
      'Control runtime artifacts require the explicit compiled_workflow_bundle.v0.3 source family.'
    );
  }
  return bundle;
}

function decisionEvidenceDigest(decision: CompiledDecisionV0_3): string {
  return digest({
    actionId: decision.actionId,
    requiredEvidence: decision.requiredEvidence,
    requiredEvidenceValues: decision.requiredEvidenceValues ?? null,
    requiredEvidenceMatchers: decision.requiredEvidenceMatchers ?? null
  });
}

function stepFromDecision(
  decision: CompiledDecisionV0_3,
  input: { id: string; dependsOn: string[] },
  approvalExpiresAt: string,
  workflowId: string
): WorkflowRuntimeManifestArtifact['steps'][number] {
  const shared = {
    id: input.id,
    actionId: decision.actionId,
    dependsOn: input.dependsOn,
    evidenceDigest: decisionEvidenceDigest(decision),
    recovery: 'manual_fallback' as const
  };
  if (decision.autonomy === 'auto_allow') {
    const tool = decision.toolContract;
    return {
      ...shared,
      disposition: 'pass',
      capability: {
        id: tool
          ? `${tool.targetSystemId}:${tool.name}`
          : `workflow:${workflowId}:${decision.actionId}`,
        parameterDigest: digest({ actionId: decision.actionId, toolContract: tool ?? null })
      }
    };
  }
  if (decision.autonomy === 'approval_required') {
    if (!decision.approvalOwner) {
      throw new WorkflowRuntimeManifestError(
        'INVALID_RUNTIME_MANIFEST_INPUT',
        `Approval-required action ${decision.actionId} has no approval owner.`
      );
    }
    return {
      ...shared,
      disposition: 'wait',
      approval: { policyId: decision.approvalOwner, expiresAt: approvalExpiresAt }
    };
  }
  return { ...shared, disposition: 'stop', reason: `autonomy_${decision.autonomy}` };
}

export function createWorkflowRuntimeManifest(
  source: CompiledWorkflowBundle,
  input: WorkflowRuntimeManifestInput
): WorkflowRuntimeManifestArtifact {
  const bundle = runtimeBundle(source);
  if (
    !input ||
    typeof input !== 'object' ||
    input.schemaVersion !== 'workflow_runtime_manifest_input.v0.1' ||
    input.target !== 'create-something/control-runtime.v1'
  ) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime manifest input must name the v1 Control target.'
    );
  }
  if (
    typeof input.approvalExpiresAt !== 'string' ||
    !INSTANT.test(input.approvalExpiresAt) ||
    Number.isNaN(Date.parse(input.approvalExpiresAt))
  ) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime approval expiry must be an ISO-8601 UTC instant.'
    );
  }
  if (!Array.isArray(input.steps) || input.steps.length === 0 || input.steps.length > 100) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime manifest input must contain a bounded non-empty step list.'
    );
  }
  const steps = input.steps.map((entry) => {
    if (!entry || typeof entry !== 'object')
      throw new WorkflowRuntimeManifestError(
        'INVALID_RUNTIME_MANIFEST_INPUT',
        'Runtime step input must be an object.'
      );
    return {
      id: text(entry.id, 'Runtime step ID'),
      actionId: text(entry.actionId, 'Runtime action ID'),
      dependsOn: sortedIds(entry.dependsOn, 'Runtime step dependencies')
    };
  });
  if (
    new Set(steps.map((entry) => entry.id)).size !== steps.length ||
    new Set(steps.map((entry) => entry.actionId)).size !== steps.length
  ) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime step and action IDs must each be unique.'
    );
  }
  if (steps.filter((entry) => entry.dependsOn.length === 0).length !== 1) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime v1 requires exactly one initial step.'
    );
  }
  const ids = new Set(steps.map((entry) => entry.id));
  if (steps.some((entry) => entry.dependsOn.some((dependency) => !ids.has(dependency)))) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime step dependency is not declared in the same manifest.'
    );
  }
  const dependents = new Map(steps.map((entry) => [entry.id, [] as string[]]));
  for (const step of steps) {
    if (step.dependsOn.length > 1) {
      throw new WorkflowRuntimeManifestError(
        'INVALID_RUNTIME_MANIFEST_INPUT',
        'Runtime v1 permits exactly one predecessor for each non-initial step.'
      );
    }
    for (const dependency of step.dependsOn) dependents.get(dependency)!.push(step.id);
  }
  if ([...dependents.values()].some((children) => children.length > 1)) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime v1 permits one deterministic successor per step.'
    );
  }
  const initial = steps.find((entry) => entry.dependsOn.length === 0)!;
  const visited = new Set<string>();
  let current: string | undefined = initial.id;
  while (current) {
    if (visited.has(current))
      throw new WorkflowRuntimeManifestError(
        'INVALID_RUNTIME_MANIFEST_INPUT',
        'Runtime step graph must be a finite serial chain.'
      );
    visited.add(current);
    current = dependents.get(current)?.[0];
  }
  if (visited.size !== steps.length) {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime v1 step chain must be reachable from its initial step.'
    );
  }
  const decisions = new Map(
    bundle.decisionInventory.decisions.map((decision) => [decision.actionId, decision])
  );
  return {
    schemaVersion: 'workflow_runtime_manifest.v0.1',
    runtimeCompatibility: 'workflow-runtime.v0.1',
    target: 'create-something/control-runtime.v1',
    workflow: {
      id: bundle.workflowId,
      version: bundle.workflowVersion,
      definitionHash: bundle.definitionHash,
      compilerVersion: bundle.compilerVersion,
      compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
    },
    artifacts: {
      governedInteractionSha256: sha256(bundle.governedInteraction),
      decisionInventorySha256: sha256(bundle.decisionInventory),
      approvalSurfacesSha256: sha256(bundle.approvalSurfaces),
      toolContractsSha256: sha256(bundle.toolContracts)
    },
    steps: steps.map((entry) => {
      const decision = decisions.get(entry.actionId);
      if (!decision)
        throw new WorkflowRuntimeManifestError(
          'INVALID_RUNTIME_MANIFEST_INPUT',
          `Runtime step references unknown compiled action ${entry.actionId}.`
        );
      return stepFromDecision(decision, entry, input.approvalExpiresAt, bundle.workflowId);
    })
  };
}

export function validateWorkflowRuntimeManifestArtifact(
  source: CompiledWorkflowBundle,
  manifest: WorkflowRuntimeManifestArtifact
): void {
  const bundle = runtimeBundle(source);
  try {
    if (!manifest || !Array.isArray(manifest.steps) || manifest.steps.length === 0) {
      throw new Error('runtime manifest has no steps');
    }
    const waiting = manifest.steps.filter((step) => step.disposition === 'wait');
    const approvalExpiresAt = waiting[0]?.approval.expiresAt ?? '1970-01-01T00:00:00.000Z';
    if (waiting.some((step) => step.approval.expiresAt !== approvalExpiresAt)) {
      throw new Error('runtime manifest does not use one exact approval expiry');
    }
    const expected = createWorkflowRuntimeManifest(bundle, {
      schemaVersion: 'workflow_runtime_manifest_input.v0.1',
      target: 'create-something/control-runtime.v1',
      approvalExpiresAt,
      steps: manifest.steps.map((step) => ({
        id: step.id,
        actionId: step.actionId,
        dependsOn: step.dependsOn
      }))
    });
    if (JSON.stringify(canonicalize(expected)) !== JSON.stringify(canonicalize(manifest))) {
      throw new Error('runtime manifest differs from re-derived compiler output');
    }
  } catch {
    throw new WorkflowRuntimeManifestError(
      'INVALID_RUNTIME_MANIFEST_INPUT',
      'Runtime manifest does not match the exact compiled workflow artifact family.'
    );
  }
}
