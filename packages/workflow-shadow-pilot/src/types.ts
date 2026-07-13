export interface WorkflowPilotDiscoveryOptions {
  repoRoot: string;
}

export interface WorkflowShadowPilotOptions extends WorkflowPilotDiscoveryOptions {
  repoRoot: string;
  corpusDir: string;
  outputDir: string;
  measurementStartedAt: string;
  liveAdapterReceiptPath?: string;
}

export interface WorkflowPilotSource {
  id: string;
  tier: 'database' | 'automation' | 'judgment';
  relativePath: string;
  sha256: string;
}

export interface WorkflowPilotAdapter {
  id: string;
  owner: string;
  sourceId: string;
  read: boolean;
  write: false;
  authority: 'observe_only';
  permissions: ['read'];
  evidence: string;
  receipt: string;
  escalation: string;
}

export interface WorkflowPilotDiscoveryPack {
  schemaVersion: 'workflow_shadow_discovery_pack.v0.1';
  mode: 'shadow';
  policySha256: string;
  sources: WorkflowPilotSource[];
  adapters: WorkflowPilotAdapter[];
}

export interface WorkflowPilotCorpusSummary {
  schemaVersion: 'workflow_shadow_corpus_summary.v0.1';
  caseCount: number;
  reviewerCount: number;
  maximumReviewerShare: number;
  strataCounts: Record<string, number>;
  receiptCorpusSha256: string;
  historicalContextSha256: string;
}

export interface WorkflowPilotReconciliationSummary {
  schemaVersion: 'workflow_shadow_reconciliation_summary.v0.1';
  samplingGateStatus: 'pass' | 'blocked';
  samplingFailureCount: number;
  discrepancyCount: number;
  contextSupportedCount: number;
  ambiguousCount: number;
  contextCoverageRate: number;
  receiptProposalSha256: string;
  historicalContextProposalSha256: string;
  proposalApplied: false;
  cases: Array<{
    caseFingerprint: string;
    ruleId: string;
    classification: string;
    status: 'context_supported' | 'ambiguous';
    controlledEvidence: {
      selectionStratum: string;
      observedOutcome: string;
      rejectionCategory?: string;
      improvementAreas: string[];
      hasReviewFeedback: boolean;
      hasRejectionFeedback: boolean;
      hasDecisionDate: boolean;
    };
    sourcePointers: {
      outcome: string;
      alignment: string;
    };
    missingEvidence: string[];
  }>;
}

export interface WorkflowPilotPrivacySummary {
  schemaVersion: 'workflow_shadow_privacy_summary.v0.1';
  status: 'pass' | 'blocked';
  sensitiveValuesChecked: number;
  exactLeakCount: number;
  forbiddenKeyCount: number;
}

export interface WorkflowPilotArtifactManifest {
  schemaVersion: 'workflow_shadow_artifact_manifest.v0.1';
  files: Array<{ path: string; sha256: string }>;
}

export interface WorkflowPilotCompiledRuntimeSummary {
  schemaVersion: 'workflow_shadow_compiled_runtime_summary.v0.1';
  definitionSha256: string;
  compilerVersion: string;
  artifactCount: number;
  manifestSha256: string;
}

export interface WorkflowPilotScorecard {
  schemaVersion: 'workflow_shadow_scorecard.v0.1';
  status: 'pass' | 'blocked';
  sourceCount: number;
  adapterCount: number;
  caseCount: number;
  samplingGateStatus: 'pass' | 'blocked';
  discrepancyCount: number;
  contextSupportedCount: number;
  ambiguousCount: number;
  privacyStatus: 'pass' | 'blocked';
  compiledArtifactCount: number;
  mutationsPerformed: 0;
  proposalApplied: false;
  langfuseUsed: false;
}

export interface WorkflowPilotMeasurementReceipt {
  schemaVersion: 'workflow_shadow_measurement_receipt.v0.1';
  startedAt: string;
  finishedAt: string;
  elapsedMilliseconds: number;
  deterministicArtifactCount: number;
  caseCount: number;
  samplingGateStatus: 'pass' | 'blocked';
  contextSupportedCount: number;
  ambiguousCount: number;
  mutationsPerformed: 0;
  remainingManualWork: string[];
  excludedFromDeterministicManifest: true;
}

export interface WorkflowShadowPilotResult {
  discoveryPack: WorkflowPilotDiscoveryPack;
  corpusSummary: WorkflowPilotCorpusSummary;
  reconciliationSummary: WorkflowPilotReconciliationSummary;
  privacySummary: WorkflowPilotPrivacySummary;
  compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
  scorecard: WorkflowPilotScorecard;
  artifactManifest: WorkflowPilotArtifactManifest;
  measurementReceipt: WorkflowPilotMeasurementReceipt;
  liveAdapterReceipt?: import('./live-review-adapter.js').WorkflowPilotLiveAdapterReceipt;
}
