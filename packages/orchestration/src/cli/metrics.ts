/**
 * @create-something/orchestration
 *
 * CLI commands for work metrics tracking and reporting.
 *
 * Philosophy: Surface patterns that help identify improvement opportunities.
 * Inspired by RoboDev's 40% PR cycle time reduction measurement.
 */

import { Command } from 'commander';
import {
  collectConvoyMetrics,
  collectEpicMetrics,
  computeAggregateMetrics,
  computeTrends,
  saveMetrics,
  loadMetrics,
  listMetrics,
  generateMetricsReport,
} from '../metrics/index.js';
import { formatDate } from '../utils/format.js';

/**
 * Create the metrics command.
 */
export function createMetricsCommand(): Command {
  const metrics = new Command('metrics')
    .description('Work metrics tracking and reporting');

  // orch metrics convoy
  metrics
    .command('convoy')
    .description('Collect and display metrics for a convoy')
    .argument('<convoy-id>', 'Convoy ID')
    .requiredOption('--epic <id>', 'Epic ID')
    .option('--save', 'Save metrics to storage', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (convoyId: string, options) => {
      try {
        console.log(`📊 Collecting metrics for convoy: ${convoyId}`);
        console.log('');

        // Collect metrics
        const issueMetrics = await collectConvoyMetrics(convoyId, options.epic, options.cwd);

        if (issueMetrics.length === 0) {
          console.log('No metrics found for this convoy.');
          return;
        }

        // Compute aggregates
        const aggregate = computeAggregateMetrics(convoyId, 'convoy', issueMetrics);

        // Display summary
        displayMetricsSummary(aggregate);

        // Save if requested
        if (options.save) {
          console.log('');
          console.log('Saving metrics...');
          await saveMetrics(convoyId, issueMetrics, aggregate, [], options.cwd);
          console.log('✓ Metrics saved');
        }

        console.log('');
        console.log(`To generate report: orch metrics report ${convoyId}`);
      } catch (error) {
        console.error('Metrics collection failed:', error);
        process.exit(1);
      }
    });

  // orch metrics epic
  metrics
    .command('epic')
    .description('Collect and display metrics for an epic')
    .argument('<epic-id>', 'Epic ID')
    .option('--save', 'Save metrics to storage', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (epicId: string, options) => {
      try {
        console.log(`📊 Collecting metrics for epic: ${epicId}`);
        console.log('');

        // Collect metrics
        const issueMetrics = await collectEpicMetrics(epicId, options.cwd);

        if (issueMetrics.length === 0) {
          console.log('No metrics found for this epic.');
          return;
        }

        // Compute aggregates
        const aggregate = computeAggregateMetrics(epicId, 'epic', issueMetrics);

        // Display summary
        displayMetricsSummary(aggregate);

        // Save if requested
        if (options.save) {
          console.log('');
          console.log('Saving metrics...');
          await saveMetrics(epicId, issueMetrics, aggregate, [], options.cwd);
          console.log('✓ Metrics saved');
        }

        console.log('');
        console.log(`To generate report: orch metrics report ${epicId}`);
      } catch (error) {
        console.error('Metrics collection failed:', error);
        process.exit(1);
      }
    });

  // orch metrics report
  metrics
    .command('report')
    .description('Generate a metrics report')
    .argument('<target-id>', 'Target ID (convoy or epic)')
    .option('--output <file>', 'Output file path')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (targetId: string, options) => {
      try {
        console.log(`📋 Generating report for: ${targetId}`);
        console.log('');

        const stored = await loadMetrics(targetId, options.cwd);

        if (!stored) {
          console.error(`No metrics found for: ${targetId}`);
          console.error('Run: orch metrics convoy <id> --save');
          console.error('Or: orch metrics epic <id> --save');
          process.exit(1);
        }

        const report = generateMetricsReport(stored);

        if (options.output) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const outputPath = path.join(options.cwd, options.output);
          await fs.writeFile(outputPath, report, 'utf-8');
          console.log(`✓ Report saved to: ${options.output}`);
        } else {
          console.log(report);
        }
      } catch (error) {
        console.error('Report generation failed:', error);
        process.exit(1);
      }
    });

  // orch metrics list
  metrics
    .command('list')
    .description('List all saved metrics')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const allMetrics = await listMetrics(options.cwd);

        if (allMetrics.length === 0) {
          console.log('No saved metrics found.');
          console.log('');
          console.log('Collect metrics:');
          console.log('  orch metrics convoy <id> --epic <epic-id> --save');
          console.log('  orch metrics epic <id> --save');
          return;
        }

        console.log('Saved Metrics');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        for (const stored of allMetrics) {
          const agg = stored.aggregate;
          console.log(`${agg.targetId} (${agg.targetType})`);
          console.log(`  Issues: ${agg.totalIssues} | Success: ${(agg.successRate * 100).toFixed(0)}%`);
          console.log(`  Avg Cycle: ${agg.avgCycleTime.toFixed(0)} min | Avg Iterations: ${agg.avgIterations.toFixed(1)}`);
          console.log(`  Total Cost: $${agg.totalCost.toFixed(4)}`);
          console.log(`  Updated: ${formatDate(stored.updatedAt)}`);
          console.log('');
        }
      } catch (error) {
        console.error('List failed:', error);
        process.exit(1);
      }
    });

  // orch metrics compare
  metrics
    .command('compare')
    .description('Compare metrics between two targets')
    .argument('<target-a>', 'First target ID')
    .argument('<target-b>', 'Second target ID')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (targetA: string, targetB: string, options) => {
      try {
        console.log(`📊 Comparing: ${targetA} vs ${targetB}`);
        console.log('');

        const metricsA = await loadMetrics(targetA, options.cwd);
        const metricsB = await loadMetrics(targetB, options.cwd);

        if (!metricsA) {
          console.error(`No metrics found for: ${targetA}`);
          process.exit(1);
        }
        if (!metricsB) {
          console.error(`No metrics found for: ${targetB}`);
          process.exit(1);
        }

        const aggA = metricsA.aggregate;
        const aggB = metricsB.aggregate;

        console.log('Comparison');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`| Metric | ${targetA} | ${targetB} | Change |`);
        console.log(`|--------|---------|---------|--------|`);

        // Compare key metrics
        compareMetric('Issues', aggA.totalIssues, aggB.totalIssues);
        compareMetric('Success Rate', aggA.successRate * 100, aggB.successRate * 100, '%');
        compareMetric('Avg Cycle Time', aggA.avgCycleTime, aggB.avgCycleTime, ' min', true);
        compareMetric('Avg Iterations', aggA.avgIterations, aggB.avgIterations, '', true);
        compareMetric('Corrections', aggA.totalCorrections, aggB.totalCorrections, '', true);
        compareMetric('Reviewer Findings', aggA.totalReviewerFindings, aggB.totalReviewerFindings);
        compareMetric('Total Cost', aggA.totalCost, aggB.totalCost, '', true, '$');

        console.log('');
      } catch (error) {
        console.error('Comparison failed:', error);
        process.exit(1);
      }
    });

  // orch metrics summary
  metrics
    .command('summary')
    .description('Show summary of all metrics')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const allMetrics = await listMetrics(options.cwd);

        if (allMetrics.length === 0) {
          console.log('No saved metrics found.');
          return;
        }

        // Aggregate across all metrics
        let totalIssues = 0;
        let totalCompleted = 0;
        let totalCost = 0;
        let totalCycleTime = 0;
        let totalIterations = 0;
        let totalFindings = 0;

        for (const stored of allMetrics) {
          const agg = stored.aggregate;
          totalIssues += agg.totalIssues;
          totalCompleted += agg.completedIssues;
          totalCost += agg.totalCost;
          totalCycleTime += agg.avgCycleTime * agg.totalIssues;
          totalIterations += agg.avgIterations * agg.totalIssues;
          totalFindings += agg.totalReviewerFindings;
        }

        const avgCycleTime = totalIssues > 0 ? totalCycleTime / totalIssues : 0;
        const avgIterations = totalIssues > 0 ? totalIterations / totalIssues : 0;
        const successRate = totalIssues > 0 ? totalCompleted / totalIssues : 0;

        console.log('Overall Metrics Summary');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`Targets tracked: ${allMetrics.length}`);
        console.log('');
        console.log(`| Metric | Value |`);
        console.log(`|--------|-------|`);
        console.log(`| Total Issues | ${totalIssues} |`);
        console.log(`| Completed | ${totalCompleted} |`);
        console.log(`| Success Rate | ${(successRate * 100).toFixed(0)}% |`);
        console.log(`| Avg Cycle Time | ${avgCycleTime.toFixed(0)} min |`);
        console.log(`| Avg Iterations | ${avgIterations.toFixed(1)} |`);
        console.log(`| Total Reviewer Findings | ${totalFindings} |`);
        console.log(`| Total Cost | $${totalCost.toFixed(4)} |`);
        console.log('');
      } catch (error) {
        console.error('Summary failed:', error);
        process.exit(1);
      }
    });

  return metrics;
}

/**
 * Display metrics summary.
 */
function displayMetricsSummary(agg: ReturnType<typeof import('../metrics/index.js').computeAggregateMetrics>): void {
  console.log('Metrics Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Issues
  console.log('Issues:');
  console.log(`  Total: ${agg.totalIssues}`);
  console.log(`  Completed: ${agg.completedIssues}`);
  console.log(`  Failed: ${agg.failedIssues}`);
  console.log(`  Success Rate: ${(agg.successRate * 100).toFixed(0)}%`);
  console.log(`  First-Time Success: ${(agg.firstTimeSuccessRate * 100).toFixed(0)}%`);
  console.log('');

  // Cycle time
  console.log('Cycle Time:');
  console.log(`  Average: ${agg.avgCycleTime.toFixed(0)} min`);
  console.log(`  Median: ${agg.medianCycleTime.toFixed(0)} min`);
  console.log(`  90th Percentile: ${agg.p90CycleTime.toFixed(0)} min`);
  console.log('');

  // Iterations
  console.log('Iterations:');
  console.log(`  Average: ${agg.avgIterations.toFixed(1)}`);
  console.log(`  Corrections: ${agg.totalCorrections}`);
  console.log(`  Correction Rate: ${(agg.correctionRate * 100).toFixed(0)}%`);
  console.log(`  Issues with Retries: ${agg.issuesWithRetries}`);
  console.log('');

  // Reviewer efficacy
  console.log('Reviewer Efficacy:');
  console.log(`  Total Findings: ${agg.totalReviewerFindings}`);
  console.log(`  Catch Rate: ${(agg.reviewerCatchRate * 100).toFixed(0)}%`);
  console.log(`  Requiring Rework: ${agg.findingsRequiringRework}`);
  console.log('');

  // Cost
  console.log('Cost:');
  console.log(`  Total: $${agg.totalCost.toFixed(4)}`);
  console.log(`  Per Issue: $${agg.avgCostPerIssue.toFixed(4)}`);
  console.log(`  Per Success: $${agg.costPerSuccess.toFixed(4)}`);
}

/**
 * Compare a metric between two values.
 */
function compareMetric(
  name: string,
  valueA: number,
  valueB: number,
  suffix: string = '',
  lowerIsBetter: boolean = false,
  prefix: string = ''
): void {
  const change = valueA !== 0 ? ((valueB - valueA) / valueA) * 100 : 0;
  const changeStr = change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;

  let indicator = '';
  if (Math.abs(change) > 5) {
    if (lowerIsBetter) {
      indicator = change < 0 ? ' 📈' : ' 📉';
    } else {
      indicator = change > 0 ? ' 📈' : ' 📉';
    }
  }

  console.log(
    `| ${name} | ${prefix}${valueA.toFixed(1)}${suffix} | ${prefix}${valueB.toFixed(1)}${suffix} | ${changeStr}${indicator} |`
  );
}
