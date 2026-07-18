#!/usr/bin/env node
import { resolve } from 'node:path';

import { inspectBuildReleasePackage } from '../packages/delivery-schema/src/build-release.js';

function help(): string {
  return `Usage: pnpm build:release:check -- <path/to/build-release.json> [--json]

Validates a Build release manifest, its exact accepted Map handoff receipt, the
five canonical artifact hashes, staging/UAT evidence, rollback data, owners,
and its terminal acceptance receipt. The command is read-only: READY does not
deploy or replace promotion approval.`;
}

function main(argv: string[]): number {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(help());
    return 0;
  }

  const json = argv.includes('--json');
  const manifestArgument = argv.find((argument) => !argument.startsWith('-'));
  if (!manifestArgument) {
    console.error(help());
    return 2;
  }

  const manifestPath = resolve(process.cwd(), manifestArgument);
  const result = inspectBuildReleasePackage(manifestPath);
  if (json) {
    console.log(JSON.stringify({ manifestPath, ...result }, null, 2));
    return result.releaseReady ? 0 : 1;
  }

  console.log(`Build release: ${result.manifest?.releaseId ?? 'unreadable'}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Evidence package: ${result.evidenceValid ? 'VALID' : 'INVALID'}`);
  console.log(`Release readiness: ${result.releaseReady ? 'READY' : 'NOT READY'}`);
  if (result.manifest) {
    console.log(
      `Map handoff: ${result.manifest.handoff.handoffId} (${result.handoffReceipt?.status ?? 'unverified'})`
    );
    console.log(
      `Staging verification: ${result.verificationReceipts.staging?.status ?? 'unverified'}`
    );
    console.log(`UAT verification: ${result.verificationReceipts.uat?.status ?? 'unverified'}`);
    console.log(`Terminal decision: ${result.acceptanceReceipt?.status ?? 'unverified'}`);
  }
  if (result.issues.length > 0) {
    console.log('Issues:');
    for (const issue of result.issues) {
      console.log(`- [${issue.category}/${issue.code}] ${issue.path}: ${issue.message}`);
    }
  }
  console.log(
    'READY records package evidence only; it does not deploy or replace promotion approval.'
  );

  return result.releaseReady ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
