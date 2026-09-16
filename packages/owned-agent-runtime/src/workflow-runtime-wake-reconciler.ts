import type { FrozenControlActivation } from './control.js';
import { activationColumns } from './control-activation-binding.js';
import type { WorkflowRuntimeQueue } from './workflow-runtime-queue.js';

/** Rebuild transport notifications from durable queued state. Losing a send or
 * a process between commit and send does not require replaying an effect.
 * The owning scheduled handler must call this periodically for its fixed release.
 */
export class D1WorkflowRuntimeWakeReconciler {
  private readonly activation: FrozenControlActivation;
  constructor(private readonly database: D1Database, activation: FrozenControlActivation,
    private readonly queue: Pick<WorkflowRuntimeQueue, 'enqueue'>) {
    this.activation = structuredClone(activation);
  }

  async reconcile(limit = 25): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('runtime_wake_limit_invalid');
    const a = this.activation;
    const rows = await this.database.prepare(`SELECT p.id,p.activation_json,r.version
      FROM control_runs p LEFT JOIN control_workflow_runtime_runs r ON r.run_id=p.id
      WHERE p.account_id=?1 AND p.tenant_id=?2 AND p.workspace_account_id=?3
        AND p.activation_id=?4 AND p.activation_version=?5 AND p.status='queued'
        AND (r.run_id IS NULL OR (r.build_binding_version=2 AND r.status='queued'))
      ORDER BY p.updated_at,p.id LIMIT ?6`)
      .bind(a.accountId,a.tenantId,a.workspaceAccountId,a.id,a.activationVersion,limit)
      .all<{id:string;activation_json:string;version:number|null}>();
    let sent = 0;
    for (const row of rows.results) {
      const frozen = JSON.parse(row.activation_json) as FrozenControlActivation;
      if (!(Object.keys(activationColumns) as Array<keyof FrozenControlActivation>)
        .every(key => JSON.stringify(frozen[key]) === JSON.stringify(a[key]))) continue;
      await this.queue.enqueue({ runId: row.id, expectedVersion: row.version });
      sent++;
    }
    return sent;
  }
}
