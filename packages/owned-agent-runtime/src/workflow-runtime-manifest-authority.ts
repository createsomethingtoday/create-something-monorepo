import type { RuntimeDigest, WorkflowRuntimeManifest } from '@createsomething/workflow-runtime';

/**
 * Resolves manifests already verified against their serialized artifact digest.
 * Control ports must not accept a caller-supplied manifest for persisted proof
 * or approval context.
 */
export interface WorkflowRuntimeManifestAuthority {
  findByRuntimeManifestSha256(
    runtimeManifestSha256: RuntimeDigest
  ): Promise<WorkflowRuntimeManifest | undefined>;
}

/** Compiler-produced approval-surface schemas accepted by the internal A3 lane. */
export type WorkflowRuntimeApprovalSurfaceSchema =
  | 'approval_surfaces.v0.1'
  | 'approval_surfaces.v0.2'
  | 'approval_surfaces.v0.3';

/**
 * A trusted Control-side lookup binds a persisted runtime-manifest digest to
 * its exact compiled approval-surface artifact. It is intentionally a port:
 * no caller-supplied approval surface can enter the D1 checkpoint path.
 */
export interface WorkflowRuntimeApprovalSurface {
  schemaVersion: WorkflowRuntimeApprovalSurfaceSchema;
  sha256: RuntimeDigest;
}

export interface WorkflowRuntimeApprovalSurfaceAuthority {
  findByRuntimeManifestSha256(
    runtimeManifestSha256: RuntimeDigest
  ): Promise<WorkflowRuntimeApprovalSurface | undefined>;
}

export const WORKFLOW_RUNTIME_APPROVAL_COMMAND = {
  schema: 'create-something/control-workflow-runtime-approval-command@1',
  version: 1
} as const;
