import type { FrozenControlActivation } from './control.js';
import { activationColumns } from './control-activation-binding.js';
import type { RegisteredWorkflowArtifact } from './workflow-artifact-admission.js';

/** Agency registration lookup only. Every new claim must repeat authority and
 * signer-policy checks; a prior lookup is not a durable execution permit. */
export class D1WorkflowArtifactRegistrationReader {
  constructor(private readonly database: D1Database) {}

  async find(activationInput: FrozenControlActivation): Promise<RegisteredWorkflowArtifact | undefined> {
    const activation = structuredClone(activationInput);
    if (activation.status !== 'active') return undefined;
    const values: unknown[] = [];
    const matches = Object.entries(activationColumns).map(([key, column]) => {
      const value = activation[key as keyof FrozenControlActivation];
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
      return `a.${column} = ?${values.length}`;
    });
    const row = await this.database.prepare(`
      SELECT r.artifact_manifest_sha256 AS artifactManifestSha256,
        r.runtime_manifest_sha256 AS runtimeManifestSha256,
        r.workflow_id AS workflowId, r.workflow_version AS workflowVersion,
        r.definition_hash AS definitionHash, r.compiler_version AS compilerVersion,
        r.runtime_manifest_schema AS runtimeManifestSchema,
        r.attestation_key_id AS attestationKeyId,
        r.attestation_public_key_fingerprint AS attestationPublicKeyFingerprint
      FROM customer_control_runtime_registrations r
      JOIN customer_control_activations a ON a.id = r.activation_id
        AND a.activation_version = r.activation_version
        AND a.account_id = r.account_id AND a.tenant_id = r.tenant_id
        AND a.workspace_account_id = r.workspace_account_id
        AND a.build_release_id = r.build_release_id
        AND a.contract_sha256 = r.contract_sha256
        AND a.policy_sha256 = r.runtime_policy_sha256
      WHERE a.status = 'active' AND ${matches.join(' AND ')}
    `).bind(...values).first<RegisteredWorkflowArtifact>();
    return row ? Object.freeze({ ...row }) : undefined;
  }
}
