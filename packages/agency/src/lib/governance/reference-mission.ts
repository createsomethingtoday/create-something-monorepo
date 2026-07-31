import type {
  GovernanceDecision,
  GovernanceDeliveryReceipt,
  GovernanceProof,
  GovernanceSignal
} from '../server/governance-runtime';

export const REFERENCE_MISSION_CONTRACT_VERSION = 1 as const;
export const REFERENCE_MISSION_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1_000;

export type ReferenceMissionState =
  | 'unavailable'
  | 'incomplete'
  | 'review'
  | 'blocked'
  | 'failed'
  | 'rolled_back'
  | 'recovered'
  | 'proven'
  | 'stale';

export interface ReferenceMissionFreshness {
  state: 'unavailable' | 'current' | 'stale';
  observed_at: string | null;
  stale_after_days: number;
}

export interface ReferenceMissionPublicProjection {
  contract_version: typeof REFERENCE_MISSION_CONTRACT_VERSION;
  mission_id: string | null;
  correlation_id: string | null;
  state: ReferenceMissionState;
  title: string | null;
  objective: string | null;
  scope: string | null;
  authority_class: string | null;
  source_class: string | null;
  verification_summary: string | null;
  proof_summary: string | null;
  recovery_summary: string | null;
  freshness: ReferenceMissionFreshness;
}

export interface ReferenceMissionOperatorProjection {
  mission_id: string;
  correlation_id: string;
  state: ReferenceMissionState;
  freshness: ReferenceMissionFreshness;
  source: {
    signal_id: string;
    decision_id: string | null;
    proof_id: string | null;
    receipt_id: string | null;
    signal_source: string;
    signal_url: string | null;
    decision_owner: string | null;
    proof_receipt_url: string | null;
  };
  lifecycle: {
    signal_status: GovernanceSignal['status'];
    decision_state: GovernanceDecision['decision_state'] | null;
    proof_outcome: GovernanceProof['outcome'] | null;
    receipt_status: GovernanceDeliveryReceipt['status'] | null;
  };
}

export interface ReferenceMissionReadModel {
  public: ReferenceMissionPublicProjection;
  operator: ReferenceMissionOperatorProjection | null;
}

export interface ReferenceMissionSourceRecords {
  signals: GovernanceSignal[];
  decisions: GovernanceDecision[];
  proofs: GovernanceProof[];
  receipts: GovernanceDeliveryReceipt[];
}

interface ReferenceMissionPublicCapsule {
  title: string;
  objective: string;
  scope: string;
  authority_class: string;
  source_class: string;
  verification_summary: string;
  proof_summary: string;
  recovery_summary: string;
}

interface ReferenceMissionEnvelope {
  missionId: string;
  correlationId: string;
  publicCapsule: ReferenceMissionPublicCapsule;
}

export function buildReferenceMissionReadModel(
  records: ReferenceMissionSourceRecords,
  options: { now?: string; staleAfterMs?: number } = {}
): ReferenceMissionReadModel {
  const signalMatch = records.signals
    .map((signal) => ({ signal, envelope: referenceMissionEnvelope(signal) }))
    .filter(
      (match): match is { signal: GovernanceSignal; envelope: ReferenceMissionEnvelope } =>
        match.envelope !== null
    )
    .sort(
      (left, right) => timestamp(right.signal.updated_at) - timestamp(left.signal.updated_at)
    )[0];

  if (!signalMatch) return unavailableReadModel(options.staleAfterMs);

  const { signal, envelope } = signalMatch;
  const decisions = records.decisions
    .filter((decision) => decision.signal_id === signal.id)
    .sort((left, right) => timestamp(right.updated_at) - timestamp(left.updated_at));
  const decision = decisions[0] ?? null;
  const proofs = records.proofs
    .filter(
      (proof) =>
        proof.signal_id === signal.id || (decision !== null && proof.decision_id === decision.id)
    )
    .sort((left, right) => timestamp(right.updated_at) - timestamp(left.updated_at));
  const proof = proofs[0] ?? null;
  const receipts = records.receipts
    .filter(
      (receipt) =>
        proof !== null && receipt.record_product_id === 'proof' && receipt.record_id === proof.id
    )
    .sort(
      (left, right) =>
        timestamp(right.delivered_at ?? right.created_at) -
        timestamp(left.delivered_at ?? left.created_at)
    );
  const receipt = receipts[0] ?? null;
  const observedAt = latestTimestamp([
    signal.updated_at,
    decision?.updated_at,
    proof?.updated_at,
    receipt?.delivered_at,
    receipt?.created_at
  ]);
  const freshness = buildFreshness(observedAt, options);
  const state = referenceMissionState({ signal, decision, proof, receipt, proofs, freshness });
  const publicProjection: ReferenceMissionPublicProjection = {
    contract_version: REFERENCE_MISSION_CONTRACT_VERSION,
    mission_id: envelope.missionId,
    correlation_id: envelope.correlationId,
    state,
    ...envelope.publicCapsule,
    freshness
  };

  return {
    public: publicProjection,
    operator: {
      mission_id: envelope.missionId,
      correlation_id: envelope.correlationId,
      state,
      freshness,
      source: {
        signal_id: signal.id,
        decision_id: decision?.id ?? null,
        proof_id: proof?.id ?? null,
        receipt_id: receipt?.id ?? null,
        signal_source: signal.source,
        signal_url: signal.source_url,
        decision_owner: decision?.decision_owner ?? null,
        proof_receipt_url: proof?.receipt_url ?? null
      },
      lifecycle: {
        signal_status: signal.status,
        decision_state: decision?.decision_state ?? null,
        proof_outcome: proof?.outcome ?? null,
        receipt_status: receipt?.status ?? null
      }
    }
  };
}

function referenceMissionEnvelope(signal: GovernanceSignal): ReferenceMissionEnvelope | null {
  const candidate = recordValue(signal.payload.reference_mission);
  if (!candidate || candidate.contract_version !== REFERENCE_MISSION_CONTRACT_VERSION) return null;

  const missionId = nonEmptyString(candidate.id);
  const correlationId = nonEmptyString(candidate.correlation_id);
  const publicRecord = recordValue(candidate.public);
  if (!missionId || !correlationId || !publicRecord) return null;

  const allowlistedCapsule = buildPublicCapsule(publicRecord);
  return allowlistedCapsule
    ? { missionId, correlationId, publicCapsule: allowlistedCapsule }
    : null;
}

function buildPublicCapsule(record: Record<string, unknown>): ReferenceMissionPublicCapsule | null {
  const capsule = {
    title: nonEmptyString(record.title),
    objective: nonEmptyString(record.objective),
    scope: nonEmptyString(record.scope),
    authority_class: nonEmptyString(record.authority_class),
    source_class: nonEmptyString(record.source_class),
    verification_summary: nonEmptyString(record.verification_summary),
    proof_summary: nonEmptyString(record.proof_summary),
    recovery_summary: nonEmptyString(record.recovery_summary)
  };

  return Object.values(capsule).every((value): value is string => value !== null)
    ? (capsule as ReferenceMissionPublicCapsule)
    : null;
}

function referenceMissionState(input: {
  signal: GovernanceSignal;
  decision: GovernanceDecision | null;
  proof: GovernanceProof | null;
  receipt: GovernanceDeliveryReceipt | null;
  proofs: GovernanceProof[];
  freshness: ReferenceMissionFreshness;
}): ReferenceMissionState {
  const { signal, decision, proof, receipt, proofs, freshness } = input;
  if (!decision || !proof || !receipt) return 'incomplete';
  if (decision.decision_state === 'stop') return 'blocked';
  if (decision.decision_state === 'wait') return 'review';
  if (proof.outcome === 'failed' || receipt.status === 'failed') return 'failed';
  if (proof.outcome === 'rolled_back') return 'rolled_back';
  if (
    proof.outcome !== 'passed' ||
    receipt.status !== 'delivered' ||
    signal.status !== 'resolved'
  ) {
    return 'incomplete';
  }
  if (freshness.state === 'stale') return 'stale';
  return proofs.some(
    (candidate) =>
      candidate.id !== proof.id && ['failed', 'rolled_back'].includes(candidate.outcome)
  )
    ? 'recovered'
    : 'proven';
}

function unavailableReadModel(
  staleAfterMs = REFERENCE_MISSION_STALE_AFTER_MS
): ReferenceMissionReadModel {
  return {
    operator: null,
    public: {
      contract_version: REFERENCE_MISSION_CONTRACT_VERSION,
      mission_id: null,
      correlation_id: null,
      state: 'unavailable',
      title: null,
      objective: null,
      scope: null,
      authority_class: null,
      source_class: null,
      verification_summary: null,
      proof_summary: null,
      recovery_summary: null,
      freshness: {
        state: 'unavailable',
        observed_at: null,
        stale_after_days: Math.round(staleAfterMs / (24 * 60 * 60 * 1_000))
      }
    }
  };
}

function buildFreshness(
  observedAt: string | null,
  options: { now?: string; staleAfterMs?: number }
): ReferenceMissionFreshness {
  const staleAfterMs = options.staleAfterMs ?? REFERENCE_MISSION_STALE_AFTER_MS;
  const now = timestamp(options.now ?? new Date().toISOString());
  const observed = observedAt ? timestamp(observedAt) : Number.NaN;
  return {
    state: Number.isFinite(observed) && now - observed <= staleAfterMs ? 'current' : 'stale',
    observed_at: observedAt,
    stale_after_days: Math.round(staleAfterMs / (24 * 60 * 60 * 1_000))
  };
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  return (
    values
      .filter(
        (value): value is string => typeof value === 'string' && Number.isFinite(timestamp(value))
      )
      .sort((left, right) => timestamp(right) - timestamp(left))[0] ?? null
  );
}

function timestamp(value: string): number {
  return Date.parse(value);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
