#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const DEFAULT_SCOPE = process.env.VERCEL_SCOPE || 'createsomething';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  return {
    command: [command, ...args].join(' '),
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function printResult(label, result, options = {}) {
  const prefix = result.ok ? 'ok' : 'fail';
  console.log(`${prefix}: ${label}`);
  if (options.showOutput && result.stdout) {
    console.log(result.stdout);
  }
  if (!result.ok && result.stderr) {
    console.error(result.stderr);
  }
}

function assertCommand(command) {
  const result = run('command', ['-v', command], { shell: true });
  return result.ok;
}

const checks = [];

checks.push({
  label: 'vercel cli installed',
  ok: assertCommand('vercel'),
});

checks.push({
  label: 'github cli installed',
  ok: assertCommand('gh'),
});

const vercelVersion = run('vercel', ['--version']);
printResult('vercel version', vercelVersion, { showOutput: true });

const vercelWhoami = run('vercel', ['whoami']);
printResult('vercel auth', vercelWhoami, { showOutput: true });

const vercelTeams = run('vercel', ['teams', 'ls']);
printResult('vercel teams visible', vercelTeams, { showOutput: true });

const vercelProjects = run('vercel', ['projects', 'ls', '--scope', DEFAULT_SCOPE]);
printResult(`vercel projects visible for scope=${DEFAULT_SCOPE}`, vercelProjects, {
  showOutput: true,
});

const ghAuth = run('gh', ['auth', 'status']);
printResult('github auth', ghAuth, { showOutput: true });

const hardFailures = [
  ['vercel cli installed', checks[0].ok],
  ['github cli installed', checks[1].ok],
  ['vercel auth', vercelWhoami.ok],
  ['vercel team/project access', vercelProjects.ok],
  ['github auth', ghAuth.ok],
].filter(([, ok]) => !ok);

console.log('');
console.log('manual gates before deploy:');
console.log('- Confirm Vercel Spend Management is enabled for the target team.');
console.log('- Confirm the spend action pauses production deployments at the agreed cap.');
console.log('- Confirm Marketplace storage costs are acceptable; Spend Management does not cover Marketplace billing.');
console.log('- Confirm the Composio API key is available outside repo files.');
console.log('- Confirm TrustClaw will deploy to the dedicated Vercel project `trustclaw` or an approved equivalent.');

if (hardFailures.length > 0) {
  console.error('');
  console.error('preflight failed:');
  for (const [label] of hardFailures) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log('');
console.log('TrustClaw Vercel preflight passed.');
