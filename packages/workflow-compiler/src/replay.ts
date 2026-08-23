import { parseWorkflowReplayManifest, ReplayInputValidationError } from './input.js';
import type {
  CompiledDecision,
  CompiledApprovalSurface,
  CompiledWorkflowBundle,
  EvidenceLedgerArtifact,
  GovernedInteractionDecision,
  ReplayOutcome,
  WorkflowAction,
  WorkflowAcceptanceSummary,
  WorkflowEvidenceMatcher,
  WorkflowEvidenceValue,
  WorkflowReplayCase,
  WorkflowReplayReport,
  WorkflowReplayResult,
  WorkflowReplayResultV0_1,
  WorkflowReplayResultV0_2,
  WorkflowReplayResultV0_3
} from './types.js';

export interface WorkflowReplayArtifacts {
  report: WorkflowReplayReport;
  evidenceLedger: EvidenceLedgerArtifact;
}

interface EvidenceConstraintCarrier {
  actionId: string;
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
}

export function createAcceptanceSummary(
  bundle: CompiledWorkflowBundle,
  report: WorkflowReplayReport
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
          Boolean(decision.recovery.owner && decision.recovery.path)
      ),
    requiredCoverage: {
      pass: report.cases.some((entry) => entry.observedOutcome === 'pass'),
      approvalRequired: report.cases.some((entry) => entry.observedOutcome === 'approval_required'),
      blocked: report.cases.some((entry) => entry.observedOutcome === 'blocked'),
      insufficientEvidence: report.cases.some(
        (entry) => entry.reasonCode === 'INSUFFICIENT_EVIDENCE'
      ),
      unknownAction: report.cases.some((entry) => entry.reasonCode === 'UNKNOWN_ACTION')
    }
  };
}

export function replayWorkflow(
  bundle: CompiledWorkflowBundle,
  input: unknown
): WorkflowReplayArtifacts {
  rejectMismatchedNestedArtifactSchemas(bundle);
  rejectDivergentNestedGovernanceContracts(bundle);
  rejectLegacyEvidenceConstraints(bundle);
  const manifest = parseWorkflowReplayManifest(input);
  if (manifest.workflowId !== bundle.workflowId) {
    throw new ReplayInputValidationError([
      {
        code: 'WORKFLOW_ID_MISMATCH',
        path: '$.workflowId',
        message: `Replay manifest workflow ${manifest.workflowId} does not match compiled workflow ${bundle.workflowId}.`
      }
    ]);
  }

  const decisions = new Map(
    bundle.decisionInventory.decisions.map((decision) => [decision.actionId, decision])
  );
  const actors = new Set(
    bundle.workflowMap.nodes
      .filter((node) => node.kind === 'actor' && node.id.startsWith('actor:'))
      .map((node) => node.id.slice('actor:'.length))
  );
  const cases = manifest.cases
    .map((replayCase) => replayCaseAgainstBundle(bundle, decisions, actors, replayCase))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  const counts: Record<ReplayOutcome, number> = {
    pass: cases.filter((entry) => entry.observedOutcome === 'pass').length,
    approval_required: cases.filter((entry) => entry.observedOutcome === 'approval_required')
      .length,
    blocked: cases.filter((entry) => entry.observedOutcome === 'blocked').length
  };
  const header = {
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash
  };
  const report =
    bundle.schemaVersion === 'compiled_workflow_bundle.v0.3'
      ? {
          schemaVersion: 'workflow_replay_report.v0.3' as const,
          ...header,
          cases: cases as WorkflowReplayResultV0_3[],
          counts,
          allExpectationsMatched: cases.every((entry) => entry.expectationMatched)
        }
      : bundle.schemaVersion === 'compiled_workflow_bundle.v0.2'
      ? {
          schemaVersion: 'workflow_replay_report.v0.2' as const,
          ...header,
          cases: cases as WorkflowReplayResultV0_2[],
          counts,
          allExpectationsMatched: cases.every((entry) => entry.expectationMatched)
        }
      : {
          schemaVersion: 'workflow_replay_report.v0.1' as const,
          ...header,
          cases: cases as WorkflowReplayResultV0_1[],
          counts,
          allExpectationsMatched: cases.every((entry) => entry.expectationMatched)
        };

  return {
    report,
    evidenceLedger: {
      schemaVersion: 'evidence_ledger.v0.1',
      ...header,
      entries: cases.map((entry) => entry.receipt)
    }
  };
}

function rejectMismatchedNestedArtifactSchemas(bundle: CompiledWorkflowBundle): void {
  const expectedSchemaVersions = expectedNestedArtifactSchemaVersions(bundle);
  const artifacts = [
    ['decisionInventory', bundle.decisionInventory],
    ['governedInteraction', bundle.governedInteraction],
    ['approvalSurfaces', bundle.approvalSurfaces],
    ['toolContracts', bundle.toolContracts]
  ] as const;
  const diagnostics = artifacts.flatMap(([artifactName, artifact]) => {
    const expectedSchemaVersion = expectedSchemaVersions[artifactName];
    const actualSchemaVersion = artifact?.schemaVersion;
    if (actualSchemaVersion === expectedSchemaVersion) return [];
    return [
      {
        code: 'INVALID_VALUE' as const,
        path: `$.${artifactName}.schemaVersion`,
        message:
          `Compiled workflow bundle ${bundle.schemaVersion} requires ${expectedSchemaVersion}; ` +
          `received ${actualSchemaVersion ?? 'missing'}.`
      }
    ];
  });
  const expectedHeader = {
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
  };
  const artifactHeaders = [
    ['workflowMap', bundle.workflowMap, ['workflowId', 'workflowVersion']],
    ['runtimeTargets', bundle.runtimeTargets, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['objectSchemas', bundle.objectSchemas, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['eventSchemas', bundle.eventSchemas, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['agentContracts', bundle.agentContracts, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['evaluationManifest', bundle.evaluationManifest, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['decisionInventory', bundle.decisionInventory, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['governedInteraction', bundle.governedInteraction, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['approvalSurfaces', bundle.approvalSurfaces, ['workflowId', 'workflowVersion', 'definitionHash']],
    ['toolContracts', bundle.toolContracts, ['workflowId', 'workflowVersion', 'definitionHash']],
  ] as const;
  diagnostics.push(
    ...artifactHeaders.flatMap(([artifactName, artifact, headerFields]) =>
      headerFields.flatMap((field) => {
        const actual = artifactHeaderValue(artifact, field);
        if (actual === expectedHeader[field]) return [];
        return [
          {
            code: 'INVALID_VALUE' as const,
            path: `$.${artifactName}.${field}`,
            message:
              `Compiled artifact ${artifactName} ${field} must match compiled workflow bundle ` +
              `${field}; received ${String(actual ?? 'missing')}.`,
          },
        ];
      }),
    ),
  );
  if (diagnostics.length > 0) throw new ReplayInputValidationError(diagnostics);
}

function expectedNestedArtifactSchemaVersions(bundle: CompiledWorkflowBundle): {
  decisionInventory: string;
  governedInteraction: string;
  approvalSurfaces: string;
  toolContracts: string;
} {
  const schemaVersion = bundle.schemaVersion as string;
  switch (schemaVersion) {
    case 'compiled_workflow_bundle.v0.1':
      return {
        decisionInventory: 'decision_inventory.v0.1',
        governedInteraction: 'governed_interaction_bundle.v0.1',
        approvalSurfaces: 'approval_surfaces.v0.1',
        toolContracts: 'tool_contracts.v0.1',
      };
    case 'compiled_workflow_bundle.v0.2':
      return {
        decisionInventory: 'decision_inventory.v0.2',
        governedInteraction: 'governed_interaction_bundle.v0.2',
        approvalSurfaces: 'approval_surfaces.v0.2',
        toolContracts: 'tool_contracts.v0.2',
      };
    case 'compiled_workflow_bundle.v0.3':
      return {
        decisionInventory: 'decision_inventory.v0.3',
        governedInteraction: 'governed_interaction_bundle.v0.3',
        approvalSurfaces: 'approval_surfaces.v0.3',
        toolContracts: 'tool_contracts.v0.3',
      };
    default:
      throw new ReplayInputValidationError([
        {
          code: 'INVALID_VALUE',
          path: '$.schemaVersion',
          message: `Unsupported compiled workflow bundle schema ${schemaVersion}.`,
        },
      ]);
  }
}

function artifactHeaderValue(
  artifact: unknown,
  field: 'workflowId' | 'workflowVersion' | 'definitionHash',
): unknown {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) return undefined;
  return (artifact as Record<string, unknown>)[field];
}

function rejectDivergentNestedGovernanceContracts(bundle: CompiledWorkflowBundle): void {
  if (bundle.schemaVersion === 'compiled_workflow_bundle.v0.1') return;
  const decisionEntriesByActionId = new Map<
    string,
    Array<{ index: number; action: typeof bundle.decisionInventory.decisions[number] }>
  >();
  bundle.decisionInventory.decisions.forEach((action, index) => {
    const entries = decisionEntriesByActionId.get(action.actionId) ?? [];
    entries.push({ action, index });
    decisionEntriesByActionId.set(action.actionId, entries);
  });
  const governedEntriesByActionId = new Map<
    string,
    Array<{ index: number; action: typeof bundle.governedInteraction.actions[number] }>
  >();
  bundle.governedInteraction.actions.forEach((action, index) => {
    const entries = governedEntriesByActionId.get(action.actionId) ?? [];
    entries.push({ action, index });
    governedEntriesByActionId.set(action.actionId, entries);
  });
  const approvalEntriesByActionId = new Map<
    string,
    Array<{ index: number; action: typeof bundle.approvalSurfaces.actions[number] }>
  >();
  bundle.approvalSurfaces.actions.forEach((action, index) => {
    const entries = approvalEntriesByActionId.get(action.actionId) ?? [];
    entries.push({ action, index });
    approvalEntriesByActionId.set(action.actionId, entries);
  });
  const decisionByActionId = new Map(
    bundle.decisionInventory.decisions.map((action, index) => [action.actionId, { action, index }])
  );
  const toolEntriesByActionId = new Map<string, Array<{ index: number; action: typeof bundle.toolContracts.tools[number] }>>();
  bundle.toolContracts.tools.forEach((action, index) => {
    const entries = toolEntriesByActionId.get(action.actionId) ?? [];
    entries.push({ action, index });
    toolEntriesByActionId.set(action.actionId, entries);
  });
  const diagnostics = [
    ...[...decisionEntriesByActionId.entries()].flatMap(([actionId, entries]) =>
      entries.length === 1
        ? []
        : [decisionInventoryDiagnostic(actionId, '$.decisionInventory.decisions')]
    ),
    ...bundle.decisionInventory.decisions.flatMap((decision, decisionIndex) => {
      const decisionPath = `$.decisionInventory.decisions[${decisionIndex}]`;
      const governedEntries = governedEntriesByActionId.get(decision.actionId) ?? [];
      const governed = governedEntries.length === 1 ? governedEntries[0] : undefined;
      const governedDiagnostics = governed
        ? governanceContractDiagnostics(
            decision,
            decisionPath,
            governed.action,
            `$.governedInteraction.actions[${governed.index}]`
          )
        : governedEntries.length === 0
          ? [missingCorrelatedActionDiagnostic(decision.actionId, '$.governedInteraction.actions')]
          : [governedInteractionInventoryDiagnostic(decision.actionId, '$.governedInteraction.actions')];
      const approvalEntries = approvalEntriesByActionId.get(decision.actionId) ?? [];
      const approvalDiagnostics = !governed
        ? []
        : governed.action.autonomy === 'auto_allow'
          ? approvalEntries.map(({ index }) =>
              unexpectedApprovalSurfaceDiagnostic(
                decision.actionId,
                `$.approvalSurfaces.actions[${index}]`
              )
            )
          : approvalEntries.length === 1
            ? approvalSurfaceContractDiagnostics(
                governed.action,
                `$.governedInteraction.actions[${governed.index}]`,
                approvalEntries[0].action,
                `$.approvalSurfaces.actions[${approvalEntries[0].index}]`
              )
            : approvalEntries.length === 0
              ? [missingCorrelatedActionDiagnostic(decision.actionId, '$.approvalSurfaces.actions')]
              : [approvalSurfaceInventoryDiagnostic(decision.actionId, '$.approvalSurfaces.actions')];
      const toolEntries = toolEntriesByActionId.get(decision.actionId) ?? [];
      const toolDiagnostics = decision.toolContract
        ? toolEntries.length === 1
          ? [
              ...evidenceConstraintDiagnostics(
                decision,
                decisionPath,
                toolEntries[0].action,
                `$.toolContracts.tools[${toolEntries[0].index}]`
              ),
              ...toolContractDiagnostics(
                decision.toolContract,
                decisionPath,
                toolEntries[0].action,
                `$.toolContracts.tools[${toolEntries[0].index}]`
              )
            ]
          : [toolInventoryDiagnostic(decision.actionId, '$.toolContracts.tools')]
        : toolEntries.map(({ index }) =>
            unexpectedToolContractDiagnostic(decision.actionId, `$.toolContracts.tools[${index}]`)
          );
      return [...governedDiagnostics, ...approvalDiagnostics, ...toolDiagnostics];
    }),
    ...bundle.toolContracts.tools.flatMap((tool, toolIndex) => {
      const decision = decisionByActionId.get(tool.actionId);
      if (!decision) {
        return [unexpectedToolContractDiagnostic(tool.actionId, `$.toolContracts.tools[${toolIndex}]`)];
      }
      return [];
    }),
    ...bundle.governedInteraction.actions.flatMap((action, actionIndex) => {
      const decision = decisionByActionId.get(action.actionId);
      if (!decision) {
        return [
          unexpectedGovernedInteractionDiagnostic(
            action.actionId,
            `$.governedInteraction.actions[${actionIndex}]`
          )
        ];
      }
      return [];
    }),
    ...bundle.approvalSurfaces.actions.flatMap((action, actionIndex) => {
      const decision = decisionByActionId.get(action.actionId);
      if (!decision) {
        return [
          unexpectedApprovalSurfaceDiagnostic(
            action.actionId,
            `$.approvalSurfaces.actions[${actionIndex}]`
          )
        ];
      }
      return [];
    })
  ];
  if (diagnostics.length > 0) throw new ReplayInputValidationError(diagnostics);
}

function missingCorrelatedActionDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 requires a correlated action for ${actionId}.`
  };
}

function decisionInventoryDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 requires exactly one decision inventory action for ${actionId}.`
  };
}

function governedInteractionInventoryDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 requires exactly one governed interaction action for ${actionId}.`
  };
}

function unexpectedGovernedInteractionDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 does not declare a decision for governed interaction action ${actionId}.`
  };
}

function approvalSurfaceInventoryDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 requires exactly one approval surface for ${actionId}.`
  };
}

function unexpectedApprovalSurfaceDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 does not declare a controlled approval surface for ${actionId}.`
  };
}

function toolInventoryDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 requires exactly one source-derived tool contract for ${actionId}.`
  };
}

function unexpectedToolContractDiagnostic(actionId: string, path: string) {
  return {
    code: 'INVALID_VALUE' as const,
    path,
    message: `Compiled workflow bundle v0.2 does not declare a tool contract for ${actionId}.`
  };
}

function toolContractDiagnostics(
  source: unknown,
  sourcePath: string,
  target: unknown,
  targetPath: string
) {
  if (canonicalizeContract(source) === canonicalizeContract(target)) return [];
  return [
    {
      code: 'INVALID_VALUE' as const,
      path: targetPath,
      message: `Tool contract must match the source-derived contract at ${sourcePath}.`
    }
  ];
}

function governanceContractDiagnostics(
  source: CompiledDecision,
  sourcePath: string,
  target: GovernedInteractionDecision,
  targetPath: string
) {
  const fields = [
    'actionId',
    'title',
    'kind',
    'authority',
    'autonomy',
    'systemsTouched',
    'requiredEvidence',
    'requiredEvidenceValues',
    'requiredEvidenceMatchers',
    'approvalOwner',
    'receiptFields',
    'recovery'
  ] as const;
  return fields.flatMap((field) => {
    if (canonicalizeContract(source[field]) === canonicalizeContract(target[field])) {
      return [];
    }
    return [
      {
        code: 'INVALID_VALUE' as const,
        path: `${targetPath}.${field}`,
        message: `Governance contract ${field} for action ${source.actionId} must match ${sourcePath}.`
      }
    ];
  });
}

function approvalSurfaceContractDiagnostics(
  source: GovernedInteractionDecision,
  sourcePath: string,
  target: CompiledApprovalSurface,
  targetPath: string
) {
  const expected = {
    actionId: source.actionId,
    title: source.title,
    mode: source.autonomy,
    owner: source.approvalOwner ?? source.recovery.owner,
    requiredEvidence: source.requiredEvidence,
    requiredEvidenceValues: source.requiredEvidenceValues,
    requiredEvidenceMatchers: source.requiredEvidenceMatchers,
    recovery: source.recovery
  };
  const fields = [
    'actionId',
    'title',
    'mode',
    'owner',
    'requiredEvidence',
    'requiredEvidenceValues',
    'requiredEvidenceMatchers',
    'recovery'
  ] as const;
  return fields.flatMap((field) => {
    if (canonicalizeContract(expected[field]) === canonicalizeContract(target[field])) {
      return [];
    }
    return [
      {
        code: 'INVALID_VALUE' as const,
        path: `${targetPath}.${field}`,
        message: `Approval surface contract ${field} for action ${source.actionId} must match ${sourcePath}.`
      }
    ];
  });
}

function evidenceConstraintDiagnostics(
  source: EvidenceConstraintCarrier,
  sourcePath: string,
  target: EvidenceConstraintCarrier,
  targetPath: string
) {
  return (['requiredEvidenceValues', 'requiredEvidenceMatchers'] as const).flatMap((field) => {
    if (canonicalizeContract(source[field]) === canonicalizeContract(target[field])) {
      return [];
    }
    return [
      {
        code: 'INVALID_VALUE' as const,
        path: `${targetPath}.${field}`,
        message: `Evidence constraint ${field} for action ${source.actionId} must match ${sourcePath}.`
      }
    ];
  });
}

function canonicalizeContract(value: unknown): string {
  return JSON.stringify(canonicalizeContractValue(value));
}

function canonicalizeContractValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(canonicalizeContractValue)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeContractValue(entry)])
    );
  }
  return value ?? null;
}

function rejectLegacyEvidenceConstraints(bundle: CompiledWorkflowBundle): void {
  if (bundle.schemaVersion !== 'compiled_workflow_bundle.v0.1') return;
  const decisionIndex = bundle.decisionInventory.decisions.findIndex(
    (decision) =>
      Object.prototype.hasOwnProperty.call(decision, 'requiredEvidenceValues') ||
      Object.prototype.hasOwnProperty.call(decision, 'requiredEvidenceMatchers'),
  );
  if (decisionIndex === -1) return;
  const decision = bundle.decisionInventory.decisions[decisionIndex];
  const constraintField = Object.prototype.hasOwnProperty.call(
    decision,
    'requiredEvidenceValues',
  )
    ? 'requiredEvidenceValues'
    : 'requiredEvidenceMatchers';
  throw new ReplayInputValidationError([
    {
      code: 'INVALID_VALUE',
      path: `$.decisionInventory.decisions[${decisionIndex}].${constraintField}`,
      message:
        'Compiled workflow bundle v0.1 cannot contain evidence constraints; recompile a workflow_definition.v0.2 bundle.'
    }
  ]);
}

function hasEvidence(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  return !Array.isArray(value) || value.length > 0;
}

function transitionTarget(
  bundle: CompiledWorkflowBundle,
  initialState: string,
  actionId: string
): string | undefined {
  const actionNode = `action:${actionId}`;
  const entersAction = bundle.workflowMap.edges.some(
    (edge) =>
      edge.kind === 'transitions' && edge.from === `state:${initialState}` && edge.to === actionNode
  );
  if (!entersAction) return undefined;
  const exitsAction = bundle.workflowMap.edges.find(
    (edge) =>
      edge.kind === 'transitions' && edge.from === actionNode && edge.to.startsWith('state:')
  );
  return exitsAction?.to.slice('state:'.length);
}

function unknownRecovery(bundle: CompiledWorkflowBundle): WorkflowAction['recovery'] {
  return {
    mode: 'escalate',
    owner: bundle.owners.workflow,
    path: 'Stop execution and add or correct the action in the versioned workflow definition.'
  };
}

function receiptFields(
  bundle: CompiledWorkflowBundle,
  replayCase: WorkflowReplayCase,
  outcome: ReplayOutcome,
  decision?: CompiledDecision
): Record<string, unknown> {
  const evidenceReferences = Object.keys(replayCase.evidence)
    .filter((key) => hasEvidence(replayCase.evidence[key]))
    .sort((left, right) => left.localeCompare(right));
  const requiredFields = decision?.receiptFields ?? [
    'workflow_id',
    'action_id',
    'correlation_id',
    'outcome'
  ];

  return Object.fromEntries(
    requiredFields.map((field) => {
      if (field === 'workflow_id') return [field, bundle.workflowId];
      if (field === 'action_id') return [field, replayCase.actionId];
      if (field === 'actor_id') return [field, replayCase.actorId];
      if (field === 'correlation_id') return [field, replayCase.caseId];
      if (field === 'outcome') return [field, outcome];
      if (field === 'evidence_refs') return [field, evidenceReferences];
      return [field, replayCase.evidence[field] ?? null];
    })
  );
}

function matchesEvidenceMatcher(actual: unknown, matcher: WorkflowEvidenceMatcher): boolean {
  if (typeof actual !== 'string') return false;
  if (matcher.kind === 'contains_case_insensitive') {
    const normalizedActual = actual.toLowerCase();
    return matcher.values.some((value) => normalizedActual.includes(value.toLowerCase()));
  }
  return matcher.values.includes(actual);
}

function replayCaseAgainstBundle(
  bundle: CompiledWorkflowBundle,
  decisions: Map<string, CompiledDecision>,
  actors: Set<string>,
  replayCase: WorkflowReplayCase
): WorkflowReplayResult {
  const decision = decisions.get(replayCase.actionId);
  const evidenceReferences = Object.keys(replayCase.evidence)
    .filter((key) => hasEvidence(replayCase.evidence[key]))
    .sort((left, right) => left.localeCompare(right));
  const missingEvidence = decision
    ? decision.requiredEvidence.filter((field) => !hasEvidence(replayCase.evidence[field]))
    : [];
  const evidenceMismatches = decision
    ? Object.entries(decision.requiredEvidenceValues ?? {})
        .filter(([field, expected]) => replayCase.evidence[field] !== expected)
        .map(([field, expected]) => ({
          field,
          expected,
          actual: replayCase.evidence[field] ?? null
        }))
    : [];
  const evidenceMatcherMismatches = decision
    ? Object.entries(decision.requiredEvidenceMatchers ?? {})
        .filter(([field, matcher]) => !matchesEvidenceMatcher(replayCase.evidence[field], matcher))
        .map(([field, matcher]) => ({
          field,
          matcher,
          actual: replayCase.evidence[field] ?? null
        }))
    : [];
  const recovery = decision?.recovery ?? unknownRecovery(bundle);
  const owner = decision?.approvalOwner ?? decision?.recovery.owner ?? bundle.owners.workflow;

  let observedOutcome: ReplayOutcome;
  let reasonCode: WorkflowReplayResultV0_2['reasonCode'];
  let stateAfter = replayCase.initialState;
  let canExecute = false;

  if (!decision) {
    observedOutcome = 'blocked';
    reasonCode = 'UNKNOWN_ACTION';
  } else if (!actors.has(replayCase.actorId)) {
    observedOutcome = 'blocked';
    reasonCode = 'UNKNOWN_ACTOR';
  } else if (replayCase.actorId !== decision.authority) {
    observedOutcome = 'blocked';
    reasonCode = 'ACTOR_NOT_AUTHORIZED';
  } else if (decision.autonomy === 'blocked') {
    observedOutcome = 'blocked';
    reasonCode = 'POLICY_BLOCKED';
  } else if (missingEvidence.length > 0) {
    observedOutcome = 'blocked';
    reasonCode = 'INSUFFICIENT_EVIDENCE';
  } else if (evidenceMismatches.length > 0) {
    observedOutcome = 'blocked';
    reasonCode = 'EVIDENCE_VALUE_MISMATCH';
  } else if (evidenceMatcherMismatches.length > 0) {
    observedOutcome = 'blocked';
    reasonCode = 'EVIDENCE_MATCHER_MISMATCH';
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
    actorId: replayCase.actorId,
    correlationId: replayCase.caseId,
    outcome: observedOutcome,
    receiptFields: receiptFields(bundle, replayCase, observedOutcome, decision)
  };

  const common = {
    caseId: replayCase.caseId,
    title: replayCase.title,
    actionId: replayCase.actionId,
    actorId: replayCase.actorId,
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
    receipt
  };
  if (bundle.schemaVersion === 'compiled_workflow_bundle.v0.1') {
    return { ...common, reasonCode } as WorkflowReplayResultV0_1;
  }
  if (bundle.schemaVersion === 'compiled_workflow_bundle.v0.2') {
    return {
      ...common,
      reasonCode,
      evidenceMismatches,
      evidenceMatcherMismatches
    } as WorkflowReplayResultV0_2;
  }
  return {
    ...common,
    reasonCode,
    evidenceMismatches,
    evidenceMatcherMismatches
  } as WorkflowReplayResultV0_3;
}
