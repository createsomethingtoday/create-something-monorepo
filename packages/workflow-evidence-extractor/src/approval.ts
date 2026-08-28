import {
  compileWorkflowDefinition,
  type WorkflowDefinition,
} from '@createsomething/workflow-compiler';

import { calculateWorkflowProposalHash } from './extract.js';

import type {
  WorkflowDefinitionProposal,
  WorkflowProposalApplicationResult,
  WorkflowProposalApprovalDiagnostic,
  WorkflowProposalApprovalManifest,
} from './types.js';

export class WorkflowProposalApprovalError extends Error {
  readonly diagnostics: WorkflowProposalApprovalDiagnostic[];

  constructor(diagnostics: WorkflowProposalApprovalDiagnostic[]) {
    super(`Workflow proposal approval failed with ${diagnostics.length} diagnostic(s)`);
    this.name = 'WorkflowProposalApprovalError';
    this.diagnostics = diagnostics;
  }
}

export function applyApprovedWorkflowProposal(
  baseline: WorkflowDefinition,
  proposal: WorkflowDefinitionProposal,
  approval: WorkflowProposalApprovalManifest,
): WorkflowProposalApplicationResult {
  const diagnostics: WorkflowProposalApprovalDiagnostic[] = [];
  const compiledBaseline = compileWorkflowDefinition(baseline);
  if (
    compiledBaseline.definitionHash !== proposal.baselineHash ||
    approval.baselineHash !== proposal.baselineHash
  ) {
    diagnostics.push({
      code: 'BASELINE_HASH_MISMATCH',
      message: 'The approval and proposal must target the exact compiler-validated baseline.',
      ids: [compiledBaseline.definitionHash, proposal.baselineHash, approval.baselineHash],
    });
  }

  const { proposalHash: declaredProposalHash, ...proposalBody } = proposal;
  const calculatedProposalHash = calculateWorkflowProposalHash(proposalBody);
  if (
    calculatedProposalHash !== declaredProposalHash ||
    approval.proposalHash !== declaredProposalHash
  ) {
    diagnostics.push({
      code: 'PROPOSAL_HASH_MISMATCH',
      message: 'The approval and proposal content hashes do not match.',
      ids: [calculatedProposalHash, declaredProposalHash, approval.proposalHash],
    });
  }

  const operationIds = proposal.operations.map((operation) => operation.id);
  const operationIdSet = new Set(operationIds);
  const approved = [...new Set(approval.approvedOperationIds)].sort();
  const rejected = [...new Set(approval.rejectedOperationIds)].sort();
  const decided = new Set([...approved, ...rejected]);
  const unreviewed = operationIds.filter((id) => !decided.has(id)).sort();
  if (unreviewed.length > 0) {
    diagnostics.push({
      code: 'UNREVIEWED_OPERATIONS',
      message: 'Every proposed operation must be explicitly approved or rejected.',
      ids: unreviewed,
    });
  }
  const unknown = [...decided].filter((id) => !operationIdSet.has(id)).sort();
  if (unknown.length > 0) {
    diagnostics.push({
      code: 'UNKNOWN_OPERATION_DECISION',
      message: 'The approval manifest references operation IDs outside the proposal.',
      ids: unknown,
    });
  }
  const duplicate = approved.filter((id) => rejected.includes(id));
  if (duplicate.length > 0) {
    diagnostics.push({
      code: 'DUPLICATE_OPERATION_DECISION',
      message: 'An operation cannot be both approved and rejected.',
      ids: duplicate,
    });
  }

  const acknowledged = [...new Set(approval.acknowledgedConflictIds)].sort();
  const unacknowledged = proposal.conflicts
    .map((conflict) => conflict.id)
    .filter((id) => !acknowledged.includes(id))
    .sort();
  if (unacknowledged.length > 0) {
    diagnostics.push({
      code: 'UNACKNOWLEDGED_CONFLICTS',
      message: 'Every unresolved conflict must be acknowledged before applying unrelated additions.',
      ids: unacknowledged,
    });
  }

  if (diagnostics.length > 0) throw new WorkflowProposalApprovalError(diagnostics);

  const definition = structuredClone(baseline);
  const operations = new Map(proposal.operations.map((operation) => [operation.id, operation]));
  for (const operationId of approved) {
    const operation = operations.get(operationId)!;
    if (operation.path === '/systems/-') {
      definition.systems.push(structuredClone(operation.proposedValue) as WorkflowDefinition['systems'][number]);
    } else {
      definition.evaluations.push(
        structuredClone(operation.proposedValue) as WorkflowDefinition['evaluations'][number],
      );
    }
  }
  definition.systems.sort((left, right) => left.id.localeCompare(right.id));
  definition.evaluations.sort((left, right) => left.id.localeCompare(right.id));
  const compiled = compileWorkflowDefinition(definition);

  return {
    schemaVersion: 'workflow_proposal_application.v0.1',
    definition,
    appliedOperationIds: approved,
    rejectedOperationIds: rejected,
    acknowledgedConflictIds: acknowledged,
    compilerProof: {
      definitionHash: compiled.definitionHash,
      compilerVersion: compiled.compilerVersion,
    },
  };
}
