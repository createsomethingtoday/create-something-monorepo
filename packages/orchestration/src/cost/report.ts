/**
 * @create-something/orchestration
 *
 * Cost reporting with formatted output.
 */

import type { ConvoyCostTracker } from '../types.js';
import { aggregateCosts, getWorkerCostBreakdown, getSessionCostBreakdown } from './tracker.js';
import { loadConvoy, listConvoys } from '../coordinator/convoy.js';
import { listCheckpoints } from '../checkpoint/store.js';

/**
 * Cost report for a single convoy.
 */
export interface ConvoyCostReport {
  convoyId: string;
  convoyName: string;
  totalCost: number;
  workerBreakdown: Array<{ workerId: string; issueId: string; cost: number; percent: number }>;
  sessionBreakdown: Array<{ sessionId: string; cost: number; percent: number }>;
  budget: number | null;
  remaining: number | null;
  exceeded: boolean;
}

/**
 * Cost report for an entire epic.
 */
export interface EpicCostReport {
  epicId: string;
  totalCost: number;
  convoys: ConvoyCostReport[];
  budget: number | null;
  remaining: number | null;
  exceeded: boolean;
}

/**
 * Generate cost report for a convoy.
 */
export async function generateConvoyReport(
  convoyId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<ConvoyCostReport | null> {
  const loaded = await loadConvoy(convoyId, epicId, cwd);
  if (!loaded) return null;

  const { convoy, stored } = loaded;

  const workerBreakdown = getWorkerCostBreakdown(stored.costTracker).map((w) => {
    // Find worker's issue ID
    const worker = stored.workers.find((worker) => worker.workerId === w.workerId);
    return {
      ...w,
      issueId: worker?.issueId || 'unknown',
    };
  });

  const sessionBreakdown = getSessionCostBreakdown(stored.costTracker);

  return {
    convoyId: convoy.id,
    convoyName: convoy.name,
    totalCost: stored.costTracker.convoyCost,
    workerBreakdown,
    sessionBreakdown,
    budget: stored.costTracker.epicBudget,
    remaining: stored.costTracker.epicRemaining,
    exceeded: stored.costTracker.epicRemaining !== null && stored.costTracker.epicRemaining <= 0,
  };
}

/**
 * Generate cost report for an epic.
 */
export async function generateEpicReport(epicId: string, cwd: string = process.cwd()): Promise<EpicCostReport> {
  const convoys = await listConvoys(epicId, cwd);

  const convoyReports = await Promise.all(
    convoys.map((convoy) => generateConvoyReport(convoy.id, epicId, cwd))
  );

  const validReports = convoyReports.filter((r): r is ConvoyCostReport => r !== null);

  // Calculate epic totals
  const totalCost = validReports.reduce((sum, r) => sum + r.totalCost, 0);

  // Budget is per-convoy, not epic-level
  // For epic report, show first convoy's budget as reference
  const firstConvoyBudget = validReports[0]?.budget ?? null;

  return {
    epicId,
    totalCost,
    convoys: validReports,
    budget: firstConvoyBudget,
    remaining: firstConvoyBudget !== null ? firstConvoyBudget - totalCost : null,
    exceeded: firstConvoyBudget !== null && totalCost > firstConvoyBudget,
  };
}

/**
 * Format convoy cost report as human-readable string.
 */
export function formatConvoyReport(report: ConvoyCostReport): string {
  const lines: string[] = [];

  lines.push(`\n=== Convoy Cost Report: ${report.convoyName} ===`);
  lines.push(`Convoy ID: ${report.convoyId}`);
  lines.push(`Total Cost: $${report.totalCost.toFixed(4)}`);

  if (report.budget !== null) {
    lines.push(`Budget: $${report.budget.toFixed(4)}`);
    lines.push(`Remaining: $${(report.remaining ?? 0).toFixed(4)}`);

    if (report.exceeded) {
      lines.push(`⚠️  BUDGET EXCEEDED`);
    } else {
      const percentUsed = (report.totalCost / report.budget) * 100;
      lines.push(`Budget Used: ${percentUsed.toFixed(1)}%`);
    }
  }

  if (report.workerBreakdown.length > 0) {
    lines.push(`\n--- Worker Breakdown ---`);
    report.workerBreakdown.forEach((w) => {
      lines.push(`  ${w.workerId} (${w.issueId}): $${w.cost.toFixed(4)} (${w.percent.toFixed(1)}%)`);
    });
  }

  if (report.sessionBreakdown.length > 0) {
    lines.push(`\n--- Session Breakdown ---`);
    report.sessionBreakdown.forEach((s) => {
      lines.push(`  ${s.sessionId}: $${s.cost.toFixed(4)} (${s.percent.toFixed(1)}%)`);
    });
  }

  return lines.join('\n');
}

/**
 * Format epic cost report as human-readable string.
 */
export function formatEpicReport(report: EpicCostReport): string {
  const lines: string[] = [];

  lines.push(`\n=== Epic Cost Report ===`);
  lines.push(`Epic ID: ${report.epicId}`);
  lines.push(`Total Cost: $${report.totalCost.toFixed(4)}`);

  if (report.budget !== null) {
    lines.push(`Budget: $${report.budget.toFixed(4)}`);
    lines.push(`Remaining: $${(report.remaining ?? 0).toFixed(4)}`);

    if (report.exceeded) {
      lines.push(`⚠️  BUDGET EXCEEDED`);
    }
  }

  lines.push(`\n--- Convoys (${report.convoys.length}) ---`);

  report.convoys.forEach((convoy) => {
    const percentOfTotal = report.totalCost > 0 ? (convoy.totalCost / report.totalCost) * 100 : 0;
    lines.push(`  ${convoy.convoyName}: $${convoy.totalCost.toFixed(4)} (${percentOfTotal.toFixed(1)}%)`);
  });

  return lines.join('\n');
}

/**
 * Generate cost summary table (compact format for CLI).
 */
export function formatCostSummary(report: ConvoyCostReport): string {
  const lines: string[] = [];

  lines.push(`Convoy: ${report.convoyName} ($${report.totalCost.toFixed(4)})`);

  if (report.budget !== null) {
    const percentUsed = (report.totalCost / report.budget) * 100;
    const bar = generateProgressBar(percentUsed, 20);
    lines.push(`Budget: ${bar} ${percentUsed.toFixed(0)}%`);
  }

  return lines.join('\n');
}

/**
 * Generate ASCII progress bar.
 */
function generateProgressBar(percent: number, width: number): string {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  // Color based on percentage
  if (percent >= 100) return `[${bar}] ⚠️`;
  if (percent >= 80) return `[${bar}] ⚡`;
  return `[${bar}]`;
}
