import { z } from 'zod';
import {
  decisionOutcomeSchema, decisionRequestHash, decisionRequestSchema,
  type DecisionOutcome, type DecisionReceipt, type DecisionRepository
} from './decisions.js';

const receiptSchema = z.object({
  schema: z.literal('agent-decision/v1'), authority: z.literal('advisory_only'),
  request: decisionRequestSchema, requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  selector: z.object({ provider: z.string().min(1), model: z.string().min(1), version: z.string().min(1) }).strict().nullable(),
  selectedId: z.string().nullable(),
  reason: z.enum(['selected', 'pinned', 'resumed', 'abstained', 'invalid_response',
    'unavailable', 'selector_failed', 'timeout', 'state_changed']),
  fallback: z.boolean(), elapsedMs: z.number().finite().nonnegative()
}).strict();

type DecisionRow = { scope: string; decision_id: string; request_hash: string; receipt_json: string };
type OutcomeRow = { scope: string; decision_id: string; request_hash: string; outcome_json: string };

function identity(scope: string, id: string) {
  z.string().min(1).max(128).parse(scope);
  z.string().min(1).max(128).parse(id);
}

async function decodeReceipt(value: unknown, scope?: string, id?: string, hash?: string): Promise<DecisionReceipt> {
  const receipt = receiptSchema.parse(value);
  const fixed = receipt.reason === 'pinned' || receipt.reason === 'resumed';
  const blocked = receipt.reason === 'state_changed' || receipt.reason === 'timeout';
  const selected = receipt.reason === 'selected';
  const semanticsValid = blocked ? receipt.selectedId === null && !receipt.fallback : fixed ?
    receipt.request.mode === receipt.reason && receipt.selectedId === receipt.request.fixedChoiceId &&
      !receipt.fallback && receipt.selector === null : selected ?
    receipt.request.mode === 'fresh' && receipt.selectedId !== null && !receipt.fallback && receipt.selector !== null :
    receipt.request.mode === 'fresh' && receipt.fallback && receipt.selectedId === receipt.request.fallbackId &&
      (receipt.reason === 'unavailable' ? receipt.selector === null : receipt.selector !== null);
  if (!semanticsValid) throw new Error('Stored decision semantics are inconsistent');
  if ((scope !== undefined && receipt.request.scope !== scope) ||
      (id !== undefined && receipt.request.id !== id) ||
      (hash !== undefined && receipt.requestHash !== hash) ||
      await decisionRequestHash(receipt.request) !== receipt.requestHash ||
      (receipt.selectedId !== null && !receipt.request.candidates.some(candidate => candidate.id === receipt.selectedId))) {
    throw new Error('Stored decision binding or request hash mismatch');
  }
  return receipt;
}

/** Host-owned evidence only; this repository never dispatches tools or authorizes a run. */
export class D1DecisionRepository implements DecisionRepository {
  constructor(private readonly database: D1Database) {}

  async getDecision(scope: string, id: string): Promise<DecisionReceipt | undefined> {
    identity(scope, id);
    const row = await this.database.prepare(
      'SELECT scope, decision_id, request_hash, receipt_json FROM agent_decisions WHERE scope = ?1 AND decision_id = ?2'
    ).bind(scope, id).first<DecisionRow>();
    return row ? decodeReceipt(JSON.parse(row.receipt_json), scope, id, row.request_hash) : undefined;
  }

  async putDecision(value: DecisionReceipt): Promise<void> {
    const receipt = await decodeReceipt(value);
    const serialized = JSON.stringify(receipt);
    const row = await this.database.prepare(
      `INSERT INTO agent_decisions (scope, decision_id, request_hash, selected_id, reason, fallback, receipt_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(scope, decision_id) DO NOTHING RETURNING receipt_json`
    ).bind(receipt.request.scope, receipt.request.id, receipt.requestHash, receipt.selectedId,
      receipt.reason, receipt.fallback ? 1 : 0, serialized).first<{ receipt_json: string }>();
    if (row) return;
    const existing = await this.getDecision(receipt.request.scope, receipt.request.id);
    if (!existing || JSON.stringify(existing) !== serialized) throw new Error('Immutable decision evidence conflict');
  }

  private async decodeOutcome(value: unknown, scope?: string, id?: string, hash?: string): Promise<DecisionOutcome> {
    const outcome = decisionOutcomeSchema.parse(value);
    const receipt = await this.getDecision(outcome.scope, outcome.decisionId);
    if ((scope !== undefined && outcome.scope !== scope) ||
        (id !== undefined && outcome.decisionId !== id) ||
        (hash !== undefined && outcome.requestHash !== hash) ||
        !receipt || receipt.requestHash !== outcome.requestHash || receipt.selectedId === null) {
      throw new Error('Stored outcome binding mismatch');
    }
    return outcome;
  }

  async getOutcome(scope: string, id: string): Promise<DecisionOutcome | undefined> {
    identity(scope, id);
    const row = await this.database.prepare(
      'SELECT scope, decision_id, request_hash, outcome_json FROM agent_decision_outcomes WHERE scope = ?1 AND decision_id = ?2'
    ).bind(scope, id).first<OutcomeRow>();
    return row ? this.decodeOutcome(JSON.parse(row.outcome_json), scope, id, row.request_hash) : undefined;
  }

  async putOutcome(value: DecisionOutcome): Promise<void> {
    const outcome = await this.decodeOutcome(value);
    const serialized = JSON.stringify(outcome);
    const row = await this.database.prepare(
      `INSERT INTO agent_decision_outcomes (scope, decision_id, request_hash, status, outcome_json)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(scope, decision_id) DO NOTHING RETURNING outcome_json`
    ).bind(outcome.scope, outcome.decisionId, outcome.requestHash, outcome.status, serialized)
      .first<{ outcome_json: string }>();
    if (row) return;
    const existing = await this.getOutcome(outcome.scope, outcome.decisionId);
    if (!existing || JSON.stringify(existing) !== serialized) throw new Error('Immutable outcome evidence conflict');
  }
}
