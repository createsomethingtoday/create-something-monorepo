/**
 * @create-something/orchestration
 *
 * Outbox Pattern Types: Reliable event publishing.
 *
 * Philosophy: Events must survive crashes. The outbox pattern ensures
 * at-least-once delivery by storing events in the same transaction
 * as the business operation, then publishing asynchronously.
 *
 * Canon: "The work must remain connected"—no event should be lost
 * between systems during workflow orchestration.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Event types for orchestration workflows.
 */
export type OutboxEventType =
  | 'convoy.created'
  | 'convoy.started'
  | 'convoy.completed'
  | 'convoy.failed'
  | 'worker.spawned'
  | 'worker.completed'
  | 'worker.failed'
  | 'worker.stale'
  | 'checkpoint.created'
  | 'session.started'
  | 'session.completed'
  | 'session.failed'
  | 'budget.warning'
  | 'budget.exceeded'
  | 'issue.completed'
  | 'issue.failed'
  | 'custom';

/**
 * Event status in the outbox.
 */
export type OutboxEventStatus =
  | 'pending' // Not yet published
  | 'processing' // Being published
  | 'published' // Successfully published
  | 'failed' // Failed to publish (will retry)
  | 'dead_letter'; // Exceeded retry attempts

/**
 * An event stored in the outbox.
 */
export interface OutboxEvent<T = unknown> {
  /** Unique event ID (UUID) */
  id: string;
  /** Event type */
  type: OutboxEventType;
  /** Aggregate root ID (e.g., convoy ID, worker ID) */
  aggregateId: string;
  /** Aggregate type (e.g., 'convoy', 'worker') */
  aggregateType: string;
  /** Event payload */
  payload: T;
  /** Event metadata */
  metadata: OutboxEventMetadata;
  /** Current status */
  status: OutboxEventStatus;
  /** Number of publish attempts */
  attempts: number;
  /** Last error message (if failed) */
  lastError: string | null;
  /** When the event was created */
  createdAt: string;
  /** When the event was last updated */
  updatedAt: string;
  /** When the event was published (null if not yet) */
  publishedAt: string | null;
  /** Scheduled time for next retry (null if not scheduled) */
  scheduledAt: string | null;
}

/**
 * Metadata attached to outbox events.
 */
export interface OutboxEventMetadata {
  /** Epic ID this event belongs to */
  epicId: string;
  /** Session ID that created this event */
  sessionId?: string;
  /** Convoy ID (if applicable) */
  convoyId?: string;
  /** Worker ID (if applicable) */
  workerId?: string;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Causation ID (the event that caused this one) */
  causationId?: string;
  /** Source system/component */
  source: string;
  /** Schema version for payload */
  schemaVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Publisher Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of publishing an event.
 */
export interface PublishResult {
  /** Whether the publish succeeded */
  success: boolean;
  /** Event ID */
  eventId: string;
  /** Error message (if failed) */
  error?: string;
  /** How long the publish took in ms */
  durationMs: number;
}

/**
 * A handler for a specific event type.
 */
export type EventHandler<T = unknown> = (
  event: OutboxEvent<T>
) => Promise<void>;

/**
 * Configuration for the outbox publisher.
 */
export interface OutboxConfig {
  /** Maximum retry attempts before dead-lettering (default: 5) */
  maxRetries: number;
  /** Base delay between retries in ms (default: 1000) */
  retryDelayMs: number;
  /** Maximum delay for exponential backoff in ms (default: 60000) */
  maxRetryDelayMs: number;
  /** Batch size for processing events (default: 10) */
  batchSize: number;
  /** Poll interval in ms (default: 5000) */
  pollIntervalMs: number;
  /** Whether to enable the publisher (default: true) */
  enabled: boolean;
  /** Storage path for file-based outbox (default: .orchestration/outbox) */
  storagePath: string;
}

/**
 * Default outbox configuration.
 */
export const DEFAULT_OUTBOX_CONFIG: OutboxConfig = {
  maxRetries: 5,
  retryDelayMs: 1000,
  maxRetryDelayMs: 60000,
  batchSize: 10,
  pollIntervalMs: 5000,
  enabled: true,
  storagePath: '.orchestration/outbox',
};

// ─────────────────────────────────────────────────────────────────────────────
// Event Payloads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payload for convoy events.
 */
export interface ConvoyEventPayload {
  convoyId: string;
  convoyName: string;
  epicId: string;
  issueIds: string[];
  status: string;
  totalCost?: number;
  completedIssues?: number;
  failedIssues?: number;
  error?: string;
}

/**
 * Payload for worker events.
 */
export interface WorkerEventPayload {
  workerId: string;
  convoyId: string;
  issueId: string;
  status: string;
  outcome?: string;
  costUsd?: number;
  error?: string;
  durationMs?: number;
}

/**
 * Payload for checkpoint events.
 */
export interface CheckpointEventPayload {
  checkpointId: string;
  epicId: string;
  sessionId: string;
  reason: string;
  summary: string;
  gitCommit?: string;
}

/**
 * Payload for budget events.
 */
export interface BudgetEventPayload {
  epicId: string;
  convoyId?: string;
  budget: number;
  consumed: number;
  remaining: number;
  threshold?: number;
}

/**
 * Payload for issue events.
 */
export interface IssueEventPayload {
  issueId: string;
  title: string;
  status: string;
  outcome?: string;
  workerId?: string;
  costUsd?: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query options for fetching events.
 */
export interface OutboxQueryOptions {
  /** Filter by status */
  status?: OutboxEventStatus | OutboxEventStatus[];
  /** Filter by event type */
  type?: OutboxEventType | OutboxEventType[];
  /** Filter by aggregate ID */
  aggregateId?: string;
  /** Filter by aggregate type */
  aggregateType?: string;
  /** Filter by epic ID */
  epicId?: string;
  /** Maximum number of events to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order by (default: createdAt ASC) */
  orderBy?: 'createdAt' | 'updatedAt' | 'scheduledAt';
  /** Order direction */
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Statistics about the outbox.
 */
export interface OutboxStats {
  /** Total events in outbox */
  total: number;
  /** Events by status */
  byStatus: Record<OutboxEventStatus, number>;
  /** Events by type */
  byType: Record<string, number>;
  /** Oldest pending event timestamp */
  oldestPending: string | null;
  /** Average publish duration in ms */
  avgPublishDurationMs: number;
  /** Success rate (published / (published + failed)) */
  successRate: number;
}
