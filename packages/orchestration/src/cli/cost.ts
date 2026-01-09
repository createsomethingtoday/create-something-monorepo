/**
 * @create-something/orchestration
 *
 * CLI commands for cost tracking and reporting.
 */

import { Command } from 'commander';
import { generateConvoyReport, generateEpicReport, formatConvoyReport, formatEpicReport } from '../cost/report.js';
import { loadConvoy, listConvoys } from '../coordinator/convoy.js';

/**
 * Create cost CLI command group.
 */
export function createCostCommand(): Command {
  const cost = new Command('cost');
  cost.description('Track and report convoy/epic costs');

  // orch cost status
  cost
    .command('status')
    .description('Show overall cost summary')
    .option('--epic <id>', 'Filter by epic ID')
    .option('--convoy <id>', 'Filter by convoy ID')
    .action(async (options) => {
      try {
        if (options.convoy) {
          // Show convoy cost status
          const report = await generateConvoyReport(options.convoy, options.epic);

          if (!report) {
            console.error(`Convoy ${options.convoy} not found`);
            process.exit(1);
          }

          console.log(`\n=== Convoy Cost Status ===`);
          console.log(`Convoy: ${report.convoyName}`);
          console.log(`Total Cost: $${report.totalCost.toFixed(4)}`);

          if (report.budget !== null) {
            const percentUsed = (report.totalCost / report.budget) * 100;
            console.log(`Budget: $${report.budget.toFixed(4)}`);
            console.log(`Remaining: $${(report.remaining ?? 0).toFixed(4)}`);
            console.log(`Used: ${percentUsed.toFixed(1)}%`);

            if (report.exceeded) {
              console.log(`⚠️  BUDGET EXCEEDED`);
            } else if (percentUsed >= 80) {
              console.log(`⚡ Warning: Budget at ${percentUsed.toFixed(0)}%`);
            }
          }

          console.log(`\nWorkers: ${report.workerBreakdown.length}`);
          console.log(`Sessions: ${report.sessionBreakdown.length}`);
        } else if (options.epic) {
          // Show epic cost status
          const report = await generateEpicReport(options.epic);

          console.log(`\n=== Epic Cost Status ===`);
          console.log(`Epic: ${report.epicId}`);
          console.log(`Total Cost: $${report.totalCost.toFixed(4)}`);

          if (report.budget !== null) {
            console.log(`Budget: $${report.budget.toFixed(4)}`);
            console.log(`Remaining: $${(report.remaining ?? 0).toFixed(4)}`);

            if (report.exceeded) {
              console.log(`⚠️  BUDGET EXCEEDED`);
            }
          }

          console.log(`\nConvoys: ${report.convoys.length}`);

          // Show top 5 convoys by cost
          const topConvoys = [...report.convoys].sort((a, b) => b.totalCost - a.totalCost).slice(0, 5);

          if (topConvoys.length > 0) {
            console.log(`\n--- Top Convoys by Cost ---`);
            topConvoys.forEach((convoy, i) => {
              console.log(`${i + 1}. ${convoy.convoyName}: $${convoy.totalCost.toFixed(4)}`);
            });
          }
        } else {
          console.error('Error: --epic <id> or --convoy <id> is required');
          process.exit(1);
        }
      } catch (error) {
        console.error('Error getting cost status:', error);
        process.exit(1);
      }
    });

  // orch cost report
  cost
    .command('report')
    .description('Generate detailed cost report')
    .option('--epic <id>', 'Generate epic-level report')
    .option('--convoy <id>', 'Generate convoy-level report')
    .option('--format <type>', 'Output format: text (default), json', 'text')
    .action(async (options) => {
      try {
        if (options.convoy) {
          // Convoy report
          const report = await generateConvoyReport(options.convoy, options.epic);

          if (!report) {
            console.error(`Convoy ${options.convoy} not found`);
            process.exit(1);
          }

          if (options.format === 'json') {
            console.log(JSON.stringify(report, null, 2));
          } else {
            console.log(formatConvoyReport(report));
          }
        } else if (options.epic) {
          // Epic report
          const report = await generateEpicReport(options.epic);

          if (options.format === 'json') {
            console.log(JSON.stringify(report, null, 2));
          } else {
            console.log(formatEpicReport(report));

            // Show detailed convoy reports
            console.log(`\n\n=== Convoy Details ===`);
            for (const convoy of report.convoys) {
              console.log(formatConvoyReport(convoy));
              console.log();
            }
          }
        } else {
          console.error('Error: --epic <id> or --convoy <id> is required');
          process.exit(1);
        }
      } catch (error) {
        console.error('Error generating cost report:', error);
        process.exit(1);
      }
    });

  // orch cost budget <amount>
  cost
    .command('budget <amount>')
    .description('Set or update epic budget')
    .option('--epic <id>', 'Epic ID (required)')
    .option('--convoy <id>', 'Convoy ID (set convoy-specific budget)')
    .action(async (amount: string, options) => {
      try {
        const budget = parseFloat(amount);

        if (isNaN(budget) || budget <= 0) {
          console.error('Error: Budget must be a positive number');
          process.exit(1);
        }

        if (!options.epic && !options.convoy) {
          console.error('Error: --epic <id> or --convoy <id> is required');
          process.exit(1);
        }

        if (options.convoy) {
          // Update convoy budget
          const loaded = await loadConvoy(options.convoy, options.epic);
          if (!loaded) {
            console.error(`Convoy ${options.convoy} not found`);
            process.exit(1);
          }

          const { convoy } = loaded;

          // Update convoy cost tracker with new budget
          convoy.costTracker = {
            budget,
            consumed: convoy.costTracker?.consumed || 0,
            remaining: budget - (convoy.costTracker?.consumed || 0),
            exceeded: (convoy.costTracker?.consumed || 0) > budget,
            warnings: convoy.costTracker?.warnings || [],
          };

          console.log(`Budget updated for convoy ${convoy.name}: $${budget.toFixed(4)}`);
        } else {
          // Update epic budget (would need epic-level storage, not implemented in Phase 2)
          console.log(`Epic budget feature not yet implemented (Phase 3)`);
          console.log(`For now, set budgets per-convoy using --convoy flag`);
        }
      } catch (error) {
        console.error('Error setting budget:', error);
        process.exit(1);
      }
    });

  return cost;
}
