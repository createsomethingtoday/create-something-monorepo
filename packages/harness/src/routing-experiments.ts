/**
 * @create-something/harness
 *
 * Routing Experiments: Track Haiku performance vs Sonnet baseline.
 *
 * Philosophy: Validate the hypothesis that Haiku achieves 90% of Sonnet's
 * performance on well-defined tasks while costing 10x less.
 *
 * Success criteria: Haiku maintains ≥85% quality on execution tasks.
 */

import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ClaudeModelFamily } from './types.js';
import type { RoutingDecision } from './model-routing.js';

/**
 * Single experiment entry
 */
export interface RoutingExperiment {
  id: string;
  timestamp: number;
  taskId: string;
  description: string;
  modelUsed: ClaudeModelFamily;
  routingStrategy: RoutingDecision['strategy'];
  routingConfidence: number;
  success: boolean;
  cost: number;
  timeToComplete?: number; // in seconds
  qualityScore?: number; // 1-5 subjective rating
  notes: string;
}

/**
 * Experiment statistics
 */
export interface ExperimentStats {
  totalExperiments: number;
  byModel: Record<ClaudeModelFamily, {
    count: number;
    successRate: number;
    avgCost: number;
    avgQuality: number;
    avgTime: number;
  }>;
  costSavings: {
    totalSpent: number;
    estimatedWithoutOptimization: number;
    savingsAmount: number;
    savingsPercent: number;
  };
}

/**
 * Log a routing experiment to JSONL file
 */
export function logExperiment(
  experiment: Omit<RoutingExperiment, 'id' | 'timestamp'>,
  cwd: string = process.cwd()
): void {
  const experimentsPath = join(cwd, '.beads', 'routing-experiments.jsonl');

  const entry: RoutingExperiment = {
    id: generateExperimentId(),
    timestamp: Date.now(),
    ...experiment,
  };

  const line = JSON.stringify(entry) + '\n';

  try {
    appendFileSync(experimentsPath, line, 'utf-8');
  } catch (error) {
    console.error('Failed to log routing experiment:', (error as Error).message);
  }
}

/**
 * Read all routing experiments
 */
export function readExperiments(cwd: string = process.cwd()): RoutingExperiment[] {
  const experimentsPath = join(cwd, '.beads', 'routing-experiments.jsonl');

  if (!existsSync(experimentsPath)) {
    return [];
  }

  try {
    const content = readFileSync(experimentsPath, 'utf-8');
    const lines = content.trim().split('\n');

    return lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line) as RoutingExperiment;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as RoutingExperiment[];
  } catch (error) {
    console.error('Failed to read experiments:', (error as Error).message);
    return [];
  }
}

/**
 * Calculate experiment statistics
 */
export function calculateStats(experiments: RoutingExperiment[]): ExperimentStats {
  const byModel: ExperimentStats['byModel'] = {
    haiku: { count: 0, successRate: 0, avgCost: 0, avgQuality: 0, avgTime: 0 },
    sonnet: { count: 0, successRate: 0, avgCost: 0, avgQuality: 0, avgTime: 0 },
    opus: { count: 0, successRate: 0, avgCost: 0, avgQuality: 0, avgTime: 0 },
    unknown: { count: 0, successRate: 0, avgCost: 0, avgQuality: 0, avgTime: 0 },
  };

  let totalSpent = 0;
  let estimatedWithoutOptimization = 0;

  for (const exp of experiments) {
    const model = exp.modelUsed;
    const stats = byModel[model];

    stats.count++;
    if (exp.success) {
      stats.successRate++;
    }
    stats.avgCost += exp.cost;
    if (exp.qualityScore) {
      stats.avgQuality += exp.qualityScore;
    }
    if (exp.timeToComplete) {
      stats.avgTime += exp.timeToComplete;
    }

    totalSpent += exp.cost;

    // Estimate cost if we always used Sonnet
    estimatedWithoutOptimization += 0.01; // Sonnet baseline cost
  }

  // Calculate averages
  for (const model of Object.keys(byModel) as ClaudeModelFamily[]) {
    const stats = byModel[model];
    if (stats.count > 0) {
      stats.successRate = stats.successRate / stats.count;
      stats.avgCost = stats.avgCost / stats.count;
      stats.avgQuality = stats.avgQuality / stats.count;
      stats.avgTime = stats.avgTime / stats.count;
    }
  }

  const savingsAmount = estimatedWithoutOptimization - totalSpent;
  const savingsPercent = estimatedWithoutOptimization > 0
    ? (savingsAmount / estimatedWithoutOptimization) * 100
    : 0;

  return {
    totalExperiments: experiments.length,
    byModel,
    costSavings: {
      totalSpent,
      estimatedWithoutOptimization,
      savingsAmount,
      savingsPercent,
    },
  };
}

/**
 * Generate experiment report
 */
export function generateReport(cwd: string = process.cwd()): string {
  const experiments = readExperiments(cwd);
  const stats = calculateStats(experiments);

  const lines: string[] = [];

  lines.push('# Routing Experiments Report\n');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Experiments: ${stats.totalExperiments}\n`);

  lines.push('## Performance by Model\n');

  for (const model of ['haiku', 'sonnet', 'opus'] as ClaudeModelFamily[]) {
    const s = stats.byModel[model];
    if (s.count === 0) continue;

    lines.push(`### ${model.toUpperCase()}`);
    lines.push(`- Count: ${s.count}`);
    lines.push(`- Success Rate: ${(s.successRate * 100).toFixed(1)}%`);
    lines.push(`- Avg Cost: $${s.avgCost.toFixed(4)}`);
    if (s.avgQuality > 0) {
      lines.push(`- Avg Quality: ${s.avgQuality.toFixed(1)}/5`);
    }
    if (s.avgTime > 0) {
      lines.push(`- Avg Time: ${s.avgTime.toFixed(0)}s`);
    }
    lines.push('');
  }

  lines.push('## Cost Savings\n');
  lines.push(`- Total Spent: $${stats.costSavings.totalSpent.toFixed(2)}`);
  lines.push(`- Estimated (all Sonnet): $${stats.costSavings.estimatedWithoutOptimization.toFixed(2)}`);
  lines.push(`- Savings: $${stats.costSavings.savingsAmount.toFixed(2)} (${stats.costSavings.savingsPercent.toFixed(1)}%)\n`);

  lines.push('## Validation\n');

  const haikuStats = stats.byModel.haiku;
  if (haikuStats.count > 0) {
    const haikuSuccess = haikuStats.successRate * 100;
    const targetSuccess = 85;

    if (haikuSuccess >= targetSuccess) {
      lines.push(`✅ Haiku success rate: ${haikuSuccess.toFixed(1)}% (target: ≥${targetSuccess}%)`);
      lines.push('✅ Hypothesis validated: Haiku maintains quality on execution tasks');
    } else {
      lines.push(`⚠️  Haiku success rate: ${haikuSuccess.toFixed(1)}% (target: ≥${targetSuccess}%)`);
      lines.push('⚠️  Hypothesis not yet validated - need more data or refinement');
    }
  } else {
    lines.push('⏳ Insufficient Haiku experiments to validate hypothesis');
  }

  return lines.join('\n');
}

/**
 * Export experiments to CSV for external analysis
 */
export function exportToCSV(cwd: string = process.cwd()): string {
  const experiments = readExperiments(cwd);

  const header = [
    'id',
    'timestamp',
    'taskId',
    'description',
    'modelUsed',
    'routingStrategy',
    'routingConfidence',
    'success',
    'cost',
    'timeToComplete',
    'qualityScore',
    'notes',
  ].join(',');

  const rows = experiments.map(exp => [
    exp.id,
    exp.timestamp,
    exp.taskId,
    `"${exp.description.replace(/"/g, '""')}"`,
    exp.modelUsed,
    exp.routingStrategy,
    exp.routingConfidence,
    exp.success,
    exp.cost,
    exp.timeToComplete || '',
    exp.qualityScore || '',
    `"${exp.notes.replace(/"/g, '""')}"`,
  ].join(','));

  return [header, ...rows].join('\n');
}

/**
 * Generate a unique experiment ID
 */
function generateExperimentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `exp_${timestamp}_${random}`;
}

/**
 * Quick log helper for simple success/failure tracking
 */
export function quickLog(
  taskId: string,
  description: string,
  modelUsed: ClaudeModelFamily,
  success: boolean,
  cost: number,
  notes: string = '',
  cwd: string = process.cwd()
): void {
  logExperiment({
    taskId,
    description,
    modelUsed,
    routingStrategy: 'default',
    routingConfidence: 1.0,
    success,
    cost,
    notes,
  }, cwd);
}

/**
 * Print latest experiments to console
 */
export function printLatestExperiments(count: number = 10, cwd: string = process.cwd()): void {
  const experiments = readExperiments(cwd);
  const latest = experiments.slice(-count).reverse();

  console.log(`\n📊 Latest ${latest.length} Routing Experiments\n`);

  for (const exp of latest) {
    const status = exp.success ? '✅' : '❌';
    const quality = exp.qualityScore ? ` (${exp.qualityScore}/5)` : '';
    console.log(`${status} ${exp.modelUsed.toUpperCase()} - ${exp.description}${quality}`);
    console.log(`   Cost: $${exp.cost.toFixed(4)} | ${exp.notes || 'No notes'}\n`);
  }
}
