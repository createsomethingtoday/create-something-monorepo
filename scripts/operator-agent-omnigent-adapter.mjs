#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST_PATH = 'config/operator-agent/omnigent-a4-adapter.json';
const DEFAULT_PROFILE_PATH = 'config/operator-agent/omnigent-readonly-scout.profile.json';
const DEFAULT_TRIAL_RECEIPT_PATH = 'config/operator-agent/fixtures/omnigent-readonly-scout.receipt.json';
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
  'issue',
  'approver',
  'approvalSurface',
  'approvedAt',
  'expiresAt',
  'target',
  'action',
  'riskClass',
  'namedRisks',
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

const REQUIRED_TRIAL_RECEIPT_FIELDS = [
  'signal',
  'context',
  'policy',
  'action',
  'validation',
  'rollback',
  'nextDecision',
  'evidenceTarget',
];

const REQUIRED_EXECUTION_COMMAND_FIELDS = [
  'authorityLevel',
  'issue',
  'target',
  'action',
  'commandId',
  'commandSurface',
  'requestedBy',
  'requestedAt',
  'expiresAt',
  'executionMode',
  'packet',
  'preflightReceipt',
  'executionReceipt',
  'authorization',
  'evidenceTarget',
];

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: args[0] || 'check',
    manifest: DEFAULT_MANIFEST_PATH,
    packet: null,
    preflightReceipt: null,
    executionReceipt: null,
    authorization: null,
    commandArtifact: null,
    profile: DEFAULT_PROFILE_PATH,
    trialReceipt: DEFAULT_TRIAL_RECEIPT_PATH,
    receiptDir: DEFAULT_RECEIPT_DIR,
    expectedIssue: null,
    expectedTarget: null,
    expectedAction: null,
    maxAgeHours: 24,
    now: null,
    json: false,
    writeReceipt: true,
  };

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--manifest' && args[index + 1]) options.manifest = args[++index];
    else if (arg === '--packet' && args[index + 1]) options.packet = args[++index];
    else if (arg === '--preflight-receipt' && args[index + 1]) options.preflightReceipt = args[++index];
    else if (arg === '--execution-receipt' && args[index + 1]) options.executionReceipt = args[++index];
    else if (arg === '--authorization' && args[index + 1]) options.authorization = args[++index];
    else if (arg === '--command-artifact' && args[index + 1]) options.commandArtifact = args[++index];
    else if (arg === '--profile' && args[index + 1]) options.profile = args[++index];
    else if (arg === '--trial-receipt' && args[index + 1]) options.trialReceipt = args[++index];
    else if (arg === '--receipt-dir' && args[index + 1]) options.receiptDir = args[++index];
    else if (arg === '--expected-issue' && args[index + 1]) options.expectedIssue = args[++index];
    else if (arg === '--expected-target' && args[index + 1]) options.expectedTarget = args[++index];
    else if (arg === '--expected-action' && args[index + 1]) options.expectedAction = args[++index];
    else if (arg === '--max-age-hours' && args[index + 1]) options.maxAgeHours = Number(args[++index]);
    else if (arg === '--now' && args[index + 1]) options.now = args[++index];
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

function parseTimestamp(value, label, errors) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) {
    errors.push(`approval packet ${label} must be a valid ISO timestamp`);
    return null;
  }
  return time;
}

function approvalConstraintsFromOptions(options) {
  if (!options.packet) throw new Error('--packet is required');
  if (!options.expectedIssue) throw new Error('--expected-issue is required');
  if (!options.expectedTarget) throw new Error('--expected-target is required');
  if (!options.expectedAction) throw new Error('--expected-action is required');
  return {
    expectedIssue: options.expectedIssue,
    expectedTarget: options.expectedTarget,
    expectedAction: options.expectedAction,
    maxAgeHours: options.maxAgeHours,
    now: options.now,
  };
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

  const executionCommand = manifest.a4ExecutionCommand || {};
  const missingCommandFields = includesAll(executionCommand.requiredFields, REQUIRED_EXECUTION_COMMAND_FIELDS);
  if (missingCommandFields.length) {
    errors.push(`a4ExecutionCommand.requiredFields missing: ${missingCommandFields.join(', ')}`);
  }
  if (!executionCommand.allowedCommandSurfaces?.includes('Linear')) {
    errors.push('a4ExecutionCommand.allowedCommandSurfaces must include Linear');
  }
  if (!executionCommand.allowedExecutionModes?.includes('operator-supervised')) {
    errors.push('a4ExecutionCommand.allowedExecutionModes must include operator-supervised');
  }
  if (executionCommand.runnerEnabled !== false) {
    errors.push('a4ExecutionCommand.runnerEnabled must remain false while authority.a4Execution is blocked');
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

function validateApprovalPacket(packet, manifest, constraints = {}) {
  const errors = [];
  const rules = manifest.a4ApprovalPacket || {};

  for (const field of rules.requiredFields || REQUIRED_PACKET_FIELDS) {
    if (!hasValue(packet[field])) errors.push(`approval packet missing ${field}`);
  }
  if (packet.authorityLevel !== 'A4') errors.push('approval packet authorityLevel must be A4');
  if (!rules.allowedApprovalSurfaces?.includes(packet.approvalSurface)) {
    errors.push(`approval packet approvalSurface is not allowed: ${packet.approvalSurface}`);
  }

  if (constraints.expectedIssue && packet.issue !== constraints.expectedIssue) {
    errors.push(`approval packet issue mismatch: expected ${constraints.expectedIssue}, got ${packet.issue}`);
  }
  if (constraints.expectedTarget && packet.target !== constraints.expectedTarget) {
    errors.push(`approval packet target mismatch: expected ${constraints.expectedTarget}, got ${packet.target}`);
  }
  if (constraints.expectedAction && packet.action !== constraints.expectedAction) {
    errors.push(`approval packet action mismatch: expected ${constraints.expectedAction}, got ${packet.action}`);
  }

  const namedRisks = new Set(packet.namedRisks || []);
  for (const risk of rules.mustNameExactRisks || REQUIRED_A4_RISKS) {
    if (!namedRisks.has(risk)) errors.push(`approval packet must name risk: ${risk}`);
  }

  for (const field of ['validation', 'rollback', 'postActionSmoke', 'stopConditions']) {
    if (!hasValue(packet[field])) errors.push(`approval packet ${field} must be non-empty`);
  }

  const now = constraints.now ? parseTimestamp(constraints.now, 'now', errors) : Date.now();
  const approvedAt = parseTimestamp(packet.approvedAt, 'approvedAt', errors);
  const expiresAt = parseTimestamp(packet.expiresAt, 'expiresAt', errors);
  const maxAgeHours = constraints.maxAgeHours ?? 24;
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    errors.push('approval packet maxAgeHours must be a positive number');
  }
  if (approvedAt !== null && now !== null) {
    if (approvedAt > now) errors.push('approval packet approvedAt must not be in the future');
    if (Number.isFinite(maxAgeHours) && now - approvedAt > maxAgeHours * 60 * 60 * 1000) {
      errors.push(`approval packet is stale: approvedAt is older than ${maxAgeHours} hours`);
    }
  }
  if (expiresAt !== null && now !== null && expiresAt <= now) {
    errors.push('approval packet expiresAt must be in the future');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateScoutProfile(profile, manifest) {
  const errors = [];

  if (profile.schemaVersion !== 1) errors.push('profile.schemaVersion must be 1');
  if (profile.id !== 'create-something-readonly-scout') {
    errors.push('profile.id must be create-something-readonly-scout');
  }
  if (profile.adapter !== manifest.id) {
    errors.push(`profile.adapter must match manifest id ${manifest.id}`);
  }
  if (profile.authority?.level !== 'A0') errors.push('profile.authority.level must be A0');
  if (profile.authority?.writes !== false) errors.push('profile.authority.writes must be false');
  if (profile.authority?.production !== false) errors.push('profile.authority.production must be false');
  if (profile.authority?.requiresApprovalPacket !== false) {
    errors.push('profile.authority.requiresApprovalPacket must be false for the read-only scout');
  }

  const missingEscalations = includesAll(profile.authority?.forbiddenEscalation, [
    'A4',
    'production-write',
    'credential-write',
    'billing-change',
    'client-production',
    'destructive-write',
    'irreversible-data-operation',
  ]);
  if (missingEscalations.length) {
    errors.push(`profile.authority.forbiddenEscalation missing: ${missingEscalations.join(', ')}`);
  }

  const manifestCommands = new Set((manifest.allowedCommands || []).map((command) => command.command));
  for (const command of profile.allowedCommands || []) {
    if (commandLooksHighRisk(command)) errors.push(`profile command is high-risk: ${command}`);
    if (!manifestCommands.has(command) && command !== 'node scripts/operator-agent-omnigent-adapter.mjs trial-check --json') {
      errors.push(`profile command is not allowed by adapter manifest: ${command}`);
    }
  }

  const missingReceiptFields = includesAll(profile.receiptContract?.requiredFields, REQUIRED_TRIAL_RECEIPT_FIELDS);
  if (missingReceiptFields.length) {
    errors.push(`profile.receiptContract.requiredFields missing: ${missingReceiptFields.join(', ')}`);
  }
  if (profile.receiptContract?.writesPerformed !== 0) {
    errors.push('profile.receiptContract.writesPerformed must be 0');
  }
  if (profile.receiptContract?.linearMirrorIssue !== 'CRE-1062') {
    errors.push('profile.receiptContract.linearMirrorIssue must be CRE-1062');
  }

  return errors;
}

function validateTrialReceipt(receipt, profile, manifest) {
  const errors = [];

  if (receipt.schemaVersion !== 1) errors.push('trial receipt schemaVersion must be 1');
  if (receipt.profileId !== profile.id) errors.push(`trial receipt profileId must be ${profile.id}`);
  if (receipt.adapter !== manifest.id) errors.push(`trial receipt adapter must be ${manifest.id}`);
  if (receipt.authorityLevel !== 'A0') errors.push('trial receipt authorityLevel must be A0');
  if (receipt.writesPerformed !== 0) errors.push('trial receipt writesPerformed must be 0');
  if (receipt.issue !== 'CRE-1062') errors.push('trial receipt issue must be CRE-1062');

  for (const field of REQUIRED_TRIAL_RECEIPT_FIELDS) {
    if (!hasValue(receipt[field])) errors.push(`trial receipt missing ${field}`);
  }

  if (receipt.policy?.a4Execution !== 'blocked') {
    errors.push('trial receipt policy.a4Execution must be blocked');
  }
  if (receipt.policy?.omnigentRole !== 'transport-policy-host') {
    errors.push('trial receipt policy.omnigentRole must be transport-policy-host');
  }
  if (receipt.action?.writes !== false) errors.push('trial receipt action.writes must be false');
  if (commandLooksHighRisk(receipt.action?.command)) {
    errors.push(`trial receipt action command is high-risk: ${receipt.action.command}`);
  }
  if (receipt.evidenceTarget?.kind !== 'Linear' || receipt.evidenceTarget?.issue !== 'CRE-1062') {
    errors.push('trial receipt evidenceTarget must point to Linear CRE-1062');
  }
  if (receipt.linearMirror?.required !== true || receipt.linearMirror?.issue !== 'CRE-1062') {
    errors.push('trial receipt must require Linear mirror to CRE-1062');
  }

  return errors;
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
    issue: result.issue || result.constraints?.expectedIssue || 'CRE-1061',
    manifest: options.manifest,
    ok: result.ok,
    errors: result.errors || [],
    warnings: result.warnings || [],
    checkedAt: new Date().toISOString(),
  };
}

function buildPreflightReceipt({ manifest, manifestValidation, packet, packetPath, constraints, packetValidation, options }) {
  const errors = [...manifestValidation.errors, ...packetValidation.errors];
  const admissionOk = manifestValidation.ok && packetValidation.ok;
  const base = {
    mode: 'preflight-check',
    ok: admissionOk,
    admissionOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    riskClass: packet.riskClass,
    namedRisks: packet.namedRisks || [],
    constraints,
    wouldExecute: false,
    writesPerformed: 0,
    checkedAt: new Date().toISOString(),
  };

  if (!admissionOk) {
    return {
      ...base,
      executionPlan: [],
      validationPlan: [],
      rollbackPlan: [],
      postActionSmokePlan: [],
      stopConditions: packet.stopConditions || [],
      evidenceTarget: packet.evidenceTarget || null,
    };
  }

  return {
    ...base,
    executionPlan: [
      {
        order: 1,
        phase: 'validation',
        steps: packet.validation,
      },
      {
        order: 2,
        phase: 'execution',
        action: packet.action,
        target: packet.target,
        dryRunOnly: true,
      },
      {
        order: 3,
        phase: 'post-action-smoke',
        steps: packet.postActionSmoke,
      },
      {
        order: 4,
        phase: 'rollback-readiness',
        steps: packet.rollback,
      },
    ],
    validationPlan: packet.validation,
    rollbackPlan: packet.rollback,
    postActionSmokePlan: packet.postActionSmoke,
    stopConditions: packet.stopConditions,
    forbiddenSideEffects: packet.forbiddenSideEffects,
    evidenceTarget: packet.evidenceTarget,
    nextGate: 'operator-authorized execution receipt; this preflight does not grant execution authority',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
    },
  };
}

function validatePreflightReceipt(preflightReceipt, packet, constraints) {
  const errors = [];

  if (preflightReceipt.mode !== 'preflight-check') errors.push('preflight receipt mode must be preflight-check');
  if (preflightReceipt.ok !== true || preflightReceipt.admissionOk !== true) {
    errors.push('preflight receipt admission must be ok');
  }
  if (preflightReceipt.issue !== constraints.expectedIssue) {
    errors.push(`preflight receipt issue mismatch: expected ${constraints.expectedIssue}, got ${preflightReceipt.issue}`);
  }
  if (preflightReceipt.target !== constraints.expectedTarget) {
    errors.push(`preflight receipt target mismatch: expected ${constraints.expectedTarget}, got ${preflightReceipt.target}`);
  }
  if (preflightReceipt.action !== constraints.expectedAction) {
    errors.push(`preflight receipt action mismatch: expected ${constraints.expectedAction}, got ${preflightReceipt.action}`);
  }
  if (preflightReceipt.authorityLevel !== 'A4') errors.push('preflight receipt authorityLevel must be A4');
  if (preflightReceipt.wouldExecute !== false) errors.push('preflight receipt wouldExecute must be false');
  if (preflightReceipt.writesPerformed !== 0) errors.push('preflight receipt writesPerformed must be 0');
  if (!Array.isArray(preflightReceipt.executionPlan) || preflightReceipt.executionPlan.length === 0) {
    errors.push('preflight receipt executionPlan must be non-empty');
  }
  if (!preflightReceipt.executionPlan?.some((step) => step?.phase === 'execution' && step?.dryRunOnly === true)) {
    errors.push('preflight receipt execution phase must be dryRunOnly');
  }

  for (const [field, packetField] of [
    ['validationPlan', 'validation'],
    ['rollbackPlan', 'rollback'],
    ['postActionSmokePlan', 'postActionSmoke'],
    ['stopConditions', 'stopConditions'],
  ]) {
    if (JSON.stringify(preflightReceipt[field] || []) !== JSON.stringify(packet[packetField] || [])) {
      errors.push(`preflight receipt ${field} must match packet ${packetField}`);
    }
  }

  return errors;
}

function buildDisabledExecutionReceipt({ manifest, manifestValidation, packet, packetPath, preflightReceipt, preflightPath, constraints, packetValidation, preflightErrors, options }) {
  const errors = [...manifestValidation.errors, ...packetValidation.errors, ...preflightErrors];
  const prerequisitesOk = manifestValidation.ok && packetValidation.ok && preflightErrors.length === 0;
  const base = {
    mode: 'execution-receipt-check',
    ok: prerequisitesOk,
    prerequisitesOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    constraints,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: 'A4 execution remains disabled until a separate explicit operator execution approval is recorded',
    checkedAt: new Date().toISOString(),
    evidenceTarget: packet.evidenceTarget || preflightReceipt.evidenceTarget || null,
  };

  if (!prerequisitesOk) {
    return {
      ...base,
      validationPlan: [],
      rollbackPlan: [],
      postActionSmokePlan: [],
      stopConditions: [],
    };
  }

  return {
    ...base,
    validationPlan: preflightReceipt.validationPlan,
    rollbackPlan: preflightReceipt.rollbackPlan,
    postActionSmokePlan: preflightReceipt.postActionSmokePlan,
    stopConditions: preflightReceipt.stopConditions,
    executionPlan: preflightReceipt.executionPlan,
    nextGate: 'explicit operator execution approval for this same issue, target, action, packet, and preflight receipt',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
    },
  };
}

function validateExecutionReceipt(executionReceipt, packet, preflightReceipt, constraints) {
  const errors = [];

  if (executionReceipt.mode !== 'execution-receipt-check') {
    errors.push('execution receipt mode must be execution-receipt-check');
  }
  if (executionReceipt.ok !== true || executionReceipt.prerequisitesOk !== true) {
    errors.push('execution receipt prerequisites must be ok');
  }
  if (executionReceipt.issue !== constraints.expectedIssue) {
    errors.push(`execution receipt issue mismatch: expected ${constraints.expectedIssue}, got ${executionReceipt.issue}`);
  }
  if (executionReceipt.target !== constraints.expectedTarget) {
    errors.push(`execution receipt target mismatch: expected ${constraints.expectedTarget}, got ${executionReceipt.target}`);
  }
  if (executionReceipt.action !== constraints.expectedAction) {
    errors.push(`execution receipt action mismatch: expected ${constraints.expectedAction}, got ${executionReceipt.action}`);
  }
  if (executionReceipt.authorityLevel !== 'A4') errors.push('execution receipt authorityLevel must be A4');
  if (executionReceipt.executionEnabled !== false) errors.push('execution receipt executionEnabled must be false');
  if (executionReceipt.executionApproved !== false) errors.push('execution receipt executionApproved must be false');
  if (executionReceipt.wouldExecute !== false) errors.push('execution receipt wouldExecute must be false');
  if (executionReceipt.writesPerformed !== 0) errors.push('execution receipt writesPerformed must be 0');

  for (const [field, packetField] of [
    ['validationPlan', 'validation'],
    ['rollbackPlan', 'rollback'],
    ['postActionSmokePlan', 'postActionSmoke'],
    ['stopConditions', 'stopConditions'],
  ]) {
    if (JSON.stringify(executionReceipt[field] || []) !== JSON.stringify(packet[packetField] || [])) {
      errors.push(`execution receipt ${field} must match packet ${packetField}`);
    }
  }

  if (JSON.stringify(executionReceipt.executionPlan || []) !== JSON.stringify(preflightReceipt.executionPlan || [])) {
    errors.push('execution receipt executionPlan must match preflight receipt executionPlan');
  }

  return errors;
}

function validateExecutionAuthorization(authorization, packet, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ApprovalPacket || {};

  const requiredFields = [
    'authorityLevel',
    'issue',
    'approver',
    'approvalSurface',
    'approvedAt',
    'expiresAt',
    'target',
    'action',
    'namedRisks',
    'packet',
    'preflightReceipt',
    'executionReceipt',
    'evidenceTarget',
  ];
  for (const field of requiredFields) {
    if (!hasValue(authorization[field])) errors.push(`execution authorization missing ${field}`);
  }
  if (authorization.authorityLevel !== 'A4') errors.push('execution authorization authorityLevel must be A4');
  if (!rules.allowedApprovalSurfaces?.includes(authorization.approvalSurface)) {
    errors.push(`execution authorization approvalSurface is not allowed: ${authorization.approvalSurface}`);
  }
  if (authorization.issue !== constraints.expectedIssue) {
    errors.push(`execution authorization issue mismatch: expected ${constraints.expectedIssue}, got ${authorization.issue}`);
  }
  if (authorization.target !== constraints.expectedTarget) {
    errors.push(`execution authorization target mismatch: expected ${constraints.expectedTarget}, got ${authorization.target}`);
  }
  if (authorization.action !== constraints.expectedAction) {
    errors.push(`execution authorization action mismatch: expected ${constraints.expectedAction}, got ${authorization.action}`);
  }
  if (authorization.packet !== rel(paths.packetPath)) {
    errors.push('execution authorization packet must match packet path');
  }
  if (authorization.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('execution authorization preflightReceipt must match preflight receipt path');
  }
  if (authorization.executionReceipt !== rel(paths.executionPath)) {
    errors.push('execution authorization executionReceipt must match execution receipt path');
  }

  const namedRisks = new Set(authorization.namedRisks || []);
  for (const risk of rules.mustNameExactRisks || REQUIRED_A4_RISKS) {
    if (!namedRisks.has(risk)) errors.push(`execution authorization must name risk: ${risk}`);
  }

  const timestampErrors = [];
  const now = constraints.now ? parseTimestamp(constraints.now, 'now', timestampErrors) : Date.now();
  const approvedAt = parseTimestamp(authorization.approvedAt, 'approvedAt', timestampErrors);
  const expiresAt = parseTimestamp(authorization.expiresAt, 'expiresAt', timestampErrors);
  errors.push(...timestampErrors.map((error) => error.replace('approval packet', 'execution authorization')));
  const maxAgeHours = constraints.maxAgeHours ?? 24;
  if (approvedAt !== null && now !== null) {
    if (approvedAt > now) errors.push('execution authorization approvedAt must not be in the future');
    if (Number.isFinite(maxAgeHours) && now - approvedAt > maxAgeHours * 60 * 60 * 1000) {
      errors.push(`execution authorization is stale: approvedAt is older than ${maxAgeHours} hours`);
    }
  }
  if (expiresAt !== null && now !== null && expiresAt <= now) {
    errors.push('execution authorization expiresAt must be in the future');
  }

  return errors;
}

function buildExecutionAuthorizationReceipt({
  manifest,
  manifestValidation,
  packet,
  packetPath,
  preflightReceipt,
  preflightPath,
  executionReceipt,
  executionPath,
  authorization,
  authorizationPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
  ];
  const authorizationOk = errors.length === 0;

  return {
    mode: 'execution-authorization-check',
    ok: authorizationOk,
    authorizationOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    approver: authorization.approver,
    approvalSurface: authorization.approvalSurface,
    constraints,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: 'authorization artifact validated; execution still requires a separate explicit execution command',
    evidenceTarget: authorization.evidenceTarget || packet.evidenceTarget || executionReceipt.evidenceTarget || null,
    validationPlan: authorizationOk ? executionReceipt.validationPlan : [],
    rollbackPlan: authorizationOk ? executionReceipt.rollbackPlan : [],
    postActionSmokePlan: authorizationOk ? executionReceipt.postActionSmokePlan : [],
    stopConditions: authorizationOk ? executionReceipt.stopConditions : [],
    checkedAt: new Date().toISOString(),
    nextGate: 'explicit execution command that revalidates this authorization immediately before running any action',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
    },
  };
}

function validateExecutionCommandArtifact(commandArtifact, packet, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ExecutionCommand || {};

  for (const field of rules.requiredFields || REQUIRED_EXECUTION_COMMAND_FIELDS) {
    if (!hasValue(commandArtifact[field])) errors.push(`execution command missing ${field}`);
  }
  if (commandArtifact.authorityLevel !== 'A4') errors.push('execution command authorityLevel must be A4');
  if (!rules.allowedCommandSurfaces?.includes(commandArtifact.commandSurface)) {
    errors.push(`execution command commandSurface is not allowed: ${commandArtifact.commandSurface}`);
  }
  if (!rules.allowedExecutionModes?.includes(commandArtifact.executionMode)) {
    errors.push(`execution command executionMode is not allowed: ${commandArtifact.executionMode}`);
  }
  if (commandArtifact.issue !== constraints.expectedIssue) {
    errors.push(`execution command issue mismatch: expected ${constraints.expectedIssue}, got ${commandArtifact.issue}`);
  }
  if (commandArtifact.target !== constraints.expectedTarget) {
    errors.push(`execution command target mismatch: expected ${constraints.expectedTarget}, got ${commandArtifact.target}`);
  }
  if (commandArtifact.action !== constraints.expectedAction) {
    errors.push(`execution command action mismatch: expected ${constraints.expectedAction}, got ${commandArtifact.action}`);
  }
  if (commandArtifact.packet !== rel(paths.packetPath)) {
    errors.push('execution command packet must match packet path');
  }
  if (commandArtifact.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('execution command preflightReceipt must match preflight receipt path');
  }
  if (commandArtifact.executionReceipt !== rel(paths.executionPath)) {
    errors.push('execution command executionReceipt must match execution receipt path');
  }
  if (commandArtifact.authorization !== rel(paths.authorizationPath)) {
    errors.push('execution command authorization must match authorization artifact path');
  }

  const timestampErrors = [];
  const now = constraints.now ? parseTimestamp(constraints.now, 'now', timestampErrors) : Date.now();
  const requestedAt = parseTimestamp(commandArtifact.requestedAt, 'requestedAt', timestampErrors);
  const expiresAt = parseTimestamp(commandArtifact.expiresAt, 'expiresAt', timestampErrors);
  errors.push(...timestampErrors.map((error) => error.replace('approval packet', 'execution command')));
  const maxAgeHours = constraints.maxAgeHours ?? 24;
  if (requestedAt !== null && now !== null) {
    if (requestedAt > now) errors.push('execution command requestedAt must not be in the future');
    if (Number.isFinite(maxAgeHours) && now - requestedAt > maxAgeHours * 60 * 60 * 1000) {
      errors.push(`execution command is stale: requestedAt is older than ${maxAgeHours} hours`);
    }
  }
  if (expiresAt !== null && now !== null && expiresAt <= now) {
    errors.push('execution command expiresAt must be in the future');
  }

  if (packet.issue !== commandArtifact.issue) {
    errors.push('execution command issue must match packet issue');
  }
  if (packet.target !== commandArtifact.target) {
    errors.push('execution command target must match packet target');
  }
  if (packet.action !== commandArtifact.action) {
    errors.push('execution command action must match packet action');
  }

  return errors;
}

function buildExecutionCommandReceipt({
  manifest,
  manifestValidation,
  packet,
  packetPath,
  preflightReceipt,
  preflightPath,
  executionReceipt,
  executionPath,
  authorization,
  authorizationPath,
  commandArtifact,
  commandPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
  ];
  const commandOk = errors.length === 0;
  const runnerEnabled = manifest.a4ExecutionCommand?.runnerEnabled === true && manifest.authority?.a4Execution !== 'blocked';
  const executionReady = commandOk && runnerEnabled;

  return {
    mode: 'execution-command-check',
    ok: commandOk,
    commandOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    commandId: commandArtifact.commandId,
    commandSurface: commandArtifact.commandSurface,
    requestedBy: commandArtifact.requestedBy,
    executionMode: commandArtifact.executionMode,
    constraints,
    commandAdmitted: commandOk,
    runnerEnabled,
    executionReady,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: commandOk
      ? 'execution command artifact validated; A4 runner remains disabled by repo policy'
      : 'execution command artifact rejected before runner admission',
    evidenceTarget: commandArtifact.evidenceTarget || authorization.evidenceTarget || packet.evidenceTarget || null,
    validationPlan: commandOk ? executionReceipt.validationPlan : [],
    rollbackPlan: commandOk ? executionReceipt.rollbackPlan : [],
    postActionSmokePlan: commandOk ? executionReceipt.postActionSmokePlan : [],
    stopConditions: commandOk ? executionReceipt.stopConditions : [],
    executionPlan: commandOk ? executionReceipt.executionPlan : [],
    checkedAt: new Date().toISOString(),
    nextGate: 'repo policy change plus an explicit executor implementation that revalidates this receipt before any write',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
    },
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
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for approval-check'));
  }
  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const packet = readJson(packetPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const packetValidation = validateApprovalPacket(packet, manifest, constraints);
  const result = {
    ok: manifestValidation.ok && packetValidation.ok,
    errors: [...manifestValidation.errors, ...packetValidation.errors],
    warnings: manifestValidation.warnings,
    manifestPath: options.manifest,
    packetPath: rel(packetPath),
    issue: packet.issue,
    constraints,
  };
  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, buildReceipt('approval-check', options, result));
  }
  return result;
}

function commandPreflightCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for preflight-check'));
  }
  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const packet = readJson(packetPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const packetValidation = validateApprovalPacket(packet, manifest, constraints);
  const result = buildPreflightReceipt({
    manifest,
    manifestValidation,
    packet,
    packetPath,
    constraints,
    packetValidation,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandExecutionReceiptCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for execution-receipt-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for execution-receipt-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const packetValidation = validateApprovalPacket(packet, manifest, constraints);
  const preflightErrors = validatePreflightReceipt(preflightReceipt, packet, constraints);
  const result = buildDisabledExecutionReceipt({
    manifest,
    manifestValidation,
    packet,
    packetPath,
    preflightReceipt,
    preflightPath,
    constraints,
    packetValidation,
    preflightErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandExecutionAuthorizationCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for execution-authorization-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for execution-authorization-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for execution-authorization-check');
  if (!options.authorization) throw new Error('--authorization is required for execution-authorization-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const packetValidation = validateApprovalPacket(packet, manifest, constraints);
  const preflightErrors = validatePreflightReceipt(preflightReceipt, packet, constraints);
  const executionErrors = validateExecutionReceipt(executionReceipt, packet, preflightReceipt, constraints);
  const authorizationErrors = validateExecutionAuthorization(authorization, packet, manifest, {
    packetPath,
    preflightPath,
    executionPath,
  }, constraints);
  const result = buildExecutionAuthorizationReceipt({
    manifest,
    manifestValidation,
    packet,
    packetPath,
    preflightReceipt,
    preflightPath,
    executionReceipt,
    executionPath,
    authorization,
    authorizationPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandExecutionCommandCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for execution-command-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for execution-command-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for execution-command-check');
  if (!options.authorization) throw new Error('--authorization is required for execution-command-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for execution-command-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const packetValidation = validateApprovalPacket(packet, manifest, constraints);
  const preflightErrors = validatePreflightReceipt(preflightReceipt, packet, constraints);
  const executionErrors = validateExecutionReceipt(executionReceipt, packet, preflightReceipt, constraints);
  const authorizationErrors = validateExecutionAuthorization(authorization, packet, manifest, {
    packetPath,
    preflightPath,
    executionPath,
  }, constraints);
  const commandErrors = validateExecutionCommandArtifact(commandArtifact, packet, manifest, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
  }, constraints);
  const result = buildExecutionCommandReceipt({
    manifest,
    manifestValidation,
    packet,
    packetPath,
    preflightReceipt,
    preflightPath,
    executionReceipt,
    executionPath,
    authorization,
    authorizationPath,
    commandArtifact,
    commandPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandTrialCheck(options) {
  const manifest = readJson(resolveFromRoot(options.manifest));
  const profilePath = resolveFromRoot(options.profile);
  const receiptPath = resolveFromRoot(options.trialReceipt);
  const profile = readJson(profilePath);
  const trialReceipt = readJson(receiptPath);
  const manifestValidation = validateManifest(manifest);
  const errors = [
    ...manifestValidation.errors,
    ...validateScoutProfile(profile, manifest),
    ...validateTrialReceipt(trialReceipt, profile, manifest),
  ];
  const result = {
    ok: errors.length === 0,
    errors,
    warnings: manifestValidation.warnings,
    manifestPath: options.manifest,
    profilePath: rel(profilePath),
    trialReceiptPath: rel(receiptPath),
    authorityLevel: trialReceipt.authorityLevel,
    writesPerformed: trialReceipt.writesPerformed,
    linearMirrorIssue: trialReceipt.linearMirror?.issue,
  };
  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, buildReceipt('trial-check', options, result));
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
  node scripts/operator-agent-omnigent-adapter.mjs approval-check --packet <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs preflight-check --packet <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs execution-receipt-check --packet <path> --preflight-receipt <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs execution-authorization-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs execution-command-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs trial-check [--profile <path>] [--trial-receipt <path>] [--json]
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
  else if (options.command === 'preflight-check') result = commandPreflightCheck(options);
  else if (options.command === 'execution-receipt-check') result = commandExecutionReceiptCheck(options);
  else if (options.command === 'execution-authorization-check') result = commandExecutionAuthorizationCheck(options);
  else if (options.command === 'execution-command-check') result = commandExecutionCommandCheck(options);
  else if (options.command === 'trial-check') result = commandTrialCheck(options);
  else if (options.command === 'print') result = commandPrint(options);
  else throw new Error(`Unknown command: ${options.command}`);

  print(result, options);
  if (!result.ok) process.exitCode = 1;
}

export {
  DEFAULT_MANIFEST_PATH,
  DEFAULT_PROFILE_PATH,
  DEFAULT_TRIAL_RECEIPT_PATH,
  REQUIRED_A4_RISKS,
  REQUIRED_PACKET_FIELDS,
  REQUIRED_TRIAL_RECEIPT_FIELDS,
  commandLooksHighRisk,
  commandExecutionCommandCheck,
  commandExecutionAuthorizationCheck,
  commandExecutionReceiptCheck,
  commandPreflightCheck,
  parseArgs,
  validateApprovalPacket,
  validateManifest,
  validateScoutProfile,
  validateTrialReceipt,
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
