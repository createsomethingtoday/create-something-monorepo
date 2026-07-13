import type {
  WorkflowPilotCompiledRuntimeSummary,
  WorkflowPilotCorpusSummary,
  WorkflowPilotDiscoveryPack,
  WorkflowPilotPrivacySummary,
  WorkflowPilotReconciliationSummary,
  WorkflowPilotScorecard,
} from './types.js';

export function createWorkflowPilotScorecard(input: {
  discoveryPack: WorkflowPilotDiscoveryPack;
  corpusSummary: WorkflowPilotCorpusSummary;
  reconciliationSummary: WorkflowPilotReconciliationSummary;
  privacySummary: WorkflowPilotPrivacySummary;
  compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
}): WorkflowPilotScorecard {
  const status =
    input.reconciliationSummary.samplingGateStatus === 'pass' &&
    input.privacySummary.status === 'pass' &&
    !input.reconciliationSummary.proposalApplied
      ? 'pass'
      : 'blocked';

  return {
    schemaVersion: 'workflow_shadow_scorecard.v0.1',
    status,
    sourceCount: input.discoveryPack.sources.length,
    adapterCount: input.discoveryPack.adapters.length,
    caseCount: input.corpusSummary.caseCount,
    samplingGateStatus: input.reconciliationSummary.samplingGateStatus,
    discrepancyCount: input.reconciliationSummary.discrepancyCount,
    contextSupportedCount: input.reconciliationSummary.contextSupportedCount,
    ambiguousCount: input.reconciliationSummary.ambiguousCount,
    privacyStatus: input.privacySummary.status,
    compiledArtifactCount: input.compiledRuntime.artifactCount,
    mutationsPerformed: 0,
    proposalApplied: false,
    langfuseUsed: false,
  };
}
