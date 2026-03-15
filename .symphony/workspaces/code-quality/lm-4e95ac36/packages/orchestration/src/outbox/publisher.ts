/**
 * @create-something/orchestration
 *
 * Outbox Publisher: Asynchronous event delivery.
 *
 * Philosophy: Decouple event creation from delivery.
 * The publisher polls the outbox and delivers events to registered handlers.
 *
 * Canon: "The tool recedes into transparent operation"—the publisher
 * runs in the background without requiring attention.
 */

import type {
  OutboxEvent,
  OutboxEventType,
  EventHandler,
  PublishResult,
  OutboxConfig,
} from './types.js';
import { DEFAULT_OUTBOX_CONFIG } from './types.js';
import { OutboxStore, getOutboxStore } from './store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Publisher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Outbox publisher that processes events asynchronously.
 */
export class OutboxPublisher {
  private handlers = new Map<OutboxEventType, EventHandler[]>();
  private globalHandlers: EventHandler[] = [];
  private running = false;
  private pollTimeout: NodeJS.Timeout | null = null;

  constructor(
    private store: OutboxStore,
    private config: OutboxConfig = DEFAULT_OUTBOX_CONFIG
  ) {}

  /**
   * Register a handler for a specific event type.
   */
  on<T = unknown>(type: OutboxEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler as EventHandler);
    this.handlers.set(type, handlers);
  }

  /**
   * Register a handler for all events.
   */
  onAll(handler: EventHandler): void {
    this.globalHandlers.push(handler);
  }

  /**
   * Remove a handler.
   */
  off(type: OutboxEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Start the publisher (begins polling).
   */
  start(): void {
    if (this.running) return;
    if (!this.config.enabled) {
      console.log('[OutboxPublisher] Disabled by configuration');
      return;
    }

    this.running = true;
    console.log('[OutboxPublisher] Started');
    this.poll();
  }

  /**
   * Stop the publisher.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    console.log('[OutboxPublisher] Stopped');
  }

  /**
   * Check if the publisher is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Process a single batch of events (for manual triggering).
   */
  async processBatch(): Promise<PublishResult[]> {
    const events = await this.store.getPendingEvents(this.config.batchSize);
    const results: PublishResult[] = [];

    for (const event of events) {
      const result = await this.processEvent(event);
      results.push(result);
    }

    return results;
  }

  /**
   * Publish a single event immediately (bypasses polling).
   */
  async publishNow<T>(event: OutboxEvent<T>): Promise<PublishResult> {
    return this.processEvent(event);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      await this.processBatch();
    } catch (error) {
      console.error('[OutboxPublisher] Error processing batch:', error);
    }

    // Schedule next poll
    this.pollTimeout = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private async processEvent(event: OutboxEvent): Promise<PublishResult> {
    const startTime = Date.now();

    try {
      // Mark as processing
      await this.store.markProcessing(event.id);

      // Get handlers for this event type
      const typeHandlers = this.handlers.get(event.type) ?? [];
      const allHandlers = [...typeHandlers, ...this.globalHandlers];

      if (allHandlers.length === 0) {
        // No handlers, mark as published (no-op)
        await this.store.markPublished(event.id);
        return {
          success: true,
          eventId: event.id,
          durationMs: Date.now() - startTime,
        };
      }

      // Execute all handlers
      const errors: string[] = [];
      for (const handler of allHandlers) {
        try {
          await handler(event);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(message);
        }
      }

      if (errors.length > 0) {
        const error = errors.join('; ');
        await this.store.markFailed(event.id, error);
        return {
          success: false,
          eventId: event.id,
          error,
          durationMs: Date.now() - startTime,
        };
      }

      // All handlers succeeded
      await this.store.markPublished(event.id);
      return {
        success: true,
        eventId: event.id,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.store.markFailed(event.id, message);
      return {
        success: false,
        eventId: event.id,
        error: message,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a publisher with the default store.
 */
export function createPublisher(
  config?: Partial<OutboxConfig>,
  cwd?: string
): OutboxPublisher {
  const fullConfig = { ...DEFAULT_OUTBOX_CONFIG, ...config };
  const store = getOutboxStore(fullConfig, cwd);
  return new OutboxPublisher(store, fullConfig);
}

/**
 * Simple logging handler for debugging.
 */
export function createLoggingHandler(prefix: string = '[Outbox]'): EventHandler {
  return async (event) => {
    console.log(
      `${prefix} ${event.type} | ${event.aggregateType}:${event.aggregateId} | ` +
        `attempts=${event.attempts} | created=${event.createdAt}`
    );
  };
}

/**
 * Handler that writes events to a webhook.
 */
export function createWebhookHandler(
  url: string,
  options: {
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): EventHandler {
  return async (event) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout ?? 10000
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Handler that writes events to a file (for audit logs).
 */
export function createFileHandler(
  filePath: string,
  options: {
    format?: 'json' | 'jsonl';
  } = {}
): EventHandler {
  const format = options.format ?? 'jsonl';

  return async (event) => {
    const fs = await import('fs/promises');
    const line =
      format === 'jsonl'
        ? JSON.stringify(event) + '\n'
        : JSON.stringify(event, null, 2) + '\n---\n';

    await fs.appendFile(filePath, line, 'utf-8');
  };
}
