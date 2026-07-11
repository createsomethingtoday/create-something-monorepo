import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  WorkflowDefinitionProposal,
  WorkflowProposalApplicationResult,
} from './types.js';

export interface WorkflowEvidenceArtifactManifest {
  schemaVersion: 'workflow_evidence_artifact_manifest.v0.1';
  artifactType: 'proposal' | 'application';
  workflowId: string;
  files: Array<{ path: string; hash: string }>;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

async function writeArtifacts(
  outDir: string,
  artifactType: 'proposal' | 'application',
  workflowId: string,
  artifacts: Array<{ path: string; value: unknown }>,
): Promise<WorkflowEvidenceArtifactManifest> {
  await mkdir(outDir, { recursive: true });
  const files = [];
  for (const artifact of artifacts.sort((left, right) => left.path.localeCompare(right.path))) {
    const content = json(artifact.value);
    await writeFile(join(outDir, artifact.path), content, 'utf8');
    files.push({ path: artifact.path, hash: contentHash(content) });
  }
  const manifest: WorkflowEvidenceArtifactManifest = {
    schemaVersion: 'workflow_evidence_artifact_manifest.v0.1',
    artifactType,
    workflowId,
    files,
  };
  await writeFile(join(outDir, 'manifest.json'), json(manifest), 'utf8');
  return manifest;
}

export function createApprovalTemplate(proposal: WorkflowDefinitionProposal) {
  return {
    schemaVersion: 'workflow_proposal_approval_template.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    requiredOperationIds: proposal.operations.map((operation) => operation.id),
    requiredConflictIds: proposal.conflicts.map((conflict) => conflict.id),
    instructions:
      'Copy the embedded approvalManifest, classify every operation, acknowledge every conflict, and provide the operator and approval timestamp.',
    approvalManifest: {
      schemaVersion: 'workflow_proposal_approval.v0.1',
      baselineHash: proposal.baselineHash,
      proposalHash: proposal.proposalHash,
      approvedOperationIds: [],
      rejectedOperationIds: [],
      acknowledgedConflictIds: [],
      operator: '',
      approvedAt: '',
    },
  };
}

export async function writeWorkflowProposalArtifacts(
  proposal: WorkflowDefinitionProposal,
  outDir: string,
): Promise<WorkflowEvidenceArtifactManifest> {
  return writeArtifacts(outDir, 'proposal', proposal.workflowId, [
    { path: 'approval-template.json', value: createApprovalTemplate(proposal) },
    { path: 'conflicts.json', value: proposal.conflicts },
    { path: 'evidence-inventory.json', value: proposal.evidence },
    { path: 'proposal.json', value: proposal },
  ]);
}

export async function writeWorkflowApplicationArtifacts(
  result: WorkflowProposalApplicationResult,
  outDir: string,
): Promise<WorkflowEvidenceArtifactManifest> {
  return writeArtifacts(outDir, 'application', result.definition.workflowId, [
    { path: 'application.json', value: result },
    { path: 'approved-definition.json', value: result.definition },
    { path: 'compiler-proof.json', value: result.compilerProof },
  ]);
}
