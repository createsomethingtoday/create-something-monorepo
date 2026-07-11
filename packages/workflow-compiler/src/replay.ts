import type {
  CompiledDecision,
  CompiledWorkflowBundle,
  EvidenceLedgerArtifact,
  ReplayOutcome,
  WorkflowAction,
  WorkflowAcceptanceSummary,
  WorkflowReplayCase,
  WorkflowReplayManifest,
  WorkflowReplayReport,
  WorkflowReplayResult,
} from './types.js';

export interface WorkflowReplayArtifacts {
  report: WorkflowReplayReport;
  evidenceLedger: EvidenceLedgerArtifact;
}

export function createAcceptanceSummary(
  bundle: CompiledWorkflowBundle,
  report: WorkflowReplayReport,
): WorkflowAcceptanceSummary {
  return {
    schemaVersion: 'workflow_acceptance_summary.v0.1',
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
    compilerVersion: bundle.compilerVersion,
    caseCount: report.cases.length,
    counts: report.counts,
    allExpectationsMatched: report.allExpectationsMatched,
    governanceComplete: bundle.decisionInventory.decisions
      .filter((decision) => decision.kind !== 'read')
      .every(
        (decision) =>
          decision.systemsTouched.length > 0 &&
          decision.requiredEvidence.length > 0 &&
          decision.receiptFields.length > 0 &&
          Boolean(decision.recovery.owner && decision.recovery.path),
      ),
    requiredCoverage: {
      pass: report.cases.some((entry) => entry.observedOutcome === 'pass'),
      approvalRequired: report.cases.some(
        (entry) => entry.observedOutcome === 'approval_required',
      ),
      blocked: report.cases.some((entry) => entry.observedOutcome === 'blocked'),
      insufficientEvidence: report.cases.some(
        (entry) => entry.reasonCode === 'INSUFFICIENT_EVIDENCE',
      ),
      unknownAction: report.cases.some((entry) => entry.reasonCode === 'UNKNOWN_ACTION'),
    },
  };
}

export function replayWorkflow(
  bundle: CompiledWorkflowBundle,
  manifest: WorkflowReplayManifest,
): WorkflowReplayArtifacts {
  if (manifest.workflowId !== bundle.workflowId) {
    throw new Error(
      `Replay manifest workflow ${manifest.workflowId} does not match bundle ${bundle.workflowId}.`,
    );
  }

  const decisions = new Map(
    bundle.decisionInventory.decisions.map((decision) => [decision.actionId, decision]),
  );
  const cases = manifest.cases
    .map((replayCase) => replayCaseAgainstBundle(bundle, decisions, replayCase))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  const counts: Record<ReplayOutcome, number> = {
    pass: cases.filter((entry) => entry.observedOutcome === 'pass').length,
    approval_required: cases.filter((entry) => entry.observedOutcome === 'approval_required').length,
    blocked: cases.filter((entry) => entry.observedOutcome === 'blocked').length,
  };
  const header = {
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
  };

  return {
    report: {
      schemaVersion: 'workflow_replay_report.v0.1',
      ...header,
      cases,
      counts,
      allExpectationsMatched: cases.every((entry) => entry.expectationMatched),
    },
    evidenceLedger: {
      schemaVersion: 'evidence_ledger.v0.1',
      ...header,
      entries: cases.map((entry) => entry.receipt),
    },
  };
}

function hasEvidence(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !Array.isArray(value) || value.length > 0;
}

function transitionTarget(
  bundle: CompiledWorkflowBundle,
  initialState: string,
  actionId: string,
): string | undefined {
  const actionNode = `action:${actionId}`;
  const entersAction = bundle.workflowMap.edges.some(
    (edge) => edge.kind === 'transitions' && edge.from === `state:${initialState}` && edge.to === actionNode,
  );
  if (!entersAction) return undefined;
  const exitsAction = bundle.workflowMap.edges.find(
    (edge) => edge.kind === 'transitions' && edge.from === actionNode && edge.to.startsWith('state:'),
  );
  return exitsAction?.to.slice('state:'.length);
}

function unknownRecovery(bundle: CompiledWorkflowBundle): WorkflowAction['recovery'] {
  return {
    mode: 'escalate',
    owner: bundle.owners.workflow,
    path: 'Stop execution and add or correct the action in the versioned workflow definition.',
  };
}

function receiptFields(
  bundle: CompiledWorkflowBundle,
  replayCase: WorkflowReplayCase,
  outcome: ReplayOutcome,
  decision?: CompiledDecision,
): Record<string, unknown> {
  const evidenceReferences = Object.keys(replayCase.evidence)
    .filter((key) => hasEvidence(replayCase.evidence[key]))
    .sort((left, right) => left.localeCompare(right));
  const requiredFields = decision?.receiptFields ?? [
    'workflow_id',
    'action_id',
    'correlation_id',
    'outcome',
  ];

  return Object.fromEntries(
    requiredFields.map((field) => {
      if (field === 'workflow_id') return [field, bundle.workflowId];
      if (field === 'action_id') return [field, replayCase.actionId];
      if (field === 'correlation_id') return [field, replayCase.caseId];
      if (field === 'outcome') return [field, outcome];
      if (field === 'evidence_refs') return [field, evidenceReferences];
      return [field, replayCase.evidence[field] ?? null];
    }),
  );
}

function replayCaseAgainstBundle(
  bundle: CompiledWorkflowBundle,
  decisions: Map<string, CompiledDecision>,
  replayCase: WorkflowReplayCase,
): WorkflowReplayResult {
  const decision = decisions.get(replayCase.actionId);
  const evidenceReferences = Object.keys(replayCase.evidence)
    .filter((key) => hasEvidence(replayCase.evidence[key]))
    .sort((left, right) => left.localeCompare(right));
  const missingEvidence = decision
    ? decision.requiredEvidence.filter((field) => !hasEvidence(replayCase.evidence[field]))
    : [];
  const recovery = decision?.recovery ?? unknownRecovery(bundle);
  const owner = decision?.approvalOwner ?? decision?.recovery.owner ?? bundle.owners.workflow;

  let observedOutcome: ReplayOutcome;
  let reasonCode: WorkflowReplayResult['reasonCode'];
  let stateAfter = replayCase.initialState;
  let canExecute = false;

  if (!decision) {
    observedOutcome = 'blocked';
    reasonCode = 'UNKNOWN_ACTION';
  } else if (decision.autonomy === 'blocked') {
    observedOutcome = 'blocked';
    reasonCode = 'POLICY_BLOCKED';
  } else if (missingEvidence.length > 0) {
    observedOutcome = 'blocked';
    reasonCode = 'INSUFFICIENT_EVIDENCE';
  } else if (
    (decision.autonomy === 'approval_required' || decision.autonomy === 'manual_only') &&
    (!decision.approvalOwner || !replayCase.approvals.includes(decision.approvalOwner))
  ) {
    observedOutcome = 'approval_required';
    reasonCode = 'APPROVAL_REQUIRED';
  } else {
    const targetState = transitionTarget(bundle, replayCase.initialState, replayCase.actionId);
    if (!targetState) {
      observedOutcome = 'blocked';
      reasonCode = 'INVALID_TRANSITION';
    } else {
      observedOutcome = 'pass';
      reasonCode = 'ACTION_ALLOWED';
      stateAfter = targetState;
      canExecute = true;
    }
  }

  const receipt = {
    schemaVersion: 'workflow_replay_receipt.v0.1' as const,
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
    caseId: replayCase.caseId,
    actionId: replayCase.actionId,
    correlationId: replayCase.caseId,
    outcome: observedOutcome,
    receiptFields: receiptFields(bundle, replayCase, observedOutcome, decision),
  };

  return {
    caseId: replayCase.caseId,
    title: replayCase.title,
    actionId: replayCase.actionId,
    stateBefore: replayCase.initialState,
    stateAfter,
    observedOutcome,
    expectedOutcome: replayCase.expectedOutcome,
    expectationMatched:
      observedOutcome === replayCase.expectedOutcome && stateAfter === replayCase.expectedState,
    canExecute,
    reasonCode,
    authority: decision?.authority ?? 'unresolved',
    owner,
    evidenceReferences,
    missingEvidence,
    recovery,
    receipt,
  };
}
