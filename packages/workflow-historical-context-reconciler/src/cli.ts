#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { WorkflowDefinition } from '@create-something/workflow-compiler';

import { writeWorkflowHistoricalContextArtifacts } from './artifacts.js';
import { loadSanitizedHistoricalContextBundle } from './load.js';
import { reconcileWorkflowHistoricalContext } from './reconcile.js';
import type { WorkflowHistoricalContextPolicy } from './types.js';

function usage(): string {
  return 'Usage: workflow-historical-context-reconciler reconcile --baseline <json> --context-dir <dir> --policy <json> --out <dir>';
}

function flag(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error(usage());
  return resolve(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] !== 'reconcile') throw new Error(usage());
  const baseline = JSON.parse(await readFile(flag(args, '--baseline'), 'utf8')) as WorkflowDefinition;
  const policy = JSON.parse(
    await readFile(flag(args, '--policy'), 'utf8'),
  ) as WorkflowHistoricalContextPolicy;
  const bundle = await loadSanitizedHistoricalContextBundle(flag(args, '--context-dir'));
  const reconciliation = reconcileWorkflowHistoricalContext({ baseline, bundle, policy });
  const outDir = flag(args, '--out');
  await writeWorkflowHistoricalContextArtifacts(reconciliation, outDir);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      outDir,
      coverage: reconciliation.coverage,
      operationCount: reconciliation.proposal.operations.length,
      conflictCount: reconciliation.proposal.conflicts.length,
      proposalHash: reconciliation.proposal.proposalHash,
    }, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
