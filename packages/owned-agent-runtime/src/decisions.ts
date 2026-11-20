import { z } from 'zod';

const identifier = z.string().min(1).max(128);
export const decisionRequestSchema = z.object({
  id: identifier,
  scope: identifier,
  policyVersion: identifier,
  stateVersion: identifier,
  question: z.string().min(1).max(2000),
  candidates: z.array(z.object({
    id: identifier.refine(value => value !== 'no_match'),
    description: z.string().min(1).max(2000)
  }).strict()).min(1).max(16),
  fallbackId: identifier,
  mode: z.enum(['fresh', 'pinned', 'resumed']),
  fixedChoiceId: identifier.optional()
}).strict().superRefine((request, context) => {
  const ids = request.candidates.map(candidate => candidate.id);
  if (new Set(ids).size !== ids.length || !ids.includes(request.fallbackId) ||
      (request.mode === 'fresh' ? request.fixedChoiceId !== undefined :
        !request.fixedChoiceId || !ids.includes(request.fixedChoiceId))) {
    context.addIssue({ code: 'custom', message: 'Candidates, fallback and fixed route must be consistent' });
  }
});

export type DecisionRequest = z.infer<typeof decisionRequestSchema>;
export interface DecisionSelector {
  provider: string;
  model: string;
  version: string;
  select(request: DecisionRequest, signal: AbortSignal): Promise<unknown>;
}
export type DecisionReason = 'selected' | 'pinned' | 'resumed' | 'abstained' |
  'invalid_response' | 'unavailable' | 'selector_failed' | 'timeout' | 'state_changed';
export type DecisionReceipt = {
  schema: 'agent-decision/v1';
  authority: 'advisory_only';
  request: DecisionRequest;
  requestHash: string;
  selector: { provider: string; model: string; version: string } | null;
  selectedId: string | null;
  reason: DecisionReason;
  fallback: boolean;
  elapsedMs: number;
};
export const decisionOutcomeSchema = z.object({
  decisionId: identifier,
  scope: identifier,
  requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(['verified_success', 'verified_failure', 'unknown']),
  evidenceRef: z.string().min(1).max(512),
  durationMs: z.number().finite().nonnegative(),
  costUsd: z.number().finite().nonnegative().optional(),
  retries: z.number().int().nonnegative()
}).strict();
export type DecisionOutcome = z.infer<typeof decisionOutcomeSchema>;

/** Implementations must reject conflicting writes, and scope every read. */
export interface DecisionRepository {
  putDecision(receipt: DecisionReceipt): Promise<void>;
  getDecision(scope: string, id: string): Promise<DecisionReceipt | undefined>;
  putOutcome(outcome: DecisionOutcome): Promise<void>;
  getOutcome(scope: string, id: string): Promise<DecisionOutcome | undefined>;
}

export async function decisionRequestHash(value: DecisionRequest): Promise<string> {
  const request = decisionRequestSchema.parse(value);
  const bytes = new TextEncoder().encode(JSON.stringify(request));
  if (bytes.byteLength > 20_000) throw new Error('Decision exceeds 20 KB budget');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createDecisionService(dependencies: {
  repository: DecisionRepository;
  selector?: DecisionSelector;
  timeoutMs?: number;
}) {
  const timeoutMs = dependencies.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) {
    throw new Error('Decision timeout must be between 1 and 5000 ms');
  }
  return {
    /** Does not dispatch tools. The host must enforce authority again at dispatch. */
    async decide(value: DecisionRequest, current: () => Promise<DecisionRequest>): Promise<DecisionReceipt> {
      const request = decisionRequestSchema.parse(value);
      const requestHash = await decisionRequestHash(request);
      // A decision ID is single-use: callers reconcile an uncertain append by scoped readback.
      if (await dependencies.repository.getDecision(request.scope, request.id)) {
        throw new Error('Decision already exists; reconcile the stored receipt');
      }
      const started = performance.now();
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let expired = false;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          controller.abort();
          reject(new Error('Decision deadline exceeded'));
        }, timeoutMs);
      });
      const bounded = <T>(work: Promise<T>) => Promise.race([work, deadline]);
      let selectedId: string | null = request.fallbackId;
      let reason: DecisionReason = 'unavailable';
      let fallback = true;
      try {
        if (request.mode !== 'fresh') {
          selectedId = request.fixedChoiceId!;
          reason = request.mode;
          fallback = false;
        } else if (dependencies.selector) {
          try {
            const raw = await bounded(Promise.resolve().then(() =>
              dependencies.selector!.select(structuredClone(request), controller.signal)));
            const parsed = z.object({ choice: z.string().nullable() }).strict().safeParse(raw);
            if (!parsed.success || (parsed.data.choice !== null &&
                !request.candidates.some(candidate => candidate.id === parsed.data.choice))) {
              reason = 'invalid_response';
            } else if (parsed.data.choice === null) {
              reason = 'abstained';
            } else {
              selectedId = parsed.data.choice;
              reason = 'selected';
              fallback = false;
            }
          } catch {
            reason = expired ? 'timeout' : 'selector_failed';
          }
        }
        // Even fallbacks and fixed choices must still match the current scope and policy.
        try {
          const liveHash = await bounded(Promise.resolve().then(current).then(decisionRequestHash));
          if (liveHash !== requestHash) {
            selectedId = null;
            reason = 'state_changed';
            fallback = false;
          }
        } catch {
          selectedId = null;
          reason = expired ? 'timeout' : 'state_changed';
          fallback = false;
        }
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
      const receipt: DecisionReceipt = {
        schema: 'agent-decision/v1', authority: 'advisory_only', request, requestHash,
        selector: request.mode === 'fresh' && dependencies.selector ? {
          provider: dependencies.selector.provider, model: dependencies.selector.model,
          version: dependencies.selector.version
        } : null,
        selectedId, reason, fallback, elapsedMs: Math.round(performance.now() - started)
      };
      // An uncertain or failed append must never yield a usable choice.
      await dependencies.repository.putDecision(structuredClone(receipt));
      return receipt;
    },
    async observe(value: DecisionOutcome): Promise<void> {
      const outcome = decisionOutcomeSchema.parse(value);
      const receipt = await dependencies.repository.getDecision(outcome.scope, outcome.decisionId);
      if (!receipt || receipt.requestHash !== outcome.requestHash || receipt.selectedId === null) {
        throw new Error('Outcome must bind an actionable decision in the same scope');
      }
      await dependencies.repository.putOutcome(outcome);
    }
  };
}

export class MemoryDecisionRepository implements DecisionRepository {
  private decisions = new Map<string, DecisionReceipt>();
  private outcomes = new Map<string, DecisionOutcome>();
  private key(scope: string, id: string) { return JSON.stringify([scope, id]); }
  async putDecision(receipt: DecisionReceipt) {
    const key = this.key(receipt.request.scope, receipt.request.id);
    const existing = this.decisions.get(key);
    if (existing && JSON.stringify(existing) !== JSON.stringify(receipt)) throw new Error('Decision conflict');
    this.decisions.set(key, structuredClone(receipt));
  }
  async getDecision(scope: string, id: string) {
    return structuredClone(this.decisions.get(this.key(scope, id)));
  }
  async putOutcome(outcome: DecisionOutcome) {
    const receipt = await this.getDecision(outcome.scope, outcome.decisionId);
    if (!receipt || receipt.requestHash !== outcome.requestHash || receipt.selectedId === null) {
      throw new Error('Outcome binding mismatch');
    }
    const key = this.key(outcome.scope, outcome.decisionId);
    const existing = this.outcomes.get(key);
    if (existing && JSON.stringify(existing) !== JSON.stringify(outcome)) throw new Error('Outcome conflict');
    this.outcomes.set(key, structuredClone(outcome));
  }
  async getOutcome(scope: string, id: string) {
    return structuredClone(this.outcomes.get(this.key(scope, id)));
  }
}
