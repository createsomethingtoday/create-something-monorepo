/**
 * @create-something/orchestration
 *
 * CLI commands for agent reflection and learning extraction.
 *
 * Philosophy: Like RoboDev's "sleep" phase, agents need to reflect on past work
 * to extract learnings and improve future performance. This CLI provides
 * commands to trigger and manage the reflection process.
 */

import { Command } from 'commander';
import {
  analyzeConvoy,
  analyzeEpic,
  saveReflection,
  loadReflection,
  listReflections,
  applyAllLearnings,
  getPendingLearningSummary,
  generateLearningsReport,
  DEFAULT_REFLECTION_CONFIG,
} from '../reflection/index.js';
import type { ReflectionConfig } from '../reflection/index.js';

/**
 * Create the reflect command.
 */
export function createReflectCommand(): Command {
  const reflect = new Command('reflect')
    .description('Agent reflection and learning extraction');

  // orch reflect convoy
  reflect
    .command('convoy')
    .description('Reflect on a completed convoy')
    .argument('<convoy-id>', 'Convoy ID to reflect on')
    .requiredOption('--epic <id>', 'Epic ID containing the convoy')
    .option('--min-confidence <n>', 'Minimum confidence threshold (0-1)', parseFloat)
    .option('--auto-apply', 'Automatically apply learnings to rule files', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (convoyId: string, options) => {
      try {
        console.log(`🔍 Reflecting on convoy: ${convoyId}`);
        console.log(`   Epic: ${options.epic}`);
        console.log('');

        const config: ReflectionConfig = {
          ...DEFAULT_REFLECTION_CONFIG,
          minConfidence: options.minConfidence ?? DEFAULT_REFLECTION_CONFIG.minConfidence,
          autoApply: options.autoApply,
        };

        // Analyze convoy
        console.log('Analyzing convoy...');
        const result = await analyzeConvoy(convoyId, options.epic, config, options.cwd);

        // Save reflection
        console.log('Saving reflection...');
        const stored = await saveReflection(result, config, options.cwd);

        // Display results
        displayReflectionResult(result, stored);

        // Auto-apply if enabled
        if (options.autoApply && result.learnings.length > 0) {
          console.log('');
          console.log('Applying learnings to rule files...');
          const { applied, skipped } = await applyAllLearnings(stored, options.cwd);
          console.log(`  Applied: ${applied}`);
          console.log(`  Skipped: ${skipped} (no target file)`);
        }

        console.log('');
        console.log(`Reflection saved: ${result.id}`);
        console.log(`To apply learnings: orch reflect apply ${result.id}`);
      } catch (error) {
        console.error('Reflection failed:', error);
        process.exit(1);
      }
    });

  // orch reflect epic
  reflect
    .command('epic')
    .description('Reflect on an entire epic')
    .argument('<epic-id>', 'Epic ID to reflect on')
    .option('--min-confidence <n>', 'Minimum confidence threshold (0-1)', parseFloat)
    .option('--auto-apply', 'Automatically apply learnings to rule files', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (epicId: string, options) => {
      try {
        console.log(`🔍 Reflecting on epic: ${epicId}`);
        console.log('');

        const config: ReflectionConfig = {
          ...DEFAULT_REFLECTION_CONFIG,
          minConfidence: options.minConfidence ?? DEFAULT_REFLECTION_CONFIG.minConfidence,
          autoApply: options.autoApply,
        };

        // Analyze epic
        console.log('Analyzing epic...');
        const result = await analyzeEpic(epicId, config, options.cwd);

        // Save reflection
        console.log('Saving reflection...');
        const stored = await saveReflection(result, config, options.cwd);

        // Display results
        displayReflectionResult(result, stored);

        // Auto-apply if enabled
        if (options.autoApply && result.learnings.length > 0) {
          console.log('');
          console.log('Applying learnings to rule files...');
          const { applied, skipped } = await applyAllLearnings(stored, options.cwd);
          console.log(`  Applied: ${applied}`);
          console.log(`  Skipped: ${skipped} (no target file)`);
        }

        console.log('');
        console.log(`Reflection saved: ${result.id}`);
        console.log(`To apply learnings: orch reflect apply ${result.id}`);
      } catch (error) {
        console.error('Reflection failed:', error);
        process.exit(1);
      }
    });

  // orch reflect apply
  reflect
    .command('apply')
    .description('Apply pending learnings from a reflection')
    .argument('<reflection-id>', 'Reflection ID')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (reflectionId: string, options) => {
      try {
        console.log(`📝 Applying learnings from: ${reflectionId}`);
        console.log('');

        const stored = await loadReflection(reflectionId, options.cwd);

        if (!stored) {
          console.error(`Reflection not found: ${reflectionId}`);
          process.exit(1);
        }

        if (stored.pendingLearnings.length === 0) {
          console.log('No pending learnings to apply.');
          return;
        }

        console.log(`Pending learnings: ${stored.pendingLearnings.length}`);
        console.log('');

        const { applied, skipped } = await applyAllLearnings(stored, options.cwd);

        console.log('');
        console.log(`✓ Applied: ${applied}`);
        console.log(`- Skipped: ${skipped} (no target file)`);

        if (applied > 0) {
          console.log('');
          console.log('Learnings have been added to .claude/rules/ files.');
          console.log('Review and commit the changes.');
        }
      } catch (error) {
        console.error('Apply failed:', error);
        process.exit(1);
      }
    });

  // orch reflect list
  reflect
    .command('list')
    .description('List all reflections')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const reflections = await listReflections(options.cwd);

        if (reflections.length === 0) {
          console.log('No reflections found.');
          console.log('');
          console.log('Run a reflection:');
          console.log('  orch reflect epic <epic-id>');
          console.log('  orch reflect convoy <convoy-id> --epic <epic-id>');
          return;
        }

        console.log('Reflections');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        for (const stored of reflections) {
          const r = stored.reflection;
          const pending = stored.pendingLearnings.length;
          const applied = stored.appliedLearnings.length;

          console.log(`${r.id}`);
          console.log(`  Type: ${r.target.type}`);
          console.log(`  Target: ${r.target.name}`);
          console.log(`  Date: ${formatDate(r.timestamp)}`);
          console.log(`  Learnings: ${r.learnings.length} (${pending} pending, ${applied} applied)`);
          console.log(`  Stats: ${r.stats.issuesCompleted} completed, ${r.stats.issuesFailed} failed`);
          console.log('');
        }

        // Summary
        const summary = await getPendingLearningSummary(options.cwd);
        if (summary.total > 0) {
          console.log('───────────────────────────────────────────────────────────────');
          console.log(`Total pending learnings: ${summary.total}`);
          console.log('');
          console.log('To apply all: iterate through reflections and run orch reflect apply <id>');
        }
      } catch (error) {
        console.error('List failed:', error);
        process.exit(1);
      }
    });

  // orch reflect report
  reflect
    .command('report')
    .description('Generate a markdown report of all learnings')
    .option('--output <file>', 'Output file path', 'LEARNINGS_REPORT.md')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        console.log('Generating learnings report...');
        console.log('');

        const report = await generateLearningsReport(options.cwd);

        const fs = await import('fs/promises');
        const path = await import('path');
        const outputPath = path.join(options.cwd, options.output);

        await fs.writeFile(outputPath, report, 'utf-8');

        console.log(`✓ Report saved to: ${options.output}`);
        console.log('');

        // Preview
        const lines = report.split('\n');
        console.log('Preview:');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(lines.slice(0, 20).join('\n'));
        if (lines.length > 20) {
          console.log('...');
          console.log(`(${lines.length - 20} more lines)`);
        }
      } catch (error) {
        console.error('Report generation failed:', error);
        process.exit(1);
      }
    });

  // orch reflect pending
  reflect
    .command('pending')
    .description('Show summary of pending learnings')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        const summary = await getPendingLearningSummary(options.cwd);

        console.log('Pending Learnings Summary');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        if (summary.total === 0) {
          console.log('No pending learnings.');
          return;
        }

        console.log(`Total: ${summary.total}`);
        console.log('');

        console.log('By Type:');
        for (const [type, count] of Object.entries(summary.byType)) {
          console.log(`  ${type}: ${count}`);
        }
        console.log('');

        console.log('By Target File:');
        for (const [file, count] of Object.entries(summary.byFile)) {
          console.log(`  ${file}: ${count}`);
        }
        console.log('');

        console.log('───────────────────────────────────────────────────────────────');
        console.log('To apply learnings: orch reflect apply <reflection-id>');
        console.log('To see all reflections: orch reflect list');
      } catch (error) {
        console.error('Failed to get pending summary:', error);
        process.exit(1);
      }
    });

  return reflect;
}

/**
 * Display reflection result.
 */
function displayReflectionResult(
  result: Awaited<ReturnType<typeof analyzeConvoy>>,
  stored: Awaited<ReturnType<typeof saveReflection>>
): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  REFLECTION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Stats
  const stats = result.stats;
  console.log('Statistics:');
  console.log(`  Sessions analyzed: ${stats.sessionsAnalyzed}`);
  console.log(`  Issues completed: ${stats.issuesCompleted}`);
  console.log(`  Issues failed: ${stats.issuesFailed}`);
  console.log(`  Avg iterations: ${stats.avgIterations.toFixed(1)}`);
  console.log(`  Corrections: ${stats.corrections}`);
  console.log(`  Total cost: $${stats.totalCost.toFixed(4)}`);
  console.log(`  Avg cycle time: ${stats.avgCycleTime.toFixed(0)} min`);
  console.log('');

  // Learnings
  console.log(`Learnings extracted: ${result.learnings.length}`);
  console.log('');

  if (result.learnings.length > 0) {
    console.log('Top Learnings:');
    for (const learning of result.learnings.slice(0, 5)) {
      const confidence = (learning.confidence * 100).toFixed(0);
      const target = learning.targetRuleFile || 'unassigned';
      console.log(`  [${learning.type}] ${learning.title}`);
      console.log(`    Confidence: ${confidence}% | Target: ${target}`);
      console.log('');
    }

    if (result.learnings.length > 5) {
      console.log(`  ... and ${result.learnings.length - 5} more`);
      console.log('');
    }
  }
}

/**
 * Format date for display.
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
