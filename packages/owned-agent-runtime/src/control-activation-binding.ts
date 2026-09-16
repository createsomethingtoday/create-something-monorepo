import type { FrozenControlActivation } from './control.js';

// Explicit mapping makes the atomic predicate cover every frozen authority field.
export const activationColumns = {
  id: 'id', activationVersion: 'activation_version', activationKind: 'activation_kind',
  status: 'status', accountId: 'account_id', tenantId: 'tenant_id',
  workspaceAccountId: 'workspace_account_id', mapId: 'map_id', mapVersionId: 'map_version_id',
  mapVersion: 'map_version', mapCanvasSha256: 'map_canvas_sha256', handoffId: 'handoff_id',
  handoffReceiptSha256: 'handoff_receipt_sha256', buildReleaseId: 'build_release_id',
  buildManifestSha256: 'build_manifest_sha256', buildArtifactSetSha256: 'build_artifact_set_sha256',
  buildAcceptanceReceiptId: 'build_acceptance_receipt_id',
  buildAcceptanceReceiptSha256: 'build_acceptance_receipt_sha256', policyVersion: 'policy_version',
  policySha256: 'policy_sha256', contractSha256: 'contract_sha256',
  entitlementSnapshotSha256: 'entitlement_snapshot_sha256',
  allowedTools: 'allowed_tools_json', allowedResources: 'allowed_resources_json'
} satisfies Record<keyof FrozenControlActivation, string>;

