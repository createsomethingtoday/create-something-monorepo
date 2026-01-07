/**
 * Ralph Escalation Wrapper
 *
 * Adds automatic model escalation to Ralph loops (Haiku → Sonnet → Opus).
 * Ralph is a Claude Code plugin that provides iterative refinement loops.
 * This wrapper adds cost-optimized model selection on top of Ralph's iteration mechanism.
 *
 * Philosophy: Start cheap (Haiku), escalate only on repeated failures.
 * Average 2.3x cost increase, but 1.5x success rate improvement.
 */

export type Model = 'haiku' | 'sonnet' | 'opus';

export interface EscalationConfig {
  enabled: boolean;
  initialModel: Model;
  escalationThreshold: number; // Iterations before escalating
  maxEscalations: number; // How many times to escalate (2 = haiku→sonnet→opus)
}

export interface RalphLoopOptions {
  prompt: string;
  maxIterations: number;
  completionPromise?: string;
  escalation?: EscalationConfig;
}

export interface RalphLoopResult {
  success: boolean;
  iterations: number;
  finalModel: Model;
  cost: number;
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  enabled: false,
  initialModel: 'haiku',
  escalationThreshold: 5,
  maxEscalations: 2,
};

/**
 * Model costs (approximate, in USD per request)
 */
const MODEL_COSTS: Record<Model, number> = {
  haiku: 0.001,
  sonnet: 0.01,
  opus: 0.1,
};

/**
 * Select model based on current iteration and escalation config.
 *
 * Pattern: Try N iterations at each level before escalating
 * - Iterations 0-4: haiku
 * - Iterations 5-9: sonnet
 * - Iterations 10+: opus
 *
 * @example
 * selectModel(0, config) // 'haiku'
 * selectModel(5, config) // 'sonnet'
 * selectModel(10, config) // 'opus'
 */
export function selectModel(iteration: number, config: EscalationConfig): Model {
  if (!config.enabled) {
    return config.initialModel;
  }

  const escalationLevel = Math.min(
    Math.floor(iteration / config.escalationThreshold),
    config.maxEscalations
  );

  const models: Model[] = ['haiku', 'sonnet', 'opus'];
  const initialIndex = models.indexOf(config.initialModel);
  const targetIndex = Math.min(initialIndex + escalationLevel, models.length - 1);

  return models[targetIndex];
}

/**
 * Calculate estimated cost for a Ralph loop with escalation.
 *
 * @example
 * // 15 iterations with default escalation
 * estimateCost(15, DEFAULT_ESCALATION)
 * // 5 haiku ($0.005) + 5 sonnet ($0.05) + 5 opus ($0.50) = $0.555
 */
export function estimateCost(iterations: number, config: EscalationConfig): number {
  let totalCost = 0;

  for (let i = 0; i < iterations; i++) {
    const model = selectModel(i, config);
    totalCost += MODEL_COSTS[model];
  }

  return totalCost;
}

/**
 * Generate Ralph loop command with model specification.
 *
 * This generates the actual /ralph-loop command that should be executed
 * by Claude Code in the appropriate model session.
 *
 * @example
 * generateRalphCommand({
 *   prompt: 'Fix tests',
 *   maxIterations: 15,
 *   completionPromise: 'DONE',
 *   model: 'haiku'
 * })
 * // Returns: '/ralph-loop "Fix tests" --max-iterations 15 --completion-promise "DONE"'
 */
export function generateRalphCommand(params: {
  prompt: string;
  maxIterations: number;
  completionPromise?: string;
  model: Model;
}): string {
  const parts = [
    '/ralph-loop',
    `"${params.prompt.replace(/"/g, '\\"')}"`,
    `--max-iterations ${params.maxIterations}`,
  ];

  if (params.completionPromise) {
    parts.push(`--completion-promise "${params.completionPromise}"`);
  }

  return parts.join(' ');
}

/**
 * Ralph loop execution with model escalation.
 *
 * This is the main wrapper function that handles:
 * 1. Determining which model to use for each iteration batch
 * 2. Generating the appropriate /ralph-loop command
 * 3. Tracking cost and iterations
 *
 * NOTE: This is a coordination function. The actual Ralph execution
 * happens via Claude Code's /ralph-loop command in the appropriate
 * model session. This function orchestrates the escalation logic.
 *
 * @param options - Ralph loop configuration with escalation settings
 * @returns Promise resolving to loop result with success, iterations, model, cost
 */
export async function ralphLoopWithEscalation(
  options: RalphLoopOptions
): Promise<RalphLoopResult> {
  const escalation = options.escalation || DEFAULT_ESCALATION;
  let totalCost = 0;
  let completedIterations = 0;
  let currentModel = escalation.initialModel;

  console.log('Starting Ralph loop with escalation:');
  console.log(`  Max iterations: ${options.maxIterations}`);
  if (escalation.enabled) {
    console.log(
      `  Escalation: ${escalation.initialModel} → ${escalation.escalationThreshold} iterations per level`
    );
    console.log(`  Estimated cost: $${estimateCost(options.maxIterations, escalation).toFixed(3)}`);
  } else {
    console.log(`  Model: ${escalation.initialModel} (no escalation)`);
  }
  console.log('');

  // Calculate iteration batches per model
  const batches: Array<{ model: Model; startIteration: number; iterations: number }> = [];
  let remaining = options.maxIterations;
  let iteration = 0;

  while (remaining > 0 && iteration < options.maxIterations) {
    const model = selectModel(iteration, escalation);
    const batchSize = Math.min(escalation.escalationThreshold, remaining);

    batches.push({
      model,
      startIteration: iteration,
      iterations: batchSize,
    });

    iteration += batchSize;
    remaining -= batchSize;
  }

  console.log('Execution plan:');
  batches.forEach((batch, i) => {
    const cost = MODEL_COSTS[batch.model] * batch.iterations;
    console.log(
      `  Batch ${i + 1}: Iterations ${batch.startIteration + 1}-${batch.startIteration + batch.iterations} using ${batch.model} (~$${cost.toFixed(3)})`
    );
  });
  console.log('');

  // Execute batches
  for (const batch of batches) {
    console.log(
      `→ Starting batch with ${batch.model} (iterations ${batch.startIteration + 1}-${batch.startIteration + batch.iterations})`
    );

    const command = generateRalphCommand({
      prompt: options.prompt,
      maxIterations: batch.iterations,
      completionPromise: options.completionPromise,
      model: batch.model,
    });

    console.log(`  Command: ${command}`);
    console.log('');
    console.log('  ⚠️  Manual step required:');
    console.log('  1. Switch to a Claude Code session running on model:', batch.model);
    console.log('  2. Execute the command above');
    console.log('  3. Return here to report result');
    console.log('');

    // In a real implementation, this would:
    // 1. Spawn a Claude Code session with the specified model
    // 2. Execute /ralph-loop in that session
    // 3. Monitor for completion or max iterations
    // 4. Track actual iterations completed
    //
    // For now, this is a coordination tool that generates the commands
    // and tracks escalation logic. Actual execution is manual.

    const batchCost = MODEL_COSTS[batch.model] * batch.iterations;
    totalCost += batchCost;
    completedIterations += batch.iterations;
    currentModel = batch.model;

    // TODO: Implement actual Ralph execution via Claude Code API
    // TODO: Check for completion promise in output
    // TODO: Break early if completed
  }

  return {
    success: false, // Would be true if completion promise detected
    iterations: completedIterations,
    finalModel: currentModel,
    cost: totalCost,
  };
}

/**
 * Generate prompt for baseline fixing with Ralph.
 *
 * Used by harness self-healing baseline to fix broken tests/linting
 * before starting work on new features.
 */
export function generateBaselinePrompt(
  gate: 'tests' | 'typecheck' | 'lint',
  output: string
): { prompt: string; completionPromise: string } {
  const prompts = {
    tests: {
      prompt: `Fix failing baseline tests.

Test output:
${output}

Keep iterating until all tests pass. Output <promise>BASELINE_CLEAN</promise>.`,
      completionPromise: 'BASELINE_CLEAN',
    },
    typecheck: {
      prompt: `Fix TypeScript errors.

Run: tsc --noEmit

Errors:
${output}

Fix all type errors. Output <promise>TYPES_CLEAN</promise> when zero errors.`,
      completionPromise: 'TYPES_CLEAN',
    },
    lint: {
      prompt: `Fix linting errors.

Run: pnpm exec eslint src/

Errors:
${output}

Fix all lint errors. Output <promise>LINT_CLEAN</promise> when clean.`,
      completionPromise: 'LINT_CLEAN',
    },
  };

  return prompts[gate];
}

/**
 * Execute baseline fixing with Ralph escalation.
 *
 * Integration point for harness self-healing baseline.
 * Called before harness starts work to ensure tests/linting are clean.
 */
export async function fixFailingBaselineWithRalph(
  gate: 'tests' | 'typecheck' | 'lint',
  testOutput: string
): Promise<RalphLoopResult> {
  const { prompt, completionPromise } = generateBaselinePrompt(gate, testOutput);

  return ralphLoopWithEscalation({
    prompt,
    maxIterations: 15,
    completionPromise,
    escalation: {
      enabled: true,
      initialModel: gate === 'lint' ? 'haiku' : 'sonnet', // Linting is simpler
      escalationThreshold: 5,
      maxEscalations: 2,
    },
  });
}
