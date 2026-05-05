#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const fixRegistry = process.argv.includes('--fix-registry');
const summary = [];

function run(label, args) {
  console.log(`\n[mcp-fleet-self-heal] ${label}`);
  console.log(`$ pnpm ${args.join(' ')}`);

  const result = spawnSync('pnpm', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });

  const status = result.status ?? 1;
  summary.push({ label, command: ['pnpm', ...args].join(' '), status });
  return status === 0;
}

const registryValidated = run('validate registry source', ['mcp:registry:validate']);
let registryChecked = run('check generated registry artifacts', ['mcp:registry:check']);

if (!registryChecked && fixRegistry) {
  const registryGenerated = run('regenerate registry artifacts', ['mcp:registry:generate']);
  registryChecked =
    registryGenerated && run('recheck generated registry artifacts', ['mcp:registry:check']);
}

const watchdogConnected = run('probe fleet watchdog MCP connections', [
  'agent:halfdozen:fleet-watchdog:connect',
]);

console.log('\n[mcp-fleet-self-heal] summary');
console.log(JSON.stringify(summary, null, 2));

if (!registryValidated || !registryChecked || !watchdogConnected) {
  process.exitCode = 1;
}
