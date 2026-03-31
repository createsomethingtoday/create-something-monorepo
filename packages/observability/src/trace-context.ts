import type { AtlasMetadata } from './atlas.js';

export type ExperimentPhase =
  | 'search'
  | 'baseline'
  | 'candidate'
  | 'holdout'
  | 'pilot'
  | 'production'
  | string;

export interface ExperimentTraceContext {
  experimentId?: string;
  candidateId?: string;
  baselineId?: string;
  cohort?: string;
  phase?: ExperimentPhase;
}

export interface GovernanceTraceContext extends ExperimentTraceContext {
  accountId?: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  requestId?: string;
  policyId?: string;
  routeClassification?: string;
  authzDecision?: 'allow' | 'review' | 'block' | string;
  laneSlug?: string;
  boundHost?: string;
  entrypoint?: string;
}

type MetadataValue = string | number | boolean | undefined;
type MetadataRecord = Record<string, MetadataValue>;

function compactMetadata(entries: MetadataRecord): MetadataRecord {
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => {
      if (typeof value === 'string') {
        return value.length > 0;
      }
      return value !== undefined;
    }),
  ) as MetadataRecord;
}

export function traceContextMetadata(
  traceContext: GovernanceTraceContext | undefined,
): MetadataRecord {
  if (!traceContext) return {};

  return compactMetadata({
    account_id: traceContext.accountId,
    tenant_id: traceContext.tenantId,
    user_id: traceContext.userId,
    session_id: traceContext.sessionId,
    correlation_id: traceContext.correlationId,
    request_id: traceContext.requestId,
    policy_id: traceContext.policyId,
    route_classification: traceContext.routeClassification,
    authz_decision: traceContext.authzDecision,
    lane_slug: traceContext.laneSlug,
    bound_host: traceContext.boundHost,
    entrypoint: traceContext.entrypoint,
    experiment_id: traceContext.experimentId,
    candidate_id: traceContext.candidateId,
    baseline_id: traceContext.baselineId,
    cohort: traceContext.cohort,
    phase: traceContext.phase,

    // Compatibility fields for existing dashboards and ad hoc queries.
    accountId: traceContext.accountId,
    tenantId: traceContext.tenantId,
    userId: traceContext.userId,
    sessionId: traceContext.sessionId,
    correlationId: traceContext.correlationId,
    requestId: traceContext.requestId,
    policyId: traceContext.policyId,
    routeClassification: traceContext.routeClassification,
    authzDecision: traceContext.authzDecision,
    laneSlug: traceContext.laneSlug,
    boundHost: traceContext.boundHost,
    experimentId: traceContext.experimentId,
    candidateId: traceContext.candidateId,
    baselineId: traceContext.baselineId,
  });
}

export function traceContextAtlasMetadata(
  traceContext: GovernanceTraceContext | undefined,
): AtlasMetadata {
  if (!traceContext) return {};

  return compactMetadata({
    account_id: traceContext.accountId,
    tenant_id: traceContext.tenantId,
    user_id: traceContext.userId,
    session_id: traceContext.sessionId,
    correlation_id: traceContext.correlationId,
    request_id: traceContext.requestId,
    policy_id: traceContext.policyId,
    route_classification: traceContext.routeClassification,
    authz_decision: traceContext.authzDecision,
    lane_slug: traceContext.laneSlug,
    bound_host: traceContext.boundHost,
    entrypoint: traceContext.entrypoint,
    experiment_id: traceContext.experimentId,
    candidate_id: traceContext.candidateId,
    baseline_id: traceContext.baselineId,
    cohort: traceContext.cohort,
    phase: traceContext.phase,

    'governance.account_id': traceContext.accountId,
    'governance.tenant_id': traceContext.tenantId,
    'governance.user_id': traceContext.userId,
    'governance.session_id': traceContext.sessionId,
    'governance.correlation_id': traceContext.correlationId,
    'governance.request_id': traceContext.requestId,
    'governance.policy_id': traceContext.policyId,
    'governance.route_classification': traceContext.routeClassification,
    'governance.authz_decision': traceContext.authzDecision,
    'governance.lane_slug': traceContext.laneSlug,
    'governance.bound_host': traceContext.boundHost,
    'governance.entrypoint': traceContext.entrypoint,

    'experiment.experiment_id': traceContext.experimentId,
    'experiment.candidate_id': traceContext.candidateId,
    'experiment.baseline_id': traceContext.baselineId,
    'experiment.cohort': traceContext.cohort,
    'experiment.phase': traceContext.phase,
  }) as AtlasMetadata;
}

export function traceContextTags(
  traceContext: GovernanceTraceContext | undefined,
): string[] {
  if (!traceContext) return [];

  return [
    traceContext.policyId ? `policy:${traceContext.policyId}` : null,
    traceContext.routeClassification ? `route:${traceContext.routeClassification}` : null,
    traceContext.authzDecision ? `authz:${traceContext.authzDecision}` : null,
    traceContext.laneSlug ? `lane:${traceContext.laneSlug}` : null,
  ].filter((value): value is string => Boolean(value));
}
