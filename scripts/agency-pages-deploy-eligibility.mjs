#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const RUNTIME_SOURCE_PREFIXES = ['packages/agency/', 'packages/canon/', 'packages/tufte/'];

export function comparisonForAgencyPush({ refName, before, after }) {
  if (refName === 'main') return [before, after];
  return [`origin/main...${after}`];
}

export function evaluateAgencyDeployEligibility({ eventName, changedPaths }) {
  if (eventName === 'workflow_dispatch') {
    return { eligible: true, reason: 'manual workflow dispatch' };
  }

  if (eventName !== 'push') {
    return { eligible: false, reason: `unsupported event: ${eventName}` };
  }

  const runtimeChange = changedPaths.find((changedPath) =>
    RUNTIME_SOURCE_PREFIXES.some((prefix) => changedPath.startsWith(prefix))
  );
  if (runtimeChange) {
    return { eligible: true, reason: `Agency runtime source changed: ${runtimeChange}` };
  }

  return { eligible: false, reason: 'no Agency runtime source change; build-only guard' };
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('Expected --event, --ref, --before, and --after arguments');
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function changedPathsForPush({ refName, before, after }) {
  const shaPattern = /^[0-9a-f]{40}$/i;
  if (
    !shaPattern.test(after) ||
    (refName === 'main' && (!shaPattern.test(before) || /^0+$/.test(before)))
  ) {
    throw new Error('Push comparison requires valid non-zero Git SHAs');
  }

  const comparison = comparisonForAgencyPush({ refName, before, after });
  return execFileSync('git', ['diff', '--name-only', ...comparison, '--'], {
    encoding: 'utf8'
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function emit(result) {
  const reason = String(result.reason).replace(/\s+/g, ' ').trim();
  process.stdout.write(`eligible=${result.eligible}\nreason=${reason}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const eventName = args.get('event') ?? '';

  if (eventName === 'workflow_dispatch') {
    emit(evaluateAgencyDeployEligibility({ eventName, changedPaths: [] }));
    return;
  }

  try {
    const changedPaths = changedPathsForPush({
      refName: args.get('ref') ?? '',
      before: args.get('before') ?? '',
      after: args.get('after') ?? ''
    });
    emit(evaluateAgencyDeployEligibility({ eventName, changedPaths }));
  } catch (error) {
    emit({
      eligible: false,
      reason: `unable to determine changed paths; build-only guard (${error.message})`
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
