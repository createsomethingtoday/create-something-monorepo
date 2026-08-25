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
