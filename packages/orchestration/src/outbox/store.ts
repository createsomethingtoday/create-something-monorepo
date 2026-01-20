/**
 * @create-something/orchestration
 *
 * Outbox Store: File-based event storage.
 *
 * Philosophy: Store events as JSON files in Git for durability.
 * This enables recovery after crashes and audit trails.
 *
 * File structure:
 * .orchestration/outbox/
 * ├── pending/
 * │   └── {eventId}.json
 * ├── processing/
 * │   └── {eventId}.json
 * ├── published/
 * │   └── {date}/
 * │       └── {eventId}.json
 * └── dead_letter/
 *     └── {eventId}.json
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  OutboxEvent,
  OutboxEventStatus,
  OutboxEventType,
  OutboxEventMetadata,
  OutboxQueryOptions,
  OutboxStats,
  OutboxConfig,
} from './types.js';
import { DEFAULT_OUTBOX_CONFIG } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Outbox Store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * File-based outbox store.
 */
export class OutboxStore {
  private basePath: string;
  private initialized = false;

  constructor(
    private config: OutboxConfig = DEFAULT_OUTBOX_CONFIG,
    private cwd: string = process.cwd()
  ) {
    this.basePath = path.join(this.cwd, this.config.storagePath);
  }

  /**
   * Initialize the store (create directories).
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(path.join(this.basePath, 'pending'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'processing'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'published'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'dead_letter'), { recursive: true });

    this.initialized = true;
  }

  /**
   * Create a new event in the outbox.
   */
  async create<T>(
    type: OutboxEventType,
    aggregateId: string,
    aggregateType: string,
    payload: T,
    metadata: Partial<OutboxEventMetadata> & { epicId: string; source: string }
  ): Promise<OutboxEvent<T>> {
    await this.initialize();

    const now = new Date().toISOString();
    const event: OutboxEvent<T> = {
      id: randomUUID(),
      type,
      aggregateId,
      aggregateType,
      payload,
      metadata: {
        correlationId: metadata.correlationId ?? randomUUID(),
        schemaVersion: '1.0',
        ...metadata,
      },
      status: 'pending',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      scheduledAt: null,
    };

    await this.writeEvent(event);
    return event;
  }

  /**
   * Get an event by ID.
   */
  async get<T = unknown>(eventId: string): Promise<OutboxEvent<T> | null> {
    await this.initialize();

    // Check all directories
    for (const status of ['pending', 'processing', 'dead_letter'] as const) {
      const filePath = path.join(this.basePath, status, `${eventId}.json`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as OutboxEvent<T>;
      } catch {
        // Not in this directory, continue
      }
    }

    // Check published (by date subdirectories)
    try {
      const publishedDir = path.join(this.basePath, 'published');
      const dates = await fs.readdir(publishedDir);
      for (const date of dates) {
        const filePath = path.join(publishedDir, date, `${eventId}.json`);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as OutboxEvent<T>;
        } catch {
          // Not in this date, continue
        }
      }
    } catch {
      // Published directory might not exist
    }

    return null;
  }

  /**
   * Update an event's status.
   */
  async updateStatus(
    eventId: string,
    newStatus: OutboxEventStatus,
    error?: string
  ): Promise<OutboxEvent | null> {
    await this.initialize();

    const event = await this.get(eventId);
    if (!event) return null;

    const oldStatus = event.status;

    // Remove from old location
    await this.deleteEvent(eventId, oldStatus);

    // Update event
    event.status = newStatus;
    event.updatedAt = new Date().toISOString();

    if (error) {
      event.lastError = error;
      event.attempts++;
    }

    if (newStatus === 'published') {
      event.publishedAt = new Date().toISOString();
    }

    // Write to new location
    await this.writeEvent(event);

    return event;
  }

  /**
   * Mark an event as processing.
   */
  async markProcessing(eventId: string): Promise<OutboxEvent | null> {
    return this.updateStatus(eventId, 'processing');
  }

  /**
   * Mark an event as published.
   */
  async markPublished(eventId: string): Promise<OutboxEvent | null> {
    return this.updateStatus(eventId, 'published');
  }

  /**
   * Mark an event as failed (will retry).
   */
  async markFailed(eventId: string, error: string): Promise<OutboxEvent | null> {
    const event = await this.get(eventId);
    if (!event) return null;

    // Check if we should dead-letter
    if (event.attempts >= this.config.maxRetries) {
      return this.updateStatus(eventId, 'dead_letter', error);
    }

    // Schedule retry with exponential backoff
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(2, event.attempts),
      this.config.maxRetryDelayMs
    );

    const result = await this.updateStatus(eventId, 'failed', error);
    if (result) {
      result.scheduledAt = new Date(Date.now() + delay).toISOString();
      await this.writeEvent(result);
    }

    return result;
  }

  /**
   * Get pending events ready for processing.
   */
  async getPendingEvents(limit?: number): Promise<OutboxEvent[]> {
    await this.initialize();

    const events = await this.queryByStatus('pending');

    // Also include failed events that are scheduled for retry
    const failedEvents = await this.queryByStatus('failed');
    const now = Date.now();
    const readyFailed = failedEvents.filter((e) => {
      if (!e.scheduledAt) return true;
      return new Date(e.scheduledAt).getTime() <= now;
    });

    const allReady = [...events, ...readyFailed].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return limit ? allReady.slice(0, limit) : allReady;
  }

  /**
   * Query events with options.
   */
  async query<T = unknown>(options: OutboxQueryOptions = {}): Promise<OutboxEvent<T>[]> {
    await this.initialize();

    let events: OutboxEvent<T>[] = [];

    // Collect events from relevant directories
    const statuses = options.status
      ? Array.isArray(options.status)
        ? options.status
        : [options.status]
      : ['pending', 'processing', 'failed', 'dead_letter', 'published'];

    for (const status of statuses) {
      const statusEvents = await this.queryByStatus<T>(status as OutboxEventStatus);
      events.push(...statusEvents);
    }

    // Apply filters
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      events = events.filter((e) => types.includes(e.type));
    }

    if (options.aggregateId) {
      events = events.filter((e) => e.aggregateId === options.aggregateId);
    }

    if (options.aggregateType) {
      events = events.filter((e) => e.aggregateType === options.aggregateType);
    }

    if (options.epicId) {
      events = events.filter((e) => e.metadata.epicId === options.epicId);
    }

    // Sort
    const orderBy = options.orderBy ?? 'createdAt';
    const direction = options.orderDirection === 'DESC' ? -1 : 1;
    events.sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      return aVal < bVal ? -direction : direction;
    });

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? events.length;
    return events.slice(offset, offset + limit);
  }

  /**
   * Get statistics about the outbox.
   */
  async getStats(): Promise<OutboxStats> {
    await this.initialize();

    const stats: OutboxStats = {
      total: 0,
      byStatus: {
        pending: 0,
        processing: 0,
        published: 0,
        failed: 0,
        dead_letter: 0,
      },
      byType: {},
      oldestPending: null,
      avgPublishDurationMs: 0,
      successRate: 0,
    };

    // Count by status
    for (const status of ['pending', 'processing', 'failed', 'dead_letter'] as const) {
      const events = await this.queryByStatus(status);
      stats.byStatus[status] = events.length;
      stats.total += events.length;

      for (const event of events) {
        stats.byType[event.type] = (stats.byType[event.type] ?? 0) + 1;
      }

      if (status === 'pending' && events.length > 0) {
        const oldest = events.reduce((a, b) =>
          new Date(a.createdAt) < new Date(b.createdAt) ? a : b
        );
        stats.oldestPending = oldest.createdAt;
      }
    }

    // Count published (all date subdirectories)
    const publishedDir = path.join(this.basePath, 'published');
    try {
      const dates = await fs.readdir(publishedDir);
      let totalPublishDuration = 0;
      let publishedCount = 0;

      for (const date of dates) {
        const dateDir = path.join(publishedDir, date);
        const files = await fs.readdir(dateDir);
        stats.byStatus.published += files.length;
        stats.total += files.length;

        // Sample a few for duration calculation
        for (const file of files.slice(0, 10)) {
          try {
            const content = await fs.readFile(path.join(dateDir, file), 'utf-8');
            const event = JSON.parse(content) as OutboxEvent;
            stats.byType[event.type] = (stats.byType[event.type] ?? 0) + 1;

            if (event.publishedAt) {
              const duration =
                new Date(event.publishedAt).getTime() - new Date(event.createdAt).getTime();
              totalPublishDuration += duration;
              publishedCount++;
            }
          } catch {
            // Skip malformed files
          }
        }
      }

      if (publishedCount > 0) {
        stats.avgPublishDurationMs = totalPublishDuration / publishedCount;
      }
    } catch {
      // Published directory might not exist
    }

    // Calculate success rate
    const attempted = stats.byStatus.published + stats.byStatus.dead_letter;
    if (attempted > 0) {
      stats.successRate = stats.byStatus.published / attempted;
    }

    return stats;
  }

  /**
   * Clean up old published events (retention policy).
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    await this.initialize();

    const publishedDir = path.join(this.basePath, 'published');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    let deletedCount = 0;

    try {
      const dates = await fs.readdir(publishedDir);

      for (const date of dates) {
        if (date < cutoffDate) {
          const dateDir = path.join(publishedDir, date);
          const files = await fs.readdir(dateDir);
          deletedCount += files.length;
          await fs.rm(dateDir, { recursive: true });
        }
      }
    } catch {
      // Published directory might not exist
    }

    return deletedCount;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private async writeEvent(event: OutboxEvent): Promise<void> {
    let dir: string;

    if (event.status === 'published') {
      // Use date subdirectory for published events
      const date = event.publishedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
      dir = path.join(this.basePath, 'published', date);
      await fs.mkdir(dir, { recursive: true });
    } else {
      dir = path.join(this.basePath, event.status);
    }

    const filePath = path.join(dir, `${event.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(event, null, 2), 'utf-8');
  }

  private async deleteEvent(eventId: string, status: OutboxEventStatus): Promise<void> {
    if (status === 'published') {
      // Need to find the date subdirectory
      const publishedDir = path.join(this.basePath, 'published');
      try {
        const dates = await fs.readdir(publishedDir);
        for (const date of dates) {
          const filePath = path.join(publishedDir, date, `${eventId}.json`);
          try {
            await fs.unlink(filePath);
            return;
          } catch {
            // Not in this date
          }
        }
      } catch {
        // Published directory might not exist
      }
    } else {
      const filePath = path.join(this.basePath, status, `${eventId}.json`);
      try {
        await fs.unlink(filePath);
      } catch {
        // File might not exist
      }
    }
  }

  private async queryByStatus<T = unknown>(status: OutboxEventStatus): Promise<OutboxEvent<T>[]> {
    const events: OutboxEvent<T>[] = [];

    if (status === 'published') {
      // Query all date subdirectories
      const publishedDir = path.join(this.basePath, 'published');
      try {
        const dates = await fs.readdir(publishedDir);
        for (const date of dates) {
          const dateDir = path.join(publishedDir, date);
          const files = await fs.readdir(dateDir);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
              const content = await fs.readFile(path.join(dateDir, file), 'utf-8');
              events.push(JSON.parse(content) as OutboxEvent<T>);
            } catch {
              // Skip malformed files
            }
          }
        }
      } catch {
        // Directory might not exist
      }
    } else {
      const dir = path.join(this.basePath, status);
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            events.push(JSON.parse(content) as OutboxEvent<T>);
          } catch {
            // Skip malformed files
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    return events;
  }
}

/**
 * Create a singleton store instance.
 */
let defaultStore: OutboxStore | null = null;

export function getOutboxStore(
  config?: OutboxConfig,
  cwd?: string
): OutboxStore {
  if (!defaultStore || cwd) {
    defaultStore = new OutboxStore(config, cwd);
  }
  return defaultStore;
}

/**
 * Reset the default store (for testing).
 */
export function resetOutboxStore(): void {
  defaultStore = null;
}
