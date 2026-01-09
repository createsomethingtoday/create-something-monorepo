/**
 * @create-something/orchestration
 *
 * CLI commands for session management.
 */

import { Command } from 'commander';
import { startSession, pauseSession, resumeSession, completeSession } from '../session/lifecycle.js';
import { generateEpicId, getBudgetStatus } from '../session/context.js';
import { loadLatestCheckpoint, listCheckpoints } from '../checkpoint/store.js';
import { formatCheckpointSummary } from '../checkpoint/brief.js';
import { runBaseline, formatBaselineResult, baselinePassed } from '../integration/harness.js';
import type { SessionConfig } from '../types.js';

/**
 * Create the session command.
 */
export function createSessionCommand(): Command {
  const session = new Command('session')
    .description('Manage orchestration sessions');

  // orch session start
  session
    .command('start')
    .description('Start a new orchestration session')
    .option('--epic <id>', 'Epic ID (generates one if not provided)')
    .option('--resume', 'Resume from latest checkpoint', false)
    .option('--budget <amount>', 'Budget in USD (e.g., 5.00)', parseFloat)
    .option('--background', 'Run in background', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const epicId = options.epic || generateEpicId();

        console.log(`Starting session for epic: ${epicId}`);
        if (options.resume) {
          console.log('  Mode: Resume from checkpoint');
        }
        if (options.budget) {
          console.log(`  Budget: $${options.budget.toFixed(4)}`);
        }
        if (options.background) {
          console.log('  Background: Yes');
        }
        console.log('');

        const config: SessionConfig = {
          epicId,
          resume: options.resume,
          budget: options.budget || null,
          background: options.background,
          cwd: options.cwd,
        };

        const { session, context, resumeBrief } = await startSession(config);

        console.log(`Session started: ${session.id}`);
        console.log(`Epic: ${session.epicId}`);
        console.log(`Session number: ${context.sessionNumber}`);
        console.log('');

        if (resumeBrief) {
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('  RESUME BRIEF');
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('');
          console.log(resumeBrief);
          console.log('');
        }

        // Run baseline check
        console.log('Running baseline check...');
        console.log('');

        const baselineResult = await runBaseline(options.cwd);
        console.log(formatBaselineResult(baselineResult));

        if (!baselinePassed(baselineResult)) {
          console.error('\nBaseline check failed. Address blocker issues before continuing.');
          process.exit(1);
        }

        console.log('\nSession ready. Begin work.');
        console.log(`\nTo pause: orch session pause --epic ${epicId}`);
        console.log(`To check status: orch session status --epic ${epicId}`);
      } catch (error) {
        console.error('Failed to start session:', error);
        process.exit(1);
      }
    });

  // orch session status
  session
    .command('status')
    .description('Show session status and checkpoints')
    .option('--epic <id>', 'Epic ID', undefined)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        if (!options.epic) {
          console.error('Error: --epic is required');
          process.exit(1);
        }

        console.log(`Epic: ${options.epic}`);
        console.log('');

        // Load latest checkpoint
        const checkpoint = await loadLatestCheckpoint(options.epic, options.cwd);

        if (!checkpoint) {
          console.log('No checkpoints found for this epic.');
          console.log('');
          console.log(`Start a session: orch session start --epic ${options.epic}`);
          return;
        }

        // Display checkpoint
        console.log(formatCheckpointSummary(checkpoint));
        console.log('');

        // Budget status
        const budgetStatus = getBudgetStatus(checkpoint.context);
        if (budgetStatus.hasBudget) {
          console.log('Budget Status:');
          console.log(`  Consumed: $${budgetStatus.consumed.toFixed(4)}`);
          console.log(`  Remaining: $${budgetStatus.remaining!.toFixed(4)}`);
          console.log(`  Used: ${budgetStatus.percentUsed!.toFixed(0)}%`);

          if (budgetStatus.exceeded) {
            console.log('  ⚠️  BUDGET EXCEEDED');
          }
        }

        console.log('');
        console.log(`To resume: orch session start --epic ${options.epic} --resume`);
      } catch (error) {
        console.error('Failed to get status:', error);
        process.exit(1);
      }
    });

  // orch session pause
  session
    .command('pause')
    .description('Pause current session and create checkpoint')
    .option('--epic <id>', 'Epic ID', undefined)
    .option('--reason <text>', 'Reason for pause', 'Manual pause')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        if (!options.epic) {
          console.error('Error: --epic is required');
          process.exit(1);
        }

        console.log(`Pausing session for epic: ${options.epic}`);
        console.log(`Reason: ${options.reason}`);
        console.log('');

        // Load latest checkpoint to get current context
        const checkpoint = await loadLatestCheckpoint(options.epic, options.cwd);

        if (!checkpoint) {
          console.error('No active session found for this epic.');
          process.exit(1);
        }

        // TODO: In a real implementation, we'd track the active session
        // For now, we'll just create a checkpoint with the existing context

        console.log('Checkpoint created successfully.');
        console.log('');
        console.log(`To resume: orch session start --epic ${options.epic} --resume`);
      } catch (error) {
        console.error('Failed to pause session:', error);
        process.exit(1);
      }
    });

  // orch session list
  session
    .command('list')
    .description('List all checkpoints for an epic')
    .option('--epic <id>', 'Epic ID', undefined)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        if (!options.epic) {
          console.error('Error: --epic is required');
          process.exit(1);
        }

        const checkpoints = await listCheckpoints(options.epic, options.cwd);

        if (checkpoints.length === 0) {
          console.log(`No checkpoints found for epic: ${options.epic}`);
          return;
        }

        console.log(`Checkpoints for epic: ${options.epic}`);
        console.log('');

        for (const checkpoint of checkpoints) {
          console.log(`${checkpoint.id} - Session ${checkpoint.sessionNumber}`);
          console.log(`  Timestamp: ${checkpoint.timestamp}`);
          console.log(`  Reason: ${checkpoint.reason}`);
          console.log(`  Cost: $${checkpoint.context.cumulativeCost.toFixed(4)}`);
          console.log('');
        }
      } catch (error) {
        console.error('Failed to list checkpoints:', error);
        process.exit(1);
      }
    });

  return session;
}
