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
const registryCoverageChecked = run('check MCP and agent registry coverage', [
  'mcp:registry:coverage',
]);
let registryChecked = run('check generated registry artifacts', ['mcp:registry:check']);

if (!registryChecked && fixRegistry) {
  const registryGenerated = run('regenerate registry artifacts', ['mcp:registry:generate']);
  registryChecked =
    registryGenerated && run('recheck generated registry artifacts', ['mcp:registry:check']);
}

const agentConnectionScripts = [
  'agent:halfdozen:dedup:connect',
  'agent:halfdozen:inbox-triage:connect',
  'agent:halfdozen:fleet-watchdog:connect',
];

let allAgentsConnected = true;
for (const script of agentConnectionScripts) {
  allAgentsConnected = run(`probe ${script.replace('agent:halfdozen:', '')} MCP connections`, [
    script,
  ]) && allAgentsConnected;
}

console.log('\n[mcp-fleet-self-heal] summary');
console.log(JSON.stringify(summary, null, 2));

if (!registryValidated || !registryCoverageChecked || !registryChecked || !allAgentsConnected) {
  process.exitCode = 1;
}
