import { z } from 'zod';
import type { WorkflowRuntimeCheckpointStore, WorkflowRuntimeScope } from '@createsomething/workflow-runtime';
import { ControlRunConflictError, type ControlRunRepository } from './control.js';

const messageSchema = z.object({
  schema: z.literal('control-runtime-wake@1'),
  runId: z.string().min(1).max(180),
  expectedVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable()
}).strict();
export type WorkflowRuntimeWake = z.infer<typeof messageSchema>;

/** The transport carries no tenant, actor, activation or executable capability.
 * Those authorities are fixed by the owning worker's consumer composition.
 */
export class WorkflowRuntimeQueue {
  private readonly scope: WorkflowRuntimeScope;
  constructor(input: {
    scope: WorkflowRuntimeScope;
    checkpoints: Pick<WorkflowRuntimeCheckpointStore, 'find'>;
    parents: Pick<ControlRunRepository, 'find'>;
    send(message: WorkflowRuntimeWake): Promise<void>;
    process(runId: string, idempotencyKey: string): Promise<unknown>;
  }) { this.scope = structuredClone(input.scope); this.ports = input; }
  private readonly ports;

  async enqueue(input: { runId: string; expectedVersion: number | null }): Promise<void> {
    const message = messageSchema.parse({ schema: 'control-runtime-wake@1', ...input });
    const run = await this.ports.checkpoints.find(this.scope, message.runId);
    if (message.expectedVersion === null) {
      const parent = await this.ports.parents.find(this.scope, message.runId);
      if (run || !parent || parent.status !== 'queued') throw new Error('runtime_wake_initial_parent_mismatch');
    } else if (!run || run.version !== message.expectedVersion || run.status !== 'queued')
        throw new Error('runtime_wake_checkpoint_mismatch');
    await this.ports.send(message);
  }

  async consume(value: unknown): Promise<'ack' | 'retry'> {
    const parsed = messageSchema.safeParse(value);
    if (!parsed.success) return 'ack';
    const message = parsed.data;
    const run = await this.ports.checkpoints.find(this.scope, message.runId);
    if (message.expectedVersion === null) {
      if (run) return 'ack';
    } else {
      if (!run || run.version > message.expectedVersion || run.status !== 'queued') return 'ack';
      if (run.version < message.expectedVersion) return 'retry';
    }
    const parent = await this.ports.parents.find(this.scope, message.runId);
    if (!parent) return 'ack';
    // Approval persists the runtime decision before requeueing the parent.
    // A wake arriving in that interval must not disappear or start an executor.
    if (parent.status === 'waiting_for_approval' || parent.status === 'running') return 'retry';
    if (parent.status !== 'queued') return 'ack';
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(message)));
    const key = `runtime-wake:${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
    try { await this.ports.process(message.runId, key); }
    catch (error) {
      if (error instanceof ControlRunConflictError) return 'retry';
      throw error;
    }
    return 'ack';
  }
}
