import { z } from 'zod';
import {
  createDecisionService, decisionOutcomeSchema, decisionRequestSchema, MemoryDecisionRepository,
  type DecisionReceipt, type DecisionSelector
} from './decisions.js';

// An observation is usable only for the exact choice and selector version replayed.
// Evidence references remain host attestations; replay does not rerun task verifiers.
const observed = decisionOutcomeSchema.omit({ decisionId: true, scope: true, requestHash: true })
  .extend({ selectedId: z.string(), selectorVersion: z.string().nullable() });
export const decisionScenarioSchema = z.object({
  request: decisionRequestSchema,
  current: decisionRequestSchema,
  expectedChoiceId: z.string().nullable(),
  baselineOutcome: observed.optional(),
  candidateOutcome: observed.optional()
}).strict().superRefine((scenario, context) => {
  if (scenario.expectedChoiceId !== null &&
      !scenario.request.candidates.some(candidate => candidate.id === scenario.expectedChoiceId)) {
    context.addIssue({ code: 'custom', message: 'Expected choice must be an offered ID or null' });
  }
});
export type DecisionScenario = z.infer<typeof decisionScenarioSchema>;
type ArmResult = {
  receipt: DecisionReceipt;
  matchesExpected: boolean;
  outcome: z.infer<typeof observed> | null;
};

/** Replays selection only. No tool executor, policy writer, or promotion API is accepted. */
export async function replayDecisionScenarios(value: DecisionScenario[], selectors: {
  baseline?: DecisionSelector;
  candidate: DecisionSelector;
}) {
  const scenarios = z.array(decisionScenarioSchema).min(1).max(100).parse(value);
  const keys = scenarios.map(scenario => JSON.stringify([scenario.request.scope, scenario.request.id]));
  if (new Set(keys).size !== keys.length) throw new Error('Replay case IDs must be unique in each scope');
  const encoded = new TextEncoder().encode(JSON.stringify(scenarios));
  if (encoded.byteLength > 2_000_000) throw new Error('Replay suite exceeds 2 MB budget');
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const suiteHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const rows: Array<{ id: string; scope: string; expectedChoiceId: string | null;
    baseline: ArmResult; candidate: ArmResult }> = [];
  for (const [index, scenario] of scenarios.entries()) {
    const run = async (arm: 'baseline' | 'candidate'): Promise<ArmResult> => {
      const repository = new MemoryDecisionRepository();
      const service = createDecisionService({ repository, selector: selectors[arm] });
      const receipt = await service.decide(scenario.request, async () => scenario.current);
      const outcome = scenario[`${arm}Outcome`] ?? null;
      if (outcome) {
        if (outcome.selectedId !== receipt.selectedId || outcome.selectorVersion !== (receipt.selector?.version ?? null)) {
          throw new Error('Observed outcome does not match replayed choice and selector version');
        }
        const { selectedId: _selectedId, selectorVersion: _selectorVersion, ...measurement } = outcome;
        await service.observe({ ...measurement, decisionId: receipt.request.id,
          scope: receipt.request.scope, requestHash: receipt.requestHash });
      }
      return { receipt, matchesExpected: receipt.selectedId === scenario.expectedChoiceId, outcome };
    };
    // Counterbalance arm order; labels and outcomes are never sent to selectors.
    const first = index % 2 ? 'candidate' : 'baseline';
    const second = first === 'baseline' ? 'candidate' : 'baseline';
    const a = await run(first);
    const b = await run(second);
    rows.push({ id: scenario.request.id, scope: scenario.request.scope,
      expectedChoiceId: scenario.expectedChoiceId,
      baseline: first === 'baseline' ? a : b, candidate: first === 'candidate' ? a : b });
  }
  const summarize = (arm: 'baseline' | 'candidate') => ({
    cases: rows.length,
    matchesExpected: rows.filter(row => row[arm].matchesExpected).length,
    fallbacks: rows.filter(row => row[arm].receipt.fallback).length,
    blocked: rows.filter(row => row[arm].receipt.selectedId === null).length,
    selectorFailures: rows.filter(row => ['invalid_response', 'selector_failed', 'timeout']
      .includes(row[arm].receipt.reason)).length,
    selectorElapsedMs: rows.reduce((total, row) => total + row[arm].receipt.elapsedMs, 0),
    verifiedSuccesses: rows.filter(row => row[arm].outcome?.status === 'verified_success').length,
    verifiedFailures: rows.filter(row => row[arm].outcome?.status === 'verified_failure').length,
    missingOrUnknownOutcomes: rows.filter(row => !row[arm].outcome || row[arm].outcome?.status === 'unknown').length,
    observedDurationMs: rows.reduce((total, row) => total + (row[arm].outcome?.durationMs ?? 0), 0),
    observedRetries: rows.reduce((total, row) => total + (row[arm].outcome?.retries ?? 0), 0),
    missingCosts: rows.filter(row => row[arm].outcome?.costUsd === undefined).length,
    observedCostUsd: rows.reduce((total, row) => total + (row[arm].outcome?.costUsd ?? 0), 0)
  });
  const improvements = rows.filter(row => !row.baseline.matchesExpected && row.candidate.matchesExpected).length;
  const regressions = rows.filter(row => row.baseline.matchesExpected && !row.candidate.matchesExpected).length;
  const incompleteComparisons = rows.filter(row => (['baseline', 'candidate'] as const).some(arm =>
    row[arm].receipt.selector !== null && ['selector_failed', 'timeout', 'unavailable'].includes(row[arm].receipt.reason)
  )).length;
  const observedRegressions = rows.filter(row => row.candidate.outcome?.status === 'verified_failure' ||
    (row.baseline.outcome && row.candidate.outcome && (
      row.candidate.outcome.retries > row.baseline.outcome.retries ||
      row.candidate.outcome.durationMs > row.baseline.outcome.durationMs ||
      (row.candidate.outcome.costUsd !== undefined && row.baseline.outcome.costUsd !== undefined &&
        row.candidate.outcome.costUsd > row.baseline.outcome.costUsd)
    ))).length;
  return {
    schema: 'agent-decision-replay/v1' as const,
    authority: 'advisory_only' as const,
    scoringVersion: 'expected-choice-v1', suiteHash,
    scope: 'selector_replay_only' as const,
    baselineSelector: selectors.baseline ? { provider: selectors.baseline.provider,
      model: selectors.baseline.model, version: selectors.baseline.version } : null,
    candidateSelector: { provider: selectors.candidate.provider, model: selectors.candidate.model,
      version: selectors.candidate.version },
    baseline: summarize('baseline'), candidate: summarize('candidate'), improvements, regressions,
    observedRegressions, incompleteComparisons,
    proposal: improvements > 0 && regressions === 0 && observedRegressions === 0 && incompleteComparisons === 0
      ? 'review_candidate' : 'retain_baseline',
    downstreamImprovement: 'not_established' as const,
    requiresHumanReview: true as const,
    rows
  };
}
