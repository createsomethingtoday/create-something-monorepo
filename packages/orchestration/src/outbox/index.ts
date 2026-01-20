/**
 * @create-something/orchestration
 *
 * @pattern
 * ```yaml
 * id: outbox-v1
 * name: Outbox Pattern
 * category: ResilientWorkflow
 * description: |
 *   Ensures at-least-once event delivery by storing events in the same
 *   transaction as business operations, then publishing asynchronously.
 *   Use for convoy events, workflow notifications, audit trails.
 * priority_score: 37
 * dependencies: []
 * example_usage: |
 *   const outbox = createOutbox();
 *   await outbox.emitConvoyEvent('convoy.created', payload, { epicId });
 *   const publisher = createPublisher();
 *   publisher.on('convoy.created', handler);
 *   publisher.start();
 * llm_prompt: |
 *   Use outbox-v1 to publish events reliably. Create events with typed
 *   helpers (emitConvoyEvent, emitWorkerEvent). Start publisher to process.
 * variants: ["outbox-sqlite (planned)", "outbox-redis (planned)"]
 * inspired_by: ["Transactional Outbox Pattern", "Debezium"]
 * status: stable
 * ```
 *
 * Outbox Pattern: Reliable event publishing for workflows.
 *
 * Philosophy: Events must survive crashes. The outbox pattern ensures
 * at-least-once delivery by storing events in Git-backed JSON files,
 * then publishing asynchronously to handlers.
 *
 * Usage:
 * ```typescript
 * import { createOutbox, createPublisher } from '@create-something/orchestration';
 *
 * // Create events transactionally with business operations
 * const outbox = createOutbox();
 * await outbox.emit('convoy.created', { convoyId: '123', ... });
 *
 * // Start background publisher
 * const publisher = createPublisher();
 * publisher.on('convoy.created', async (event) => {
 *   console.log('Convoy created:', event.payload);
 * });
 * publisher.start();
 * ```
 */

// Types
export type {
  OutboxEventType,
  OutboxEventStatus,
  OutboxEvent,
  OutboxEventMetadata,
  PublishResult,
  EventHandler,
  OutboxConfig,
  ConvoyEventPayload,
  WorkerEventPayload,
  CheckpointEventPayload,
  BudgetEventPayload,
  IssueEventPayload,
  OutboxQueryOptions,
  OutboxStats,
} from './types.js';

export { DEFAULT_OUTBOX_CONFIG } from './types.js';

// Store
export { OutboxStore, getOutboxStore, resetOutboxStore } from './store.js';

// Publisher
export {
  OutboxPublisher,
  createPublisher,
  createLoggingHandler,
  createWebhookHandler,
  createFileHandler,
} from './publisher.js';

// ─────────────────────────────────────────────────────────────────────────────
// Convenience API
// ─────────────────────────────────────────────────────────────────────────────

import { getOutboxStore, OutboxStore } from './store.js';
import type {
  OutboxEventType,
  OutboxEvent,
  OutboxEventMetadata,
  OutboxConfig,
  ConvoyEventPayload,
  WorkerEventPayload,
  CheckpointEventPayload,
  BudgetEventPayload,
  IssueEventPayload,
} from './types.js';
import { DEFAULT_OUTBOX_CONFIG } from './types.js';

/**
 * Outbox facade for easy event creation.
 */
export class Outbox {
  private store: OutboxStore;

  constructor(
    config: Partial<OutboxConfig> = {},
    cwd: string = process.cwd()
  ) {
    this.store = getOutboxStore(
      { ...DEFAULT_OUTBOX_CONFIG, ...config },
      cwd
    );
  }

  /**
   * Initialize the outbox (creates directories).
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Emit a generic event.
   */
  async emit<T>(
    type: OutboxEventType,
    aggregateId: string,
    aggregateType: string,
    payload: T,
    metadata: Partial<OutboxEventMetadata> & { epicId: string; source: string }
  ): Promise<OutboxEvent<T>> {
    return this.store.create(type, aggregateId, aggregateType, payload, metadata);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Typed Event Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Emit a convoy event.
   */
  async emitConvoyEvent(
    type: 'convoy.created' | 'convoy.started' | 'convoy.completed' | 'convoy.failed',
    payload: ConvoyEventPayload,
    metadata: Partial<OutboxEventMetadata> & { epicId: string }
  ): Promise<OutboxEvent<ConvoyEventPayload>> {
    return this.store.create(
      type,
      payload.convoyId,
      'convoy',
      payload,
      { ...metadata, source: metadata.source ?? 'orchestration' }
    );
  }

  /**
   * Emit a worker event.
   */
  async emitWorkerEvent(
    type: 'worker.spawned' | 'worker.completed' | 'worker.failed' | 'worker.stale',
    payload: WorkerEventPayload,
    metadata: Partial<OutboxEventMetadata> & { epicId: string }
  ): Promise<OutboxEvent<WorkerEventPayload>> {
    return this.store.create(
      type,
      payload.workerId,
      'worker',
      payload,
      { ...metadata, source: metadata.source ?? 'orchestration', convoyId: payload.convoyId }
    );
  }

  /**
   * Emit a checkpoint event.
   */
  async emitCheckpointEvent(
    payload: CheckpointEventPayload,
    metadata: Partial<OutboxEventMetadata> & { epicId: string }
  ): Promise<OutboxEvent<CheckpointEventPayload>> {
    return this.store.create(
      'checkpoint.created',
      payload.checkpointId,
      'checkpoint',
      payload,
      { ...metadata, source: metadata.source ?? 'orchestration' }
    );
  }

  /**
   * Emit a budget event.
   */
  async emitBudgetEvent(
    type: 'budget.warning' | 'budget.exceeded',
    payload: BudgetEventPayload,
    metadata: Partial<OutboxEventMetadata> & { epicId: string }
  ): Promise<OutboxEvent<BudgetEventPayload>> {
    return this.store.create(
      type,
      payload.convoyId ?? payload.epicId,
      payload.convoyId ? 'convoy' : 'epic',
      payload,
      { ...metadata, source: metadata.source ?? 'orchestration' }
    );
  }

  /**
   * Emit an issue event.
   */
  async emitIssueEvent(
    type: 'issue.completed' | 'issue.failed',
    payload: IssueEventPayload,
    metadata: Partial<OutboxEventMetadata> & { epicId: string }
  ): Promise<OutboxEvent<IssueEventPayload>> {
    return this.store.create(
      type,
      payload.issueId,
      'issue',
      payload,
      { ...metadata, source: metadata.source ?? 'orchestration' }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get pending events count.
   */
  async getPendingCount(): Promise<number> {
    const events = await this.store.getPendingEvents();
    return events.length;
  }

  /**
   * Get outbox statistics.
   */
  async getStats() {
    return this.store.getStats();
  }

  /**
   * Get the underlying store (for advanced operations).
   */
  getStore(): OutboxStore {
    return this.store;
  }
}

/**
 * Create an outbox instance.
 */
export function createOutbox(
  config?: Partial<OutboxConfig>,
  cwd?: string
): Outbox {
  return new Outbox(config, cwd);
}
