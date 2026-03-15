/**
 * @create-something/orchestration
 *
 * Session context factory and management.
 * Extends harness AgentContext with orchestration-specific fields.
 */

import { EMPTY_AGENT_CONTEXT } from '@create-something/harness';
import type { OrchestrationContext } from '../types.js';
import { nanoid } from 'nanoid';

/**
 * Create a new orchestration context.
 *
 * Philosophy: Start with empty harness context and layer orchestration concerns.
 * This enables harness functions to work with orchestration contexts.
 */
export function createSessionContext(options: {
  epicId: string;
  sessionNumber?: number;
  parentSessionId?: string | null;
  budget?: number | null;
  convoyId?: string | null;
  workerId?: string | null;
  assignedIssues?: string[];
}): OrchestrationContext {
  const now = new Date().toISOString();

  return {
    // Harness AgentContext base
    ...EMPTY_AGENT_CONTEXT,
    capturedAt: now,

    // Convoy coordination
    convoyId: options.convoyId || null,
    workerId: options.workerId || null,
    assignedIssues: options.assignedIssues || [],

    // Session continuity
    sessionNumber: options.sessionNumber || 1,
    epicId: options.epicId,
    parentSessionId: options.parentSessionId || null,

    // Cost tracking
    sessionCost: 0,
    cumulativeCost: 0,
    budgetRemaining: options.budget !== undefined ? options.budget : null,

    // Background execution
    backgroundPid: null,
    backgroundStarted: null,
  };
}

/**
 * Update cost in context and check budget constraints.
 *
 * Returns warnings if budget thresholds crossed.
 */
export function updateSessionCost(
  context: OrchestrationContext,
  additionalCost: number
): { context: OrchestrationContext; warning: string | null } {
  const newSessionCost = context.sessionCost + additionalCost;
  const newCumulativeCost = context.cumulativeCost + additionalCost;

  let budgetRemaining = context.budgetRemaining;
  let warning: string | null = null;

  if (budgetRemaining !== null) {
    budgetRemaining = budgetRemaining - additionalCost;

    // Check for warnings
    if (budgetRemaining <= 0) {
      const initialBudget = context.budgetRemaining !== null ? context.budgetRemaining + context.cumulativeCost : 0;
      warning = `Budget exceeded! Consumed: $${newCumulativeCost.toFixed(4)}, Budget: $${initialBudget.toFixed(4)}`;
    } else if (context.budgetRemaining !== null) {
      const initialBudget = context.budgetRemaining + context.cumulativeCost;
      const percentRemaining = (budgetRemaining / initialBudget) * 100;

      if (percentRemaining <= 20 && context.budgetRemaining > budgetRemaining) {
        warning = `Budget warning: Only ${percentRemaining.toFixed(0)}% remaining ($${budgetRemaining.toFixed(4)})`;
      }
    }
  }

  return {
    context: {
      ...context,
      sessionCost: newSessionCost,
      cumulativeCost: newCumulativeCost,
      budgetRemaining,
    },
    warning,
  };
}

/**
 * Check if budget is exceeded.
 */
export function isBudgetExceeded(context: OrchestrationContext): boolean {
  if (context.budgetRemaining === null) return false;
  return context.budgetRemaining <= 0;
}

/**
 * Get budget status summary.
 */
export function getBudgetStatus(context: OrchestrationContext): {
  hasBudget: boolean;
  consumed: number;
  remaining: number | null;
  percentUsed: number | null;
  exceeded: boolean;
} {
  const hasBudget = context.budgetRemaining !== null;

  if (!hasBudget) {
    return {
      hasBudget: false,
      consumed: context.cumulativeCost,
      remaining: null,
      percentUsed: null,
      exceeded: false,
    };
  }

  const initialBudget = context.budgetRemaining! + context.cumulativeCost;
  const percentUsed = (context.cumulativeCost / initialBudget) * 100;

  return {
    hasBudget: true,
    consumed: context.cumulativeCost,
    remaining: context.budgetRemaining,
    percentUsed,
    exceeded: context.budgetRemaining! <= 0,
  };
}

/**
 * Generate session ID.
 */
export function generateSessionId(): string {
  return `sess-${nanoid(10)}`;
}

/**
 * Generate epic ID.
 */
export function generateEpicId(): string {
  return `epic-${nanoid(10)}`;
}
