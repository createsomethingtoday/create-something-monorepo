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
    commandReceipt: null,
    executorProofReceipt: null,
    enablementProposal: null,
    enablementProposalReceipt: null,
    policyPatch: null,
    policyPatchReceipt: null,
    candidateManifest: null,
    applicationDiffReceipt: null,
    readinessReceipt: null,
    runnerContract: null,
    runnerContractReceipt: null,
    runnerPlan: null,
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
    else if (arg === '--command-receipt' && args[index + 1]) options.commandReceipt = args[++index];
    else if (arg === '--executor-proof-receipt' && args[index + 1]) options.executorProofReceipt = args[++index];
    else if (arg === '--enablement-proposal' && args[index + 1]) options.enablementProposal = args[++index];
    else if (arg === '--enablement-proposal-receipt' && args[index + 1]) options.enablementProposalReceipt = args[++index];
    else if (arg === '--policy-patch' && args[index + 1]) options.policyPatch = args[++index];
    else if (arg === '--policy-patch-receipt' && args[index + 1]) options.policyPatchReceipt = args[++index];
    else if (arg === '--candidate-manifest' && args[index + 1]) options.candidateManifest = args[++index];
    else if (arg === '--application-diff-receipt' && args[index + 1]) options.applicationDiffReceipt = args[++index];
    else if (arg === '--readiness-receipt' && args[index + 1]) options.readinessReceipt = args[++index];
    else if (arg === '--runner-contract' && args[index + 1]) options.runnerContract = args[++index];
    else if (arg === '--runner-contract-receipt' && args[index + 1]) options.runnerContractReceipt = args[++index];
    else if (arg === '--runner-plan' && args[index + 1]) options.runnerPlan = args[++index];
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

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalJson(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyObjectPatch(base, patch) {
  const result = cloneJson(base);
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = applyObjectPatch(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function collectJsonDiffPaths(left, right, prefix = '') {
  if (sameJson(left, right)) return [];
  const leftIsObject = left && typeof left === 'object' && !Array.isArray(left);
  const rightIsObject = right && typeof right === 'object' && !Array.isArray(right);
  if (!leftIsObject || !rightIsObject) return [prefix || '.'];

  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const paths = [];
  for (const key of [...keys].sort()) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    paths.push(...collectJsonDiffPaths(left[key], right[key], nextPrefix));
  }
  return paths;
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

  const executorProof = manifest.a4ExecutorProof || {};
  if (executorProof.runnerEnabled !== false) {
    errors.push('a4ExecutorProof.runnerEnabled must remain false while authority.a4Execution is blocked');
  }
  if (executorProof.processSpawnPolicy !== 'blocked') {
    errors.push('a4ExecutorProof.processSpawnPolicy must be blocked');
  }
  if (executorProof.requiresCommandReceipt !== true) {
    errors.push('a4ExecutorProof.requiresCommandReceipt must be true');
  }

  const enablement = manifest.a4ExecutorEnablementProposal || {};
  if (!enablement.allowedApprovalSurfaces?.includes('Linear')) {
    errors.push('a4ExecutorEnablementProposal.allowedApprovalSurfaces must include Linear');
  }
  if (enablement.maxWritesPerRun !== 1) {
    errors.push('a4ExecutorEnablementProposal.maxWritesPerRun must be 1');
  }
  if (!enablement.requiredProofs?.includes('rollback')) {
    errors.push('a4ExecutorEnablementProposal.requiredProofs must include rollback');
  }
  if (!enablement.requiredProofs?.includes('post-action-smoke')) {
    errors.push('a4ExecutorEnablementProposal.requiredProofs must include post-action-smoke');
  }
  if (!enablement.requiredProofs?.includes('public-access-fail-closed')) {
    errors.push('a4ExecutorEnablementProposal.requiredProofs must include public-access-fail-closed');
  }
  if (enablement.policyChangeApplied !== false) {
    errors.push('a4ExecutorEnablementProposal.policyChangeApplied must remain false');
  }

  const policyPatchDryRun = manifest.a4PolicyPatchDryRun || {};
  if (policyPatchDryRun.requiresEnablementProposalReceipt !== true) {
    errors.push('a4PolicyPatchDryRun.requiresEnablementProposalReceipt must be true');
  }
  if (policyPatchDryRun.dryRunOnly !== true) {
    errors.push('a4PolicyPatchDryRun.dryRunOnly must be true');
  }
  if (policyPatchDryRun.policyFileChanged !== false) {
    errors.push('a4PolicyPatchDryRun.policyFileChanged must remain false');
  }
  if (policyPatchDryRun.policyChangeApplied !== false) {
    errors.push('a4PolicyPatchDryRun.policyChangeApplied must remain false');
  }
  if (policyPatchDryRun.maxWritesPerRun !== 1) {
    errors.push('a4PolicyPatchDryRun.maxWritesPerRun must be 1');
  }
  if (!policyPatchDryRun.requiredProofs?.includes('rollback')) {
    errors.push('a4PolicyPatchDryRun.requiredProofs must include rollback');
  }
  if (!policyPatchDryRun.requiredProofs?.includes('post-action-smoke')) {
    errors.push('a4PolicyPatchDryRun.requiredProofs must include post-action-smoke');
  }
  if (!policyPatchDryRun.requiredProofs?.includes('public-access-fail-closed')) {
    errors.push('a4PolicyPatchDryRun.requiredProofs must include public-access-fail-closed');
  }
  const missingAllowedPatchFields = includesAll(policyPatchDryRun.allowedPatchFields, [
    'authority.a4Execution',
    'a4ExecutionCommand.runnerEnabled',
    'a4ExecutorProof.runnerEnabled',
  ]);
  if (missingAllowedPatchFields.length) {
    errors.push(`a4PolicyPatchDryRun.allowedPatchFields missing: ${missingAllowedPatchFields.join(', ')}`);
  }

  const policyApplicationDiff = manifest.a4PolicyApplicationDiff || {};
  if (policyApplicationDiff.requiresPolicyPatchDryRunReceipt !== true) {
    errors.push('a4PolicyApplicationDiff.requiresPolicyPatchDryRunReceipt must be true');
  }
  if (policyApplicationDiff.exactPatchOnly !== true) {
    errors.push('a4PolicyApplicationDiff.exactPatchOnly must be true');
  }
  if (policyApplicationDiff.policyChangeApplied !== false) {
    errors.push('a4PolicyApplicationDiff.policyChangeApplied must remain false');
  }
  if (policyApplicationDiff.runnerEnabled !== false) {
    errors.push('a4PolicyApplicationDiff.runnerEnabled must remain false');
  }
  if (policyApplicationDiff.executionEnabled !== false) {
    errors.push('a4PolicyApplicationDiff.executionEnabled must remain false');
  }
  if (policyApplicationDiff.writesPerformed !== 0) {
    errors.push('a4PolicyApplicationDiff.writesPerformed must be 0');
  }

  const enabledManifestReadiness = manifest.a4EnabledManifestReadiness || {};
  if (enabledManifestReadiness.requiresPolicyApplicationDiffReceipt !== true) {
    errors.push('a4EnabledManifestReadiness.requiresPolicyApplicationDiffReceipt must be true');
  }
  if (enabledManifestReadiness.candidateOnly !== true) {
    errors.push('a4EnabledManifestReadiness.candidateOnly must be true');
  }
  if (enabledManifestReadiness.currentPolicyMustRemainBlocked !== true) {
    errors.push('a4EnabledManifestReadiness.currentPolicyMustRemainBlocked must be true');
  }
  if (enabledManifestReadiness.processSpawnPolicy !== 'blocked') {
    errors.push('a4EnabledManifestReadiness.processSpawnPolicy must be blocked');
  }
  if (enabledManifestReadiness.writesPerformed !== 0) {
    errors.push('a4EnabledManifestReadiness.writesPerformed must be 0');
  }

  const runnerImplementationContract = manifest.a4RunnerImplementationContract || {};
  if (runnerImplementationContract.requiresEnabledManifestReadinessReceipt !== true) {
    errors.push('a4RunnerImplementationContract.requiresEnabledManifestReadinessReceipt must be true');
  }
  if (runnerImplementationContract.requiresImmediateFullChainRevalidation !== true) {
    errors.push('a4RunnerImplementationContract.requiresImmediateFullChainRevalidation must be true');
  }
  if (runnerImplementationContract.requiresEnabledCheckedInPolicy !== true) {
    errors.push('a4RunnerImplementationContract.requiresEnabledCheckedInPolicy must be true');
  }
  if (runnerImplementationContract.allowedWhenCurrentPolicyBlocked !== false) {
    errors.push('a4RunnerImplementationContract.allowedWhenCurrentPolicyBlocked must be false');
  }
  if (!runnerImplementationContract.allowedImplementationSurfaces?.includes('repo-pr')) {
    errors.push('a4RunnerImplementationContract.allowedImplementationSurfaces must include repo-pr');
  }
  if (runnerImplementationContract.processSpawnPolicy !== 'blocked-until-checked-in-policy-enabled') {
    errors.push('a4RunnerImplementationContract.processSpawnPolicy must be blocked-until-checked-in-policy-enabled');
  }
  if (runnerImplementationContract.maxWritesPerRun !== 1) {
    errors.push('a4RunnerImplementationContract.maxWritesPerRun must be 1');
  }
  if (!runnerImplementationContract.requiredProofs?.includes('rollback')) {
    errors.push('a4RunnerImplementationContract.requiredProofs must include rollback');
  }
  if (!runnerImplementationContract.requiredProofs?.includes('post-action-smoke')) {
    errors.push('a4RunnerImplementationContract.requiredProofs must include post-action-smoke');
  }
  if (!runnerImplementationContract.requiredProofs?.includes('public-access-fail-closed')) {
    errors.push('a4RunnerImplementationContract.requiredProofs must include public-access-fail-closed');
  }
  if (runnerImplementationContract.requiresCommandReceipt !== true) {
    errors.push('a4RunnerImplementationContract.requiresCommandReceipt must be true');
  }
  if (runnerImplementationContract.writesPerformed !== 0) {
    errors.push('a4RunnerImplementationContract.writesPerformed must be 0');
  }

  const runnerImplementationPlan = manifest.a4RunnerImplementationPlan || {};
  if (runnerImplementationPlan.requiresRunnerImplementationContractReceipt !== true) {
    errors.push('a4RunnerImplementationPlan.requiresRunnerImplementationContractReceipt must be true');
  }
  if (runnerImplementationPlan.planOnly !== true) {
    errors.push('a4RunnerImplementationPlan.planOnly must be true');
  }
  if (runnerImplementationPlan.executableEntrypointAdded !== false) {
    errors.push('a4RunnerImplementationPlan.executableEntrypointAdded must be false');
  }
  if (!runnerImplementationPlan.allowedImplementationSurfaces?.includes('repo-pr')) {
    errors.push('a4RunnerImplementationPlan.allowedImplementationSurfaces must include repo-pr');
  }
  if (!runnerImplementationPlan.allowedPlannedEntrypoints?.includes('scripts/operator-agent-omnigent-runner.mjs')) {
    errors.push('a4RunnerImplementationPlan.allowedPlannedEntrypoints must include scripts/operator-agent-omnigent-runner.mjs');
  }
  const missingPlanGuards = includesAll(runnerImplementationPlan.requiredGuards, [
    'checked-in-policy-enabled',
    'full-chain-revalidation',
    'command-receipt-bound',
    'max-writes-per-run',
    'rollback-ready',
    'post-action-smoke',
    'public-access-fail-closed',
    'stop-on-mismatch',
    'stop-on-expired',
    'stop-on-drift',
  ]);
  if (missingPlanGuards.length) {
    errors.push(`a4RunnerImplementationPlan.requiredGuards missing: ${missingPlanGuards.join(', ')}`);
  }
  if (runnerImplementationPlan.maxWritesPerRun !== 1) {
    errors.push('a4RunnerImplementationPlan.maxWritesPerRun must be 1');
  }
  if (!runnerImplementationPlan.requiredProofs?.includes('rollback')) {
    errors.push('a4RunnerImplementationPlan.requiredProofs must include rollback');
  }
  if (!runnerImplementationPlan.requiredProofs?.includes('post-action-smoke')) {
    errors.push('a4RunnerImplementationPlan.requiredProofs must include post-action-smoke');
  }
  if (!runnerImplementationPlan.requiredProofs?.includes('public-access-fail-closed')) {
    errors.push('a4RunnerImplementationPlan.requiredProofs must include public-access-fail-closed');
  }
  if (runnerImplementationPlan.writesPerformed !== 0) {
    errors.push('a4RunnerImplementationPlan.writesPerformed must be 0');
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

function validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, paths, constraints) {
  const errors = [];

  if (commandReceipt.mode !== 'execution-command-check') {
    errors.push('execution command receipt mode must be execution-command-check');
  }
  if (commandReceipt.ok !== true || commandReceipt.commandOk !== true || commandReceipt.commandAdmitted !== true) {
    errors.push('execution command receipt admission must be ok');
  }
  if (commandReceipt.issue !== constraints.expectedIssue) {
    errors.push(`execution command receipt issue mismatch: expected ${constraints.expectedIssue}, got ${commandReceipt.issue}`);
  }
  if (commandReceipt.target !== constraints.expectedTarget) {
    errors.push(`execution command receipt target mismatch: expected ${constraints.expectedTarget}, got ${commandReceipt.target}`);
  }
  if (commandReceipt.action !== constraints.expectedAction) {
    errors.push(`execution command receipt action mismatch: expected ${constraints.expectedAction}, got ${commandReceipt.action}`);
  }
  if (commandReceipt.authorityLevel !== 'A4') errors.push('execution command receipt authorityLevel must be A4');
  if (commandReceipt.packetPath !== rel(paths.packetPath)) {
    errors.push('execution command receipt packetPath must match packet path');
  }
  if (commandReceipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('execution command receipt preflightReceipt must match preflight receipt path');
  }
  if (commandReceipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('execution command receipt executionReceipt must match execution receipt path');
  }
  if (commandReceipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('execution command receipt authorization must match authorization artifact path');
  }
  if (commandReceipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('execution command receipt commandArtifact must match command artifact path');
  }
  if (commandReceipt.runnerEnabled !== false) errors.push('execution command receipt runnerEnabled must be false');
  if (commandReceipt.executionReady !== false) errors.push('execution command receipt executionReady must be false');
  if (commandReceipt.executionEnabled !== false) errors.push('execution command receipt executionEnabled must be false');
  if (commandReceipt.executionApproved !== false) errors.push('execution command receipt executionApproved must be false');
  if (commandReceipt.wouldExecute !== false) errors.push('execution command receipt wouldExecute must be false');
  if (commandReceipt.writesPerformed !== 0) errors.push('execution command receipt writesPerformed must be 0');
  if (commandReceipt.processSpawned === true) errors.push('execution command receipt must not report processSpawned');
  if (Array.isArray(commandReceipt.executedCommands) && commandReceipt.executedCommands.length > 0) {
    errors.push('execution command receipt executedCommands must be empty');
  }

  if (packet.issue !== commandReceipt.issue) errors.push('execution command receipt issue must match packet issue');
  if (packet.target !== commandReceipt.target) errors.push('execution command receipt target must match packet target');
  if (packet.action !== commandReceipt.action) errors.push('execution command receipt action must match packet action');

  for (const field of ['validationPlan', 'rollbackPlan', 'postActionSmokePlan', 'stopConditions', 'executionPlan']) {
    if (JSON.stringify(commandReceipt[field] || []) !== JSON.stringify(executionReceipt[field] || [])) {
      errors.push(`execution command receipt ${field} must match execution receipt ${field}`);
    }
  }

  return errors;
}

function buildExecutorProofReceipt({
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
  commandReceipt,
  commandReceiptPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
  ];
  const executorProofOk = errors.length === 0;

  return {
    mode: 'executor-proof-check',
    ok: executorProofOk,
    executorProofOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    commandId: commandArtifact.commandId,
    commandSurface: commandArtifact.commandSurface,
    executionMode: commandArtifact.executionMode,
    constraints,
    runnerBlocked: true,
    processSpawnPolicy: manifest.a4ExecutorProof?.processSpawnPolicy || 'blocked',
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: executorProofOk
      ? 'executor proof validated full A4 chain and stopped before process spawn because repo policy blocks the runner'
      : 'executor proof rejected chain before any process spawn',
    evidenceTarget: commandReceipt.evidenceTarget || commandArtifact.evidenceTarget || authorization.evidenceTarget || packet.evidenceTarget || null,
    validationPlan: executorProofOk ? executionReceipt.validationPlan : [],
    rollbackPlan: executorProofOk ? executionReceipt.rollbackPlan : [],
    postActionSmokePlan: executorProofOk ? executionReceipt.postActionSmokePlan : [],
    stopConditions: executorProofOk ? executionReceipt.stopConditions : [],
    executionPlan: executorProofOk ? executionReceipt.executionPlan : [],
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-approved repo policy change that enables a narrowly scoped executor implementation with rollback and smoke proof',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      processSpawnPolicy: manifest.a4ExecutorProof?.processSpawnPolicy,
    },
  };
}

function validateExecutorProofReceipt(executorProofReceipt, packet, paths, constraints) {
  const errors = [];

  if (executorProofReceipt.mode !== 'executor-proof-check') {
    errors.push('executor proof receipt mode must be executor-proof-check');
  }
  if (executorProofReceipt.ok !== true || executorProofReceipt.executorProofOk !== true) {
    errors.push('executor proof receipt must be ok');
  }
  if (executorProofReceipt.issue !== constraints.expectedIssue) {
    errors.push(`executor proof receipt issue mismatch: expected ${constraints.expectedIssue}, got ${executorProofReceipt.issue}`);
  }
  if (executorProofReceipt.target !== constraints.expectedTarget) {
    errors.push(`executor proof receipt target mismatch: expected ${constraints.expectedTarget}, got ${executorProofReceipt.target}`);
  }
  if (executorProofReceipt.action !== constraints.expectedAction) {
    errors.push(`executor proof receipt action mismatch: expected ${constraints.expectedAction}, got ${executorProofReceipt.action}`);
  }
  if (executorProofReceipt.packetPath !== rel(paths.packetPath)) {
    errors.push('executor proof receipt packetPath must match packet path');
  }
  if (executorProofReceipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('executor proof receipt preflightReceipt must match preflight receipt path');
  }
  if (executorProofReceipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('executor proof receipt executionReceipt must match execution receipt path');
  }
  if (executorProofReceipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('executor proof receipt authorization must match authorization artifact path');
  }
  if (executorProofReceipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('executor proof receipt commandArtifact must match command artifact path');
  }
  if (executorProofReceipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('executor proof receipt commandReceipt must match command receipt path');
  }
  if (executorProofReceipt.runnerBlocked !== true) errors.push('executor proof receipt runnerBlocked must be true');
  if (executorProofReceipt.processSpawned !== false) errors.push('executor proof receipt processSpawned must be false');
  if (!Array.isArray(executorProofReceipt.executedCommands) || executorProofReceipt.executedCommands.length !== 0) {
    errors.push('executor proof receipt executedCommands must be empty');
  }
  if (executorProofReceipt.runnerEnabled !== false) errors.push('executor proof receipt runnerEnabled must be false');
  if (executorProofReceipt.executionReady !== false) errors.push('executor proof receipt executionReady must be false');
  if (executorProofReceipt.executionEnabled !== false) errors.push('executor proof receipt executionEnabled must be false');
  if (executorProofReceipt.wouldExecute !== false) errors.push('executor proof receipt wouldExecute must be false');
  if (executorProofReceipt.writesPerformed !== 0) errors.push('executor proof receipt writesPerformed must be 0');

  if (packet.issue !== executorProofReceipt.issue) errors.push('executor proof receipt issue must match packet issue');
  if (packet.target !== executorProofReceipt.target) errors.push('executor proof receipt target must match packet target');
  if (packet.action !== executorProofReceipt.action) errors.push('executor proof receipt action must match packet action');

  return errors;
}

function validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ExecutorEnablementProposal || {};
  const requiredFields = [
    'authorityLevel',
    'issue',
    'target',
    'action',
    'approvalSurface',
    'approvedBy',
    'approvedAt',
    'expiresAt',
    'targetScope',
    'maxWritesPerRun',
    'requiredProofs',
    'policyPatch',
    'executorProofReceipt',
    'rollbackProofRequired',
    'postActionSmokeRequired',
    'publicAccessFailClosedRequired',
    'policyChangeApplied',
    'evidenceTarget',
  ];

  for (const field of requiredFields) {
    if (!hasValue(proposal[field])) errors.push(`executor enablement proposal missing ${field}`);
  }
  if (proposal.authorityLevel !== 'A4') errors.push('executor enablement proposal authorityLevel must be A4');
  if (!rules.allowedApprovalSurfaces?.includes(proposal.approvalSurface)) {
    errors.push(`executor enablement proposal approvalSurface is not allowed: ${proposal.approvalSurface}`);
  }
  if (proposal.issue !== constraints.expectedIssue) {
    errors.push(`executor enablement proposal issue mismatch: expected ${constraints.expectedIssue}, got ${proposal.issue}`);
  }
  if (proposal.target !== constraints.expectedTarget) {
    errors.push(`executor enablement proposal target mismatch: expected ${constraints.expectedTarget}, got ${proposal.target}`);
  }
  if (proposal.action !== constraints.expectedAction) {
    errors.push(`executor enablement proposal action mismatch: expected ${constraints.expectedAction}, got ${proposal.action}`);
  }
  if (proposal.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('executor enablement proposal executorProofReceipt must match executor proof receipt path');
  }
  if (proposal.targetScope !== packet.target) {
    errors.push('executor enablement proposal targetScope must equal packet target');
  }
  if (proposal.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`executor enablement proposal maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  if (proposal.rollbackProofRequired !== true) errors.push('executor enablement proposal rollbackProofRequired must be true');
  if (proposal.postActionSmokeRequired !== true) errors.push('executor enablement proposal postActionSmokeRequired must be true');
  if (proposal.publicAccessFailClosedRequired !== true) {
    errors.push('executor enablement proposal publicAccessFailClosedRequired must be true');
  }
  if (proposal.policyChangeApplied !== false) {
    errors.push('executor enablement proposal policyChangeApplied must be false');
  }
  if (proposal.policyPatch?.authority?.a4Execution !== 'enabled') {
    errors.push('executor enablement proposal policyPatch.authority.a4Execution must be enabled');
  }
  if (proposal.policyPatch?.a4ExecutionCommand?.runnerEnabled !== true) {
    errors.push('executor enablement proposal policyPatch.a4ExecutionCommand.runnerEnabled must be true');
  }
  if (proposal.policyPatch?.a4ExecutorProof?.runnerEnabled !== true) {
    errors.push('executor enablement proposal policyPatch.a4ExecutorProof.runnerEnabled must be true');
  }

  const requiredProofs = new Set(proposal.requiredProofs || []);
  for (const proof of rules.requiredProofs || []) {
    if (!requiredProofs.has(proof)) errors.push(`executor enablement proposal requiredProofs must include ${proof}`);
  }

  const timestampErrors = [];
  const now = constraints.now ? parseTimestamp(constraints.now, 'now', timestampErrors) : Date.now();
  const approvedAt = parseTimestamp(proposal.approvedAt, 'approvedAt', timestampErrors);
  const expiresAt = parseTimestamp(proposal.expiresAt, 'expiresAt', timestampErrors);
  errors.push(...timestampErrors.map((error) => error.replace('approval packet', 'executor enablement proposal')));
  const maxAgeHours = constraints.maxAgeHours ?? 24;
  if (approvedAt !== null && now !== null) {
    if (approvedAt > now) errors.push('executor enablement proposal approvedAt must not be in the future');
    if (Number.isFinite(maxAgeHours) && now - approvedAt > maxAgeHours * 60 * 60 * 1000) {
      errors.push(`executor enablement proposal is stale: approvedAt is older than ${maxAgeHours} hours`);
    }
  }
  if (expiresAt !== null && now !== null && expiresAt <= now) {
    errors.push('executor enablement proposal expiresAt must be in the future');
  }

  if (executorProofReceipt.executorProofOk !== true) {
    errors.push('executor enablement proposal requires a valid executor proof receipt');
  }

  return errors;
}

function buildExecutorEnablementProposalReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
  ];
  const enablementProposalOk = errors.length === 0;

  return {
    mode: 'executor-enable-proposal-check',
    ok: enablementProposalOk,
    enablementProposalOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: proposal.targetScope,
    maxWritesPerRun: proposal.maxWritesPerRun,
    requiredProofs: proposal.requiredProofs || [],
    constraints,
    policyChangeApplied: false,
    proposedPolicyPatch: enablementProposalOk ? proposal.policyPatch : null,
    runnerBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: enablementProposalOk
      ? 'executor enablement proposal validated; repo policy remains blocked until the operator applies a separate policy change'
      : 'executor enablement proposal rejected before any policy change',
    evidenceTarget: proposal.evidenceTarget || executorProofReceipt.evidenceTarget || commandReceipt.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator applies the reviewed policy patch in a separate PR and reruns public access, rollback, and post-action smoke proof',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      enablementPolicyChangeApplied: manifest.a4ExecutorEnablementProposal?.policyChangeApplied,
    },
  };
}

function validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, paths, constraints) {
  const errors = [];

  if (proposalReceipt.mode !== 'executor-enable-proposal-check') {
    errors.push('executor enablement proposal receipt mode must be executor-enable-proposal-check');
  }
  if (proposalReceipt.ok !== true || proposalReceipt.enablementProposalOk !== true) {
    errors.push('executor enablement proposal receipt must be ok');
  }
  if (proposalReceipt.issue !== constraints.expectedIssue) {
    errors.push(`executor enablement proposal receipt issue mismatch: expected ${constraints.expectedIssue}, got ${proposalReceipt.issue}`);
  }
  if (proposalReceipt.target !== constraints.expectedTarget) {
    errors.push(`executor enablement proposal receipt target mismatch: expected ${constraints.expectedTarget}, got ${proposalReceipt.target}`);
  }
  if (proposalReceipt.action !== constraints.expectedAction) {
    errors.push(`executor enablement proposal receipt action mismatch: expected ${constraints.expectedAction}, got ${proposalReceipt.action}`);
  }
  if (proposalReceipt.packetPath !== rel(paths.packetPath)) {
    errors.push('executor enablement proposal receipt packetPath must match packet path');
  }
  if (proposalReceipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('executor enablement proposal receipt preflightReceipt must match preflight receipt path');
  }
  if (proposalReceipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('executor enablement proposal receipt executionReceipt must match execution receipt path');
  }
  if (proposalReceipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('executor enablement proposal receipt authorization must match authorization artifact path');
  }
  if (proposalReceipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('executor enablement proposal receipt commandArtifact must match command artifact path');
  }
  if (proposalReceipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('executor enablement proposal receipt commandReceipt must match command receipt path');
  }
  if (proposalReceipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('executor enablement proposal receipt executorProofReceipt must match executor proof receipt path');
  }
  if (proposalReceipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('executor enablement proposal receipt enablementProposal must match proposal path');
  }
  if (!sameJson(proposalReceipt.proposedPolicyPatch, proposal.policyPatch)) {
    errors.push('executor enablement proposal receipt proposedPolicyPatch must match proposal policyPatch');
  }
  if (proposalReceipt.policyChangeApplied !== false) {
    errors.push('executor enablement proposal receipt policyChangeApplied must be false');
  }
  if (proposalReceipt.runnerEnabled !== false) {
    errors.push('executor enablement proposal receipt runnerEnabled must be false');
  }
  if (proposalReceipt.executionReady !== false) {
    errors.push('executor enablement proposal receipt executionReady must be false');
  }
  if (proposalReceipt.executionEnabled !== false) {
    errors.push('executor enablement proposal receipt executionEnabled must be false');
  }
  if (proposalReceipt.wouldExecute !== false) {
    errors.push('executor enablement proposal receipt wouldExecute must be false');
  }
  if (proposalReceipt.writesPerformed !== 0) {
    errors.push('executor enablement proposal receipt writesPerformed must be 0');
  }

  if (packet.issue !== proposalReceipt.issue) errors.push('executor enablement proposal receipt issue must match packet issue');
  if (packet.target !== proposalReceipt.target) errors.push('executor enablement proposal receipt target must match packet target');
  if (packet.action !== proposalReceipt.action) errors.push('executor enablement proposal receipt action must match packet action');

  return errors;
}

function validatePolicyPatchShape(policyPatch, errors, label) {
  const allowedTopLevel = new Set(['authority', 'a4ExecutionCommand', 'a4ExecutorProof']);
  for (const key of Object.keys(policyPatch || {})) {
    if (!allowedTopLevel.has(key)) errors.push(`${label} may not patch ${key}`);
  }

  const authorityKeys = Object.keys(policyPatch?.authority || {});
  for (const key of authorityKeys) {
    if (key !== 'a4Execution') errors.push(`${label} may not patch authority.${key}`);
  }
  const commandKeys = Object.keys(policyPatch?.a4ExecutionCommand || {});
  for (const key of commandKeys) {
    if (key !== 'runnerEnabled') errors.push(`${label} may not patch a4ExecutionCommand.${key}`);
  }
  const proofKeys = Object.keys(policyPatch?.a4ExecutorProof || {});
  for (const key of proofKeys) {
    if (key !== 'runnerEnabled') errors.push(`${label} may not patch a4ExecutorProof.${key}`);
  }
}

function validatePolicyPatchDryRunArtifact(artifact, proposalReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4PolicyPatchDryRun || {};
  const requiredFields = [
    'authorityLevel',
    'issue',
    'target',
    'action',
    'targetScope',
    'maxWritesPerRun',
    'requiredProofs',
    'policyPatch',
    'enablementProposalReceipt',
    'dryRunOnly',
    'policyFileChanged',
    'policyChangeApplied',
    'writesPerformed',
    'rollbackProofRequired',
    'postActionSmokeRequired',
    'publicAccessFailClosedRequired',
    'evidenceTarget',
  ];

  for (const field of requiredFields) {
    if (!hasValue(artifact[field])) errors.push(`policy patch dry-run missing ${field}`);
  }
  if (artifact.authorityLevel !== 'A4') errors.push('policy patch dry-run authorityLevel must be A4');
  if (artifact.issue !== constraints.expectedIssue) {
    errors.push(`policy patch dry-run issue mismatch: expected ${constraints.expectedIssue}, got ${artifact.issue}`);
  }
  if (artifact.target !== constraints.expectedTarget) {
    errors.push(`policy patch dry-run target mismatch: expected ${constraints.expectedTarget}, got ${artifact.target}`);
  }
  if (artifact.action !== constraints.expectedAction) {
    errors.push(`policy patch dry-run action mismatch: expected ${constraints.expectedAction}, got ${artifact.action}`);
  }
  if (artifact.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('policy patch dry-run enablementProposalReceipt must match proposal receipt path');
  }
  if (artifact.targetScope !== proposalReceipt.targetScope) {
    errors.push('policy patch dry-run targetScope must match enablement proposal receipt');
  }
  if (artifact.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`policy patch dry-run maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  if (artifact.dryRunOnly !== true) errors.push('policy patch dry-run dryRunOnly must be true');
  if (artifact.policyFileChanged !== false) errors.push('policy patch dry-run policyFileChanged must be false');
  if (artifact.policyChangeApplied !== false) errors.push('policy patch dry-run policyChangeApplied must be false');
  if (artifact.rollbackProofRequired !== true) errors.push('policy patch dry-run rollbackProofRequired must be true');
  if (artifact.postActionSmokeRequired !== true) errors.push('policy patch dry-run postActionSmokeRequired must be true');
  if (artifact.publicAccessFailClosedRequired !== true) {
    errors.push('policy patch dry-run publicAccessFailClosedRequired must be true');
  }
  if (artifact.runnerEnabled === true) errors.push('policy patch dry-run runnerEnabled must not be true');
  if (artifact.executionReady === true) errors.push('policy patch dry-run executionReady must not be true');
  if (artifact.executionEnabled === true) errors.push('policy patch dry-run executionEnabled must not be true');
  if (artifact.wouldExecute === true) errors.push('policy patch dry-run wouldExecute must not be true');
  if (artifact.writesPerformed !== 0) {
    errors.push('policy patch dry-run writesPerformed must be 0');
  }

  const requiredProofs = new Set(artifact.requiredProofs || []);
  for (const proof of rules.requiredProofs || []) {
    if (!requiredProofs.has(proof)) errors.push(`policy patch dry-run requiredProofs must include ${proof}`);
  }
  validatePolicyPatchShape(artifact.policyPatch, errors, 'policy patch dry-run policyPatch');
  if (!sameJson(artifact.policyPatch, proposalReceipt.proposedPolicyPatch)) {
    errors.push('policy patch dry-run policyPatch must match enablement proposal receipt proposedPolicyPatch');
  }

  return errors;
}

function buildPolicyPatchDryRunReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  proposalReceipt,
  proposalReceiptPath,
  policyPatch,
  policyPatchPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  proposalReceiptErrors,
  policyPatchErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
    ...proposalReceiptErrors,
    ...policyPatchErrors,
  ];
  const policyPatchDryRunOk = errors.length === 0;

  return {
    mode: 'policy-patch-dry-run-check',
    ok: policyPatchDryRunOk,
    policyPatchDryRunOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    enablementProposalReceipt: rel(proposalReceiptPath),
    policyPatchDryRun: rel(policyPatchPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: policyPatch.targetScope,
    maxWritesPerRun: policyPatch.maxWritesPerRun,
    requiredProofs: policyPatch.requiredProofs || [],
    constraints,
    dryRunOnly: true,
    policyFileChanged: false,
    policyChangeApplied: false,
    policyPatchPreview: policyPatchDryRunOk ? policyPatch.policyPatch : null,
    runnerBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: policyPatchDryRunOk
      ? 'policy patch dry run validated; checked-in repo policy remains blocked until a separate operator PR applies it'
      : 'policy patch dry run rejected before any policy file change',
    evidenceTarget: policyPatch.evidenceTarget || proposalReceipt.evidenceTarget || proposal.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'separate operator-reviewed PR applies the policy patch and reruns public access, rollback, and post-action smoke proof',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      enablementPolicyChangeApplied: manifest.a4ExecutorEnablementProposal?.policyChangeApplied,
      policyPatchDryRunOnly: manifest.a4PolicyPatchDryRun?.dryRunOnly,
      policyPatchFileChanged: manifest.a4PolicyPatchDryRun?.policyFileChanged,
      policyPatchChangeApplied: manifest.a4PolicyPatchDryRun?.policyChangeApplied,
    },
  };
}

function validatePolicyPatchDryRunReceipt(receipt, policyPatch, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'policy-patch-dry-run-check') {
    errors.push('policy patch dry-run receipt mode must be policy-patch-dry-run-check');
  }
  if (receipt.ok !== true || receipt.policyPatchDryRunOk !== true) {
    errors.push('policy patch dry-run receipt must be ok');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`policy patch dry-run receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`policy patch dry-run receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`policy patch dry-run receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.packetPath !== rel(paths.packetPath)) {
    errors.push('policy patch dry-run receipt packetPath must match packet path');
  }
  if (receipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('policy patch dry-run receipt preflightReceipt must match preflight receipt path');
  }
  if (receipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('policy patch dry-run receipt executionReceipt must match execution receipt path');
  }
  if (receipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('policy patch dry-run receipt authorization must match authorization artifact path');
  }
  if (receipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('policy patch dry-run receipt commandArtifact must match command artifact path');
  }
  if (receipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('policy patch dry-run receipt commandReceipt must match command receipt path');
  }
  if (receipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('policy patch dry-run receipt executorProofReceipt must match executor proof receipt path');
  }
  if (receipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('policy patch dry-run receipt enablementProposal must match proposal path');
  }
  if (receipt.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('policy patch dry-run receipt enablementProposalReceipt must match proposal receipt path');
  }
  if (receipt.policyPatchDryRun !== rel(paths.policyPatchPath)) {
    errors.push('policy patch dry-run receipt policyPatchDryRun must match policy patch artifact path');
  }
  if (!sameJson(receipt.policyPatchPreview, policyPatch.policyPatch)) {
    errors.push('policy patch dry-run receipt policyPatchPreview must match policy patch artifact');
  }
  if (receipt.dryRunOnly !== true) errors.push('policy patch dry-run receipt dryRunOnly must be true');
  if (receipt.policyFileChanged !== false) errors.push('policy patch dry-run receipt policyFileChanged must be false');
  if (receipt.policyChangeApplied !== false) errors.push('policy patch dry-run receipt policyChangeApplied must be false');
  if (receipt.runnerEnabled !== false) errors.push('policy patch dry-run receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('policy patch dry-run receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('policy patch dry-run receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('policy patch dry-run receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('policy patch dry-run receipt writesPerformed must be 0');

  if (packet.issue !== receipt.issue) errors.push('policy patch dry-run receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('policy patch dry-run receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('policy patch dry-run receipt action must match packet action');

  return errors;
}

function validatePolicyApplicationCandidateManifest(candidateManifest, baseManifest, policyPatchReceipt, manifest, constraints) {
  const errors = [];
  const expectedManifest = applyObjectPatch(baseManifest, policyPatchReceipt.policyPatchPreview || {});
  const actualDiffPaths = collectJsonDiffPaths(baseManifest, candidateManifest);
  const expectedDiffPaths = collectJsonDiffPaths(baseManifest, expectedManifest);

  if (candidateManifest.id !== baseManifest.id) {
    errors.push('policy application candidate manifest id must match base manifest');
  }
  if (!sameJson(candidateManifest, expectedManifest)) {
    const extraPaths = actualDiffPaths.filter((entry) => !expectedDiffPaths.includes(entry));
    const missingPaths = expectedDiffPaths.filter((entry) => !actualDiffPaths.includes(entry));
    errors.push('policy application candidate manifest must equal base manifest plus policy patch preview');
    if (extraPaths.length) errors.push(`policy application candidate has extra changed paths: ${extraPaths.join(', ')}`);
    if (missingPaths.length) errors.push(`policy application candidate is missing changed paths: ${missingPaths.join(', ')}`);
  }
  if (candidateManifest.authority?.a4Execution !== 'enabled') {
    errors.push('policy application candidate authority.a4Execution must be enabled');
  }
  if (candidateManifest.a4ExecutionCommand?.runnerEnabled !== true) {
    errors.push('policy application candidate a4ExecutionCommand.runnerEnabled must be true');
  }
  if (candidateManifest.a4ExecutorProof?.runnerEnabled !== true) {
    errors.push('policy application candidate a4ExecutorProof.runnerEnabled must be true');
  }
  if (candidateManifest.a4ExecutorEnablementProposal?.maxWritesPerRun !== 1) {
    errors.push('policy application candidate maxWritesPerRun must remain 1');
  }
  for (const proof of manifest.a4PolicyPatchDryRun?.requiredProofs || []) {
    if (!candidateManifest.a4ExecutorEnablementProposal?.requiredProofs?.includes(proof)) {
      errors.push(`policy application candidate requiredProofs must include ${proof}`);
    }
  }
  if (candidateManifest.a4PolicyApplicationDiff?.policyChangeApplied === true) {
    errors.push('policy application candidate must not claim policyChangeApplied in the verifier gate');
  }
  if (candidateManifest.a4PolicyApplicationDiff?.runnerEnabled === true) {
    errors.push('policy application candidate must not claim verifier runnerEnabled');
  }
  if (candidateManifest.a4PolicyApplicationDiff?.executionEnabled === true) {
    errors.push('policy application candidate must not claim verifier executionEnabled');
  }
  if (candidateManifest.issue !== baseManifest.issue) {
    errors.push('policy application candidate issue must match base manifest issue');
  }
  if (policyPatchReceipt.issue !== constraints.expectedIssue) {
    errors.push('policy application policy patch receipt issue must match expected issue');
  }

  return {
    errors,
    actualDiffPaths,
    expectedDiffPaths,
  };
}

function buildPolicyApplicationDiffReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  proposalReceipt,
  proposalReceiptPath,
  policyPatch,
  policyPatchPath,
  policyPatchReceipt,
  policyPatchReceiptPath,
  candidateManifest,
  candidateManifestPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  proposalReceiptErrors,
  policyPatchErrors,
  policyPatchReceiptErrors,
  candidateValidation,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
    ...proposalReceiptErrors,
    ...policyPatchErrors,
    ...policyPatchReceiptErrors,
    ...candidateValidation.errors,
  ];
  const policyApplicationDiffOk = errors.length === 0;

  return {
    mode: 'policy-application-diff-check',
    ok: policyApplicationDiffOk,
    policyApplicationDiffOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    candidateManifest: rel(candidateManifestPath),
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    enablementProposalReceipt: rel(proposalReceiptPath),
    policyPatchDryRun: rel(policyPatchPath),
    policyPatchDryRunReceipt: rel(policyPatchReceiptPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: policyPatchReceipt.targetScope,
    maxWritesPerRun: policyPatchReceipt.maxWritesPerRun,
    requiredProofs: policyPatchReceipt.requiredProofs || [],
    constraints,
    exactPatchOnly: true,
    expectedDiffPaths: candidateValidation.expectedDiffPaths,
    actualDiffPaths: candidateValidation.actualDiffPaths,
    policyPatchPreview: policyApplicationDiffOk ? policyPatchReceipt.policyPatchPreview : null,
    candidateA4Execution: candidateManifest.authority?.a4Execution,
    candidateCommandRunnerEnabled: candidateManifest.a4ExecutionCommand?.runnerEnabled,
    candidateExecutorRunnerEnabled: candidateManifest.a4ExecutorProof?.runnerEnabled,
    policyFileChanged: false,
    policyChangeApplied: false,
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: policyApplicationDiffOk
      ? 'policy application diff validated against the dry-run receipt; current checked-in policy remains blocked in this verifier PR'
      : 'policy application diff rejected before any policy file change',
    evidenceTarget: policyPatchReceipt.evidenceTarget || policyPatch.evidenceTarget || proposal.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-reviewed policy application PR may use this verifier against its candidate manifest before enabling any runner path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      policyApplicationDiffExactPatchOnly: manifest.a4PolicyApplicationDiff?.exactPatchOnly,
      policyApplicationDiffChangeApplied: manifest.a4PolicyApplicationDiff?.policyChangeApplied,
    },
  };
}

function validatePolicyApplicationDiffReceipt(receipt, candidateManifest, policyPatchReceipt, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'policy-application-diff-check') {
    errors.push('policy application diff receipt mode must be policy-application-diff-check');
  }
  if (receipt.ok !== true || receipt.policyApplicationDiffOk !== true) {
    errors.push('policy application diff receipt must be ok');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`policy application diff receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`policy application diff receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`policy application diff receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.packetPath !== rel(paths.packetPath)) {
    errors.push('policy application diff receipt packetPath must match packet path');
  }
  if (receipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('policy application diff receipt preflightReceipt must match preflight receipt path');
  }
  if (receipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('policy application diff receipt executionReceipt must match execution receipt path');
  }
  if (receipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('policy application diff receipt authorization must match authorization artifact path');
  }
  if (receipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('policy application diff receipt commandArtifact must match command artifact path');
  }
  if (receipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('policy application diff receipt commandReceipt must match command receipt path');
  }
  if (receipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('policy application diff receipt executorProofReceipt must match executor proof receipt path');
  }
  if (receipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('policy application diff receipt enablementProposal must match proposal path');
  }
  if (receipt.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('policy application diff receipt enablementProposalReceipt must match proposal receipt path');
  }
  if (receipt.policyPatchDryRun !== rel(paths.policyPatchPath)) {
    errors.push('policy application diff receipt policyPatchDryRun must match policy patch artifact path');
  }
  if (receipt.policyPatchDryRunReceipt !== rel(paths.policyPatchReceiptPath)) {
    errors.push('policy application diff receipt policyPatchDryRunReceipt must match policy patch receipt path');
  }
  if (receipt.candidateManifest !== rel(paths.candidateManifestPath)) {
    errors.push('policy application diff receipt candidateManifest must match candidate manifest path');
  }
  if (!sameJson(receipt.policyPatchPreview, policyPatchReceipt.policyPatchPreview)) {
    errors.push('policy application diff receipt policyPatchPreview must match policy patch receipt');
  }
  if (receipt.candidateA4Execution !== candidateManifest.authority?.a4Execution) {
    errors.push('policy application diff receipt candidateA4Execution must match candidate manifest');
  }
  if (receipt.candidateCommandRunnerEnabled !== candidateManifest.a4ExecutionCommand?.runnerEnabled) {
    errors.push('policy application diff receipt candidateCommandRunnerEnabled must match candidate manifest');
  }
  if (receipt.candidateExecutorRunnerEnabled !== candidateManifest.a4ExecutorProof?.runnerEnabled) {
    errors.push('policy application diff receipt candidateExecutorRunnerEnabled must match candidate manifest');
  }
  if (receipt.policyFileChanged !== false) errors.push('policy application diff receipt policyFileChanged must be false');
  if (receipt.policyChangeApplied !== false) errors.push('policy application diff receipt policyChangeApplied must be false');
  if (receipt.runnerEnabled !== false) errors.push('policy application diff receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('policy application diff receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('policy application diff receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('policy application diff receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('policy application diff receipt writesPerformed must be 0');
  if (receipt.processSpawned === true) errors.push('policy application diff receipt processSpawned must not be true');
  if (Array.isArray(receipt.executedCommands) && receipt.executedCommands.length > 0) {
    errors.push('policy application diff receipt executedCommands must be empty');
  }

  if (packet.issue !== receipt.issue) errors.push('policy application diff receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('policy application diff receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('policy application diff receipt action must match packet action');

  return errors;
}

function validateEnabledCandidateReadiness(candidateManifest, policyApplicationReceipt, manifest) {
  const errors = [];

  if (candidateManifest.authority?.a4Execution !== 'enabled') {
    errors.push('enabled manifest readiness candidate authority.a4Execution must be enabled');
  }
  if (candidateManifest.a4ExecutionCommand?.runnerEnabled !== true) {
    errors.push('enabled manifest readiness candidate command runner must be enabled');
  }
  if (candidateManifest.a4ExecutorProof?.runnerEnabled !== true) {
    errors.push('enabled manifest readiness candidate executor runner must be enabled');
  }
  if (candidateManifest.a4ExecutorProof?.processSpawnPolicy !== 'blocked') {
    errors.push('enabled manifest readiness candidate processSpawnPolicy must remain blocked until implementation PR');
  }
  if (candidateManifest.a4ExecutorProof?.requiresCommandReceipt !== true) {
    errors.push('enabled manifest readiness candidate must still require command receipt');
  }
  if (candidateManifest.a4ExecutorEnablementProposal?.maxWritesPerRun !== 1) {
    errors.push('enabled manifest readiness candidate maxWritesPerRun must remain 1');
  }
  for (const proof of manifest.a4PolicyPatchDryRun?.requiredProofs || []) {
    if (!candidateManifest.a4ExecutorEnablementProposal?.requiredProofs?.includes(proof)) {
      errors.push(`enabled manifest readiness candidate requiredProofs must include ${proof}`);
    }
  }
  if (policyApplicationReceipt.policyApplicationDiffOk !== true) {
    errors.push('enabled manifest readiness requires valid policy application diff receipt');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('enabled manifest readiness current manifest authority.a4Execution must remain blocked');
  }
  if (manifest.a4ExecutionCommand?.runnerEnabled !== false) {
    errors.push('enabled manifest readiness current manifest command runner must remain disabled');
  }
  if (manifest.a4ExecutorProof?.runnerEnabled !== false) {
    errors.push('enabled manifest readiness current manifest executor runner must remain disabled');
  }

  return errors;
}

function validateEnabledManifestReadinessReceipt(receipt, candidateManifest, applicationDiffReceipt, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'enabled-manifest-readiness-check') {
    errors.push('enabled manifest readiness receipt mode must be enabled-manifest-readiness-check');
  }
  if (receipt.ok !== true || receipt.enabledManifestReadinessOk !== true) {
    errors.push('enabled manifest readiness receipt must be ok');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`enabled manifest readiness receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`enabled manifest readiness receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`enabled manifest readiness receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.packetPath !== rel(paths.packetPath)) {
    errors.push('enabled manifest readiness receipt packetPath must match packet path');
  }
  if (receipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('enabled manifest readiness receipt preflightReceipt must match preflight receipt path');
  }
  if (receipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('enabled manifest readiness receipt executionReceipt must match execution receipt path');
  }
  if (receipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('enabled manifest readiness receipt authorization must match authorization artifact path');
  }
  if (receipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('enabled manifest readiness receipt commandArtifact must match command artifact path');
  }
  if (receipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('enabled manifest readiness receipt commandReceipt must match command receipt path');
  }
  if (receipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('enabled manifest readiness receipt executorProofReceipt must match executor proof receipt path');
  }
  if (receipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('enabled manifest readiness receipt enablementProposal must match proposal path');
  }
  if (receipt.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('enabled manifest readiness receipt enablementProposalReceipt must match proposal receipt path');
  }
  if (receipt.policyPatchDryRun !== rel(paths.policyPatchPath)) {
    errors.push('enabled manifest readiness receipt policyPatchDryRun must match policy patch artifact path');
  }
  if (receipt.policyPatchDryRunReceipt !== rel(paths.policyPatchReceiptPath)) {
    errors.push('enabled manifest readiness receipt policyPatchDryRunReceipt must match policy patch receipt path');
  }
  if (receipt.candidateManifest !== rel(paths.candidateManifestPath)) {
    errors.push('enabled manifest readiness receipt candidateManifest must match candidate manifest path');
  }
  if (receipt.applicationDiffReceipt !== rel(paths.applicationDiffReceiptPath)) {
    errors.push('enabled manifest readiness receipt applicationDiffReceipt must match application diff receipt path');
  }
  if (receipt.candidateOnly !== true) errors.push('enabled manifest readiness receipt candidateOnly must be true');
  if (receipt.currentPolicyBlocked !== true) errors.push('enabled manifest readiness receipt currentPolicyBlocked must be true');
  if (receipt.candidateExecutionReady !== true) errors.push('enabled manifest readiness receipt candidateExecutionReady must be true');
  if (receipt.candidateA4Execution !== candidateManifest.authority?.a4Execution) {
    errors.push('enabled manifest readiness receipt candidateA4Execution must match candidate manifest');
  }
  if (receipt.candidateCommandRunnerEnabled !== candidateManifest.a4ExecutionCommand?.runnerEnabled) {
    errors.push('enabled manifest readiness receipt candidateCommandRunnerEnabled must match candidate manifest');
  }
  if (receipt.candidateExecutorRunnerEnabled !== candidateManifest.a4ExecutorProof?.runnerEnabled) {
    errors.push('enabled manifest readiness receipt candidateExecutorRunnerEnabled must match candidate manifest');
  }
  if (!sameJson(receipt.policyPatchPreview, applicationDiffReceipt.policyPatchPreview)) {
    errors.push('enabled manifest readiness receipt policyPatchPreview must match application diff receipt');
  }
  if (receipt.processSpawned !== false) errors.push('enabled manifest readiness receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('enabled manifest readiness receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('enabled manifest readiness receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('enabled manifest readiness receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('enabled manifest readiness receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('enabled manifest readiness receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('enabled manifest readiness receipt writesPerformed must be 0');

  if (packet.issue !== receipt.issue) errors.push('enabled manifest readiness receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('enabled manifest readiness receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('enabled manifest readiness receipt action must match packet action');

  return errors;
}

function validateRunnerImplementationContract(contract, packet, readinessReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4RunnerImplementationContract || {};

  if (contract.authorityLevel !== 'A4') errors.push('runner implementation contract authorityLevel must be A4');
  if (contract.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation contract issue mismatch: expected ${constraints.expectedIssue}, got ${contract.issue}`);
  }
  if (contract.target !== constraints.expectedTarget) {
    errors.push(`runner implementation contract target mismatch: expected ${constraints.expectedTarget}, got ${contract.target}`);
  }
  if (contract.action !== constraints.expectedAction) {
    errors.push(`runner implementation contract action mismatch: expected ${constraints.expectedAction}, got ${contract.action}`);
  }
  if (contract.enabledManifestReadinessReceipt !== rel(paths.readinessReceiptPath)) {
    errors.push('runner implementation contract enabledManifestReadinessReceipt must match readiness receipt path');
  }
  if (!rules.allowedImplementationSurfaces?.includes(contract.implementationSurface)) {
    errors.push('runner implementation contract implementationSurface must be allowed by manifest');
  }
  if (contract.revalidatesFullChainImmediatelyBeforeWrite !== true) {
    errors.push('runner implementation contract must revalidate full chain immediately before write');
  }
  if (contract.requiresCommandReceipt !== true) {
    errors.push('runner implementation contract must require command receipt');
  }
  if (contract.requiresEnabledCheckedInPolicy !== true) {
    errors.push('runner implementation contract must require enabled checked-in policy');
  }
  if (contract.allowedWhenCurrentPolicyBlocked !== false) {
    errors.push('runner implementation contract must not allow execution while current policy is blocked');
  }
  if (contract.processSpawnPolicy !== rules.processSpawnPolicy) {
    errors.push(`runner implementation contract processSpawnPolicy must be ${rules.processSpawnPolicy}`);
  }
  if (contract.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`runner implementation contract maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  for (const proof of rules.requiredProofs || []) {
    if (!contract.requiredProofs?.includes(proof)) {
      errors.push(`runner implementation contract requiredProofs must include ${proof}`);
    }
  }
  if (contract.rollbackProofRequired !== true) errors.push('runner implementation contract rollbackProofRequired must be true');
  if (contract.postActionSmokeRequired !== true) errors.push('runner implementation contract postActionSmokeRequired must be true');
  if (contract.publicAccessFailClosedRequired !== true) {
    errors.push('runner implementation contract publicAccessFailClosedRequired must be true');
  }
  if (contract.processSpawned === true) errors.push('runner implementation contract processSpawned must not be true');
  if (Array.isArray(contract.executedCommands) && contract.executedCommands.length > 0) {
    errors.push('runner implementation contract executedCommands must be empty');
  }
  if (contract.runnerEnabled === true) errors.push('runner implementation contract runnerEnabled must not be true');
  if (contract.executionReady === true) errors.push('runner implementation contract executionReady must not be true');
  if (contract.executionEnabled === true) errors.push('runner implementation contract executionEnabled must not be true');
  if (contract.wouldExecute === true) errors.push('runner implementation contract wouldExecute must not be true');
  if (contract.writesPerformed !== 0) errors.push('runner implementation contract writesPerformed must be 0');

  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('runner implementation contract current manifest authority.a4Execution must remain blocked in this verifier PR');
  }
  if (manifest.a4ExecutionCommand?.runnerEnabled !== false) {
    errors.push('runner implementation contract current manifest command runner must remain disabled');
  }
  if (manifest.a4ExecutorProof?.runnerEnabled !== false) {
    errors.push('runner implementation contract current manifest executor runner must remain disabled');
  }
  if (readinessReceipt.enabledManifestReadinessOk !== true) {
    errors.push('runner implementation contract requires a valid enabled-manifest readiness receipt');
  }
  if (packet.issue !== contract.issue) errors.push('runner implementation contract issue must match packet issue');
  if (packet.target !== contract.target) errors.push('runner implementation contract target must match packet target');
  if (packet.action !== contract.action) errors.push('runner implementation contract action must match packet action');

  return errors;
}

function validateRunnerImplementationContractReceipt(receipt, runnerContract, readinessReceipt, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'runner-implementation-contract-check') {
    errors.push('runner implementation contract receipt mode must be runner-implementation-contract-check');
  }
  if (receipt.ok !== true || receipt.runnerImplementationContractOk !== true) {
    errors.push('runner implementation contract receipt must be ok');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation contract receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`runner implementation contract receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`runner implementation contract receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.packetPath !== rel(paths.packetPath)) {
    errors.push('runner implementation contract receipt packetPath must match packet path');
  }
  if (receipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('runner implementation contract receipt preflightReceipt must match preflight receipt path');
  }
  if (receipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('runner implementation contract receipt executionReceipt must match execution receipt path');
  }
  if (receipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('runner implementation contract receipt authorization must match authorization artifact path');
  }
  if (receipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('runner implementation contract receipt commandArtifact must match command artifact path');
  }
  if (receipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('runner implementation contract receipt commandReceipt must match command receipt path');
  }
  if (receipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('runner implementation contract receipt executorProofReceipt must match executor proof receipt path');
  }
  if (receipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('runner implementation contract receipt enablementProposal must match proposal path');
  }
  if (receipt.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('runner implementation contract receipt enablementProposalReceipt must match proposal receipt path');
  }
  if (receipt.policyPatchDryRun !== rel(paths.policyPatchPath)) {
    errors.push('runner implementation contract receipt policyPatchDryRun must match policy patch artifact path');
  }
  if (receipt.policyPatchDryRunReceipt !== rel(paths.policyPatchReceiptPath)) {
    errors.push('runner implementation contract receipt policyPatchDryRunReceipt must match policy patch receipt path');
  }
  if (receipt.candidateManifest !== rel(paths.candidateManifestPath)) {
    errors.push('runner implementation contract receipt candidateManifest must match candidate manifest path');
  }
  if (receipt.applicationDiffReceipt !== rel(paths.applicationDiffReceiptPath)) {
    errors.push('runner implementation contract receipt applicationDiffReceipt must match application diff receipt path');
  }
  if (receipt.readinessReceipt !== rel(paths.readinessReceiptPath)) {
    errors.push('runner implementation contract receipt readinessReceipt must match readiness receipt path');
  }
  if (receipt.runnerContract !== rel(paths.runnerContractPath)) {
    errors.push('runner implementation contract receipt runnerContract must match runner contract artifact path');
  }
  if (receipt.implementationSurface !== runnerContract.implementationSurface) {
    errors.push('runner implementation contract receipt implementationSurface must match runner contract');
  }
  if (receipt.revalidatesFullChainImmediatelyBeforeWrite !== true) {
    errors.push('runner implementation contract receipt must require immediate full-chain revalidation');
  }
  if (receipt.requiresEnabledCheckedInPolicy !== true) {
    errors.push('runner implementation contract receipt must require enabled checked-in policy');
  }
  if (receipt.allowedWhenCurrentPolicyBlocked !== false) {
    errors.push('runner implementation contract receipt must not allow current blocked policy');
  }
  if (receipt.maxWritesPerRun !== runnerContract.maxWritesPerRun) {
    errors.push('runner implementation contract receipt maxWritesPerRun must match runner contract');
  }
  if (!sameJson(receipt.requiredProofs, runnerContract.requiredProofs)) {
    errors.push('runner implementation contract receipt requiredProofs must match runner contract');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('runner implementation contract receipt currentPolicyBlocked must be true');
  if (receipt.candidateExecutionReady !== readinessReceipt.candidateExecutionReady) {
    errors.push('runner implementation contract receipt candidateExecutionReady must match readiness receipt');
  }
  if (receipt.processSpawned !== false) errors.push('runner implementation contract receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('runner implementation contract receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('runner implementation contract receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('runner implementation contract receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('runner implementation contract receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('runner implementation contract receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('runner implementation contract receipt writesPerformed must be 0');

  if (packet.issue !== receipt.issue) errors.push('runner implementation contract receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('runner implementation contract receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('runner implementation contract receipt action must match packet action');

  return errors;
}

function validateRunnerImplementationPlan(plan, packet, contractReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4RunnerImplementationPlan || {};
  const requiredRevalidationSequence = [
    'approval-check',
    'preflight-check',
    'execution-receipt-check',
    'execution-authorization-check',
    'execution-command-check',
    'executor-proof-check',
    'executor-enable-proposal-check',
    'policy-patch-dry-run-check',
    'policy-application-diff-check',
    'enabled-manifest-readiness-check',
    'runner-implementation-contract-check',
  ];
  const requiredReceiptOutputs = [
    'pre-action-receipt',
    'execution-receipt',
    'post-action-smoke',
    'rollback-readiness',
    'final-outcome',
  ];

  if (plan.authorityLevel !== 'A4') errors.push('runner implementation plan authorityLevel must be A4');
  if (plan.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation plan issue mismatch: expected ${constraints.expectedIssue}, got ${plan.issue}`);
  }
  if (plan.target !== constraints.expectedTarget) {
    errors.push(`runner implementation plan target mismatch: expected ${constraints.expectedTarget}, got ${plan.target}`);
  }
  if (plan.action !== constraints.expectedAction) {
    errors.push(`runner implementation plan action mismatch: expected ${constraints.expectedAction}, got ${plan.action}`);
  }
  if (plan.runnerImplementationContractReceipt !== rel(paths.contractReceiptPath)) {
    errors.push('runner implementation plan runnerImplementationContractReceipt must match contract receipt path');
  }
  if (!rules.allowedImplementationSurfaces?.includes(plan.implementationSurface)) {
    errors.push('runner implementation plan implementationSurface must be allowed by manifest');
  }
  if (!rules.allowedPlannedEntrypoints?.includes(plan.plannedEntrypoint)) {
    errors.push('runner implementation plan plannedEntrypoint must be allowed by manifest');
  }
  if (plan.implementationPlanOnly !== true) errors.push('runner implementation plan implementationPlanOnly must be true');
  if (plan.executableEntrypointAdded !== false) errors.push('runner implementation plan executableEntrypointAdded must be false');
  if (plan.revalidatesFullChainImmediatelyBeforeWrite !== true) {
    errors.push('runner implementation plan must revalidate full chain immediately before write');
  }
  if (plan.requiresEnabledCheckedInPolicy !== true) {
    errors.push('runner implementation plan must require enabled checked-in policy');
  }
  if (plan.requiresCommandReceipt !== true) errors.push('runner implementation plan must require command receipt');
  if (plan.allowedWhenCurrentPolicyBlocked !== false) {
    errors.push('runner implementation plan must not allow execution while current policy is blocked');
  }
  if (plan.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`runner implementation plan maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  for (const proof of rules.requiredProofs || []) {
    if (!plan.requiredProofs?.includes(proof)) {
      errors.push(`runner implementation plan requiredProofs must include ${proof}`);
    }
  }
  for (const guard of rules.requiredGuards || []) {
    if (!plan.requiredGuards?.includes(guard)) {
      errors.push(`runner implementation plan requiredGuards must include ${guard}`);
    }
  }
  for (const check of requiredRevalidationSequence) {
    if (!plan.revalidationSequence?.includes(check)) {
      errors.push(`runner implementation plan revalidationSequence must include ${check}`);
    }
  }
  if (!hasValue(plan.rollbackPlan)) errors.push('runner implementation plan rollbackPlan is required');
  if (!hasValue(plan.postActionSmokePlan)) errors.push('runner implementation plan postActionSmokePlan is required');
  if (!hasValue(plan.publicAccessFailClosedPlan)) {
    errors.push('runner implementation plan publicAccessFailClosedPlan is required');
  }
  if (!hasValue(plan.stopConditions)) errors.push('runner implementation plan stopConditions are required');
  for (const output of requiredReceiptOutputs) {
    if (!plan.receiptOutputs?.includes(output)) {
      errors.push(`runner implementation plan receiptOutputs must include ${output}`);
    }
  }
  if (plan.processSpawned === true) errors.push('runner implementation plan processSpawned must not be true');
  if (Array.isArray(plan.executedCommands) && plan.executedCommands.length > 0) {
    errors.push('runner implementation plan executedCommands must be empty');
  }
  if (plan.runnerEnabled === true) errors.push('runner implementation plan runnerEnabled must not be true');
  if (plan.executionReady === true) errors.push('runner implementation plan executionReady must not be true');
  if (plan.executionEnabled === true) errors.push('runner implementation plan executionEnabled must not be true');
  if (plan.wouldExecute === true) errors.push('runner implementation plan wouldExecute must not be true');
  if (plan.writesPerformed !== 0) errors.push('runner implementation plan writesPerformed must be 0');

  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('runner implementation plan current manifest authority.a4Execution must remain blocked in this verifier PR');
  }
  if (contractReceipt.runnerImplementationContractOk !== true) {
    errors.push('runner implementation plan requires a valid runner implementation contract receipt');
  }
  if (packet.issue !== plan.issue) errors.push('runner implementation plan issue must match packet issue');
  if (packet.target !== plan.target) errors.push('runner implementation plan target must match packet target');
  if (packet.action !== plan.action) errors.push('runner implementation plan action must match packet action');

  return errors;
}

function buildEnabledManifestReadinessReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  proposalReceipt,
  proposalReceiptPath,
  policyPatch,
  policyPatchPath,
  policyPatchReceipt,
  policyPatchReceiptPath,
  candidateManifest,
  candidateManifestPath,
  applicationDiffReceipt,
  applicationDiffReceiptPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  proposalReceiptErrors,
  policyPatchErrors,
  policyPatchReceiptErrors,
  candidateValidation,
  applicationDiffReceiptErrors,
  readinessErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
    ...proposalReceiptErrors,
    ...policyPatchErrors,
    ...policyPatchReceiptErrors,
    ...candidateValidation.errors,
    ...applicationDiffReceiptErrors,
    ...readinessErrors,
  ];
  const enabledManifestReadinessOk = errors.length === 0;

  return {
    mode: 'enabled-manifest-readiness-check',
    ok: enabledManifestReadinessOk,
    enabledManifestReadinessOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    candidateManifest: rel(candidateManifestPath),
    applicationDiffReceipt: rel(applicationDiffReceiptPath),
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    enablementProposalReceipt: rel(proposalReceiptPath),
    policyPatchDryRun: rel(policyPatchPath),
    policyPatchDryRunReceipt: rel(policyPatchReceiptPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: applicationDiffReceipt.targetScope,
    maxWritesPerRun: applicationDiffReceipt.maxWritesPerRun,
    requiredProofs: applicationDiffReceipt.requiredProofs || [],
    constraints,
    candidateOnly: true,
    currentPolicyBlocked: true,
    candidateA4Execution: candidateManifest.authority?.a4Execution,
    candidateCommandRunnerEnabled: candidateManifest.a4ExecutionCommand?.runnerEnabled,
    candidateExecutorRunnerEnabled: candidateManifest.a4ExecutorProof?.runnerEnabled,
    candidateExecutionReady: enabledManifestReadinessOk,
    policyPatchPreview: enabledManifestReadinessOk ? applicationDiffReceipt.policyPatchPreview : null,
    processSpawnPolicy: manifest.a4EnabledManifestReadiness?.processSpawnPolicy || 'blocked',
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: enabledManifestReadinessOk
      ? 'candidate enabled manifest is ready for a future implementation PR; current checked-in policy remains blocked and no process was spawned'
      : 'candidate enabled manifest readiness rejected before any runner path',
    evidenceTarget: applicationDiffReceipt.evidenceTarget || policyPatchReceipt.evidenceTarget || proposal.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-reviewed implementation PR may add a runner that revalidates this full chain immediately before any write',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      enabledManifestReadinessCandidateOnly: manifest.a4EnabledManifestReadiness?.candidateOnly,
      enabledManifestReadinessProcessSpawnPolicy: manifest.a4EnabledManifestReadiness?.processSpawnPolicy,
    },
  };
}

function buildRunnerImplementationContractReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  proposalReceipt,
  proposalReceiptPath,
  policyPatch,
  policyPatchPath,
  policyPatchReceipt,
  policyPatchReceiptPath,
  candidateManifest,
  candidateManifestPath,
  applicationDiffReceipt,
  applicationDiffReceiptPath,
  readinessReceipt,
  readinessReceiptPath,
  runnerContract,
  runnerContractPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  proposalReceiptErrors,
  policyPatchErrors,
  policyPatchReceiptErrors,
  candidateValidation,
  applicationDiffReceiptErrors,
  readinessErrors,
  readinessReceiptErrors,
  runnerContractErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
    ...proposalReceiptErrors,
    ...policyPatchErrors,
    ...policyPatchReceiptErrors,
    ...candidateValidation.errors,
    ...applicationDiffReceiptErrors,
    ...readinessErrors,
    ...readinessReceiptErrors,
    ...runnerContractErrors,
  ];
  const runnerImplementationContractOk = errors.length === 0;

  return {
    mode: 'runner-implementation-contract-check',
    ok: runnerImplementationContractOk,
    runnerImplementationContractOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    runnerContract: rel(runnerContractPath),
    readinessReceipt: rel(readinessReceiptPath),
    candidateManifest: rel(candidateManifestPath),
    applicationDiffReceipt: rel(applicationDiffReceiptPath),
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    enablementProposalReceipt: rel(proposalReceiptPath),
    policyPatchDryRun: rel(policyPatchPath),
    policyPatchDryRunReceipt: rel(policyPatchReceiptPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: runnerContract.targetScope || readinessReceipt.targetScope || applicationDiffReceipt.targetScope,
    implementationSurface: runnerContract.implementationSurface,
    revalidatesFullChainImmediatelyBeforeWrite: runnerContract.revalidatesFullChainImmediatelyBeforeWrite === true,
    requiresEnabledCheckedInPolicy: runnerContract.requiresEnabledCheckedInPolicy === true,
    allowedWhenCurrentPolicyBlocked: runnerContract.allowedWhenCurrentPolicyBlocked === true,
    maxWritesPerRun: runnerContract.maxWritesPerRun,
    requiredProofs: runnerContract.requiredProofs || [],
    currentPolicyBlocked: true,
    candidateExecutionReady: readinessReceipt.candidateExecutionReady === true,
    processSpawnPolicy: runnerContract.processSpawnPolicy,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: runnerImplementationContractOk
      ? 'runner implementation contract admitted for a future PR; current checked-in policy remains blocked and no process was spawned'
      : 'runner implementation contract rejected before any runner path',
    evidenceTarget: runnerContract.evidenceTarget || readinessReceipt.evidenceTarget || applicationDiffReceipt.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-reviewed implementation PR may add runner code only after checked-in policy is enabled and the runner revalidates this full chain immediately before any write',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      runnerContractRequiresReadinessReceipt: manifest.a4RunnerImplementationContract?.requiresEnabledManifestReadinessReceipt,
      runnerContractRequiresImmediateRevalidation: manifest.a4RunnerImplementationContract?.requiresImmediateFullChainRevalidation,
      runnerContractProcessSpawnPolicy: manifest.a4RunnerImplementationContract?.processSpawnPolicy,
    },
  };
}

function buildRunnerImplementationPlanReceipt({
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
  commandReceipt,
  commandReceiptPath,
  executorProofReceipt,
  executorProofPath,
  proposal,
  proposalPath,
  proposalReceipt,
  proposalReceiptPath,
  policyPatch,
  policyPatchPath,
  policyPatchReceipt,
  policyPatchReceiptPath,
  candidateManifest,
  candidateManifestPath,
  applicationDiffReceipt,
  applicationDiffReceiptPath,
  readinessReceipt,
  readinessReceiptPath,
  runnerContract,
  runnerContractPath,
  contractReceipt,
  contractReceiptPath,
  runnerPlan,
  runnerPlanPath,
  constraints,
  packetValidation,
  preflightErrors,
  executionErrors,
  authorizationErrors,
  commandErrors,
  commandReceiptErrors,
  executorProofErrors,
  proposalErrors,
  proposalReceiptErrors,
  policyPatchErrors,
  policyPatchReceiptErrors,
  candidateValidation,
  applicationDiffReceiptErrors,
  readinessErrors,
  readinessReceiptErrors,
  runnerContractErrors,
  contractReceiptErrors,
  runnerPlanErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...packetValidation.errors,
    ...preflightErrors,
    ...executionErrors,
    ...authorizationErrors,
    ...commandErrors,
    ...commandReceiptErrors,
    ...executorProofErrors,
    ...proposalErrors,
    ...proposalReceiptErrors,
    ...policyPatchErrors,
    ...policyPatchReceiptErrors,
    ...candidateValidation.errors,
    ...applicationDiffReceiptErrors,
    ...readinessErrors,
    ...readinessReceiptErrors,
    ...runnerContractErrors,
    ...contractReceiptErrors,
    ...runnerPlanErrors,
  ];
  const runnerImplementationPlanOk = errors.length === 0;

  return {
    mode: 'runner-implementation-plan-check',
    ok: runnerImplementationPlanOk,
    runnerImplementationPlanOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    runnerPlan: rel(runnerPlanPath),
    runnerImplementationContractReceipt: rel(contractReceiptPath),
    runnerContract: rel(runnerContractPath),
    readinessReceipt: rel(readinessReceiptPath),
    candidateManifest: rel(candidateManifestPath),
    applicationDiffReceipt: rel(applicationDiffReceiptPath),
    packetPath: rel(packetPath),
    preflightReceipt: rel(preflightPath),
    executionReceipt: rel(executionPath),
    authorization: rel(authorizationPath),
    commandArtifact: rel(commandPath),
    commandReceipt: rel(commandReceiptPath),
    executorProofReceipt: rel(executorProofPath),
    enablementProposal: rel(proposalPath),
    enablementProposalReceipt: rel(proposalReceiptPath),
    policyPatchDryRun: rel(policyPatchPath),
    policyPatchDryRunReceipt: rel(policyPatchReceiptPath),
    issue: packet.issue || constraints.expectedIssue,
    authorityLevel: packet.authorityLevel,
    target: packet.target,
    action: packet.action,
    targetScope: runnerPlan.targetScope || contractReceipt.targetScope || runnerContract.targetScope,
    implementationSurface: runnerPlan.implementationSurface,
    plannedEntrypoint: runnerPlan.plannedEntrypoint,
    implementationPlanOnly: runnerPlan.implementationPlanOnly === true,
    executableEntrypointAdded: runnerPlan.executableEntrypointAdded === true,
    revalidatesFullChainImmediatelyBeforeWrite: runnerPlan.revalidatesFullChainImmediatelyBeforeWrite === true,
    requiresEnabledCheckedInPolicy: runnerPlan.requiresEnabledCheckedInPolicy === true,
    allowedWhenCurrentPolicyBlocked: runnerPlan.allowedWhenCurrentPolicyBlocked === true,
    maxWritesPerRun: runnerPlan.maxWritesPerRun,
    requiredProofs: runnerPlan.requiredProofs || [],
    requiredGuards: runnerPlan.requiredGuards || [],
    revalidationSequence: runnerPlan.revalidationSequence || [],
    receiptOutputs: runnerPlan.receiptOutputs || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: runnerImplementationPlanOk
      ? 'runner implementation plan admitted for a future PR; no executable entrypoint was added and current checked-in policy remains blocked'
      : 'runner implementation plan rejected before any runner implementation path',
    evidenceTarget: runnerPlan.evidenceTarget || contractReceipt.evidenceTarget || runnerContract.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-reviewed implementation PR may add the planned runner entrypoint only after checked-in policy is enabled and this plan is revalidated',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      runnerPlanRequiresContractReceipt: manifest.a4RunnerImplementationPlan?.requiresRunnerImplementationContractReceipt,
      runnerPlanOnly: manifest.a4RunnerImplementationPlan?.planOnly,
      runnerPlanEntrypointAdded: manifest.a4RunnerImplementationPlan?.executableEntrypointAdded,
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

function commandExecutorProofCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for executor-proof-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for executor-proof-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for executor-proof-check');
  if (!options.authorization) throw new Error('--authorization is required for executor-proof-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for executor-proof-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for executor-proof-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const result = buildExecutorProofReceipt({
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
    commandReceipt,
    commandReceiptPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandExecutorEnableProposalCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for executor-enable-proposal-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for executor-enable-proposal-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for executor-enable-proposal-check');
  if (!options.authorization) throw new Error('--authorization is required for executor-enable-proposal-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for executor-enable-proposal-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for executor-enable-proposal-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for executor-enable-proposal-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for executor-enable-proposal-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const result = buildExecutorEnablementProposalReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandPolicyPatchDryRunCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for policy-patch-dry-run-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for policy-patch-dry-run-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for policy-patch-dry-run-check');
  if (!options.authorization) throw new Error('--authorization is required for policy-patch-dry-run-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for policy-patch-dry-run-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for policy-patch-dry-run-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for policy-patch-dry-run-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for policy-patch-dry-run-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for policy-patch-dry-run-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for policy-patch-dry-run-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const proposalReceiptPath = resolveFromRoot(options.enablementProposalReceipt);
  const policyPatchPath = resolveFromRoot(options.policyPatch);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
  const proposalReceipt = readJson(proposalReceiptPath);
  const policyPatch = readJson(policyPatchPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const proposalReceiptErrors = validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  }, constraints);
  const policyPatchErrors = validatePolicyPatchDryRunArtifact(policyPatch, proposalReceipt, manifest, {
    proposalReceiptPath,
  }, constraints);
  const result = buildPolicyPatchDryRunReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    proposalReceipt,
    proposalReceiptPath,
    policyPatch,
    policyPatchPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    proposalReceiptErrors,
    policyPatchErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandPolicyApplicationDiffCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for policy-application-diff-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for policy-application-diff-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for policy-application-diff-check');
  if (!options.authorization) throw new Error('--authorization is required for policy-application-diff-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for policy-application-diff-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for policy-application-diff-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for policy-application-diff-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for policy-application-diff-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for policy-application-diff-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for policy-application-diff-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for policy-application-diff-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for policy-application-diff-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const proposalReceiptPath = resolveFromRoot(options.enablementProposalReceipt);
  const policyPatchPath = resolveFromRoot(options.policyPatch);
  const policyPatchReceiptPath = resolveFromRoot(options.policyPatchReceipt);
  const candidateManifestPath = resolveFromRoot(options.candidateManifest);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
  const proposalReceipt = readJson(proposalReceiptPath);
  const policyPatch = readJson(policyPatchPath);
  const policyPatchReceipt = readJson(policyPatchReceiptPath);
  const candidateManifest = readJson(candidateManifestPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const proposalReceiptErrors = validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  }, constraints);
  const policyPatchErrors = validatePolicyPatchDryRunArtifact(policyPatch, proposalReceipt, manifest, {
    proposalReceiptPath,
  }, constraints);
  const policyPatchReceiptErrors = validatePolicyPatchDryRunReceipt(policyPatchReceipt, policyPatch, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
  }, constraints);
  const candidateValidation = validatePolicyApplicationCandidateManifest(
    candidateManifest,
    manifest,
    policyPatchReceipt,
    manifest,
    constraints,
  );
  const result = buildPolicyApplicationDiffReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    proposalReceipt,
    proposalReceiptPath,
    policyPatch,
    policyPatchPath,
    policyPatchReceipt,
    policyPatchReceiptPath,
    candidateManifest,
    candidateManifestPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    proposalReceiptErrors,
    policyPatchErrors,
    policyPatchReceiptErrors,
    candidateValidation,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandEnabledManifestReadinessCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for enabled-manifest-readiness-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for enabled-manifest-readiness-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for enabled-manifest-readiness-check');
  if (!options.authorization) throw new Error('--authorization is required for enabled-manifest-readiness-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for enabled-manifest-readiness-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for enabled-manifest-readiness-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for enabled-manifest-readiness-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for enabled-manifest-readiness-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for enabled-manifest-readiness-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for enabled-manifest-readiness-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for enabled-manifest-readiness-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for enabled-manifest-readiness-check');
  if (!options.applicationDiffReceipt) {
    throw new Error('--application-diff-receipt is required for enabled-manifest-readiness-check');
  }

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const proposalReceiptPath = resolveFromRoot(options.enablementProposalReceipt);
  const policyPatchPath = resolveFromRoot(options.policyPatch);
  const policyPatchReceiptPath = resolveFromRoot(options.policyPatchReceipt);
  const candidateManifestPath = resolveFromRoot(options.candidateManifest);
  const applicationDiffReceiptPath = resolveFromRoot(options.applicationDiffReceipt);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
  const proposalReceipt = readJson(proposalReceiptPath);
  const policyPatch = readJson(policyPatchPath);
  const policyPatchReceipt = readJson(policyPatchReceiptPath);
  const candidateManifest = readJson(candidateManifestPath);
  const applicationDiffReceipt = readJson(applicationDiffReceiptPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const proposalReceiptErrors = validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  }, constraints);
  const policyPatchErrors = validatePolicyPatchDryRunArtifact(policyPatch, proposalReceipt, manifest, {
    proposalReceiptPath,
  }, constraints);
  const policyPatchReceiptErrors = validatePolicyPatchDryRunReceipt(policyPatchReceipt, policyPatch, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
  }, constraints);
  const candidateValidation = validatePolicyApplicationCandidateManifest(
    candidateManifest,
    manifest,
    policyPatchReceipt,
    manifest,
    constraints,
  );
  const applicationDiffReceiptErrors = validatePolicyApplicationDiffReceipt(applicationDiffReceipt, candidateManifest, policyPatchReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
  }, constraints);
  const readinessErrors = validateEnabledCandidateReadiness(candidateManifest, applicationDiffReceipt, manifest);
  const result = buildEnabledManifestReadinessReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    proposalReceipt,
    proposalReceiptPath,
    policyPatch,
    policyPatchPath,
    policyPatchReceipt,
    policyPatchReceiptPath,
    candidateManifest,
    candidateManifestPath,
    applicationDiffReceipt,
    applicationDiffReceiptPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    proposalReceiptErrors,
    policyPatchErrors,
    policyPatchReceiptErrors,
    candidateValidation,
    applicationDiffReceiptErrors,
    readinessErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandRunnerImplementationContractCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for runner-implementation-contract-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for runner-implementation-contract-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for runner-implementation-contract-check');
  if (!options.authorization) throw new Error('--authorization is required for runner-implementation-contract-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for runner-implementation-contract-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for runner-implementation-contract-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for runner-implementation-contract-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for runner-implementation-contract-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for runner-implementation-contract-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for runner-implementation-contract-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for runner-implementation-contract-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for runner-implementation-contract-check');
  if (!options.applicationDiffReceipt) {
    throw new Error('--application-diff-receipt is required for runner-implementation-contract-check');
  }
  if (!options.readinessReceipt) {
    throw new Error('--readiness-receipt is required for runner-implementation-contract-check');
  }
  if (!options.runnerContract) throw new Error('--runner-contract is required for runner-implementation-contract-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const proposalReceiptPath = resolveFromRoot(options.enablementProposalReceipt);
  const policyPatchPath = resolveFromRoot(options.policyPatch);
  const policyPatchReceiptPath = resolveFromRoot(options.policyPatchReceipt);
  const candidateManifestPath = resolveFromRoot(options.candidateManifest);
  const applicationDiffReceiptPath = resolveFromRoot(options.applicationDiffReceipt);
  const readinessReceiptPath = resolveFromRoot(options.readinessReceipt);
  const runnerContractPath = resolveFromRoot(options.runnerContract);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
  const proposalReceipt = readJson(proposalReceiptPath);
  const policyPatch = readJson(policyPatchPath);
  const policyPatchReceipt = readJson(policyPatchReceiptPath);
  const candidateManifest = readJson(candidateManifestPath);
  const applicationDiffReceipt = readJson(applicationDiffReceiptPath);
  const readinessReceipt = readJson(readinessReceiptPath);
  const runnerContract = readJson(runnerContractPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const proposalReceiptErrors = validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  }, constraints);
  const policyPatchErrors = validatePolicyPatchDryRunArtifact(policyPatch, proposalReceipt, manifest, {
    proposalReceiptPath,
  }, constraints);
  const policyPatchReceiptErrors = validatePolicyPatchDryRunReceipt(policyPatchReceipt, policyPatch, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
  }, constraints);
  const candidateValidation = validatePolicyApplicationCandidateManifest(
    candidateManifest,
    manifest,
    policyPatchReceipt,
    manifest,
    constraints,
  );
  const applicationDiffReceiptErrors = validatePolicyApplicationDiffReceipt(applicationDiffReceipt, candidateManifest, policyPatchReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
  }, constraints);
  const readinessErrors = validateEnabledCandidateReadiness(candidateManifest, applicationDiffReceipt, manifest);
  const readinessReceiptErrors = validateEnabledManifestReadinessReceipt(readinessReceipt, candidateManifest, applicationDiffReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
    applicationDiffReceiptPath,
  }, constraints);
  const runnerContractErrors = validateRunnerImplementationContract(runnerContract, packet, readinessReceipt, manifest, {
    readinessReceiptPath,
  }, constraints);
  const result = buildRunnerImplementationContractReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    proposalReceipt,
    proposalReceiptPath,
    policyPatch,
    policyPatchPath,
    policyPatchReceipt,
    policyPatchReceiptPath,
    candidateManifest,
    candidateManifestPath,
    applicationDiffReceipt,
    applicationDiffReceiptPath,
    readinessReceipt,
    readinessReceiptPath,
    runnerContract,
    runnerContractPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    proposalReceiptErrors,
    policyPatchErrors,
    policyPatchReceiptErrors,
    candidateValidation,
    applicationDiffReceiptErrors,
    readinessErrors,
    readinessReceiptErrors,
    runnerContractErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandRunnerImplementationPlanCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for runner-implementation-plan-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for runner-implementation-plan-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for runner-implementation-plan-check');
  if (!options.authorization) throw new Error('--authorization is required for runner-implementation-plan-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for runner-implementation-plan-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for runner-implementation-plan-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for runner-implementation-plan-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for runner-implementation-plan-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for runner-implementation-plan-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for runner-implementation-plan-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for runner-implementation-plan-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for runner-implementation-plan-check');
  if (!options.applicationDiffReceipt) {
    throw new Error('--application-diff-receipt is required for runner-implementation-plan-check');
  }
  if (!options.readinessReceipt) {
    throw new Error('--readiness-receipt is required for runner-implementation-plan-check');
  }
  if (!options.runnerContract) throw new Error('--runner-contract is required for runner-implementation-plan-check');
  if (!options.runnerContractReceipt) {
    throw new Error('--runner-contract-receipt is required for runner-implementation-plan-check');
  }
  if (!options.runnerPlan) throw new Error('--runner-plan is required for runner-implementation-plan-check');

  const manifest = readJson(resolveFromRoot(options.manifest));
  const packetPath = resolveFromRoot(options.packet);
  const preflightPath = resolveFromRoot(options.preflightReceipt);
  const executionPath = resolveFromRoot(options.executionReceipt);
  const authorizationPath = resolveFromRoot(options.authorization);
  const commandPath = resolveFromRoot(options.commandArtifact);
  const commandReceiptPath = resolveFromRoot(options.commandReceipt);
  const executorProofPath = resolveFromRoot(options.executorProofReceipt);
  const proposalPath = resolveFromRoot(options.enablementProposal);
  const proposalReceiptPath = resolveFromRoot(options.enablementProposalReceipt);
  const policyPatchPath = resolveFromRoot(options.policyPatch);
  const policyPatchReceiptPath = resolveFromRoot(options.policyPatchReceipt);
  const candidateManifestPath = resolveFromRoot(options.candidateManifest);
  const applicationDiffReceiptPath = resolveFromRoot(options.applicationDiffReceipt);
  const readinessReceiptPath = resolveFromRoot(options.readinessReceipt);
  const runnerContractPath = resolveFromRoot(options.runnerContract);
  const contractReceiptPath = resolveFromRoot(options.runnerContractReceipt);
  const runnerPlanPath = resolveFromRoot(options.runnerPlan);
  const packet = readJson(packetPath);
  const preflightReceipt = readJson(preflightPath);
  const executionReceipt = readJson(executionPath);
  const authorization = readJson(authorizationPath);
  const commandArtifact = readJson(commandPath);
  const commandReceipt = readJson(commandReceiptPath);
  const executorProofReceipt = readJson(executorProofPath);
  const proposal = readJson(proposalPath);
  const proposalReceipt = readJson(proposalReceiptPath);
  const policyPatch = readJson(policyPatchPath);
  const policyPatchReceipt = readJson(policyPatchReceiptPath);
  const candidateManifest = readJson(candidateManifestPath);
  const applicationDiffReceipt = readJson(applicationDiffReceiptPath);
  const readinessReceipt = readJson(readinessReceiptPath);
  const runnerContract = readJson(runnerContractPath);
  const contractReceipt = readJson(contractReceiptPath);
  const runnerPlan = readJson(runnerPlanPath);
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
  const commandReceiptErrors = validateExecutionCommandReceipt(commandReceipt, packet, executionReceipt, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
  }, constraints);
  const executorProofErrors = validateExecutorProofReceipt(executorProofReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  }, constraints);
  const proposalErrors = validateExecutorEnablementProposal(proposal, packet, executorProofReceipt, manifest, {
    executorProofPath,
  }, constraints);
  const proposalReceiptErrors = validateExecutorEnablementProposalReceipt(proposalReceipt, proposal, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  }, constraints);
  const policyPatchErrors = validatePolicyPatchDryRunArtifact(policyPatch, proposalReceipt, manifest, {
    proposalReceiptPath,
  }, constraints);
  const policyPatchReceiptErrors = validatePolicyPatchDryRunReceipt(policyPatchReceipt, policyPatch, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
  }, constraints);
  const candidateValidation = validatePolicyApplicationCandidateManifest(
    candidateManifest,
    manifest,
    policyPatchReceipt,
    manifest,
    constraints,
  );
  const applicationDiffReceiptErrors = validatePolicyApplicationDiffReceipt(applicationDiffReceipt, candidateManifest, policyPatchReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
  }, constraints);
  const readinessErrors = validateEnabledCandidateReadiness(candidateManifest, applicationDiffReceipt, manifest);
  const readinessReceiptErrors = validateEnabledManifestReadinessReceipt(readinessReceipt, candidateManifest, applicationDiffReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
    applicationDiffReceiptPath,
  }, constraints);
  const runnerContractErrors = validateRunnerImplementationContract(runnerContract, packet, readinessReceipt, manifest, {
    readinessReceiptPath,
  }, constraints);
  const contractReceiptErrors = validateRunnerImplementationContractReceipt(contractReceipt, runnerContract, readinessReceipt, packet, {
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
    applicationDiffReceiptPath,
    readinessReceiptPath,
    runnerContractPath,
  }, constraints);
  const runnerPlanErrors = validateRunnerImplementationPlan(runnerPlan, packet, contractReceipt, manifest, {
    contractReceiptPath,
  }, constraints);
  const result = buildRunnerImplementationPlanReceipt({
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
    commandReceipt,
    commandReceiptPath,
    executorProofReceipt,
    executorProofPath,
    proposal,
    proposalPath,
    proposalReceipt,
    proposalReceiptPath,
    policyPatch,
    policyPatchPath,
    policyPatchReceipt,
    policyPatchReceiptPath,
    candidateManifest,
    candidateManifestPath,
    applicationDiffReceipt,
    applicationDiffReceiptPath,
    readinessReceipt,
    readinessReceiptPath,
    runnerContract,
    runnerContractPath,
    contractReceipt,
    contractReceiptPath,
    runnerPlan,
    runnerPlanPath,
    constraints,
    packetValidation,
    preflightErrors,
    executionErrors,
    authorizationErrors,
    commandErrors,
    commandReceiptErrors,
    executorProofErrors,
    proposalErrors,
    proposalReceiptErrors,
    policyPatchErrors,
    policyPatchReceiptErrors,
    candidateValidation,
    applicationDiffReceiptErrors,
    readinessErrors,
    readinessReceiptErrors,
    runnerContractErrors,
    contractReceiptErrors,
    runnerPlanErrors,
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
  node scripts/operator-agent-omnigent-adapter.mjs executor-proof-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs executor-enable-proposal-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs policy-patch-dry-run-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs policy-application-diff-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs enabled-manifest-readiness-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-contract-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-plan-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
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
  else if (options.command === 'executor-proof-check') result = commandExecutorProofCheck(options);
  else if (options.command === 'executor-enable-proposal-check') result = commandExecutorEnableProposalCheck(options);
  else if (options.command === 'policy-patch-dry-run-check') result = commandPolicyPatchDryRunCheck(options);
  else if (options.command === 'policy-application-diff-check') result = commandPolicyApplicationDiffCheck(options);
  else if (options.command === 'enabled-manifest-readiness-check') result = commandEnabledManifestReadinessCheck(options);
  else if (options.command === 'runner-implementation-contract-check') result = commandRunnerImplementationContractCheck(options);
  else if (options.command === 'runner-implementation-plan-check') result = commandRunnerImplementationPlanCheck(options);
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
  commandExecutorEnableProposalCheck,
  commandPolicyPatchDryRunCheck,
  commandPolicyApplicationDiffCheck,
  commandEnabledManifestReadinessCheck,
  commandRunnerImplementationContractCheck,
  commandRunnerImplementationPlanCheck,
  commandExecutorProofCheck,
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
