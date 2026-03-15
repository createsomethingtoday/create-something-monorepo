/**
 * @create-something/orchestration
 *
 * CLI commands for worker management.
 */

import { Command } from 'commander';
import { loadConvoy } from '../coordinator/convoy.js';
import { spawnWorker, readWorkerSignal, terminateWorker } from '../coordinator/worker-pool.js';
import { getIssue } from '../integration/beads.js';
import type { WorkerConfig } from '../types.js';

/**
 * Create work CLI command group.
 */
export function createWorkCommand(): Command {
  const work = new Command('work');
  work.description('Manage worker assignments and status');

  // orch work assign <issue> <convoy>
  work
    .command('assign <issueId> <convoyId>')
    .description('Assign an issue to a convoy worker')
    .option('--epic <id>', 'Epic ID (for faster convoy lookup)')
    .option('--budget <amount>', 'Budget for this worker in USD')
    .action(async (issueId: string, convoyId: string, options) => {
      try {
        // Load convoy
        const loaded = await loadConvoy(convoyId, options.epic);
        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;

        // Verify issue is in convoy
        if (!convoy.issueIds.includes(issueId)) {
          console.error(`Issue ${issueId} is not in convoy ${convoyId}`);
          console.log(`Convoy issues: ${convoy.issueIds.join(', ')}`);
          process.exit(1);
        }

        // Get issue details
        const issue = await getIssue(issueId);
        if (!issue) {
          console.error(`Issue ${issueId} not found`);
          process.exit(1);
        }

        // Spawn worker
        const config: WorkerConfig = {
          epicId: convoy.epicId,
          convoyId: convoy.id,
          cwd: process.cwd(),
          budget: options.budget ? parseFloat(options.budget) : null,
        };

        const worker = await spawnWorker(convoy, issue, config);

        console.log(`\nWorker spawned: ${worker.workerId}`);
        console.log(`Issue: ${issueId} - ${issue.title}`);
        console.log(`Convoy: ${convoy.name}`);

        console.log(`\nWorker prompt written to: .orchestration/workers/${worker.workerId}/prompt.txt`);
        console.log(`\nNext steps:`);
        console.log(`  1. Spawn Task subagent manually (Claude Code doesn't expose Task API yet)`);
        console.log(`  2. Monitor worker: orch work status ${issueId}`);
        console.log(`  3. View logs: .orchestration/workers/${worker.workerId}/status.json`);
      } catch (error) {
        console.error('Error assigning work:', error);
        process.exit(1);
      }
    });

  // orch work status <issue>
  work
    .command('status <issueId>')
    .description('Show worker status for an issue')
    .action(async (issueId: string) => {
      try {
        // Find worker for this issue
        // This requires scanning all worker directories
        // For Phase 2, we'll implement a simple search
        console.log(`Searching for worker handling ${issueId}...`);

        // TODO: Implement worker search by issue ID
        // For now, instruct user to check convoy status
        console.log(`\nUse 'orch convoy show <convoy-id>' to see all workers in a convoy`);
      } catch (error) {
        console.error('Error checking work status:', error);
        process.exit(1);
      }
    });

  // orch work retry <issue>
  work
    .command('retry <issueId>')
    .description('Retry a failed worker')
    .option('--convoy <id>', 'Convoy ID')
    .option('--epic <id>', 'Epic ID (for faster convoy lookup)')
    .action(async (issueId: string, options) => {
      try {
        if (!options.convoy) {
          console.error('Error: --convoy <id> is required');
          process.exit(1);
        }

        // Load convoy
        const loaded = await loadConvoy(options.convoy, options.epic);
        if (!loaded) {
          console.error(`Convoy ${options.convoy} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;

        // Get issue
        const issue = await getIssue(issueId);
        if (!issue) {
          console.error(`Issue ${issueId} not found`);
          process.exit(1);
        }

        // Spawn new worker
        const config: WorkerConfig = {
          epicId: convoy.epicId,
          convoyId: convoy.id,
          cwd: process.cwd(),
          budget: null,
        };

        const worker = await spawnWorker(convoy, issue, config);

        console.log(`\nRetry worker spawned: ${worker.workerId}`);
        console.log(`Previous failures will be visible in issue notes`);
      } catch (error) {
        console.error('Error retrying work:', error);
        process.exit(1);
      }
    });

  return work;
}
