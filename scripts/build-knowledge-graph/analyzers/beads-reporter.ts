/**
 * Beads Reporter
 *
 * Creates Beads issues from detected knowledge gaps.
 * Implements self-healing: graph analysis → issues → work → improved graph.
 */

import { execSync } from 'child_process';
import type { KnowledgeGap, AnalysisResult } from './types.js';

export interface ReportResult {
  created: number;
  skipped: number;
  errors: string[];
  issueIds: string[];
}

/**
 * Create a Beads issue from a knowledge gap
 */
function createIssue(gap: KnowledgeGap, dryRun: boolean): string | null {
  const labels = [...gap.labels, 'harness:self-heal'].join(',');
  const priority = gap.priority;

  // Build bd create command
  const command = [
    'bd', 'create',
    `--title="${gap.title}"`,
    '--type=task',
    `--priority=${priority}`,
    `--label=${labels}`,
  ].join(' ');

  if (dryRun) {
    console.log(`  [DRY RUN] ${command}`);
    return null;
  }

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Extract issue ID from output (e.g., "Created csm-abc123")
    const match = output.match(/Created\s+(csm-[a-z0-9]+)/i) ||
                  output.match(/(csm-[a-z0-9]+)/i);
    return match?.[1] ?? null;
  } catch (error) {
    console.error(`  Failed to create issue: ${error}`);
    return null;
  }
}

/**
 * Format gap for console output
 */
function formatGap(gap: KnowledgeGap, index: number): string {
  const priorityColors: Record<number, string> = {
    0: '\x1b[31m', // Red
    1: '\x1b[33m', // Yellow
    2: '\x1b[36m', // Cyan
    3: '\x1b[37m', // White
    4: '\x1b[90m', // Gray
  };
  const reset = '\x1b[0m';
  const color = priorityColors[gap.priority] ?? reset;

  return `${index + 1}. ${color}[P${gap.priority}]${reset} ${gap.title}
   Type: ${gap.type}
   ${gap.targets.slice(0, 2).join(', ')}${gap.targets.length > 2 ? ` (+${gap.targets.length - 2} more)` : ''}`;
}

/**
 * Print analysis summary to console
 */
export function printSummary(result: AnalysisResult): void {
  console.log('\n📊 Knowledge Graph Analysis\n');
  console.log(`   Nodes: ${result.stats.totalNodes}`);
  console.log(`   Edges: ${result.stats.totalEdges}`);
  console.log('');

  if (result.totalGaps === 0) {
    console.log('✅ No gaps detected. Knowledge graph is healthy.\n');
    return;
  }

  console.log(`🔍 Found ${result.totalGaps} gaps:\n`);

  // Group by type
  const byType = new Map<string, KnowledgeGap[]>();
  for (const gap of result.gaps) {
    const list = byType.get(gap.type) ?? [];
    list.push(gap);
    byType.set(gap.type, list);
  }

  const typeLabels: Record<string, string> = {
    'missing-understanding': '📁 Missing UNDERSTANDING.md',
    'orphaned-node': '🏝️  Orphaned Nodes',
    'undocumented-semantic': '🔗 Undocumented Semantic Links',
    'undefined-concept': '📖 Undefined Concepts',
    'stale-documentation': '📅 Stale Documentation',
  };

  let index = 0;
  for (const [type, gaps] of byType) {
    console.log(`${typeLabels[type] ?? type} (${gaps.length}):\n`);
    for (const gap of gaps.slice(0, 5)) {
      console.log(formatGap(gap, index++));
      console.log('');
    }
    if (gaps.length > 5) {
      console.log(`   ... and ${gaps.length - 5} more\n`);
      index += gaps.length - 5;
    }
  }
}

/**
 * Create Beads issues from analysis result
 */
export function createIssues(
  result: AnalysisResult,
  options: { dryRun?: boolean; maxIssues?: number } = {}
): ReportResult {
  const { dryRun = true, maxIssues = 10 } = options;

  console.log(dryRun ? '\n🔍 Preview (dry run):\n' : '\n📝 Creating Beads issues:\n');

  const report: ReportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    issueIds: [],
  };

  // Limit issues to prevent flooding
  const gapsToProcess = result.gaps.slice(0, maxIssues);

  for (const gap of gapsToProcess) {
    console.log(`→ [P${gap.priority}] ${gap.title}`);

    const issueId = createIssue(gap, dryRun);

    if (issueId) {
      report.created++;
      report.issueIds.push(issueId);
      console.log(`  ✓ Created: ${issueId}`);
    } else if (dryRun) {
      report.skipped++;
    } else {
      report.errors.push(gap.title);
    }
  }

  if (result.gaps.length > maxIssues) {
    console.log(`\n⚠️  Limited to ${maxIssues} issues. ${result.gaps.length - maxIssues} gaps not processed.`);
    console.log('   Run with --max-issues=N to process more.\n');
  }

  console.log('\n' + (dryRun ? '📋 Summary (dry run):' : '📋 Summary:'));
  console.log(`   ${dryRun ? 'Would create' : 'Created'}: ${dryRun ? gapsToProcess.length : report.created}`);
  if (report.errors.length > 0) {
    console.log(`   Errors: ${report.errors.length}`);
  }
  console.log('');

  return report;
}

/**
 * Full analysis and reporting workflow
 */
export function reportGaps(
  result: AnalysisResult,
  options: { dryRun?: boolean; maxIssues?: number; quiet?: boolean } = {}
): ReportResult {
  if (!options.quiet) {
    printSummary(result);
  }

  if (result.totalGaps === 0) {
    return { created: 0, skipped: 0, errors: [], issueIds: [] };
  }

  return createIssues(result, options);
}
