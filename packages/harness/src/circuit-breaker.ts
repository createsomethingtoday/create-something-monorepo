/**
 * @create-something/harness
 *
 * @pattern
 * ```yaml
 * id: circuit-breaker-v1
 * name: Circuit Breaker
 * category: ResilientWorkflow
 * description: |
 *   Prevents cascade failures by tracking service health and failing fast
 *   when a service is unhealthy. Use for external API calls, agent chains,
 *   and any operation that can fail repeatedly.
 * priority_score: 38
 * dependencies: []
 * example_usage: |
 *   const breaker = new CircuitBreaker('api-service', { failureThreshold: 5 });
 *   const result = await breaker.call(() => fetch(url));
 *   if (result.rejected) console.log('Service unavailable');
 * llm_prompt: |
 *   Wrap external API calls with circuit-breaker-v1 to prevent cascade failures.
 *   Configure failureThreshold based on acceptable error rate.
 * inspired_by: ["Microsoft Azure Architecture Patterns", "Netflix Hystrix"]
 * status: stable
 * ```
 *
 * Circuit Breaker Pattern: Prevents cascade failures in agent chains.
 *
 * Philosophy: When a service repeatedly fails, stop calling it.
 * The circuit breaker acts as a protective barrier that:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Service is failing, requests fail-fast without calling
 * - HALF_OPEN: Testing if service has recovered
 *
 * Canon: "The tool recedes into transparent operation"—failures should be
 * handled without requiring human intervention where possible.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit breaker states.
 *
 * State transitions:
 * - CLOSED → OPEN: When failure threshold exceeded
 * - OPEN → HALF_OPEN: After reset timeout expires
 * - HALF_OPEN → CLOSED: On successful probe
 * - HALF_OPEN → OPEN: On failed probe
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Configuration for a circuit breaker instance.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Number of successes needed to close from half-open (default: 2) */
  successThreshold: number;
  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeoutMs: number;
  /** Time window in ms for counting failures (default: 60000) */
  failureWindowMs: number;
  /** Optional timeout for individual calls in ms */
  callTimeoutMs?: number;
  /** Whether to track per-operation metrics (default: true) */
  trackMetrics: boolean;
}

/**
 * Metrics tracked by a circuit breaker.
 */
export interface CircuitMetrics {
  /** Total number of calls */
  totalCalls: number;
  /** Number of successful calls */
  successCount: number;
  /** Number of failed calls */
  failureCount: number;
  /** Number of calls rejected due to open circuit */
  rejectedCount: number;
  /** Number of timeouts */
  timeoutCount: number;
  /** Average response time in ms */
  avgResponseTimeMs: number;
  /** Last failure timestamp */
  lastFailureAt: string | null;
  /** Last success timestamp */
  lastSuccessAt: string | null;
  /** Current state */
  state: CircuitState;
  /** Time when circuit will attempt reset (if OPEN) */
  nextResetAttempt: string | null;
}

/**
 * Result of a circuit breaker call.
 */
export interface CircuitResult<T> {
  /** Whether the call succeeded */
  success: boolean;
  /** The result value (if successful) */
  value?: T;
  /** Error message (if failed) */
  error?: string;
  /** Whether the call was rejected by the circuit breaker */
  rejected: boolean;
  /** Whether the call timed out */
  timedOut: boolean;
  /** Duration of the call in ms */
  durationMs: number;
  /** Circuit state after the call */
  circuitState: CircuitState;
}

/**
 * A recorded failure for time-window tracking.
 */
interface FailureRecord {
  timestamp: number;
  error: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 30000, // 30 seconds
  failureWindowMs: 60000, // 1 minute
  callTimeoutMs: undefined, // No timeout by default
  trackMetrics: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit Breaker class.
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker('api-service', { failureThreshold: 3 });
 *
 * const result = await breaker.call(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 *
 * if (result.success) {
 *   console.log(result.value);
 * } else if (result.rejected) {
 *   console.log('Circuit is open, request rejected');
 * } else {
 *   console.log('Call failed:', result.error);
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: FailureRecord[] = [];
  private consecutiveSuccesses = 0;
  private lastStateChange: number = Date.now();
  private openedAt: number | null = null;

  // Metrics
  private totalCalls = 0;
  private successCount = 0;
  private failureCount = 0;
  private rejectedCount = 0;
  private timeoutCount = 0;
  private totalResponseTimeMs = 0;
  private lastFailureAt: string | null = null;
  private lastSuccessAt: string | null = null;

  constructor(
    public readonly name: string,
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG
  ) {}

  /**
   * Get current circuit state.
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.transitionTo('HALF_OPEN');
    }
    return this.state;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): CircuitMetrics {
    const state = this.getState();
    return {
      totalCalls: this.totalCalls,
      successCount: this.successCount,
      failureCount: this.failureCount,
      rejectedCount: this.rejectedCount,
      timeoutCount: this.timeoutCount,
      avgResponseTimeMs:
        this.totalCalls > 0 ? this.totalResponseTimeMs / this.totalCalls : 0,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      state,
      nextResetAttempt:
        state === 'OPEN' && this.openedAt
          ? new Date(this.openedAt + this.config.resetTimeoutMs).toISOString()
          : null,
    };
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param fn - The async function to execute
   * @returns CircuitResult with success/failure info
   */
  async call<T>(fn: () => Promise<T>): Promise<CircuitResult<T>> {
    const startTime = Date.now();
    this.totalCalls++;

    // Check if circuit allows the call
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      this.rejectedCount++;
      return {
        success: false,
        rejected: true,
        timedOut: false,
        durationMs: 0,
        error: `Circuit breaker "${this.name}" is OPEN - request rejected`,
        circuitState: 'OPEN',
      };
    }

    // Execute the call
    try {
      const result = await this.executeWithTimeout(fn);
      const durationMs = Date.now() - startTime;
      this.totalResponseTimeMs += durationMs;

      this.recordSuccess();

      return {
        success: true,
        value: result,
        rejected: false,
        timedOut: false,
        durationMs,
        circuitState: this.state,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.totalResponseTimeMs += durationMs;

      const isTimeout = error instanceof TimeoutError;
      if (isTimeout) {
        this.timeoutCount++;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.recordFailure(errorMessage);

      return {
        success: false,
        rejected: false,
        timedOut: isTimeout,
        durationMs,
        error: errorMessage,
        circuitState: this.state,
      };
    }
  }

  /**
   * Manually open the circuit (e.g., from external health check).
   */
  open(reason: string): void {
    console.log(`[CircuitBreaker:${this.name}] Manually opened: ${reason}`);
    this.transitionTo('OPEN');
  }

  /**
   * Manually close the circuit (e.g., after manual intervention).
   */
  close(): void {
    console.log(`[CircuitBreaker:${this.name}] Manually closed`);
    this.transitionTo('CLOSED');
    this.failures = [];
    this.consecutiveSuccesses = 0;
  }

  /**
   * Reset all metrics.
   */
  resetMetrics(): void {
    this.totalCalls = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.rejectedCount = 0;
    this.timeoutCount = 0;
    this.totalResponseTimeMs = 0;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
  }

  /**
   * Check if the circuit is healthy (CLOSED state).
   */
  isHealthy(): boolean {
    return this.getState() === 'CLOSED';
  }

  /**
   * Get a human-readable status string.
   */
  getStatusString(): string {
    const metrics = this.getMetrics();
    const successRate =
      metrics.totalCalls > 0
        ? ((metrics.successCount / metrics.totalCalls) * 100).toFixed(1)
        : '100.0';

    return (
      `[${this.name}] State: ${metrics.state} | ` +
      `Calls: ${metrics.totalCalls} | ` +
      `Success Rate: ${successRate}% | ` +
      `Rejected: ${metrics.rejectedCount} | ` +
      `Avg Response: ${metrics.avgResponseTimeMs.toFixed(0)}ms`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.callTimeoutMs) {
      return fn();
    }

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError('Call timed out')),
          this.config.callTimeoutMs
        )
      ),
    ]);
  }

  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccessAt = new Date().toISOString();
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        console.log(
          `[CircuitBreaker:${this.name}] Recovery successful, closing circuit`
        );
        this.transitionTo('CLOSED');
        this.failures = [];
        this.consecutiveSuccesses = 0;
      }
    }
  }

  private recordFailure(error: string): void {
    this.failureCount++;
    this.lastFailureAt = new Date().toISOString();
    this.consecutiveSuccesses = 0;

    // Add to failure window
    const now = Date.now();
    this.failures.push({ timestamp: now, error });

    // Clean old failures outside the window
    const windowStart = now - this.config.failureWindowMs;
    this.failures = this.failures.filter((f) => f.timestamp >= windowStart);

    // Check if we should open the circuit
    if (this.state === 'CLOSED') {
      if (this.failures.length >= this.config.failureThreshold) {
        console.log(
          `[CircuitBreaker:${this.name}] Failure threshold reached (${this.failures.length}/${this.config.failureThreshold}), opening circuit`
        );
        this.transitionTo('OPEN');
      }
    } else if (this.state === 'HALF_OPEN') {
      console.log(
        `[CircuitBreaker:${this.name}] Probe failed, re-opening circuit`
      );
      this.transitionTo('OPEN');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt >= this.config.resetTimeoutMs;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'OPEN') {
      this.openedAt = Date.now();
    } else if (newState === 'CLOSED') {
      this.openedAt = null;
    }

    if (oldState !== newState) {
      console.log(
        `[CircuitBreaker:${this.name}] State transition: ${oldState} → ${newState}`
      );
    }
  }
}

/**
 * Custom error for timeouts.
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker Registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global registry for circuit breakers.
 * Allows sharing circuit breakers across the application.
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker by name.
   */
  get(
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker(name, {
          ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
          ...config,
        })
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all registered circuit breakers.
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get aggregated health report.
   */
  getHealthReport(): {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
    breakers: { name: string; state: CircuitState; metrics: CircuitMetrics }[];
  } {
    const breakers = this.getAll().map((b) => ({
      name: b.name,
      state: b.getState(),
      metrics: b.getMetrics(),
    }));

    return {
      total: breakers.length,
      healthy: breakers.filter((b) => b.state === 'CLOSED').length,
      degraded: breakers.filter((b) => b.state === 'HALF_OPEN').length,
      failed: breakers.filter((b) => b.state === 'OPEN').length,
      breakers,
    };
  }

  /**
   * Reset a specific circuit breaker.
   */
  reset(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      breaker.resetMetrics();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers.
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.close();
      breaker.resetMetrics();
    }
  }

  /**
   * Remove a circuit breaker from the registry.
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers.
   */
  clear(): void {
    this.breakers.clear();
  }
}

/**
 * Global circuit breaker registry instance.
 */
export const circuitBreakers = new CircuitBreakerRegistry();

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap an async function with circuit breaker protection.
 *
 * Usage:
 * ```typescript
 * const protectedFetch = withCircuitBreaker('api', fetch);
 * const result = await protectedFetch('https://api.example.com');
 * ```
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  config?: Partial<CircuitBreakerConfig>
): (...args: Parameters<T>) => Promise<CircuitResult<Awaited<ReturnType<T>>>> {
  const breaker = circuitBreakers.get(name, config);

  return async (...args: Parameters<T>) => {
    return breaker.call(() => fn(...args));
  };
}

/**
 * Format circuit breaker metrics for display.
 */
export function formatCircuitBreakerReport(): string {
  const report = circuitBreakers.getHealthReport();
  const lines: string[] = [];

  lines.push('┌────────────────────────────────────────────────────────────────┐');
  lines.push('│  CIRCUIT BREAKER STATUS                                        │');
  lines.push('├────────────────────────────────────────────────────────────────┤');
  lines.push(
    `│  Total: ${report.total}  Healthy: ${report.healthy}  Degraded: ${report.degraded}  Failed: ${report.failed}`.padEnd(
      65
    ) + '│'
  );

  if (report.breakers.length > 0) {
    lines.push('├────────────────────────────────────────────────────────────────┤');
    for (const b of report.breakers) {
      const stateIcon =
        b.state === 'CLOSED' ? '✅' : b.state === 'HALF_OPEN' ? '⚠️' : '❌';
      const successRate =
        b.metrics.totalCalls > 0
          ? ((b.metrics.successCount / b.metrics.totalCalls) * 100).toFixed(0)
          : '100';
      lines.push(
        `│  ${stateIcon} ${b.name.padEnd(20)} ${b.state.padEnd(10)} ${successRate}% success`.padEnd(
          65
        ) + '│'
      );
    }
  }

  lines.push('└────────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}
