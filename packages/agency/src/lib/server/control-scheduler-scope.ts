export interface ControlSchedulerScope {
  activationId: string;
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
}

export async function findControlSchedulerActivationScope(
  db: D1Database,
  scope: ControlSchedulerScope
): Promise<{ allowed: true; activation_id: string } | { allowed: false; reason: string }> {
  const row = await db
    .prepare(
      `SELECT id
         FROM customer_control_activations
        WHERE id = ?
          AND account_id = ?
          AND tenant_id = ?
          AND workspace_account_id = ?
        LIMIT 1`
    )
    .bind(scope.activationId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
    .first<{ id: string }>();
  return row?.id
    ? { allowed: true, activation_id: row.id }
    : { allowed: false, reason: 'control_activation_scope_required' };
}
