#!/usr/bin/env node

/**
 * ralph-escalate CLI
 *
 * Wrapper for Ralph loops with automatic model escalation.
 * Generates execution plan showing which model to use for each batch of iterations.
 *
 * Usage:
 *   ralph-escalate "Fix failing tests" --max-iterations 15 --escalate
 *   ralph-escalate "Refactor auth" --max-iterations 20 --escalate --start-model sonnet
 *   ralph-escalate "Fix lint" --max-iterations 10  # No escalation, uses default model
 *
 * Flags:
 *   --max-iterations <n>        Maximum iterations (required)
 *   --completion-promise <text> Exit phrase to look for
 *   --escalate                  Enable model escalation
 *   --start-model <model>       Initial model (haiku|sonnet|opus)
 *   --escalation-threshold <n>  Iterations per model level
 *   --dry-run                   Show plan without executing
 */

import { ralphLoopWithEscalation, type EscalationConfig, DEFAULT_ESCALATION } from '../ralph-escalation';

interface CLIArgs {
  prompt: string;
  maxIterations: number;
  completionPromise?: string;
  escalate?: boolean;
  startModel?: 'haiku' | 'sonnet' | 'opus';
  escalationThreshold?: number;
  dryRun?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const result: Partial<CLIArgs> = {};

  // First positional arg is the prompt
  if (args[0] && !args[0].startsWith('--')) {
    result.prompt = args[0];
  } else {
    console.error('Error: Missing prompt argument');
    console.error('Usage: ralph-escalate "<prompt>" --max-iterations <n>');
    process.exit(1);
  }

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--max-iterations':
        result.maxIterations = parseInt(args[++i], 10);
        break;
      case '--completion-promise':
        result.completionPromise = args[++i];
        break;
      case '--escalate':
        result.escalate = true;
        break;
      case '--start-model':
        result.startModel = args[++i] as 'haiku' | 'sonnet' | 'opus';
        break;
      case '--escalation-threshold':
        result.escalationThreshold = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      default:
        console.error(`Unknown flag: ${arg}`);
        process.exit(1);
    }
  }

  // Validate required fields
  if (!result.maxIterations) {
    console.error('Error: --max-iterations is required');
    process.exit(1);
  }

  if (result.maxIterations < 1 || result.maxIterations > 50) {
    console.error('Error: --max-iterations must be between 1 and 50');
    process.exit(1);
  }

  return result as CLIArgs;
}

function printHelp(): void {
  console.log(`
ralph-escalate - Ralph loops with model escalation

USAGE:
  ralph-escalate "<prompt>" --max-iterations <n> [OPTIONS]

EXAMPLES:
  # Simple escalation (Haiku → Sonnet → Opus)
  ralph-escalate "Fix failing tests" --max-iterations 15 --escalate

  # Start with Sonnet, escalate to Opus if needed
  ralph-escalate "Refactor auth" --max-iterations 20 --escalate --start-model sonnet

  # No escalation (current Ralph behavior)
  ralph-escalate "Fix lint errors" --max-iterations 10

  # Custom escalation threshold (escalate every 3 iterations)
  ralph-escalate "Fix types" --max-iterations 15 --escalate --escalation-threshold 3

  # Dry run (show plan without executing)
  ralph-escalate "Fix tests" --max-iterations 15 --escalate --dry-run

OPTIONS:
  --max-iterations <n>        Maximum iterations (required, 1-50)
  --completion-promise <text> Exit phrase to detect completion
  --escalate                  Enable model escalation
  --start-model <model>       Initial model: haiku|sonnet|opus (default: haiku)
  --escalation-threshold <n>  Iterations before escalating (default: 5)
  --dry-run                   Show execution plan without running

ESCALATION PATTERN:
  Without --escalate: Uses start-model for all iterations
  With --escalate:    Haiku (0-4) → Sonnet (5-9) → Opus (10+)

COST ESTIMATES:
  Haiku:  ~$0.001/iteration
  Sonnet: ~$0.01/iteration
  Opus:   ~$0.10/iteration

  15 iterations with escalation: ~$0.555 (5 Haiku + 5 Sonnet + 5 Opus)
  15 iterations without:         ~$0.015 (15 Haiku)

INTEGRATION:
  This tool generates execution plans. You must manually:
  1. Switch to Claude Code session with the specified model
  2. Run the /ralph-loop command shown
  3. Continue to next batch if needed

SEE ALSO:
  .claude/rules/ralph-patterns.md - Full documentation
  bd show csm-5jz5r - Implementation tracking issue
`);
}

async function main() {
  const args = parseArgs();

  // Build escalation config
  const escalation: EscalationConfig = {
    enabled: args.escalate || false,
    initialModel: args.startModel || 'haiku',
    escalationThreshold: args.escalationThreshold || DEFAULT_ESCALATION.escalationThreshold,
    maxEscalations: DEFAULT_ESCALATION.maxEscalations,
  };

  console.log('═══════════════════════════════════════════════');
  console.log('  Ralph Escalation Wrapper');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  if (args.dryRun) {
    console.log('⚠️  DRY RUN MODE - No execution, planning only');
    console.log('');
  }

  // Execute (or show plan)
  const result = await ralphLoopWithEscalation({
    prompt: args.prompt,
    maxIterations: args.maxIterations,
    completionPromise: args.completionPromise,
    escalation,
  });

  console.log('═══════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total iterations: ${result.iterations}`);
  console.log(`  Final model:      ${result.finalModel}`);
  console.log(`  Total cost:       $${result.cost.toFixed(3)}`);
  console.log(`  Success:          ${result.success ? '✓' : '✗ (manual execution required)'}`);
  console.log('');

  if (args.dryRun) {
    console.log('To execute this plan, remove the --dry-run flag.');
  } else {
    console.log('NOTE: This tool coordinates escalation but requires manual');
    console.log('execution of /ralph-loop commands in Claude Code sessions.');
    console.log('');
    console.log('Future enhancement: Automatic session spawning and execution.');
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
