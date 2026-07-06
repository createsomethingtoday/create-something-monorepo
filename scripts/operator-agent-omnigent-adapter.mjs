#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST_PATH = 'config/operator-agent/omnigent-a4-adapter.json';
const DEFAULT_RECEIPT_DIR = '.cache/operator-agent-omnigent';

const HIGH_RISK_PATTERNS = [
  /wrangler\s+(pages\s+)?deploy/i,
  /wrangler\s+secret/i,
  /infisical\s+secrets?\s+set/i,
  /\bgit\s+push\b/i,
  /\bgh\s+pr\s+merge\b/i,
  /\blinear:done\b/i,
  /\bbilling\b/i,
  /\bdelete\b/i,
  /\bdestroy\b/i,
  /client production/i,
];

const REQUIRED_PACKET_FIELDS = [
  'authorityLevel',
  'approver',
  'approvalSurface',
  'target',
  'action',
  'riskClass',
  'forbiddenSideEffects',
  'validation',
  'rollback',
  'postActionSmoke',
  'stopConditions',
  'evidenceTarget',
];

const REQUIRED_A4_RISKS = [
  'credential-write',
  'billing-change',
  'client-production',
  'destructive-write',
  'irreversible-data-operation',
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: args[0] || 'check',
    manifest: DEFAULT_MANIFEST_PATH,
    packet: null,
    receiptDir: DEFAULT_RECEIPT_DIR,
    json: false,
    writeReceipt: true,
  };

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--manifest' && args[index + 1]) options.manifest = args[++index];
    else if (arg === '--packet' && args[index + 1]) options.packet = args[++index];
    else if (arg === '--receipt-dir' && args[index + 1]) options.receiptDir = args[++index];
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

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function rel(path) {
  return relative(ROOT, path) || '.';
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function includesAll(actual, expected) {
  const set = new Set(actual || []);
  return expected.filter((entry) => !set.has(entry));
}

function commandLooksHighRisk(command) {
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(command || ''));
}

function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (manifest.id !== 'create-something-omnigent-a4-adapter') {
    errors.push('id must be create-something-omnigent-a4-adapter');
  }
  if (!['candidate-read-only', 'candidate-local-only'].includes(manifest.status)) {
    errors.push('status must remain candidate-read-only or candidate-local-only');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('authority.a4Execution must be blocked');
  }
  if (manifest.authority?.authoritySource !== 'CREATE SOMETHING repo policy plus Linear approval packet') {
    errors.push('authority.authoritySource must keep repo policy plus Linear approval packet authoritative');
  }
  if (manifest.authority?.omnigentRole !== 'transport-policy-host') {
    errors.push('authority.omnigentRole must be transport-policy-host');
  }
  if (manifest.authority?.linearEvidenceRequired !== true) {
    errors.push('authority.linearEvidenceRequired must be true');
  }

  const missingApprovalTriggers = includesAll(manifest.authority?.approvalPacketRequiredFor, [
    'A4',
    'production-write',
    'credential-write',
    'billing-change',
    'client-production',
    'destructive-write',
    'irreversible-data-operation',
  ]);
  if (missingApprovalTriggers.length) {
    errors.push(`authority.approvalPacketRequiredFor missing: ${missingApprovalTriggers.join(', ')}`);
  }

  const commands = manifest.allowedCommands || [];
  if (!commands.length) errors.push('allowedCommands must not be empty');
  for (const command of commands) {
    if (!['A0', 'A1'].includes(command.autonomyLevel)) {
      errors.push(`allowed command ${command.id || command.command} must be A0 or A1`);
    }
    if (commandLooksHighRisk(command.command) && command.requiresApprovalPacket !== true) {
      errors.push(`high-risk command ${command.id || command.command} requires an approval packet`);
    }
    if (command.autonomyLevel === 'A1' && command.writes === true && !command.writeScope) {
      errors.push(`A1 write command ${command.id || command.command} must declare writeScope`);
    }
  }

  const forbiddenText = (manifest.forbiddenCommands || []).join('\n');
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (!pattern.test(forbiddenText)) {
      warnings.push(`forbiddenCommands may not explicitly cover ${pattern}`);
    }
  }

  const packet = manifest.a4ApprovalPacket || {};
  const missingPacketFields = includesAll(packet.requiredFields, REQUIRED_PACKET_FIELDS);
  if (missingPacketFields.length) {
    errors.push(`a4ApprovalPacket.requiredFields missing: ${missingPacketFields.join(', ')}`);
  }
  if (packet.authorityLevel !== 'A4') errors.push('a4ApprovalPacket.authorityLevel must be A4');
  if (!packet.allowedApprovalSurfaces?.includes('Linear')) {
    errors.push('a4ApprovalPacket.allowedApprovalSurfaces must include Linear');
  }
  const missingRisks = includesAll(packet.mustNameExactRisks, REQUIRED_A4_RISKS);
  if (missingRisks.length) {
    errors.push(`a4ApprovalPacket.mustNameExactRisks missing: ${missingRisks.join(', ')}`);
  }

  if (manifest.receiptMirrors?.linearIssue !== 'CRE-1061') {
    errors.push('receiptMirrors.linearIssue must be CRE-1061');
  }
  if (!manifest.receiptMirrors?.local) errors.push('receiptMirrors.local is required');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function validateApprovalPacket(packet, manifest) {
  const errors = [];
  const rules = manifest.a4ApprovalPacket || {};

  for (const field of rules.requiredFields || REQUIRED_PACKET_FIELDS) {
    if (!hasValue(packet[field])) errors.push(`approval packet missing ${field}`);
  }
  if (packet.authorityLevel !== 'A4') errors.push('approval packet authorityLevel must be A4');
  if (!rules.allowedApprovalSurfaces?.includes(packet.approvalSurface)) {
    errors.push(`approval packet approvalSurface is not allowed: ${packet.approvalSurface}`);
  }

  const namedRisks = new Set(packet.namedRisks || []);
  for (const risk of rules.mustNameExactRisks || REQUIRED_A4_RISKS) {
    if (!namedRisks.has(risk)) errors.push(`approval packet must name risk: ${risk}`);
  }

  for (const field of ['validation', 'rollback', 'postActionSmoke', 'stopConditions']) {
    if (!hasValue(packet[field])) errors.push(`approval packet ${field} must be non-empty`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function writeReceipt(options, receipt) {
  const absoluteDir = resolveFromRoot(options.receiptDir);
  mkdirSync(absoluteDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = resolve(absoluteDir, `${stamp}-${receipt.mode}.json`);
  writeFileSync(path, stableJson(receipt));
  return rel(path);
}

function buildReceipt(mode, options, result) {
  return {
    mode,
    issue: 'CRE-1061',
    manifest: options.manifest,
    ok: result.ok,
    errors: result.errors || [],
    warnings: result.warnings || [],
    checkedAt: new Date().toISOString(),
  };
}

function print(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.ok ? 'ok' : 'failed');
  for (const error of result.errors || []) console.log(`- ${error}`);
  for (const warning of result.warnings || []) console.log(`warning: ${warning}`);
  if (result.receiptPath) console.log(`receipt: ${result.receiptPath}`);
}

function commandCheck(options) {
  const manifestPath = resolveFromRoot(options.manifest);
  const manifest = readJson(manifestPath);
  const validation = validateManifest(manifest);
  const result = {
    ...validation,
    manifestPath: rel(manifestPath),
    allowedCommandCount: manifest.allowedCommands?.length || 0,
    a4Execution: manifest.authority?.a4Execution,
  };
  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, buildReceipt('check', options, result));
  }
  return result;
}

function commandApprovalCheck(options) {
  if (!options.packet) throw new Error('--packet is required for approval-check');
  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const packet = readJson(packetPath);
  const manifestValidation = validateManifest(manifest);
  const packetValidation = validateApprovalPacket(packet, manifest);
  const result = {
    ok: manifestValidation.ok && packetValidation.ok,
    errors: [...manifestValidation.errors, ...packetValidation.errors],
    warnings: manifestValidation.warnings,
    manifestPath: options.manifest,
    packetPath: rel(packetPath),
  };
  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, buildReceipt('approval-check', options, result));
  }
  return result;
}

function commandPrint(options) {
  return {
    ok: true,
    manifest: readJson(resolveFromRoot(options.manifest)),
  };
}

function usage() {
  console.log(`Usage:
  node scripts/operator-agent-omnigent-adapter.mjs check [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs approval-check --packet <path> [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs print [--manifest <path>] [--json]
`);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  let result;
  if (options.command === 'check') result = commandCheck(options);
  else if (options.command === 'approval-check') result = commandApprovalCheck(options);
  else if (options.command === 'print') result = commandPrint(options);
  else throw new Error(`Unknown command: ${options.command}`);

  print(result, options);
  if (!result.ok) process.exitCode = 1;
}

export {
  DEFAULT_MANIFEST_PATH,
  REQUIRED_A4_RISKS,
  REQUIRED_PACKET_FIELDS,
  commandLooksHighRisk,
  parseArgs,
  validateApprovalPacket,
  validateManifest,
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
