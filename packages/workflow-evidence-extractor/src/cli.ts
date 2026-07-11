#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  applyApprovedWorkflowProposal,
  WorkflowProposalApprovalError,
} from './approval.js';
import {
  writeWorkflowApplicationArtifacts,
  writeWorkflowProposalArtifacts,
} from './artifacts.js';
import { extractWorkflowDefinitionProposal } from './extract.js';
import { loadWorkflowEvidenceSource } from './source.js';
import type {
  WorkflowDefinitionProposal,
  WorkflowExtractionPolicy,
  WorkflowProposalApprovalManifest,
} from './types.js';
import type { WorkflowDefinition } from '@create-something/workflow-compiler';

function usage(): string {
  return [
    'Usage:',
    '  workflow-evidence-extractor propose --baseline <json> --agent-contract <yaml> --mcp-contract <yaml> --rule-catalog <json> --policy <json> --out <dir>',
    '  workflow-evidence-extractor apply --baseline <json> --proposal <json> --approval <json> --out <dir>',
  ].join('\n');
}

function flag(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error(usage());
  return resolve(value);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function propose(args: string[]) {
  const baseline = await readJson<WorkflowDefinition>(flag(args, '--baseline'));
  const policy = await readJson<WorkflowExtractionPolicy>(flag(args, '--policy'));
  const sources = await Promise.all([
    loadWorkflowEvidenceSource({
      id: 'marketplace-agent-contract',
      kind: 'agent_contract',
      path: flag(args, '--agent-contract'),
    }),
    loadWorkflowEvidenceSource({
      id: 'marketplace-mcp-contract',
      kind: 'mcp_contract',
      path: flag(args, '--mcp-contract'),
    }),
    loadWorkflowEvidenceSource({
      id: 'marketplace-rule-catalog',
      kind: 'rule_catalog',
      path: flag(args, '--rule-catalog'),
    }),
  ]);
  const proposal = extractWorkflowDefinitionProposal({ baseline, sources, policy });
  const outDir = flag(args, '--out');
  const manifest = await writeWorkflowProposalArtifacts(proposal, outDir);
  return { ok: true, command: 'propose', outDir, proposalHash: proposal.proposalHash, manifest };
}

async function apply(args: string[]) {
  const baseline = await readJson<WorkflowDefinition>(flag(args, '--baseline'));
  const proposal = await readJson<WorkflowDefinitionProposal>(flag(args, '--proposal'));
  const approval = await readJson<WorkflowProposalApprovalManifest>(flag(args, '--approval'));
  const result = applyApprovedWorkflowProposal(baseline, proposal, approval);
  const outDir = flag(args, '--out');
  const manifest = await writeWorkflowApplicationArtifacts(result, outDir);
  return { ok: true, command: 'apply', outDir, compilerProof: result.compilerProof, manifest };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const result = args[0] === 'propose' ? await propose(args) : args[0] === 'apply' ? await apply(args) : (() => { throw new Error(usage()); })();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  if (error instanceof WorkflowProposalApprovalError) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: error.name, diagnostics: error.diagnostics }, null, 2)}\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
