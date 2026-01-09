/**
 * @create-something/orchestration
 *
 * CLI commands for convoy management.
 */

import { Command } from 'commander';
import {
  createConvoy,
  listConvoys,
  getConvoyStatus,
  updateConvoyStatus,
  deleteConvoy,
} from '../coordinator/convoy.js';
import { labelConvoyIssues, getIssues, getReadyIssues } from '../integration/beads.js';
import { formatCostSummary } from '../cost/report.js';
import { generateConvoyReport } from '../cost/report.js';

/**
 * Create convoy CLI command group.
 */
export function createConvoyCommand(): Command {
  const convoy = new Command('convoy');
  convoy.description('Manage convoys for parallel issue execution');

  // orch convoy create <name> <issue...>
  convoy
    .command('create <name> <issues...>')
    .description('Create a new convoy for parallel execution')
    .option('--epic <id>', 'Epic ID (auto-generated if not provided)')
    .option('--budget <amount>', 'Budget in USD for this convoy')
    .action(async (name: string, issueIds: string[], options) => {
      try {
        const epicId = options.epic || `epic-${Date.now()}`;
        const budget = options.budget ? parseFloat(options.budget) : null;

        // Validate issues exist
        const issues = await getIssues(issueIds);
        if (issues.length === 0) {
          console.error('Error: No valid issues found');
          process.exit(1);
        }

        if (issues.length < issueIds.length) {
          console.warn(
            `Warning: Found ${issues.length}/${issueIds.length} issues. Missing: ${issueIds.filter((id) => !issues.find((i) => i.id === id)).join(', ')}`
          );
        }

        // Check for blocked issues
        const readyIssues = await getReadyIssues(issueIds);
        if (readyIssues.length < issues.length) {
          console.warn(`Warning: ${issues.length - readyIssues.length} issues are blocked`);
        }

        // Create convoy
        const convoy = await createConvoy(epicId, name, issueIds, budget);

        // Label issues with convoy membership
        await labelConvoyIssues(convoy.id, issueIds);

        console.log(`\nConvoy created: ${convoy.id}`);
        console.log(`Name: ${convoy.name}`);
        console.log(`Epic: ${convoy.epicId}`);
        console.log(`Issues: ${convoy.issueIds.length}`);
        if (budget !== null) {
          console.log(`Budget: $${budget.toFixed(4)}`);
        }

        console.log(`\nNext steps:`);
        console.log(`  1. Spawn workers: orch work assign <issue-id> ${convoy.id}`);
        console.log(`  2. Monitor status: orch convoy show ${convoy.id}`);
        console.log(`  3. Track costs: orch cost report --convoy ${convoy.id}`);
      } catch (error) {
        console.error('Error creating convoy:', error);
        process.exit(1);
      }
    });

  // orch convoy list
  convoy
    .command('list')
    .description('List all convoys in an epic')
    .option('--epic <id>', 'Filter by epic ID')
    .action(async (options) => {
      try {
        if (!options.epic) {
          console.error('Error: --epic <id> is required');
          process.exit(1);
        }

        const convoys = await listConvoys(options.epic);

        if (convoys.length === 0) {
          console.log(`No convoys found for epic ${options.epic}`);
          return;
        }

        console.log(`\n=== Convoys in ${options.epic} ===\n`);

        for (const convoy of convoys) {
          console.log(`${convoy.id} - ${convoy.name}`);
          console.log(`  Status: ${convoy.status}`);
          console.log(`  Issues: ${convoy.issueIds.length}`);
          console.log(`  Created: ${new Date(convoy.createdAt).toLocaleString()}`);

          if (convoy.completedAt) {
            console.log(`  Completed: ${new Date(convoy.completedAt).toLocaleString()}`);
          }

          console.log();
        }
      } catch (error) {
        console.error('Error listing convoys:', error);
        process.exit(1);
      }
    });

  // orch convoy show <convoy-id>
  convoy
    .command('show <convoyId>')
    .description('Show detailed convoy status')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string, options) => {
      try {
        const status = await getConvoyStatus(convoyId, options.epic);

        if (!status) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        console.log(`\n=== Convoy Status ===`);
        console.log(`ID: ${status.convoyId}`);
        console.log(`Name: ${status.name}`);
        console.log(`Status: ${status.status}`);
        console.log(`Created: ${new Date(status.createdAt).toLocaleString()}`);

        console.log(`\n--- Progress ---`);
        console.log(`Total Issues: ${status.totalIssues}`);
        console.log(`Completed: ${status.completedIssues}`);
        console.log(`In Progress: ${status.inProgressIssues}`);
        console.log(`Failed: ${status.failedIssues}`);

        const percentComplete =
          status.totalIssues > 0 ? (status.completedIssues / status.totalIssues) * 100 : 0;
        console.log(`Progress: ${percentComplete.toFixed(1)}%`);

        console.log(`\n--- Worker Health ---`);
        console.log(`Healthy: ${status.health.healthy}`);
        console.log(`Completed: ${status.health.completed}`);
        console.log(`Failed: ${status.health.failed}`);
        console.log(`Stale: ${status.health.stale}`);

        if (status.health.staleWorkerIds.length > 0) {
          console.log(`Stale Workers: ${status.health.staleWorkerIds.join(', ')}`);
        }

        console.log(`\n--- Cost ---`);
        console.log(`Total Cost: $${status.totalCost.toFixed(4)}`);

        if (status.budgetRemaining !== null) {
          console.log(`Budget Remaining: $${status.budgetRemaining.toFixed(4)}`);

          const percentUsed = (status.totalCost / (status.totalCost + status.budgetRemaining)) * 100;
          console.log(`Budget Used: ${percentUsed.toFixed(1)}%`);

          if (status.budgetRemaining <= 0) {
            console.log(`⚠️  BUDGET EXCEEDED`);
          } else if (percentUsed >= 80) {
            console.log(`⚡ Warning: Budget at ${percentUsed.toFixed(0)}%`);
          }
        }

        // Show cost report
        const report = await generateConvoyReport(convoyId, options.epic);
        if (report) {
          console.log(`\n${formatCostSummary(report)}`);
        }
      } catch (error) {
        console.error('Error showing convoy:', error);
        process.exit(1);
      }
    });

  // orch convoy cancel <convoy-id>
  convoy
    .command('cancel <convoyId>')
    .description('Cancel a convoy (terminate all workers)')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string, options) => {
      try {
        // Update convoy status to failed
        await updateConvoyStatus(convoyId, 'failed', options.epic);

        console.log(`Convoy ${convoyId} cancelled`);
        console.log(`Note: Workers are not automatically terminated. Use 'orch work' commands to manage workers.`);
      } catch (error) {
        console.error('Error cancelling convoy:', error);
        process.exit(1);
      }
    });

  return convoy;
}
