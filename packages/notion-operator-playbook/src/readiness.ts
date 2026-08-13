import type { RunbookReadinessInput, RunbookReadinessResult } from './contracts.js';
import { stableId } from './ids.js';

export function inspectRunbookReadiness(input: RunbookReadinessInput): RunbookReadinessResult {
  const missingRequirements: string[] = [];
  if (!input.title.trim()) missingRequirements.push('Runbook title');
  if (!input.owner.trim()) missingRequirements.push('Named owner');
  if (input.approvalStatus !== 'approved') missingRequirements.push('Approved review state');
  if (!input.rollbackPlan.trim()) missingRequirements.push('Rollback plan');
  if (input.evidenceCount < 1) missingRequirements.push('At least one evidence artifact');
  if (input.stepCount < 1) missingRequirements.push('At least one executable step');

  const ready = missingRequirements.length === 0;
  return {
    runbookId: input.runbookId,
    ready,
    status: ready ? 'ready' : 'blocked',
    missingRequirements,
    recommendedAction: ready
      ? 'The runbook is ready for an operator-controlled execution smoke.'
      : `Resolve: ${missingRequirements.join(', ')}.`,
    receiptId: stableId('readiness', [
      input.runbookId,
      input.title,
      input.owner,
      input.approvalStatus,
      input.rollbackPlan,
      String(input.evidenceCount),
      String(input.stepCount)
    ])
  };
}
