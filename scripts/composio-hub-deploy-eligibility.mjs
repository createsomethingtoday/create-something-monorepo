#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const OWNED_PATHS = [
  'config/mcp-hub/registry.json',
  'packages/composio-toolkit-mcp/',
  'packages/cs-mcp-hub-remote/',
  'scripts/cs-hub-fleet-deploy.sh',
  'scripts/cs-hub-fleet-verify.sh'
];

function isOwnedPath(changedPath) {
  return OWNED_PATHS.some((ownedPath) =>
    ownedPath.endsWith('/') ? changedPath.startsWith(ownedPath) : changedPath === ownedPath
  );
}

export function evaluateComposioDeployEligibility({ eventName, changedPaths }) {
  if (eventName === 'workflow_dispatch') {
    return { eligible: true, reason: 'manual workflow dispatch' };
  }

  if (eventName !== 'push') {
    return { eligible: false, reason: `unsupported event: ${eventName}` };
  }

  const ownedChange = changedPaths.find(isOwnedPath);
  if (ownedChange) {
    return { eligible: true, reason: `Composio hub source changed: ${ownedChange}` };
  }

  return { eligible: false, reason: 'no Composio hub source change; build-only guard' };
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('Expected --event, --before, and --after arguments');
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function changedPathsBetween(before, after) {
  const shaPattern = /^[0-9a-f]{40}$/i;
  if (!shaPattern.test(before) || !shaPattern.test(after) || /^0+$/.test(before)) {
    throw new Error('Push comparison requires non-zero 40-character Git SHAs');
  }

  return execFileSync('git', ['diff', '--name-only', before, after, '--'], {
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
    emit(evaluateComposioDeployEligibility({ eventName, changedPaths: [] }));
    return;
  }

  try {
    const changedPaths = changedPathsBetween(args.get('before') ?? '', args.get('after') ?? '');
    emit(evaluateComposioDeployEligibility({ eventName, changedPaths }));
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
