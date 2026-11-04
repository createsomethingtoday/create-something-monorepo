#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PROOF_PATH = 'packages/landing-page-filter/public/a3-autonomy-proof.json';
const DEFAULT_RECEIPT_DIR = '.cache/operator-agent-a3';

const REQUIRED_PROOF = {
  schemaVersion: 1,
  issue: 'CRE-1060',
  autonomyLevel: 'A3',
  preparedAt: '2026-07-06',
  surface: {
    package: '@create-something/landing-page-filter',
    project: 'landing-page-filter',
    kind: 'cloudflare-pages-static',
    path: '/a3-autonomy-proof.json',
    productionUrl: 'https://landing-page-filter.pages.dev/a3-autonomy-proof.json',
  },
  risk: 'low',
  boundedChange:
    'Publish a static proof receipt only; do not change category-filter runtime code, API behavior, secrets, billing, data, or client production.',
  policy: {
    target: 'create-something-internal-production',
    allowed: [
      'bounded static proof artifact',
      'Cloudflare Pages deployment for the named CREATE SOMETHING-owned project',
      'post-deploy smoke of the proof JSON',
    ],
    forbidden: [
      'client production mutation',
      'secrets or credential changes',
      'billing or account-access changes',
      'destructive writes',
      'irreversible data changes',
    ],
  },
  validation: {
    commands: [
      'node scripts/operator-agent-a3-ownership-proof.mjs check --json',
      'node --test scripts/test/operator-agent-a3-ownership-proof.test.mjs',
      'pnpm --dir packages/landing-page-filter typecheck',
    ],
  },
  deployment: {
    command: 'pnpm --dir packages/landing-page-filter deploy',
    smokeCommand:
      'node scripts/operator-agent-a3-ownership-proof.mjs smoke --url https://landing-page-filter.pages.dev/a3-autonomy-proof.json --json',
    preReceipt: 'Cloudflare Pages deployment list for landing-page-filter',
    postReceipt: 'Cloudflare Pages deployment URL plus smoke receipt',
  },
  rollback: {
    command:
      'git worktree add /tmp/landing-page-filter-rollback-17a98c58 17a98c58a07b7fa37eb07ef4815fe81cf1ca6367 && cd /tmp/landing-page-filter-rollback-17a98c58/packages/landing-page-filter && CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a node ../../scripts/run-wrangler.mjs pages deploy public --project-name=landing-page-filter --branch=main',
    evidence:
      'deployment list shows source 17a98c58 back on Production and the A3 proof smoke no longer validates as the active production proof',
    stopIf: [
      'previous production source commit is unknown',
      'rollback command fails',
      'post-rollback smoke cannot be checked',
    ],
  },
  a4PromotionGate: {
    name: 'operator-authorized autonomous execution',
    requires: [
      'signed or Linear-recorded operator approval packet',
      'exact target and action scope',
      'precomputed validation and rollback plan',
      'credential, billing, data, and client-production risk classification',
      'post-action verification receipt',
      'automatic stop on authority or verification mismatch',
    ],
    notAllowedWithoutPacket: [
      'credential writes',
      'billing changes',
      'client production mutation',
      'destructive or irreversible data operations',
    ],
  },
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: args[0] || 'check',
    file: DEFAULT_PROOF_PATH,
    receiptDir: DEFAULT_RECEIPT_DIR,
    json: false,
    writeReceipt: true,
    url: null,
  };

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--file' && args[index + 1]) options.file = args[++index];
    else if (arg === '--receipt-dir' && args[index + 1]) options.receiptDir = args[++index];
    else if (arg === '--url' && args[index + 1]) options.url = args[++index];
    else if (arg === '--json') options.json = true;
    else if (arg === '--no-receipt') options.writeReceipt = false;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function resolveFromRoot(path) {
  return resolve(ROOT, path);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function rel(path) {
  return relative(ROOT, path) || '.';
}

function collectMismatches(actual, expected, prefix = '') {
  const errors = [];

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return [`${prefix || 'value'} must be an array`];
    }
    if (actual.length !== expected.length) {
      errors.push(`${prefix || 'value'} expected ${expected.length} entries, got ${actual.length}`);
    }
    expected.forEach((entry, index) => {
      errors.push(...collectMismatches(actual[index], entry, `${prefix}[${index}]`));
    });
    return errors;
  }

  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
      return [`${prefix || 'value'} must be an object`];
    }
    for (const [key, expectedValue] of Object.entries(expected)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      errors.push(...collectMismatches(actual[key], expectedValue, nextPrefix));
    }
    return errors;
  }

  if (actual !== expected) {
    errors.push(`${prefix || 'value'} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  return errors;
}

function normalizeProof(proof) {
  return {
    ...clone(REQUIRED_PROOF),
    ...proof,
    surface: { ...REQUIRED_PROOF.surface, ...(proof?.surface || {}) },
    policy: { ...REQUIRED_PROOF.policy, ...(proof?.policy || {}) },
    validation: { ...REQUIRED_PROOF.validation, ...(proof?.validation || {}) },
    deployment: { ...REQUIRED_PROOF.deployment, ...(proof?.deployment || {}) },
    rollback: { ...REQUIRED_PROOF.rollback, ...(proof?.rollback || {}) },
    a4PromotionGate: { ...REQUIRED_PROOF.a4PromotionGate, ...(proof?.a4PromotionGate || {}) },
  };
}

function validateProof(proof) {
  const errors = collectMismatches(proof, REQUIRED_PROOF);

  if (proof?.autonomyLevel === 'A4') {
    errors.push('A4 is not allowed for this proof; A4 requires an operator approval packet.');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function writeReceipt(receiptDir, receipt) {
  const absoluteDir = resolveFromRoot(receiptDir);
  mkdirSync(absoluteDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = resolve(absoluteDir, `${stamp}-${receipt.mode}.json`);
  writeFileSync(path, stableJson(receipt));
  return rel(path);
}

function buildReceipt(mode, options, result) {
  return {
    mode,
    issue: REQUIRED_PROOF.issue,
    autonomyLevel: REQUIRED_PROOF.autonomyLevel,
    target: REQUIRED_PROOF.policy.target,
    surface: REQUIRED_PROOF.surface,
    risk: REQUIRED_PROOF.risk,
    file: options.file,
    ok: result.ok,
    errors: result.errors || [],
    writesPerformed: result.writesPerformed || 0,
    rollback: REQUIRED_PROOF.rollback,
    a4PromotionGate: REQUIRED_PROOF.a4PromotionGate,
    checkedAt: new Date().toISOString(),
  };
}

function print(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.ok ? 'ok' : 'failed');
  if (result.errors?.length) {
    for (const error of result.errors) console.log(`- ${error}`);
  }
  if (result.receiptPath) console.log(`receipt: ${result.receiptPath}`);
}

async function commandCheck(options) {
  const absolutePath = resolveFromRoot(options.file);
  const proof = readJson(absolutePath);
  const validation = validateProof(proof);
  const receipt = buildReceipt('check', options, validation);
  const result = { ...validation, proofPath: rel(absolutePath) };
  if (options.writeReceipt) result.receiptPath = writeReceipt(options.receiptDir, receipt);
  return result;
}

async function commandHeal(options) {
  const absolutePath = resolveFromRoot(options.file);
  const before = existsSync(absolutePath) ? readJson(absolutePath) : {};
  const healed = normalizeProof(before);
  const beforeText = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
  const afterText = stableJson(healed);
  const writesPerformed = beforeText === afterText ? 0 : 1;
  if (writesPerformed) writeFileSync(absolutePath, afterText);
  const validation = validateProof(healed);
  const receipt = buildReceipt('heal', options, { ...validation, writesPerformed });
  const result = { ...validation, proofPath: rel(absolutePath), writesPerformed };
  if (options.writeReceipt) result.receiptPath = writeReceipt(options.receiptDir, receipt);
  return result;
}

async function commandSmoke(options) {
  if (!options.url) throw new Error('--url is required for smoke');
  const response = await fetch(options.url, {
    headers: { accept: 'application/json' },
  });
  const proof = await response.json().catch(() => null);
  const validation = proof
    ? validateProof(proof)
    : { ok: false, errors: ['smoke target did not return valid JSON'] };
  const result = {
    ...validation,
    url: options.url,
    status: response.status,
    contentType: response.headers.get('content-type'),
  };
  if (!response.ok) {
    result.ok = false;
    result.errors = [...(result.errors || []), `smoke target returned HTTP ${response.status}`];
  }
  const receipt = buildReceipt('smoke', options, result);
  if (options.writeReceipt) result.receiptPath = writeReceipt(options.receiptDir, receipt);
  return result;
}

function commandPrint() {
  return { ok: true, proof: clone(REQUIRED_PROOF) };
}

function usage() {
  console.log(`Usage:
  node scripts/operator-agent-a3-ownership-proof.mjs check [--file <path>] [--json]
  node scripts/operator-agent-a3-ownership-proof.mjs heal [--file <path>] [--json]
  node scripts/operator-agent-a3-ownership-proof.mjs smoke --url <url> [--json]
  node scripts/operator-agent-a3-ownership-proof.mjs print --json
`);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  let result;
  if (options.command === 'check') result = await commandCheck(options);
  else if (options.command === 'heal') result = await commandHeal(options);
  else if (options.command === 'smoke') result = await commandSmoke(options);
  else if (options.command === 'print') result = commandPrint();
  else throw new Error(`Unknown command: ${options.command}`);

  print(result, options);
  if (!result.ok) process.exitCode = 1;
}

export {
  DEFAULT_PROOF_PATH,
  REQUIRED_PROOF,
  collectMismatches,
  normalizeProof,
  parseArgs,
  validateProof,
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
