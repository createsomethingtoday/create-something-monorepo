#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { WorkflowDefinition } from '@create-something/workflow-compiler';

import { writeWorkflowObservationReconciliationArtifacts } from './artifacts.js';
import { reconcileWorkflowObservationReport } from './reconcile.js';
import type { WorkflowObservationReconciliationPolicy } from './types.js';

function usage(): string {
  return 'Usage: workflow-observation-reconciler reconcile --baseline <json> --report <markdown> --policy <json> --out <dir>';
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] !== 'reconcile') throw new Error(usage());
  const baseline = await readJson<WorkflowDefinition>(flag(args, '--baseline'));
  const reportPath = flag(args, '--report');
  const policy = await readJson<WorkflowObservationReconciliationPolicy>(flag(args, '--policy'));
  const reconciliation = reconcileWorkflowObservationReport({
    baseline,
    report: {
      id: 'balanced-50-calibration',
      path: reportPath,
      content: await readFile(reportPath, 'utf8'),
    },
    policy,
  });
  const outDir = flag(args, '--out');
  await writeWorkflowObservationReconciliationArtifacts(reconciliation, outDir);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      command: 'reconcile',
      outDir,
      observationCount: reconciliation.observations.length,
      discrepancyCount: reconciliation.discrepancies.length,
      proposalHash: reconciliation.proposal.proposalHash,
    }, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
