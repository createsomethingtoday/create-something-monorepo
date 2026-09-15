import type { RuntimeDigest, WorkflowRuntimeManifest } from '@createsomething/workflow-runtime';
import { admitWorkflowArtifact, type RegisteredWorkflowArtifact, type WorkflowArtifactAdmissionPolicy } from './workflow-artifact-admission.js';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';

/** Immutable host configuration, never request data. Reconstruct after a policy
 * change. This verifies artifact identity, not current activation/source access. */
export class RegisteredWorkflowManifestAuthority implements WorkflowRuntimeManifestAuthority {
  private readonly releases: ReadonlyArray<{
    registration: RegisteredWorkflowArtifact;
    policy: WorkflowArtifactAdmissionPolicy;
  }>;

  constructor(
    private readonly artifacts: Parameters<typeof admitWorkflowArtifact>[0],
    releases: ReadonlyArray<{registration: RegisteredWorkflowArtifact;policy: WorkflowArtifactAdmissionPolicy}>
  ) {
    this.releases = structuredClone(releases);
    const digests = this.releases.map(release => release.registration.runtimeManifestSha256);
    if (digests.some(digest => !/^sha256:[a-f0-9]{64}$/.test(digest)) || new Set(digests).size !== digests.length)
      throw new Error('runtime_manifest_registration_ambiguous');
  }

  async findByRuntimeManifestSha256(digest: RuntimeDigest): Promise<WorkflowRuntimeManifest | undefined> {
    const release = this.releases.find(entry => entry.registration.runtimeManifestSha256 === digest);
    if (!release) return undefined;
    // No verified-result cache: every resolution reads and verifies exact bytes.
    return admitWorkflowArtifact(this.artifacts, release.registration, release.policy);
  }
}
