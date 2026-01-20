/**
 * @create-something/orchestration
 *
 * CLI commands for convoy management.
 */

import { Command } from 'commander';
import {
  createConvoy,
  listConvoys,
  loadConvoy,
  getConvoyStatus,
  updateConvoyStatus,
  deleteConvoy,
} from '../coordinator/convoy.js';
import { labelConvoyIssues, getIssues, getReadyIssues } from '../integration/beads.js';
import { formatCostSummary } from '../cost/report.js';
import { generateConvoyReport } from '../cost/report.js';
import { startBackgroundConvoy, attachToBackgroundConvoy } from '../session/background.js';
import { performConvoyReview, resumeConvoyAfterReview } from '../checkpoint/review.js';

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
          console.log(`${convoy.convoy.id} - ${convoy.convoy.name}`);
          console.log(`  Status: ${convoy.convoy.status}`);
          console.log(`  Issues: ${convoy.convoy.issueIds.length}`);
          console.log(`  Created: ${new Date(convoy.convoy.createdAt).toLocaleString()}`);

          if (convoy.convoy.completedAt) {
            console.log(`  Completed: ${new Date(convoy.convoy.completedAt).toLocaleString()}`);
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

  // orch convoy background <convoy-id>
  convoy
    .command('background <convoyId>')
    .description('Start convoy in background mode')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .option('--no-witness', 'Disable witness monitoring')
    .action(async (convoyId: string, options) => {
      try {
        const loaded = await loadConvoy(convoyId, options.epic);

        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;

        console.log(`Starting convoy ${convoyId} in background...`);
        console.log(`Witness monitoring: ${options.witness ? 'enabled' : 'disabled'}`);
        console.log('');

        // Start background convoy with optional witness
        await startBackgroundConvoy({
          convoy,
          detach: true,
          witnessEnabled: options.witness !== false,
        });

      } catch (error) {
        console.error('Error starting background convoy:', error);
        process.exit(1);
      }
    });

  // orch convoy attach <convoy-id>
  convoy
    .command('attach <convoyId>')
    .description('Attach to running background convoy')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string, options) => {
      try {
        console.log(`Attaching to convoy ${convoyId}...`);
        console.log('');

        // Attach to background convoy
        await attachToBackgroundConvoy(convoyId, options.epic);

      } catch (error) {
        console.error('Error attaching to convoy:', error);
        process.exit(1);
      }
    });

  // orch convoy review <convoy-id>
  convoy
    .command('review <convoyId>')
    .description('Trigger convoy-wide review')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .option('--checkpoint <id>', 'Checkpoint ID (creates new if not provided)')
    .action(async (convoyId: string, options) => {
      try {
        console.log(`Reviewing convoy ${convoyId}...`);
        console.log('');

        // Generate checkpoint ID if not provided
        const checkpointId = options.checkpoint || `ckpt-${Date.now()}`;

        // Perform convoy-wide review
        const result = await performConvoyReview(
          convoyId,
          checkpointId,
          options.epic
        );

        // Display results
        console.log('');
        if (result.overallPass) {
          console.log('✓ Review passed');
        } else {
          console.log(`⚠️  Review found ${result.blockers.length} blocking issues`);
        }

        // Show findings
        if (result.findings.length > 0) {
          console.log('');
          console.log('Findings:');
          for (const finding of result.findings) {
            const icon = finding.severity === 'critical' ? '🔴' :
                        finding.severity === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`${icon} [${finding.reviewer}] ${finding.finding}`);
            if (finding.location) {
              console.log(`   Location: ${finding.location}`);
            }
          }
        }

        if (!result.overallPass) {
          console.log('');
          console.log(`Resume with: orch convoy resume ${convoyId}`);
        }

      } catch (error) {
        console.error('Error reviewing convoy:', error);
        process.exit(1);
      }
    });

  // orch convoy resume <convoy-id>
  convoy
    .command('resume <convoyId>')
    .description('Resume convoy after review fixes')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string, options) => {
      try {
        console.log(`Resuming convoy ${convoyId}...`);
        console.log('');

        // Resume convoy after review fixes
        await resumeConvoyAfterReview(convoyId, options.epic);

        console.log('');
        console.log('Convoy resumed successfully');
        console.log('Workers will continue execution');

      } catch (error) {
        console.error('Error resuming convoy:', error);
        process.exit(1);
      }
    });

  return convoy;
}
