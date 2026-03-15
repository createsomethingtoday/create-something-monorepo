/**
 * @create-something/orchestration
 *
 * Cost tracking with three-level aggregation:
 * session → worker → convoy → epic
 */

import type { ConvoyCostTracker } from '../types.js';

/**
 * Create a cost tracker for a convoy.
 *
 * Philosophy: Budget enforcement at epic level.
 * Workers track their own costs, convoy aggregates, epic enforces limits.
 */
export function createCostTracker(epicBudget: number | null): ConvoyCostTracker {
  return {
    sessionCosts: {},
    workerCosts: {},
    convoyCost: 0,
    epicBudget,
    epicRemaining: epicBudget,
  };
}

/**
 * Record session cost.
 *
 * Sessions are individual work units, may be part of a worker or standalone.
 */
export function recordSessionCost(
  tracker: ConvoyCostTracker,
  sessionId: string,
  cost: number
): ConvoyCostTracker {
  const newTracker = { ...tracker };

  // Record session cost
  newTracker.sessionCosts[sessionId] = cost;

  // Update convoy total (sum of all session costs)
  newTracker.convoyCost = Object.values(newTracker.sessionCosts).reduce((sum, c) => sum + c, 0);

  // Update epic remaining
  if (newTracker.epicBudget !== null) {
    newTracker.epicRemaining = newTracker.epicBudget - newTracker.convoyCost;
  }

  return newTracker;
}

/**
 * Record worker cost.
 *
 * Workers aggregate their session costs.
 */
export function recordWorkerCost(
  tracker: ConvoyCostTracker,
  workerId: string,
  cost: number
): ConvoyCostTracker {
  const newTracker = { ...tracker };

  // Record worker cost
  newTracker.workerCosts[workerId] = cost;

  // Update convoy total (sum of all worker costs)
  newTracker.convoyCost = Object.values(newTracker.workerCosts).reduce((sum, c) => sum + c, 0);

  // Update epic remaining
  if (newTracker.epicBudget !== null) {
    newTracker.epicRemaining = newTracker.epicBudget - newTracker.convoyCost;
  }

  return newTracker;
}

/**
 * Get convoy total cost.
 */
export function getConvoyCost(tracker: ConvoyCostTracker): number {
  return tracker.convoyCost;
}

/**
 * Get remaining budget.
 */
export function getRemainingBudget(tracker: ConvoyCostTracker): number | null {
  return tracker.epicRemaining;
}

/**
 * Check if budget is exceeded.
 */
export function isBudgetExceeded(tracker: ConvoyCostTracker): boolean {
  if (tracker.epicBudget === null) return false;
  return (tracker.epicRemaining ?? 0) <= 0;
}

/**
 * Get budget warning threshold.
 *
 * Returns threshold percentage (0.8 = 80%) if budget is set.
 */
export function getBudgetWarningThreshold(tracker: ConvoyCostTracker, threshold: number = 0.8): number | null {
  if (tracker.epicBudget === null) return null;

  const percentUsed = tracker.convoyCost / tracker.epicBudget;
  return percentUsed >= threshold ? percentUsed : null;
}

/**
 * Aggregate costs across multiple levels.
 *
 * Returns cost summary with session, worker, and convoy totals.
 */
export function aggregateCosts(tracker: ConvoyCostTracker): CostSummary {
  const sessionTotal = Object.values(tracker.sessionCosts).reduce((sum, c) => sum + c, 0);
  const workerTotal = Object.values(tracker.workerCosts).reduce((sum, c) => sum + c, 0);

  return {
    sessionCount: Object.keys(tracker.sessionCosts).length,
    sessionTotal,
    workerCount: Object.keys(tracker.workerCosts).length,
    workerTotal,
    convoyTotal: tracker.convoyCost,
    epicBudget: tracker.epicBudget,
    epicRemaining: tracker.epicRemaining,
    exceeded: isBudgetExceeded(tracker),
  };
}

/**
 * Cost summary for reporting.
 */
export interface CostSummary {
  sessionCount: number;
  sessionTotal: number;
  workerCount: number;
  workerTotal: number;
  convoyTotal: number;
  epicBudget: number | null;
  epicRemaining: number | null;
  exceeded: boolean;
}

/**
 * Get per-worker cost breakdown.
 */
export function getWorkerCostBreakdown(
  tracker: ConvoyCostTracker
): Array<{ workerId: string; cost: number; percent: number }> {
  const total = tracker.convoyCost;

  return Object.entries(tracker.workerCosts).map(([workerId, cost]) => ({
    workerId,
    cost,
    percent: total > 0 ? (cost / total) * 100 : 0,
  }));
}

/**
 * Get per-session cost breakdown.
 */
export function getSessionCostBreakdown(
  tracker: ConvoyCostTracker
): Array<{ sessionId: string; cost: number; percent: number }> {
  const total = Object.values(tracker.sessionCosts).reduce((sum, c) => sum + c, 0);

  return Object.entries(tracker.sessionCosts).map(([sessionId, cost]) => ({
    sessionId,
    cost,
    percent: total > 0 ? (cost / total) * 100 : 0,
  }));
}

/**
 * Estimate remaining work cost.
 *
 * Based on average cost per completed worker.
 */
export function estimateRemainingCost(tracker: ConvoyCostTracker, remainingWorkers: number): number | null {
  const completedWorkers = Object.keys(tracker.workerCosts).length;

  if (completedWorkers === 0) {
    // No data yet, can't estimate
    return null;
  }

  const avgCostPerWorker = tracker.convoyCost / completedWorkers;
  return avgCostPerWorker * remainingWorkers;
}

/**
 * Check if estimated total would exceed budget.
 */
export function wouldExceedBudget(
  tracker: ConvoyCostTracker,
  remainingWorkers: number,
  safetyMargin: number = 0.1
): boolean {
  if (tracker.epicBudget === null) return false;

  const estimatedRemaining = estimateRemainingCost(tracker, remainingWorkers);
  if (estimatedRemaining === null) return false;

  const estimatedTotal = tracker.convoyCost + estimatedRemaining;
  const budgetWithMargin = tracker.epicBudget * (1 - safetyMargin);

  return estimatedTotal > budgetWithMargin;
}
