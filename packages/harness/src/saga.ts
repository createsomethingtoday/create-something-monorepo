/**
 * @create-something/harness
 *
 * @pattern
 * ```yaml
 * id: saga-v1
 * name: Saga Orchestrator
 * category: ResilientWorkflow
 * description: |
 *   Manages distributed workflows with compensating transactions. When a
 *   multi-step operation fails, automatically rolls back completed steps
 *   in reverse order. Use for PR workflows, deployments, multi-service ops.
 * priority_score: 39
 * dependencies: []
 * example_usage: |
 *   const saga = new SagaOrchestrator('deploy-workflow');
 *   saga.addStep({ name: 'build', execute: build, compensate: cleanup });
 *   saga.addStep({ name: 'deploy', execute: deploy, compensate: rollback });
 *   const result = await saga.execute(context);
 * llm_prompt: |
 *   Implement a multi-step workflow using saga-v1. Define execute and
 *   compensate functions for each step. Steps run forward; on failure,
 *   compensation runs backward.
 * inspired_by: ["Hector Garcia-Molina SAGAS paper", "Eventuate Tram"]
 * status: stable
 * ```
 *
 * Saga Pattern: Compensating transactions for distributed workflows.
 *
 * Philosophy: When multi-step workflows fail, we need to undo partial work.
 * The Saga pattern manages forward execution and reverse compensation.
 *
 * Canon: "The work must remain connected"—if a workflow fails midway,
 * the system should not be left in an inconsistent state.
 *
 * Usage:
 * ```typescript
 * const saga = new SagaOrchestrator('create-pr-workflow');
 *
 * saga.addStep({
 *   name: 'create-branch',
 *   execute: async (ctx) => {
 *     const branch = await createBranch(ctx.branchName);
 *     return { branch };
 *   },
 *   compensate: async (ctx, result) => {
 *     await deleteBranch(result.branch);
 *   },
 * });
 *
 * saga.addStep({
 *   name: 'push-changes',
 *   execute: async (ctx, prev) => {
 *     await pushChanges(prev['create-branch'].branch);
 *   },
 *   compensate: async (ctx) => {
 *     // Push compensation: revert commit or delete branch (handled by previous step)
 *   },
 * });
 *
 * const result = await saga.execute({ branchName: 'feature/new-thing' });
 * if (!result.success) {
 *   console.log('Saga failed, all steps compensated');
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status of a saga step.
 */
export type SagaStepStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'compensating'
  | 'compensated'
  | 'compensation_failed';

/**
 * Overall saga status.
 */
export type SagaStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'compensating'
  | 'compensated'
  | 'compensation_failed';

/**
 * Result of a saga step execution.
 */
export interface SagaStepResult<T = unknown> {
  /** Step name */
  name: string;
  /** Step status */
  status: SagaStepStatus;
  /** Result data from execution */
  result?: T;
  /** Error message if failed */
  error?: string;
  /** Duration of execution in ms */
  durationMs: number;
  /** When the step started */
  startedAt: string;
  /** When the step completed */
  completedAt: string | null;
  /** Compensation status (if compensated) */
  compensationError?: string;
}

/**
 * Complete saga execution result.
 */
export interface SagaResult<T = Record<string, unknown>> {
  /** Saga name */
  sagaName: string;
  /** Overall success */
  success: boolean;
  /** Overall status */
  status: SagaStatus;
  /** Results from each step (keyed by step name) */
  stepResults: Record<string, SagaStepResult>;
  /** Final context with all step outputs */
  finalContext: T;
  /** Total duration in ms */
  totalDurationMs: number;
  /** Number of steps executed */
  stepsExecuted: number;
  /** Number of steps compensated */
  stepsCompensated: number;
  /** The step that caused failure (if any) */
  failedStep?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Definition of a saga step.
 */
export interface SagaStep<TContext = unknown, TResult = unknown> {
  /** Step name (must be unique within saga) */
  name: string;
  /** Execute the forward action */
  execute: (
    context: TContext,
    previousResults: Record<string, unknown>
  ) => Promise<TResult>;
  /** Compensate (undo) the action */
  compensate?: (
    context: TContext,
    result: TResult | undefined,
    previousResults: Record<string, unknown>
  ) => Promise<void>;
  /** Whether this step is optional (failure won't trigger compensation) */
  optional?: boolean;
  /** Timeout for this step in ms */
  timeoutMs?: number;
  /** Number of retries before failing */
  retries?: number;
  /** Delay between retries in ms */
  retryDelayMs?: number;
}

/**
 * Saga configuration.
 */
export interface SagaConfig {
  /** Default timeout per step in ms (default: 30000) */
  defaultTimeoutMs: number;
  /** Default retries per step (default: 0) */
  defaultRetries: number;
  /** Default retry delay in ms (default: 1000) */
  defaultRetryDelayMs: number;
  /** Whether to continue compensation on compensation failure (default: true) */
  continueOnCompensationFailure: boolean;
  /** Whether to persist saga state for recovery (default: false) */
  persistState: boolean;
  /** Storage path for persisted state */
  storagePath?: string;
}

/**
 * Default saga configuration.
 */
export const DEFAULT_SAGA_CONFIG: SagaConfig = {
  defaultTimeoutMs: 30000,
  defaultRetries: 0,
  defaultRetryDelayMs: 1000,
  continueOnCompensationFailure: true,
  persistState: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Saga Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saga Orchestrator: Manages distributed workflow with compensation.
 */
export class SagaOrchestrator<TContext = Record<string, unknown>> {
  private steps: SagaStep<TContext, unknown>[] = [];
  private config: SagaConfig;

  constructor(
    public readonly name: string,
    config: Partial<SagaConfig> = {}
  ) {
    this.config = { ...DEFAULT_SAGA_CONFIG, ...config };
  }

  /**
   * Add a step to the saga.
   */
  addStep<TResult>(step: SagaStep<TContext, TResult>): this {
    this.steps.push(step as SagaStep<TContext, unknown>);
    return this;
  }

  /**
   * Execute the saga.
   *
   * @param context - Initial context passed to all steps
   * @returns SagaResult with all step results
   */
  async execute(context: TContext): Promise<SagaResult<TContext>> {
    const startTime = Date.now();
    const stepResults: Record<string, SagaStepResult> = {};
    const previousResults: Record<string, unknown> = {};
    const completedSteps: SagaStep<TContext, unknown>[] = [];

    let status: SagaStatus = 'running';
    let failedStep: string | undefined;
    let error: string | undefined;

    console.log(`[Saga:${this.name}] Starting with ${this.steps.length} steps`);

    // Execute steps in order
    for (const step of this.steps) {
      const stepStartTime = Date.now();
      const stepResult: SagaStepResult = {
        name: step.name,
        status: 'executing',
        durationMs: 0,
        startedAt: new Date().toISOString(),
        completedAt: null,
      };

      console.log(`[Saga:${this.name}] Executing step: ${step.name}`);

      try {
        const result = await this.executeStepWithRetry(
          step,
          context,
          previousResults
        );

        stepResult.status = 'completed';
        stepResult.result = result;
        stepResult.durationMs = Date.now() - stepStartTime;
        stepResult.completedAt = new Date().toISOString();

        previousResults[step.name] = result;
        completedSteps.push(step);

        console.log(`[Saga:${this.name}] Step completed: ${step.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        stepResult.status = 'failed';
        stepResult.error = message;
        stepResult.durationMs = Date.now() - stepStartTime;
        stepResult.completedAt = new Date().toISOString();

        console.log(`[Saga:${this.name}] Step failed: ${step.name} - ${message}`);

        if (!step.optional) {
          failedStep = step.name;
          error = message;
          status = 'failed';
          stepResults[step.name] = stepResult;
          break;
        }
      }

      stepResults[step.name] = stepResult;
    }

    // Compensate if failed
    if (status === 'failed') {
      console.log(`[Saga:${this.name}] Starting compensation...`);
      status = 'compensating';

      const compensationSuccess = await this.compensate(
        completedSteps,
        context,
        previousResults,
        stepResults
      );

      status = compensationSuccess ? 'compensated' : 'compensation_failed';
    } else {
      status = 'completed';
    }

    const totalDurationMs = Date.now() - startTime;
    const stepsExecuted = Object.values(stepResults).filter(
      (r) => r.status === 'completed' || r.status === 'compensated'
    ).length;
    const stepsCompensated = Object.values(stepResults).filter(
      (r) => r.status === 'compensated'
    ).length;

    console.log(
      `[Saga:${this.name}] ${status === 'completed' ? 'Completed' : 'Failed'} ` +
        `in ${totalDurationMs}ms (${stepsExecuted} executed, ${stepsCompensated} compensated)`
    );

    return {
      sagaName: this.name,
      success: status === 'completed',
      status,
      stepResults,
      finalContext: { ...context, ...previousResults } as TContext,
      totalDurationMs,
      stepsExecuted,
      stepsCompensated,
      failedStep,
      error,
    };
  }

  /**
   * Get the list of steps.
   */
  getSteps(): SagaStep<TContext, unknown>[] {
    return [...this.steps];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  private async executeStepWithRetry<TResult>(
    step: SagaStep<TContext, TResult>,
    context: TContext,
    previousResults: Record<string, unknown>
  ): Promise<TResult> {
    const retries = step.retries ?? this.config.defaultRetries;
    const retryDelay = step.retryDelayMs ?? this.config.defaultRetryDelayMs;
    const timeout = step.timeoutMs ?? this.config.defaultTimeoutMs;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.withTimeout(
          step.execute(context, previousResults),
          timeout,
          `Step "${step.name}" timed out after ${timeout}ms`
        );
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < retries) {
          console.log(
            `[Saga:${this.name}] Step "${step.name}" failed (attempt ${attempt + 1}/${retries + 1}), ` +
              `retrying in ${retryDelay}ms...`
          );
          await this.sleep(retryDelay);
        }
      }
    }

    throw lastError ?? new Error(`Step "${step.name}" failed`);
  }

  private async compensate(
    completedSteps: SagaStep<TContext, unknown>[],
    context: TContext,
    previousResults: Record<string, unknown>,
    stepResults: Record<string, SagaStepResult>
  ): Promise<boolean> {
    let allCompensated = true;

    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];

      if (!step.compensate) {
        console.log(
          `[Saga:${this.name}] No compensation defined for: ${step.name}`
        );
        continue;
      }

      const stepResult = stepResults[step.name];
      stepResult.status = 'compensating';

      console.log(`[Saga:${this.name}] Compensating step: ${step.name}`);

      try {
        await step.compensate(context, stepResult.result, previousResults);
        stepResult.status = 'compensated';
        console.log(`[Saga:${this.name}] Compensated: ${step.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        stepResult.status = 'compensation_failed';
        stepResult.compensationError = message;
        allCompensated = false;

        console.error(
          `[Saga:${this.name}] Compensation failed for ${step.name}: ${message}`
        );

        if (!this.config.continueOnCompensationFailure) {
          break;
        }
      }
    }

    return allCompensated;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms)
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fluent builder for creating sagas.
 */
export class SagaBuilder<TContext = Record<string, unknown>> {
  private saga: SagaOrchestrator<TContext>;

  constructor(name: string, config?: Partial<SagaConfig>) {
    this.saga = new SagaOrchestrator<TContext>(name, config);
  }

  /**
   * Add a step with just an execute function.
   */
  step<TResult>(
    name: string,
    execute: (ctx: TContext, prev: Record<string, unknown>) => Promise<TResult>
  ): this {
    this.saga.addStep({ name, execute });
    return this;
  }

  /**
   * Add a step with both execute and compensate.
   */
  stepWithCompensation<TResult>(
    name: string,
    execute: (ctx: TContext, prev: Record<string, unknown>) => Promise<TResult>,
    compensate: (
      ctx: TContext,
      result: TResult | undefined,
      prev: Record<string, unknown>
    ) => Promise<void>
  ): this {
    this.saga.addStep({ name, execute, compensate });
    return this;
  }

  /**
   * Add an optional step (failure won't trigger compensation).
   */
  optionalStep<TResult>(
    name: string,
    execute: (ctx: TContext, prev: Record<string, unknown>) => Promise<TResult>
  ): this {
    this.saga.addStep({ name, execute, optional: true });
    return this;
  }

  /**
   * Build and return the saga.
   */
  build(): SagaOrchestrator<TContext> {
    return this.saga;
  }
}

/**
 * Create a new saga builder.
 */
export function saga<TContext = Record<string, unknown>>(
  name: string,
  config?: Partial<SagaConfig>
): SagaBuilder<TContext> {
  return new SagaBuilder<TContext>(name, config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format saga result for display.
 */
export function formatSagaResult(result: SagaResult): string {
  const lines: string[] = [];

  const statusIcon = result.success ? '✅' : '❌';
  lines.push(`${statusIcon} Saga: ${result.sagaName}`);
  lines.push(`   Status: ${result.status}`);
  lines.push(`   Duration: ${result.totalDurationMs}ms`);
  lines.push(`   Steps: ${result.stepsExecuted} executed, ${result.stepsCompensated} compensated`);

  if (result.error) {
    lines.push(`   Error: ${result.error}`);
    if (result.failedStep) {
      lines.push(`   Failed at: ${result.failedStep}`);
    }
  }

  lines.push('');
  lines.push('   Steps:');

  for (const [name, stepResult] of Object.entries(result.stepResults)) {
    const icon = {
      pending: '⏳',
      executing: '🔄',
      completed: '✅',
      failed: '❌',
      compensating: '🔄',
      compensated: '↩️',
      compensation_failed: '⚠️',
    }[stepResult.status];

    lines.push(`     ${icon} ${name}: ${stepResult.status} (${stepResult.durationMs}ms)`);

    if (stepResult.error) {
      lines.push(`        Error: ${stepResult.error}`);
    }
    if (stepResult.compensationError) {
      lines.push(`        Compensation Error: ${stepResult.compensationError}`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if a saga result needs manual intervention.
 */
export function needsManualIntervention(result: SagaResult): boolean {
  return (
    result.status === 'compensation_failed' ||
    Object.values(result.stepResults).some(
      (s) => s.status === 'compensation_failed'
    )
  );
}

/**
 * Get steps that failed to compensate.
 */
export function getFailedCompensations(result: SagaResult): string[] {
  return Object.entries(result.stepResults)
    .filter(([, s]) => s.status === 'compensation_failed')
    .map(([name]) => name);
}
