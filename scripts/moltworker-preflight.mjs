#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OPERATING_MODEL_PATH = join(ROOT, 'config/retool/operating-model.json');
const RELAY_DIR = join(ROOT, 'packages/relay');
const RELAY_PACKAGE_PATH = join(RELAY_DIR, 'package.json');
const RELAY_WRANGLER_PATH = join(RELAY_DIR, 'wrangler.jsonc');
const RELAY_README_PATH = join(RELAY_DIR, 'README.md');
const RELAY_AGENTS_PATH = join(RELAY_DIR, 'AGENTS.md');

const args = new Set(process.argv.slice(2));
const checkAuth = args.has('--check-auth') || process.env.MOLTWORKER_PREFLIGHT_CHECK_AUTH === '1';
const strict = args.has('--strict') || process.env.MOLTWORKER_PREFLIGHT_STRICT === '1';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function pass(label) {
  console.log(`ok: ${label}`);
}

function warn(label) {
  console.warn(`warning: ${label}`);
}

function fail(label) {
  console.error(`fail: ${label}`);
}

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

function commandExists(command) {
  return run('command', ['-v', command], { shell: true }).ok;
}

function textIncludesAll(text, patterns) {
  return patterns.filter((pattern) => !text.includes(pattern));
}

const errors = [];
const warnings = [];

function requireFile(path, label) {
  if (existsSync(path)) {
    pass(`${label} exists (${relative(ROOT, path)})`);
    return true;
  }
  errors.push(`${label} missing (${relative(ROOT, path)})`);
  fail(`${label} missing (${relative(ROOT, path)})`);
  return false;
}

if (!requireFile(OPERATING_MODEL_PATH, 'Retool operating model')) {
  process.exit(1);
}

const operatingModel = readJson(OPERATING_MODEL_PATH);
const companion = operatingModel.operatorCompanionRole;
if (companion?.preferredRuntime === 'moltworker_relay') {
  pass('operator companion preferred runtime is moltworker_relay');
} else {
  errors.push('operator companion preferred runtime must be moltworker_relay');
  fail('operator companion preferred runtime must be moltworker_relay');
}

if (companion?.activeCandidate?.runbook === 'docs/guides/MOLTWORKER_OPERATOR_COMPANION.md') {
  pass('Moltworker runbook is registered in operating model');
} else {
  errors.push('Moltworker runbook must be registered in operating model');
  fail('Moltworker runbook must be registered in operating model');
}

if (companion?.composioIntegration?.status === 'allowed') {
  pass('Composio remains allowed as hidden integration plumbing');
} else {
  errors.push('Composio integration status must remain allowed');
  fail('Composio integration status must remain allowed');
}

const relayFilesPresent = [
  requireFile(RELAY_PACKAGE_PATH, 'RELAY package'),
  requireFile(RELAY_WRANGLER_PATH, 'RELAY Wrangler config'),
  requireFile(RELAY_README_PATH, 'RELAY README'),
  requireFile(RELAY_AGENTS_PATH, 'RELAY agent instructions'),
].every(Boolean);

if (relayFilesPresent) {
  const relayPackage = readJson(RELAY_PACKAGE_PATH);
  const requiredScripts = ['build', 'deploy', 'start', 'test', 'typecheck'];
  const missingScripts = requiredScripts.filter((script) => !relayPackage.scripts?.[script]);
  if (missingScripts.length === 0) {
    pass('RELAY package exposes build/deploy/start/test/typecheck scripts');
  } else {
    errors.push(`RELAY package missing scripts: ${missingScripts.join(', ')}`);
    fail(`RELAY package missing scripts: ${missingScripts.join(', ')}`);
  }

  const wrangler = readFileSync(RELAY_WRANGLER_PATH, 'utf8');
  const missingWranglerSignals = textIncludesAll(wrangler, [
    '"name": "relay"',
    '"nodejs_compat"',
    '"containers"',
    '"class_name": "Sandbox"',
    '"r2_buckets"',
    '"bucket_name": "moltbot-data"',
    '"crons"',
    '"browser"',
    '"binding": "BROWSER"',
    'CF_ACCESS_TEAM_DOMAIN',
    'CF_ACCESS_AUD',
    'MOLTBOT_GATEWAY_TOKEN',
  ]);
  if (missingWranglerSignals.length === 0) {
    pass('RELAY Wrangler config has expected Worker, Sandbox, R2, cron, browser, and auth signals');
  } else {
    errors.push(`RELAY Wrangler config missing expected signals: ${missingWranglerSignals.join(', ')}`);
    fail(`RELAY Wrangler config missing expected signals: ${missingWranglerSignals.join(', ')}`);
  }
}

for (const command of ['git', 'npm', 'pnpm']) {
  if (commandExists(command)) {
    pass(`${command} available`);
  } else {
    const message = `${command} is not available`;
    warnings.push(message);
    warn(message);
  }
}

const localWrangler = join(RELAY_DIR, 'node_modules/.bin/wrangler');
if (existsSync(localWrangler)) {
  const version = run(localWrangler, ['--version']);
  if (version.ok) {
    pass(`RELAY local wrangler available (${version.stdout.split('\n')[0]})`);
  } else {
    warnings.push('RELAY local wrangler exists but did not run cleanly');
    warn('RELAY local wrangler exists but did not run cleanly');
  }
} else if (commandExists('wrangler')) {
  const version = run('wrangler', ['--version']);
  if (version.ok) {
    pass(`system wrangler available (${version.stdout.split('\n')[0]})`);
  } else {
    warnings.push('system wrangler exists but did not run cleanly');
    warn('system wrangler exists but did not run cleanly');
  }
} else {
  const message = 'wrangler is not available; run pnpm bootstrap:worktree or install package dependencies before deploy checks';
  warnings.push(message);
  warn(message);
}

if (checkAuth) {
  const wranglerCommand = existsSync(localWrangler) ? localWrangler : commandExists('wrangler') ? 'wrangler' : null;
  if (!wranglerCommand) {
    errors.push('cannot check Cloudflare auth because wrangler is unavailable');
    fail('cannot check Cloudflare auth because wrangler is unavailable');
  } else {
    const whoami = run(wranglerCommand, ['whoami']);
    if (whoami.ok) {
      pass('Cloudflare auth visible through wrangler');
      console.log(whoami.stdout);
    } else {
      errors.push('Cloudflare auth check failed through wrangler');
      fail('Cloudflare auth check failed through wrangler');
      if (whoami.stderr) console.error(whoami.stderr);
    }
  }
} else {
  warn('Cloudflare auth not checked; rerun with --check-auth when ready');
}

console.log('');
console.log('Manual gates before deploy:');
console.log('- Rotate MOLTBOT_GATEWAY_TOKEN before reusing the historical relay deployment.');
console.log('- Confirm Workers Paid plan and Sandbox/Containers availability.');
console.log('- Confirm Cloudflare Access protects admin/operator routes.');
console.log('- Confirm R2 persistence and AI Gateway logging/cost visibility.');
console.log('- Confirm Composio connected-account revocation is visible through Retool.');
console.log('- Confirm Retool approval is required before external send, production mutation, permission change, or deploy.');

if (errors.length > 0 || (strict && warnings.length > 0)) {
  console.error('');
  console.error('Moltworker preflight failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  if (strict && warnings.length > 0) {
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log('');
console.log('Moltworker preflight passed.');
