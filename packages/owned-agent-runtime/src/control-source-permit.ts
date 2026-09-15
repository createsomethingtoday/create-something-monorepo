import type { FrozenControlActivation } from './control.js';

// Explicit mapping makes the atomic predicate cover every frozen authority field.
const activationColumns = {
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

/** Host-only authority. Call only after the exact durable effect intent is verified. */
export class D1ControlSourcePermitAuthority {
  constructor(
    private readonly agencyDatabase: D1Database,
    private readonly clock: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID()
  ) {}

  async redeem(input: {
    activation: FrozenControlActivation;
    runId: string;
    stepId: string;
    attemptId: string;
    requestSha256: string;
    tool: string;
    resource: string;
  }): Promise<{ permitId: string; redeemedAt: string } | undefined> {
    const { activation } = input;
    if (activation.status !== 'active' || !activation.allowedTools.includes(input.tool) ||
        !activation.allowedResources.includes(input.resource)) return undefined;
    for (const [value, maximum] of [[input.runId, 160], [input.stepId, 160], [input.attemptId, 240]] as const) {
      if (typeof value !== 'string' || !value || value !== value.trim() || value.length > maximum)
        throw new Error('invalid_source_permit_binding');
    }
    for (const value of [input.tool, input.resource]) {
      if (!value || value.length > 300 || value !== value.trim().replace(/\s+/g, ' '))
        throw new Error('invalid_source_permit_source');
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(input.requestSha256))
      throw new Error('invalid_source_permit_request');
    const permitId = this.id();
    const redeemedAt = this.clock().toISOString();
    const values: unknown[] = [permitId, input.runId, input.stepId, input.attemptId,
      input.requestSha256, input.tool, input.resource, redeemedAt];
    const matches = Object.entries(activationColumns).map(([key, column]) => {
      const value = activation[key as keyof FrozenControlActivation];
      values.push(Array.isArray(value) ? JSON.stringify(value) : value);
      return `a.${column} = ?${values.length}`;
    });
    // One statement serializes suspension/supersession against redemption in
    // Agency D1. A lost response is ambiguous: a repeated call returns no permit.
    const row = await this.agencyDatabase.prepare(`
      INSERT INTO customer_control_source_permits (
        permit_id, activation_id, activation_version, account_id, tenant_id,
        workspace_account_id, run_id, step_id, attempt_id, request_sha256,
        tool, resource, redeemed_at
      ) SELECT ?1, a.id, a.activation_version, a.account_id, a.tenant_id,
        a.workspace_account_id, ?2, ?3, ?4, ?5, ?6, ?7, ?8
      FROM customer_control_activations a
      WHERE a.status = 'active' AND ${matches.join(' AND ')}
        AND NOT EXISTS (SELECT 1 FROM customer_control_source_permits p
          WHERE p.run_id = ?2 AND p.step_id = ?3 AND p.attempt_id = ?4)
      RETURNING permit_id, redeemed_at
    `).bind(...values).first<{ permit_id: string; redeemed_at: string }>();
    return row ? { permitId: row.permit_id, redeemedAt: row.redeemed_at } : undefined;
  }
}
