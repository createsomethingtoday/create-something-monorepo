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
    runnerPlanReceipt: null,
    runnerDiff: null,
    runnerDiffReceipt: null,
    releaseAdmission: null,
    releaseAdmissionReceipt: null,
    executionRunbook: null,
    executionRunbookReceipt: null,
    receiptBundle: null,
    receiptBundleReceipt: null,
    receiptPublication: null,
    receiptPublicationReceipt: null,
    receiptReviewDecision: null,
    receiptReviewDecisionReceipt: null,
    manualNextStepHandoff: null,
    manualNextStepHandoffReceipt: null,
    manualFollowUpIssueEvidence: null,
    manualFollowUpIssueEvidenceReceipt: null,
    followUpWorkIntake: null,
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
    else if (arg === '--runner-plan-receipt' && args[index + 1]) options.runnerPlanReceipt = args[++index];
    else if (arg === '--runner-diff' && args[index + 1]) options.runnerDiff = args[++index];
    else if (arg === '--runner-diff-receipt' && args[index + 1]) options.runnerDiffReceipt = args[++index];
    else if (arg === '--release-admission' && args[index + 1]) options.releaseAdmission = args[++index];
    else if (arg === '--release-admission-receipt' && args[index + 1]) options.releaseAdmissionReceipt = args[++index];
    else if (arg === '--execution-runbook' && args[index + 1]) options.executionRunbook = args[++index];
    else if (arg === '--execution-runbook-receipt' && args[index + 1]) options.executionRunbookReceipt = args[++index];
    else if (arg === '--receipt-bundle' && args[index + 1]) options.receiptBundle = args[++index];
    else if (arg === '--receipt-bundle-receipt' && args[index + 1]) options.receiptBundleReceipt = args[++index];
    else if (arg === '--receipt-publication' && args[index + 1]) options.receiptPublication = args[++index];
    else if (arg === '--receipt-publication-receipt' && args[index + 1]) options.receiptPublicationReceipt = args[++index];
    else if (arg === '--receipt-review-decision' && args[index + 1]) options.receiptReviewDecision = args[++index];
    else if (arg === '--receipt-review-decision-receipt' && args[index + 1]) options.receiptReviewDecisionReceipt = args[++index];
    else if (arg === '--manual-next-step-handoff' && args[index + 1]) options.manualNextStepHandoff = args[++index];
    else if (arg === '--manual-next-step-handoff-receipt' && args[index + 1]) options.manualNextStepHandoffReceipt = args[++index];
    else if (arg === '--manual-follow-up-issue-evidence' && args[index + 1]) options.manualFollowUpIssueEvidence = args[++index];
    else if (arg === '--manual-follow-up-issue-evidence-receipt' && args[index + 1]) options.manualFollowUpIssueEvidenceReceipt = args[++index];
    else if (arg === '--follow-up-work-intake' && args[index + 1]) options.followUpWorkIntake = args[++index];
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

  const runnerImplementationDiff = manifest.a4RunnerImplementationDiff || {};
  if (runnerImplementationDiff.requiresRunnerImplementationPlanReceipt !== true) {
    errors.push('a4RunnerImplementationDiff.requiresRunnerImplementationPlanReceipt must be true');
  }
  if (runnerImplementationDiff.candidateOnly !== true) {
    errors.push('a4RunnerImplementationDiff.candidateOnly must be true');
  }
  if (runnerImplementationDiff.checkedInEntrypointMustBeAbsent !== true) {
    errors.push('a4RunnerImplementationDiff.checkedInEntrypointMustBeAbsent must be true');
  }
  if (runnerImplementationDiff.allowedEntrypoint !== 'scripts/operator-agent-omnigent-runner.mjs') {
    errors.push('a4RunnerImplementationDiff.allowedEntrypoint must be scripts/operator-agent-omnigent-runner.mjs');
  }
  if (!runnerImplementationDiff.allowedFileAdditions?.includes('scripts/operator-agent-omnigent-runner.mjs')) {
    errors.push('a4RunnerImplementationDiff.allowedFileAdditions must include scripts/operator-agent-omnigent-runner.mjs');
  }
  const missingDiffGuards = includesAll(runnerImplementationDiff.requiredGuards, runnerImplementationPlan.requiredGuards || []);
  if (missingDiffGuards.length) {
    errors.push(`a4RunnerImplementationDiff.requiredGuards missing: ${missingDiffGuards.join(', ')}`);
  }
  if (runnerImplementationDiff.maxWritesPerRun !== 1) {
    errors.push('a4RunnerImplementationDiff.maxWritesPerRun must be 1');
  }
  if (!runnerImplementationDiff.requiredProofHooks?.includes('rollback')) {
    errors.push('a4RunnerImplementationDiff.requiredProofHooks must include rollback');
  }
  if (!runnerImplementationDiff.requiredProofHooks?.includes('post-action-smoke')) {
    errors.push('a4RunnerImplementationDiff.requiredProofHooks must include post-action-smoke');
  }
  if (!runnerImplementationDiff.requiredProofHooks?.includes('public-access-fail-closed')) {
    errors.push('a4RunnerImplementationDiff.requiredProofHooks must include public-access-fail-closed');
  }
  for (const output of ['pre-action-receipt', 'execution-receipt', 'post-action-smoke', 'rollback-readiness', 'final-outcome']) {
    if (!runnerImplementationDiff.requiredReceiptOutputs?.includes(output)) {
      errors.push(`a4RunnerImplementationDiff.requiredReceiptOutputs must include ${output}`);
    }
  }
  if (runnerImplementationDiff.writesPerformed !== 0) {
    errors.push('a4RunnerImplementationDiff.writesPerformed must be 0');
  }

  const releaseAdmission = manifest.a4ReleaseAdmission || {};
  if (releaseAdmission.requiresEnabledManifestReadinessReceipt !== true) {
    errors.push('a4ReleaseAdmission.requiresEnabledManifestReadinessReceipt must be true');
  }
  if (releaseAdmission.requiresRunnerImplementationDiffReceipt !== true) {
    errors.push('a4ReleaseAdmission.requiresRunnerImplementationDiffReceipt must be true');
  }
  if (releaseAdmission.packetOnly !== true) {
    errors.push('a4ReleaseAdmission.packetOnly must be true');
  }
  if (releaseAdmission.requiresManualMerge !== true) {
    errors.push('a4ReleaseAdmission.requiresManualMerge must be true');
  }
  for (const requiredPr of ['policy-enabled-manifest', 'runner-entrypoint']) {
    if (!releaseAdmission.requiredPrs?.includes(requiredPr)) {
      errors.push(`a4ReleaseAdmission.requiredPrs must include ${requiredPr}`);
    }
  }
  if (!releaseAdmission.requiredCheckStatuses?.includes('success')) {
    errors.push('a4ReleaseAdmission.requiredCheckStatuses must include success');
  }
  for (const requiredOrder of ['policy-enabled-manifest', 'runner-entrypoint']) {
    if (!releaseAdmission.requiredMergeOrder?.includes(requiredOrder)) {
      errors.push(`a4ReleaseAdmission.requiredMergeOrder must include ${requiredOrder}`);
    }
  }
  for (const evidence of [
    'linear-done-evidence',
    'github-checks-passed',
    'rollback-note',
    'public-access-fail-closed-proof',
  ]) {
    if (!releaseAdmission.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ReleaseAdmission.requiredEvidence must include ${evidence}`);
    }
  }
  const missingReleaseGuards = includesAll(releaseAdmission.requiredGuards, runnerImplementationDiff.requiredGuards || []);
  if (missingReleaseGuards.length) {
    errors.push(`a4ReleaseAdmission.requiredGuards missing: ${missingReleaseGuards.join(', ')}`);
  }
  if (releaseAdmission.maxWritesPerRun !== 1) {
    errors.push('a4ReleaseAdmission.maxWritesPerRun must be 1');
  }
  if (releaseAdmission.writesPerformed !== 0) {
    errors.push('a4ReleaseAdmission.writesPerformed must be 0');
  }

  const executionRunbook = manifest.a4ExecutionRunbook || {};
  if (executionRunbook.requiresReleaseAdmissionReceipt !== true) {
    errors.push('a4ExecutionRunbook.requiresReleaseAdmissionReceipt must be true');
  }
  if (executionRunbook.runbookOnly !== true) {
    errors.push('a4ExecutionRunbook.runbookOnly must be true');
  }
  if (executionRunbook.requiresTargetValidation !== true) {
    errors.push('a4ExecutionRunbook.requiresTargetValidation must be true');
  }
  if (executionRunbook.requiresWriteCommand !== true) {
    errors.push('a4ExecutionRunbook.requiresWriteCommand must be true');
  }
  if (executionRunbook.requiresPostActionSmoke !== true) {
    errors.push('a4ExecutionRunbook.requiresPostActionSmoke must be true');
  }
  if (executionRunbook.requiresRollbackCommand !== true) {
    errors.push('a4ExecutionRunbook.requiresRollbackCommand must be true');
  }
  if (executionRunbook.requiresPublicAccessFailClosedProof !== true) {
    errors.push('a4ExecutionRunbook.requiresPublicAccessFailClosedProof must be true');
  }
  for (const output of ['pre-action-receipt', 'execution-receipt', 'post-action-smoke', 'rollback-readiness', 'final-outcome']) {
    if (!executionRunbook.requiredFinalReceiptOutputs?.includes(output)) {
      errors.push(`a4ExecutionRunbook.requiredFinalReceiptOutputs must include ${output}`);
    }
  }
  for (const condition of ['target-mismatch', 'command-expired', 'receipt-drift', 'smoke-failed', 'rollback-unavailable']) {
    if (!executionRunbook.requiredStopConditions?.includes(condition)) {
      errors.push(`a4ExecutionRunbook.requiredStopConditions must include ${condition}`);
    }
  }
  if (executionRunbook.maxWritesPerRun !== 1) {
    errors.push('a4ExecutionRunbook.maxWritesPerRun must be 1');
  }
  if (executionRunbook.writesPerformed !== 0) {
    errors.push('a4ExecutionRunbook.writesPerformed must be 0');
  }

  const receiptBundle = manifest.a4ReceiptBundle || {};
  if (receiptBundle.requiresExecutionRunbookReceipt !== true) {
    errors.push('a4ReceiptBundle.requiresExecutionRunbookReceipt must be true');
  }
  if (receiptBundle.bundleOnly !== true) {
    errors.push('a4ReceiptBundle.bundleOnly must be true');
  }
  if (receiptBundle.shareableOnly !== true) {
    errors.push('a4ReceiptBundle.shareableOnly must be true');
  }
  if (receiptBundle.requiresRedactionPolicy !== true) {
    errors.push('a4ReceiptBundle.requiresRedactionPolicy must be true');
  }
  if (receiptBundle.forbidsSecrets !== true) {
    errors.push('a4ReceiptBundle.forbidsSecrets must be true');
  }
  if (receiptBundle.forbidsRawLogs !== true) {
    errors.push('a4ReceiptBundle.forbidsRawLogs must be true');
  }
  if (receiptBundle.forbidsPrompts !== true) {
    errors.push('a4ReceiptBundle.forbidsPrompts must be true');
  }
  for (const reference of [
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
    'runner-implementation-plan-check',
    'runner-implementation-diff-check',
    'release-admission-check',
    'execution-runbook-check',
  ]) {
    if (!receiptBundle.requiredReceiptReferences?.includes(reference)) {
      errors.push(`a4ReceiptBundle.requiredReceiptReferences must include ${reference}`);
    }
  }
  for (const evidence of [
    'linear-evidence',
    'github-checks-passed',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!receiptBundle.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ReceiptBundle.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
  ]) {
    if (!receiptBundle.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4ReceiptBundle.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (receiptBundle.writesPerformed !== 0) {
    errors.push('a4ReceiptBundle.writesPerformed must be 0');
  }

  const receiptPublication = manifest.a4ReceiptPublication || {};
  if (receiptPublication.requiresReceiptBundleReceipt !== true) {
    errors.push('a4ReceiptPublication.requiresReceiptBundleReceipt must be true');
  }
  if (receiptPublication.publicationPacketOnly !== true) {
    errors.push('a4ReceiptPublication.publicationPacketOnly must be true');
  }
  if (receiptPublication.requiresOperatorReview !== true) {
    errors.push('a4ReceiptPublication.requiresOperatorReview must be true');
  }
  if (receiptPublication.requiresIntendedAudience !== true) {
    errors.push('a4ReceiptPublication.requiresIntendedAudience must be true');
  }
  for (const surface of ['Linear', 'signed-release-record']) {
    if (!receiptPublication.allowedPublicationSurfaces?.includes(surface)) {
      errors.push(`a4ReceiptPublication.allowedPublicationSurfaces must include ${surface}`);
    }
  }
  if (receiptPublication.requiresRedactionPolicy !== true) {
    errors.push('a4ReceiptPublication.requiresRedactionPolicy must be true');
  }
  if (receiptPublication.forbidsSecrets !== true) {
    errors.push('a4ReceiptPublication.forbidsSecrets must be true');
  }
  if (receiptPublication.forbidsRawLogs !== true) {
    errors.push('a4ReceiptPublication.forbidsRawLogs must be true');
  }
  if (receiptPublication.forbidsPrompts !== true) {
    errors.push('a4ReceiptPublication.forbidsPrompts must be true');
  }
  if (receiptPublication.forbidsRawTranscripts !== true) {
    errors.push('a4ReceiptPublication.forbidsRawTranscripts must be true');
  }
  if (receiptPublication.requiresNoThirdPartyWrite !== true) {
    errors.push('a4ReceiptPublication.requiresNoThirdPartyWrite must be true');
  }
  for (const evidence of [
    'receipt-bundle-receipt',
    'linear-evidence-or-signed-release-record',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!receiptPublication.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ReceiptPublication.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
    'publication-not-performed',
    'third-party-write-not-performed',
  ]) {
    if (!receiptPublication.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4ReceiptPublication.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (receiptPublication.writesPerformed !== 0) {
    errors.push('a4ReceiptPublication.writesPerformed must be 0');
  }

  const receiptReviewDecision = manifest.a4ReceiptReviewDecision || {};
  if (receiptReviewDecision.requiresReceiptPublicationReceipt !== true) {
    errors.push('a4ReceiptReviewDecision.requiresReceiptPublicationReceipt must be true');
  }
  if (receiptReviewDecision.decisionPacketOnly !== true) {
    errors.push('a4ReceiptReviewDecision.decisionPacketOnly must be true');
  }
  if (receiptReviewDecision.requiresReviewerIdentity !== true) {
    errors.push('a4ReceiptReviewDecision.requiresReviewerIdentity must be true');
  }
  if (receiptReviewDecision.requiresReviewedAt !== true) {
    errors.push('a4ReceiptReviewDecision.requiresReviewedAt must be true');
  }
  for (const decision of ['approved-for-manual-next-step', 'changes-requested', 'rejected', 'blocked']) {
    if (!receiptReviewDecision.allowedDecisions?.includes(decision)) {
      errors.push(`a4ReceiptReviewDecision.allowedDecisions must include ${decision}`);
    }
  }
  for (const surface of ['receipt-publication', 'receipt-bundle', 'execution-runbook', 'release-admission']) {
    if (!receiptReviewDecision.requiresReviewedSurfaces?.includes(surface)) {
      errors.push(`a4ReceiptReviewDecision.requiresReviewedSurfaces must include ${surface}`);
    }
  }
  if (receiptReviewDecision.requiresRedactionPolicy !== true) {
    errors.push('a4ReceiptReviewDecision.requiresRedactionPolicy must be true');
  }
  if (receiptReviewDecision.forbidsSecrets !== true) {
    errors.push('a4ReceiptReviewDecision.forbidsSecrets must be true');
  }
  if (receiptReviewDecision.forbidsRawLogs !== true) {
    errors.push('a4ReceiptReviewDecision.forbidsRawLogs must be true');
  }
  if (receiptReviewDecision.forbidsPrompts !== true) {
    errors.push('a4ReceiptReviewDecision.forbidsPrompts must be true');
  }
  if (receiptReviewDecision.forbidsRawTranscripts !== true) {
    errors.push('a4ReceiptReviewDecision.forbidsRawTranscripts must be true');
  }
  if (receiptReviewDecision.requiresNoExecutionOnApproval !== true) {
    errors.push('a4ReceiptReviewDecision.requiresNoExecutionOnApproval must be true');
  }
  for (const evidence of [
    'receipt-publication-receipt',
    'reviewer-decision',
    'reviewed-surfaces',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!receiptReviewDecision.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ReceiptReviewDecision.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
    'review-only',
  ]) {
    if (!receiptReviewDecision.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4ReceiptReviewDecision.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (receiptReviewDecision.writesPerformed !== 0) {
    errors.push('a4ReceiptReviewDecision.writesPerformed must be 0');
  }

  const manualNextStepHandoff = manifest.a4ManualNextStepHandoff || {};
  if (manualNextStepHandoff.requiresReceiptReviewDecisionReceipt !== true) {
    errors.push('a4ManualNextStepHandoff.requiresReceiptReviewDecisionReceipt must be true');
  }
  if (manualNextStepHandoff.handoffPacketOnly !== true) {
    errors.push('a4ManualNextStepHandoff.handoffPacketOnly must be true');
  }
  if (manualNextStepHandoff.requiresApprovedReviewDecision !== true) {
    errors.push('a4ManualNextStepHandoff.requiresApprovedReviewDecision must be true');
  }
  if (manualNextStepHandoff.requiresProposedIssue !== true) {
    errors.push('a4ManualNextStepHandoff.requiresProposedIssue must be true');
  }
  if (manualNextStepHandoff.requiresOwner !== true) {
    errors.push('a4ManualNextStepHandoff.requiresOwner must be true');
  }
  if (manualNextStepHandoff.issueCreationPerformed !== false) {
    errors.push('a4ManualNextStepHandoff.issueCreationPerformed must be false');
  }
  if (manualNextStepHandoff.requiresRedactionPolicy !== true) {
    errors.push('a4ManualNextStepHandoff.requiresRedactionPolicy must be true');
  }
  if (manualNextStepHandoff.forbidsSecrets !== true) {
    errors.push('a4ManualNextStepHandoff.forbidsSecrets must be true');
  }
  if (manualNextStepHandoff.forbidsRawLogs !== true) {
    errors.push('a4ManualNextStepHandoff.forbidsRawLogs must be true');
  }
  if (manualNextStepHandoff.forbidsPrompts !== true) {
    errors.push('a4ManualNextStepHandoff.forbidsPrompts must be true');
  }
  if (manualNextStepHandoff.forbidsRawTranscripts !== true) {
    errors.push('a4ManualNextStepHandoff.forbidsRawTranscripts must be true');
  }
  if (manualNextStepHandoff.requiresNoExecutionOnHandoff !== true) {
    errors.push('a4ManualNextStepHandoff.requiresNoExecutionOnHandoff must be true');
  }
  for (const surface of ['Linear', 'signed-release-record']) {
    if (!manualNextStepHandoff.allowedHandoffSurfaces?.includes(surface)) {
      errors.push(`a4ManualNextStepHandoff.allowedHandoffSurfaces must include ${surface}`);
    }
  }
  for (const receiptReference of [
    'receipt-review-decision-check',
    'receipt-publication-check',
    'receipt-bundle-check',
    'execution-runbook-check',
    'release-admission-check',
  ]) {
    if (!manualNextStepHandoff.requiredReceiptReferences?.includes(receiptReference)) {
      errors.push(`a4ManualNextStepHandoff.requiredReceiptReferences must include ${receiptReference}`);
    }
  }
  for (const evidence of [
    'receipt-review-decision-receipt',
    'approved-review-decision',
    'proposed-follow-up-issue',
    'owner',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!manualNextStepHandoff.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ManualNextStepHandoff.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
    'issue-not-created',
    'handoff-only',
  ]) {
    if (!manualNextStepHandoff.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4ManualNextStepHandoff.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (manualNextStepHandoff.writesPerformed !== 0) {
    errors.push('a4ManualNextStepHandoff.writesPerformed must be 0');
  }

  const manualFollowUpIssueEvidence = manifest.a4ManualFollowUpIssueEvidence || {};
  if (manualFollowUpIssueEvidence.requiresManualNextStepHandoffReceipt !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresManualNextStepHandoffReceipt must be true');
  }
  if (manualFollowUpIssueEvidence.evidencePacketOnly !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.evidencePacketOnly must be true');
  }
  if (manualFollowUpIssueEvidence.requiresManualIssueCreationEvidence !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresManualIssueCreationEvidence must be true');
  }
  if (manualFollowUpIssueEvidence.requiresIssueIdentifier !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresIssueIdentifier must be true');
  }
  if (manualFollowUpIssueEvidence.requiresIssueUrl !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresIssueUrl must be true');
  }
  if (manualFollowUpIssueEvidence.requiresCreatedBy !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresCreatedBy must be true');
  }
  if (manualFollowUpIssueEvidence.requiresCreatedAt !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresCreatedAt must be true');
  }
  if (manualFollowUpIssueEvidence.requiresOwner !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresOwner must be true');
  }
  if (manualFollowUpIssueEvidence.issueCreationPerformedByVerifier !== false) {
    errors.push('a4ManualFollowUpIssueEvidence.issueCreationPerformedByVerifier must be false');
  }
  if (manualFollowUpIssueEvidence.requiresNoThirdPartyWriteByVerifier !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresNoThirdPartyWriteByVerifier must be true');
  }
  if (manualFollowUpIssueEvidence.requiresRedactionPolicy !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresRedactionPolicy must be true');
  }
  if (manualFollowUpIssueEvidence.forbidsSecrets !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.forbidsSecrets must be true');
  }
  if (manualFollowUpIssueEvidence.forbidsRawLogs !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.forbidsRawLogs must be true');
  }
  if (manualFollowUpIssueEvidence.forbidsPrompts !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.forbidsPrompts must be true');
  }
  if (manualFollowUpIssueEvidence.forbidsRawTranscripts !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.forbidsRawTranscripts must be true');
  }
  if (manualFollowUpIssueEvidence.requiresNoExecutionOnEvidence !== true) {
    errors.push('a4ManualFollowUpIssueEvidence.requiresNoExecutionOnEvidence must be true');
  }
  if (!manualFollowUpIssueEvidence.allowedIssueSurfaces?.includes('Linear')) {
    errors.push('a4ManualFollowUpIssueEvidence.allowedIssueSurfaces must include Linear');
  }
  for (const receiptReference of [
    'manual-next-step-handoff-check',
    'receipt-review-decision-check',
    'receipt-publication-check',
    'receipt-bundle-check',
    'execution-runbook-check',
    'release-admission-check',
  ]) {
    if (!manualFollowUpIssueEvidence.requiredReceiptReferences?.includes(receiptReference)) {
      errors.push(`a4ManualFollowUpIssueEvidence.requiredReceiptReferences must include ${receiptReference}`);
    }
  }
  for (const evidence of [
    'manual-next-step-handoff-receipt',
    'manual-issue-identifier',
    'manual-issue-url',
    'created-by',
    'created-at',
    'owner',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!manualFollowUpIssueEvidence.requiredEvidence?.includes(evidence)) {
      errors.push(`a4ManualFollowUpIssueEvidence.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
    'verifier-issue-creation-not-performed',
    'third-party-write-not-performed-by-verifier',
    'evidence-only',
  ]) {
    if (!manualFollowUpIssueEvidence.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4ManualFollowUpIssueEvidence.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (manualFollowUpIssueEvidence.writesPerformed !== 0) {
    errors.push('a4ManualFollowUpIssueEvidence.writesPerformed must be 0');
  }

  const followUpWorkIntake = manifest.a4FollowUpWorkIntake || {};
  if (followUpWorkIntake.requiresManualFollowUpIssueEvidenceReceipt !== true) {
    errors.push('a4FollowUpWorkIntake.requiresManualFollowUpIssueEvidenceReceipt must be true');
  }
  if (followUpWorkIntake.intakePacketOnly !== true) {
    errors.push('a4FollowUpWorkIntake.intakePacketOnly must be true');
  }
  for (const field of [
    'requiresIssueIdentifier',
    'requiresIssueUrl',
    'requiresOwner',
    'requiresIntendedAssignee',
    'requiresImplementationSurface',
    'requiresScopedFilesOrModules',
    'requiresValidationPlan',
    'requiresRollbackPlan',
    'requiresPublicAccessFailClosedProof',
  ]) {
    if (followUpWorkIntake[field] !== true) errors.push(`a4FollowUpWorkIntake.${field} must be true`);
  }
  for (const field of [
    'issueClaimedByVerifier',
    'worktreeCreatedByVerifier',
    'branchCreatedByVerifier',
    'prCreatedByVerifier',
  ]) {
    if (followUpWorkIntake[field] !== false) errors.push(`a4FollowUpWorkIntake.${field} must be false`);
  }
  if (followUpWorkIntake.requiresNoThirdPartyWriteByVerifier !== true) {
    errors.push('a4FollowUpWorkIntake.requiresNoThirdPartyWriteByVerifier must be true');
  }
  if (followUpWorkIntake.requiresRedactionPolicy !== true) {
    errors.push('a4FollowUpWorkIntake.requiresRedactionPolicy must be true');
  }
  for (const field of ['forbidsSecrets', 'forbidsRawLogs', 'forbidsPrompts', 'forbidsRawTranscripts']) {
    if (followUpWorkIntake[field] !== true) errors.push(`a4FollowUpWorkIntake.${field} must be true`);
  }
  if (followUpWorkIntake.requiresNoExecutionOnIntake !== true) {
    errors.push('a4FollowUpWorkIntake.requiresNoExecutionOnIntake must be true');
  }
  for (const surface of ['repo-worktree', 'repo-pr']) {
    if (!followUpWorkIntake.allowedImplementationSurfaces?.includes(surface)) {
      errors.push(`a4FollowUpWorkIntake.allowedImplementationSurfaces must include ${surface}`);
    }
  }
  for (const receiptReference of [
    'manual-follow-up-issue-evidence-check',
    'manual-next-step-handoff-check',
    'receipt-review-decision-check',
    'receipt-publication-check',
    'receipt-bundle-check',
    'execution-runbook-check',
    'release-admission-check',
  ]) {
    if (!followUpWorkIntake.requiredReceiptReferences?.includes(receiptReference)) {
      errors.push(`a4FollowUpWorkIntake.requiredReceiptReferences must include ${receiptReference}`);
    }
  }
  for (const evidence of [
    'manual-follow-up-issue-evidence-receipt',
    'issue-identifier',
    'issue-url',
    'owner',
    'intended-assignee',
    'implementation-surface',
    'scoped-files-or-modules',
    'validation-plan',
    'rollback-plan',
    'public-access-fail-closed-proof',
    'redaction-policy',
    'operator-summary',
  ]) {
    if (!followUpWorkIntake.requiredEvidence?.includes(evidence)) {
      errors.push(`a4FollowUpWorkIntake.requiredEvidence must include ${evidence}`);
    }
  }
  for (const marker of [
    'current-policy-blocked',
    'process-not-spawned',
    'executed-commands-empty',
    'runner-disabled',
    'execution-not-ready',
    'execution-disabled',
    'execution-not-approved',
    'would-execute-false',
    'writes-performed-zero',
    'issue-not-claimed-by-verifier',
    'worktree-not-created-by-verifier',
    'branch-not-created-by-verifier',
    'pr-not-created-by-verifier',
    'third-party-write-not-performed-by-verifier',
    'intake-only',
  ]) {
    if (!followUpWorkIntake.requiredNoExecutionMarkers?.includes(marker)) {
      errors.push(`a4FollowUpWorkIntake.requiredNoExecutionMarkers must include ${marker}`);
    }
  }
  if (followUpWorkIntake.writesPerformed !== 0) {
    errors.push('a4FollowUpWorkIntake.writesPerformed must be 0');
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

function validateRunnerImplementationPlanReceipt(receipt, runnerPlan, contractReceipt, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'runner-implementation-plan-check') {
    errors.push('runner implementation plan receipt mode must be runner-implementation-plan-check');
  }
  if (receipt.ok !== true || receipt.runnerImplementationPlanOk !== true) {
    errors.push('runner implementation plan receipt must be ok');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation plan receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`runner implementation plan receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`runner implementation plan receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.packetPath !== rel(paths.packetPath)) {
    errors.push('runner implementation plan receipt packetPath must match packet path');
  }
  if (receipt.preflightReceipt !== rel(paths.preflightPath)) {
    errors.push('runner implementation plan receipt preflightReceipt must match preflight receipt path');
  }
  if (receipt.executionReceipt !== rel(paths.executionPath)) {
    errors.push('runner implementation plan receipt executionReceipt must match execution receipt path');
  }
  if (receipt.authorization !== rel(paths.authorizationPath)) {
    errors.push('runner implementation plan receipt authorization must match authorization artifact path');
  }
  if (receipt.commandArtifact !== rel(paths.commandPath)) {
    errors.push('runner implementation plan receipt commandArtifact must match command artifact path');
  }
  if (receipt.commandReceipt !== rel(paths.commandReceiptPath)) {
    errors.push('runner implementation plan receipt commandReceipt must match command receipt path');
  }
  if (receipt.executorProofReceipt !== rel(paths.executorProofPath)) {
    errors.push('runner implementation plan receipt executorProofReceipt must match executor proof receipt path');
  }
  if (receipt.enablementProposal !== rel(paths.proposalPath)) {
    errors.push('runner implementation plan receipt enablementProposal must match proposal path');
  }
  if (receipt.enablementProposalReceipt !== rel(paths.proposalReceiptPath)) {
    errors.push('runner implementation plan receipt enablementProposalReceipt must match proposal receipt path');
  }
  if (receipt.policyPatchDryRun !== rel(paths.policyPatchPath)) {
    errors.push('runner implementation plan receipt policyPatchDryRun must match policy patch artifact path');
  }
  if (receipt.policyPatchDryRunReceipt !== rel(paths.policyPatchReceiptPath)) {
    errors.push('runner implementation plan receipt policyPatchDryRunReceipt must match policy patch receipt path');
  }
  if (receipt.candidateManifest !== rel(paths.candidateManifestPath)) {
    errors.push('runner implementation plan receipt candidateManifest must match candidate manifest path');
  }
  if (receipt.applicationDiffReceipt !== rel(paths.applicationDiffReceiptPath)) {
    errors.push('runner implementation plan receipt applicationDiffReceipt must match application diff receipt path');
  }
  if (receipt.readinessReceipt !== rel(paths.readinessReceiptPath)) {
    errors.push('runner implementation plan receipt readinessReceipt must match readiness receipt path');
  }
  if (receipt.runnerContract !== rel(paths.runnerContractPath)) {
    errors.push('runner implementation plan receipt runnerContract must match runner contract artifact path');
  }
  if (receipt.runnerImplementationContractReceipt !== rel(paths.contractReceiptPath)) {
    errors.push('runner implementation plan receipt runnerImplementationContractReceipt must match contract receipt path');
  }
  if (receipt.runnerPlan !== rel(paths.runnerPlanPath)) {
    errors.push('runner implementation plan receipt runnerPlan must match runner plan path');
  }
  if (receipt.plannedEntrypoint !== runnerPlan.plannedEntrypoint) {
    errors.push('runner implementation plan receipt plannedEntrypoint must match runner plan');
  }
  if (receipt.implementationPlanOnly !== true) errors.push('runner implementation plan receipt implementationPlanOnly must be true');
  if (receipt.executableEntrypointAdded !== false) {
    errors.push('runner implementation plan receipt executableEntrypointAdded must be false');
  }
  if (receipt.maxWritesPerRun !== runnerPlan.maxWritesPerRun) {
    errors.push('runner implementation plan receipt maxWritesPerRun must match runner plan');
  }
  if (!sameJson(receipt.requiredGuards, runnerPlan.requiredGuards)) {
    errors.push('runner implementation plan receipt requiredGuards must match runner plan');
  }
  if (!sameJson(receipt.revalidationSequence, runnerPlan.revalidationSequence)) {
    errors.push('runner implementation plan receipt revalidationSequence must match runner plan');
  }
  if (!sameJson(receipt.receiptOutputs, runnerPlan.receiptOutputs)) {
    errors.push('runner implementation plan receipt receiptOutputs must match runner plan');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('runner implementation plan receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('runner implementation plan receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('runner implementation plan receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('runner implementation plan receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('runner implementation plan receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('runner implementation plan receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('runner implementation plan receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('runner implementation plan receipt writesPerformed must be 0');

  if (contractReceipt.runnerImplementationContractOk !== true) {
    errors.push('runner implementation plan receipt requires valid contract receipt');
  }
  if (packet.issue !== receipt.issue) errors.push('runner implementation plan receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('runner implementation plan receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('runner implementation plan receipt action must match packet action');

  return errors;
}

function validateRunnerImplementationDiff(diff, packet, planReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4RunnerImplementationDiff || {};

  if (diff.authorityLevel !== 'A4') errors.push('runner implementation diff authorityLevel must be A4');
  if (diff.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation diff issue mismatch: expected ${constraints.expectedIssue}, got ${diff.issue}`);
  }
  if (diff.target !== constraints.expectedTarget) {
    errors.push(`runner implementation diff target mismatch: expected ${constraints.expectedTarget}, got ${diff.target}`);
  }
  if (diff.action !== constraints.expectedAction) {
    errors.push(`runner implementation diff action mismatch: expected ${constraints.expectedAction}, got ${diff.action}`);
  }
  if (diff.runnerImplementationPlanReceipt !== rel(paths.planReceiptPath)) {
    errors.push('runner implementation diff runnerImplementationPlanReceipt must match plan receipt path');
  }
  if (diff.candidateOnly !== true) errors.push('runner implementation diff candidateOnly must be true');
  if (diff.checkedInEntrypointExists !== false) {
    errors.push('runner implementation diff checkedInEntrypointExists must be false');
  }
  if (diff.plannedEntrypoint !== rules.allowedEntrypoint) {
    errors.push(`runner implementation diff plannedEntrypoint must be ${rules.allowedEntrypoint}`);
  }
  if (diff.plannedEntrypoint !== planReceipt.plannedEntrypoint) {
    errors.push('runner implementation diff plannedEntrypoint must match plan receipt');
  }
  if (!Array.isArray(diff.filesToAdd) || !diff.filesToAdd.includes(rules.allowedEntrypoint)) {
    errors.push(`runner implementation diff filesToAdd must include ${rules.allowedEntrypoint}`);
  }
  for (const file of diff.filesToAdd || []) {
    if (!rules.allowedFileAdditions?.includes(file)) {
      errors.push(`runner implementation diff file addition is not allowed: ${file}`);
    }
  }
  if (Array.isArray(diff.filesToModify) && diff.filesToModify.length > 0) {
    errors.push('runner implementation diff filesToModify must be empty');
  }
  if (diff.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`runner implementation diff maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  for (const guard of rules.requiredGuards || []) {
    if (!diff.requiredGuards?.includes(guard)) {
      errors.push(`runner implementation diff requiredGuards must include ${guard}`);
    }
  }
  for (const hook of rules.requiredProofHooks || []) {
    if (!diff.proofHooks?.includes(hook)) {
      errors.push(`runner implementation diff proofHooks must include ${hook}`);
    }
  }
  for (const output of rules.requiredReceiptOutputs || []) {
    if (!diff.receiptOutputs?.includes(output)) {
      errors.push(`runner implementation diff receiptOutputs must include ${output}`);
    }
  }
  for (const check of planReceipt.revalidationSequence || []) {
    if (!diff.revalidationSequence?.includes(check)) {
      errors.push(`runner implementation diff revalidationSequence must include ${check}`);
    }
  }
  if (!diff.revalidationSequence?.includes('runner-implementation-plan-check')) {
    errors.push('runner implementation diff revalidationSequence must include runner-implementation-plan-check');
  }
  if (diff.processSpawned === true) errors.push('runner implementation diff processSpawned must not be true');
  if (Array.isArray(diff.executedCommands) && diff.executedCommands.length > 0) {
    errors.push('runner implementation diff executedCommands must be empty');
  }
  if (diff.runnerEnabled === true) errors.push('runner implementation diff runnerEnabled must not be true');
  if (diff.executionReady === true) errors.push('runner implementation diff executionReady must not be true');
  if (diff.executionEnabled === true) errors.push('runner implementation diff executionEnabled must not be true');
  if (diff.wouldExecute === true) errors.push('runner implementation diff wouldExecute must not be true');
  if (diff.writesPerformed !== 0) errors.push('runner implementation diff writesPerformed must be 0');

  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('runner implementation diff current manifest authority.a4Execution must remain blocked in this verifier PR');
  }
  if (planReceipt.runnerImplementationPlanOk !== true) {
    errors.push('runner implementation diff requires a valid runner implementation plan receipt');
  }
  if (packet.issue !== diff.issue) errors.push('runner implementation diff issue must match packet issue');
  if (packet.target !== diff.target) errors.push('runner implementation diff target must match packet target');
  if (packet.action !== diff.action) errors.push('runner implementation diff action must match packet action');

  return errors;
}

function validateRunnerImplementationDiffReceipt(receipt, runnerDiff, planReceipt, packet, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'runner-implementation-diff-check') {
    errors.push('runner implementation diff receipt mode must be runner-implementation-diff-check');
  }
  if (receipt.ok !== true || receipt.runnerImplementationDiffOk !== true) {
    errors.push('runner implementation diff receipt must be ok');
  }
  if (receipt.runnerDiff !== rel(paths.runnerDiffPath)) {
    errors.push('runner implementation diff receipt runnerDiff must match runner diff artifact path');
  }
  if (receipt.runnerImplementationPlanReceipt !== rel(paths.planReceiptPath)) {
    errors.push('runner implementation diff receipt runnerImplementationPlanReceipt must match plan receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`runner implementation diff receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`runner implementation diff receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`runner implementation diff receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.candidateOnly !== true) errors.push('runner implementation diff receipt candidateOnly must be true');
  if (receipt.checkedInEntrypointExists !== false) {
    errors.push('runner implementation diff receipt checkedInEntrypointExists must be false');
  }
  if (receipt.plannedEntrypoint !== runnerDiff.plannedEntrypoint) {
    errors.push('runner implementation diff receipt plannedEntrypoint must match runner diff');
  }
  if (!sameJson(receipt.filesToAdd, runnerDiff.filesToAdd || [])) {
    errors.push('runner implementation diff receipt filesToAdd must match runner diff');
  }
  if (!sameJson(receipt.filesToModify, runnerDiff.filesToModify || [])) {
    errors.push('runner implementation diff receipt filesToModify must match runner diff');
  }
  if (receipt.maxWritesPerRun !== runnerDiff.maxWritesPerRun) {
    errors.push('runner implementation diff receipt maxWritesPerRun must match runner diff');
  }
  if (!sameJson(receipt.requiredGuards, runnerDiff.requiredGuards || [])) {
    errors.push('runner implementation diff receipt requiredGuards must match runner diff');
  }
  if (!sameJson(receipt.proofHooks, runnerDiff.proofHooks || [])) {
    errors.push('runner implementation diff receipt proofHooks must match runner diff');
  }
  if (!sameJson(receipt.revalidationSequence, runnerDiff.revalidationSequence || [])) {
    errors.push('runner implementation diff receipt revalidationSequence must match runner diff');
  }
  if (!sameJson(receipt.receiptOutputs, runnerDiff.receiptOutputs || [])) {
    errors.push('runner implementation diff receipt receiptOutputs must match runner diff');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('runner implementation diff receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('runner implementation diff receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('runner implementation diff receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('runner implementation diff receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('runner implementation diff receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('runner implementation diff receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('runner implementation diff receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('runner implementation diff receipt writesPerformed must be 0');
  if (planReceipt.runnerImplementationPlanOk !== true) {
    errors.push('runner implementation diff receipt requires valid runner implementation plan receipt');
  }
  if (packet.issue !== receipt.issue) errors.push('runner implementation diff receipt issue must match packet issue');
  if (packet.target !== receipt.target) errors.push('runner implementation diff receipt target must match packet target');
  if (packet.action !== receipt.action) errors.push('runner implementation diff receipt action must match packet action');

  return errors;
}

function validateReleaseAdmission(admission, packet, readinessReceipt, runnerDiffReceipt, runnerDiff, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ReleaseAdmission || {};

  if (admission.authorityLevel !== 'A4') errors.push('release admission authorityLevel must be A4');
  if (admission.issue !== constraints.expectedIssue) {
    errors.push(`release admission issue mismatch: expected ${constraints.expectedIssue}, got ${admission.issue}`);
  }
  if (admission.target !== constraints.expectedTarget) {
    errors.push(`release admission target mismatch: expected ${constraints.expectedTarget}, got ${admission.target}`);
  }
  if (admission.action !== constraints.expectedAction) {
    errors.push(`release admission action mismatch: expected ${constraints.expectedAction}, got ${admission.action}`);
  }
  if (admission.enabledManifestReadinessReceipt !== rel(paths.readinessReceiptPath)) {
    errors.push('release admission enabledManifestReadinessReceipt must match readiness receipt path');
  }
  if (admission.runnerImplementationDiffReceipt !== rel(paths.runnerDiffReceiptPath)) {
    errors.push('release admission runnerImplementationDiffReceipt must match runner diff receipt path');
  }
  if (admission.runnerDiff !== rel(paths.runnerDiffPath)) {
    errors.push('release admission runnerDiff must match runner diff artifact path');
  }
  if (admission.releaseMode !== 'operator-reviewed-pr') {
    errors.push('release admission releaseMode must be operator-reviewed-pr');
  }
  if (admission.packetOnly !== true) errors.push('release admission packetOnly must be true');
  if (admission.requiresManualMerge !== true) errors.push('release admission requiresManualMerge must be true');
  if (admission.autoMerge === true) errors.push('release admission autoMerge must not be true');
  if (!sameJson(admission.mergeOrder, rules.requiredMergeOrder || [])) {
    errors.push('release admission mergeOrder must match required merge order');
  }
  const prs = Array.isArray(admission.prs) ? admission.prs : [];
  for (const role of rules.requiredPrs || []) {
    const pr = prs.find((entry) => entry.role === role);
    if (!pr) {
      errors.push(`release admission missing PR evidence for ${role}`);
      continue;
    }
    if (!/^https:\/\/github\.com\/.+\/pull\/\d+$/.test(pr.url || '')) {
      errors.push(`release admission PR ${role} must include a GitHub pull request URL`);
    }
    if (pr.checkStatus !== 'success' || pr.checksPassed !== true) {
      errors.push(`release admission PR ${role} checks must be success`);
    }
    if (pr.mergeReady !== true) {
      errors.push(`release admission PR ${role} must be mergeReady`);
    }
  }
  for (const evidence of rules.requiredEvidence || []) {
    if (!admission.requiredEvidence?.includes(evidence)) {
      errors.push(`release admission requiredEvidence must include ${evidence}`);
    }
  }
  for (const guard of rules.requiredGuards || []) {
    if (!admission.requiredGuards?.includes(guard)) {
      errors.push(`release admission requiredGuards must include ${guard}`);
    }
  }
  if (admission.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`release admission maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  if (!hasValue(admission.linearEvidence)) errors.push('release admission linearEvidence is required');
  if (!hasValue(admission.rollbackNote)) errors.push('release admission rollbackNote is required');
  if (!hasValue(admission.publicAccessFailClosedProof)) {
    errors.push('release admission publicAccessFailClosedProof is required');
  }
  if (admission.currentPolicyBlocked !== true) errors.push('release admission currentPolicyBlocked must be true');
  if (admission.processSpawned === true) errors.push('release admission processSpawned must not be true');
  if (Array.isArray(admission.executedCommands) && admission.executedCommands.length > 0) {
    errors.push('release admission executedCommands must be empty');
  }
  if (admission.runnerEnabled === true) errors.push('release admission runnerEnabled must not be true');
  if (admission.executionReady === true) errors.push('release admission executionReady must not be true');
  if (admission.executionEnabled === true) errors.push('release admission executionEnabled must not be true');
  if (admission.wouldExecute === true) errors.push('release admission wouldExecute must not be true');
  if (admission.writesPerformed !== 0) errors.push('release admission writesPerformed must be 0');

  if (readinessReceipt.enabledManifestReadinessOk !== true) {
    errors.push('release admission requires valid enabled manifest readiness receipt');
  }
  if (runnerDiffReceipt.runnerImplementationDiffOk !== true) {
    errors.push('release admission requires valid runner implementation diff receipt');
  }
  if (runnerDiff.checkedInEntrypointExists !== false) {
    errors.push('release admission runner diff must keep checkedInEntrypointExists false');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('release admission current manifest authority.a4Execution must remain blocked in this verifier PR');
  }
  if (packet.issue !== admission.issue) errors.push('release admission issue must match packet issue');
  if (packet.target !== admission.target) errors.push('release admission target must match packet target');
  if (packet.action !== admission.action) errors.push('release admission action must match packet action');

  return errors;
}

function validateReleaseAdmissionReceipt(receipt, admission, releaseResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'release-admission-check') errors.push('release admission receipt mode must be release-admission-check');
  if (receipt.ok !== true || receipt.releaseAdmissionOk !== true) {
    errors.push('release admission receipt must be ok');
  }
  if (receipt.releaseAdmission !== rel(paths.releaseAdmissionPath)) {
    errors.push('release admission receipt releaseAdmission must match release admission artifact path');
  }
  if (receipt.runnerImplementationDiffReceipt !== rel(paths.runnerDiffReceiptPath)) {
    errors.push('release admission receipt runnerImplementationDiffReceipt must match runner diff receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`release admission receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`release admission receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`release admission receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.releaseMode !== admission.releaseMode) {
    errors.push('release admission receipt releaseMode must match release admission');
  }
  if (receipt.packetOnly !== true) errors.push('release admission receipt packetOnly must be true');
  if (receipt.requiresManualMerge !== true) errors.push('release admission receipt requiresManualMerge must be true');
  if (receipt.autoMerge === true) errors.push('release admission receipt autoMerge must not be true');
  if (!sameJson(receipt.prs, admission.prs || [])) {
    errors.push('release admission receipt prs must match release admission');
  }
  if (!sameJson(receipt.mergeOrder, admission.mergeOrder || [])) {
    errors.push('release admission receipt mergeOrder must match release admission');
  }
  if (!sameJson(receipt.requiredEvidence, admission.requiredEvidence || [])) {
    errors.push('release admission receipt requiredEvidence must match release admission');
  }
  if (!sameJson(receipt.requiredGuards, admission.requiredGuards || [])) {
    errors.push('release admission receipt requiredGuards must match release admission');
  }
  if (receipt.maxWritesPerRun !== admission.maxWritesPerRun) {
    errors.push('release admission receipt maxWritesPerRun must match release admission');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('release admission receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('release admission receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('release admission receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('release admission receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('release admission receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('release admission receipt executionEnabled must be false');
  if (receipt.wouldExecute !== false) errors.push('release admission receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('release admission receipt writesPerformed must be 0');
  if (releaseResult.releaseAdmissionOk !== true) errors.push('release admission receipt requires valid release admission result');

  return errors;
}

function validateExecutionRunbook(runbook, releaseAdmissionReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ExecutionRunbook || {};

  if (runbook.authorityLevel !== 'A4') errors.push('execution runbook authorityLevel must be A4');
  if (runbook.issue !== constraints.expectedIssue) {
    errors.push(`execution runbook issue mismatch: expected ${constraints.expectedIssue}, got ${runbook.issue}`);
  }
  if (runbook.target !== constraints.expectedTarget) {
    errors.push(`execution runbook target mismatch: expected ${constraints.expectedTarget}, got ${runbook.target}`);
  }
  if (runbook.action !== constraints.expectedAction) {
    errors.push(`execution runbook action mismatch: expected ${constraints.expectedAction}, got ${runbook.action}`);
  }
  if (runbook.releaseAdmissionReceipt !== rel(paths.releaseAdmissionReceiptPath)) {
    errors.push('execution runbook releaseAdmissionReceipt must match release admission receipt path');
  }
  if (runbook.releaseAdmission !== rel(paths.releaseAdmissionPath)) {
    errors.push('execution runbook releaseAdmission must match release admission artifact path');
  }
  if (runbook.runbookOnly !== true) errors.push('execution runbook runbookOnly must be true');
  if (runbook.executionMode !== 'operator-supervised') {
    errors.push('execution runbook executionMode must be operator-supervised');
  }
  if (runbook.requiresManualTrigger !== true) {
    errors.push('execution runbook requiresManualTrigger must be true');
  }
  if (!Array.isArray(runbook.targetValidationCommands) || runbook.targetValidationCommands.length === 0) {
    errors.push('execution runbook targetValidationCommands must be non-empty');
  }
  if (!hasValue(runbook.writeCommand?.command)) {
    errors.push('execution runbook writeCommand.command is required');
  }
  if (runbook.writeCommand?.requiresManualTrigger !== true) {
    errors.push('execution runbook writeCommand.requiresManualTrigger must be true');
  }
  if (runbook.writeCommand?.approvedCommandOnly !== true) {
    errors.push('execution runbook writeCommand.approvedCommandOnly must be true');
  }
  if (!Array.isArray(runbook.postActionSmokeCommands) || runbook.postActionSmokeCommands.length === 0) {
    errors.push('execution runbook postActionSmokeCommands must be non-empty');
  }
  if (!Array.isArray(runbook.rollbackCommands) || runbook.rollbackCommands.length === 0) {
    errors.push('execution runbook rollbackCommands must be non-empty');
  }
  if (!hasValue(runbook.publicAccessFailClosedProof)) {
    errors.push('execution runbook publicAccessFailClosedProof is required');
  }
  for (const output of rules.requiredFinalReceiptOutputs || []) {
    if (!runbook.finalReceiptOutputs?.includes(output)) {
      errors.push(`execution runbook finalReceiptOutputs must include ${output}`);
    }
  }
  for (const condition of rules.requiredStopConditions || []) {
    if (!runbook.stopConditions?.includes(condition)) {
      errors.push(`execution runbook stopConditions must include ${condition}`);
    }
  }
  if (runbook.maxWritesPerRun !== rules.maxWritesPerRun) {
    errors.push(`execution runbook maxWritesPerRun must be ${rules.maxWritesPerRun}`);
  }
  if (!hasValue(runbook.linearEvidence)) errors.push('execution runbook linearEvidence is required');
  if (runbook.currentPolicyBlocked !== true) errors.push('execution runbook currentPolicyBlocked must be true');
  if (runbook.processSpawned === true) errors.push('execution runbook processSpawned must not be true');
  if (Array.isArray(runbook.executedCommands) && runbook.executedCommands.length > 0) {
    errors.push('execution runbook executedCommands must be empty');
  }
  if (runbook.runnerEnabled === true) errors.push('execution runbook runnerEnabled must not be true');
  if (runbook.executionReady === true) errors.push('execution runbook executionReady must not be true');
  if (runbook.executionEnabled === true) errors.push('execution runbook executionEnabled must not be true');
  if (runbook.wouldExecute === true) errors.push('execution runbook wouldExecute must not be true');
  if (runbook.writesPerformed !== 0) errors.push('execution runbook writesPerformed must be 0');
  if (releaseAdmissionReceipt.releaseAdmissionOk !== true) {
    errors.push('execution runbook requires valid release admission receipt');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('execution runbook current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateExecutionRunbookReceipt(receipt, runbook, runbookResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'execution-runbook-check') {
    errors.push('execution runbook receipt mode must be execution-runbook-check');
  }
  if (receipt.ok !== true || receipt.executionRunbookOk !== true) {
    errors.push('execution runbook receipt must be ok');
  }
  if (receipt.executionRunbook !== rel(paths.executionRunbookPath)) {
    errors.push('execution runbook receipt executionRunbook must match execution runbook artifact path');
  }
  if (receipt.releaseAdmissionReceipt !== rel(paths.releaseAdmissionReceiptPath)) {
    errors.push('execution runbook receipt releaseAdmissionReceipt must match release admission receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`execution runbook receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`execution runbook receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`execution runbook receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.runbookOnly !== true) errors.push('execution runbook receipt runbookOnly must be true');
  if (receipt.executionMode !== runbook.executionMode) {
    errors.push('execution runbook receipt executionMode must match execution runbook');
  }
  if (receipt.requiresManualTrigger !== true) {
    errors.push('execution runbook receipt requiresManualTrigger must be true');
  }
  if (!sameJson(receipt.finalReceiptOutputs, runbook.finalReceiptOutputs || [])) {
    errors.push('execution runbook receipt finalReceiptOutputs must match execution runbook');
  }
  if (!sameJson(receipt.stopConditions, runbook.stopConditions || [])) {
    errors.push('execution runbook receipt stopConditions must match execution runbook');
  }
  if (receipt.maxWritesPerRun !== runbook.maxWritesPerRun) {
    errors.push('execution runbook receipt maxWritesPerRun must match execution runbook');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('execution runbook receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('execution runbook receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('execution runbook receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('execution runbook receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('execution runbook receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('execution runbook receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('execution runbook receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('execution runbook receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('execution runbook receipt writesPerformed must be 0');
  if (runbookResult.executionRunbookOk !== true) {
    errors.push('execution runbook receipt requires valid execution runbook result');
  }

  return errors;
}

function validateReceiptBundle(bundle, executionRunbookReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ReceiptBundle || {};

  if (bundle.authorityLevel !== 'A4') errors.push('receipt bundle authorityLevel must be A4');
  if (bundle.issue !== constraints.expectedIssue) {
    errors.push(`receipt bundle issue mismatch: expected ${constraints.expectedIssue}, got ${bundle.issue}`);
  }
  if (bundle.target !== constraints.expectedTarget) {
    errors.push(`receipt bundle target mismatch: expected ${constraints.expectedTarget}, got ${bundle.target}`);
  }
  if (bundle.action !== constraints.expectedAction) {
    errors.push(`receipt bundle action mismatch: expected ${constraints.expectedAction}, got ${bundle.action}`);
  }
  if (bundle.executionRunbookReceipt !== rel(paths.executionRunbookReceiptPath)) {
    errors.push('receipt bundle executionRunbookReceipt must match execution runbook receipt path');
  }
  if (bundle.executionRunbook !== rel(paths.executionRunbookPath)) {
    errors.push('receipt bundle executionRunbook must match execution runbook artifact path');
  }
  if (bundle.bundleOnly !== true) errors.push('receipt bundle bundleOnly must be true');
  if (bundle.shareable !== true) errors.push('receipt bundle shareable must be true');
  if (bundle.redactionPolicyApplied !== true) errors.push('receipt bundle redactionPolicyApplied must be true');
  if (!hasValue(bundle.redactionPolicy)) errors.push('receipt bundle redactionPolicy is required');
  if (bundle.containsSecrets !== false) errors.push('receipt bundle containsSecrets must be false');
  if (bundle.containsRawLogs !== false) errors.push('receipt bundle containsRawLogs must be false');
  if (bundle.containsPrompts !== false) errors.push('receipt bundle containsPrompts must be false');
  if (bundle.rawLogsIncluded === true) errors.push('receipt bundle rawLogsIncluded must not be true');
  if (bundle.promptsIncluded === true) errors.push('receipt bundle promptsIncluded must not be true');
  if (bundle.rawTranscriptIncluded === true) errors.push('receipt bundle rawTranscriptIncluded must not be true');

  const references = Array.isArray(bundle.receiptReferences) ? bundle.receiptReferences : [];
  const referenceModes = references.map((entry) => (typeof entry === 'string' ? entry : entry.mode));
  for (const reference of rules.requiredReceiptReferences || []) {
    if (!referenceModes.includes(reference)) {
      errors.push(`receipt bundle receiptReferences must include ${reference}`);
    }
  }
  for (const reference of references) {
    if (typeof reference === 'object' && reference.redacted !== true) {
      errors.push(`receipt bundle reference ${reference.mode || 'unknown'} must be redacted`);
    }
  }

  for (const evidence of rules.requiredEvidence || []) {
    if (!bundle.requiredEvidence?.includes(evidence)) {
      errors.push(`receipt bundle requiredEvidence must include ${evidence}`);
    }
  }
  if (!hasValue(bundle.linearEvidence)) errors.push('receipt bundle linearEvidence is required');
  if (bundle.githubChecksPassed !== true) errors.push('receipt bundle githubChecksPassed must be true');
  if (!hasValue(bundle.publicAccessFailClosedProof)) {
    errors.push('receipt bundle publicAccessFailClosedProof is required');
  }
  if (!hasValue(bundle.operatorSummary)) errors.push('receipt bundle operatorSummary is required');

  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!bundle.noExecutionMarkers?.includes(marker)) {
      errors.push(`receipt bundle noExecutionMarkers must include ${marker}`);
    }
  }
  if (bundle.currentPolicyBlocked !== true) errors.push('receipt bundle currentPolicyBlocked must be true');
  if (bundle.processSpawned === true) errors.push('receipt bundle processSpawned must not be true');
  if (Array.isArray(bundle.executedCommands) && bundle.executedCommands.length > 0) {
    errors.push('receipt bundle executedCommands must be empty');
  }
  if (bundle.runnerEnabled === true) errors.push('receipt bundle runnerEnabled must not be true');
  if (bundle.executionReady === true) errors.push('receipt bundle executionReady must not be true');
  if (bundle.executionEnabled === true) errors.push('receipt bundle executionEnabled must not be true');
  if (bundle.executionApproved === true) errors.push('receipt bundle executionApproved must not be true');
  if (bundle.wouldExecute === true) errors.push('receipt bundle wouldExecute must not be true');
  if (bundle.writesPerformed !== 0) errors.push('receipt bundle writesPerformed must be 0');
  if (executionRunbookReceipt.executionRunbookOk !== true) {
    errors.push('receipt bundle requires valid execution runbook receipt');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('receipt bundle current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateReceiptBundleReceipt(receipt, bundle, bundleResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'receipt-bundle-check') {
    errors.push('receipt bundle receipt mode must be receipt-bundle-check');
  }
  if (receipt.ok !== true || receipt.receiptBundleOk !== true) {
    errors.push('receipt bundle receipt must be ok');
  }
  if (receipt.receiptBundle !== rel(paths.receiptBundlePath)) {
    errors.push('receipt bundle receipt receiptBundle must match receipt bundle artifact path');
  }
  if (receipt.executionRunbookReceipt !== rel(paths.executionRunbookReceiptPath)) {
    errors.push('receipt bundle receipt executionRunbookReceipt must match execution runbook receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`receipt bundle receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`receipt bundle receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`receipt bundle receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.bundleOnly !== true) errors.push('receipt bundle receipt bundleOnly must be true');
  if (receipt.shareable !== true) errors.push('receipt bundle receipt shareable must be true');
  if (receipt.redactionPolicyApplied !== true) {
    errors.push('receipt bundle receipt redactionPolicyApplied must be true');
  }
  if (receipt.containsSecrets !== false) errors.push('receipt bundle receipt containsSecrets must be false');
  if (receipt.containsRawLogs !== false) errors.push('receipt bundle receipt containsRawLogs must be false');
  if (receipt.containsPrompts !== false) errors.push('receipt bundle receipt containsPrompts must be false');
  if (receipt.rawLogsIncluded !== false) errors.push('receipt bundle receipt rawLogsIncluded must be false');
  if (receipt.promptsIncluded !== false) errors.push('receipt bundle receipt promptsIncluded must be false');
  if (receipt.rawTranscriptIncluded !== false) errors.push('receipt bundle receipt rawTranscriptIncluded must be false');
  if (!sameJson(receipt.requiredEvidence, bundle.requiredEvidence || [])) {
    errors.push('receipt bundle receipt requiredEvidence must match receipt bundle');
  }
  if (receipt.githubChecksPassed !== bundle.githubChecksPassed) {
    errors.push('receipt bundle receipt githubChecksPassed must match receipt bundle');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('receipt bundle receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('receipt bundle receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('receipt bundle receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('receipt bundle receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('receipt bundle receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('receipt bundle receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('receipt bundle receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('receipt bundle receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('receipt bundle receipt writesPerformed must be 0');
  if (bundleResult.receiptBundleOk !== true) {
    errors.push('receipt bundle receipt requires valid receipt bundle result');
  }

  return errors;
}

function validateReceiptPublication(publication, receiptBundleReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ReceiptPublication || {};

  if (publication.authorityLevel !== 'A4') errors.push('receipt publication authorityLevel must be A4');
  if (publication.issue !== constraints.expectedIssue) {
    errors.push(`receipt publication issue mismatch: expected ${constraints.expectedIssue}, got ${publication.issue}`);
  }
  if (publication.target !== constraints.expectedTarget) {
    errors.push(`receipt publication target mismatch: expected ${constraints.expectedTarget}, got ${publication.target}`);
  }
  if (publication.action !== constraints.expectedAction) {
    errors.push(`receipt publication action mismatch: expected ${constraints.expectedAction}, got ${publication.action}`);
  }
  if (publication.receiptBundleReceipt !== rel(paths.receiptBundleReceiptPath)) {
    errors.push('receipt publication receiptBundleReceipt must match receipt bundle receipt path');
  }
  if (publication.receiptBundle !== rel(paths.receiptBundlePath)) {
    errors.push('receipt publication receiptBundle must match receipt bundle artifact path');
  }
  if (publication.publicationPacketOnly !== true) {
    errors.push('receipt publication publicationPacketOnly must be true');
  }
  if (publication.requiresOperatorReview !== true) {
    errors.push('receipt publication requiresOperatorReview must be true');
  }
  if (!rules.allowedPublicationSurfaces?.includes(publication.publicationSurface)) {
    errors.push('receipt publication publicationSurface must be an allowed publication surface');
  }
  if (!hasValue(publication.intendedAudience)) {
    errors.push('receipt publication intendedAudience is required');
  }
  if (publication.publishMode !== 'operator-reviewed-manual') {
    errors.push('receipt publication publishMode must be operator-reviewed-manual');
  }
  if (publication.autoPublish === true) errors.push('receipt publication autoPublish must not be true');
  if (publication.publicationPerformed === true) {
    errors.push('receipt publication publicationPerformed must not be true');
  }
  if (publication.thirdPartyWritePerformed === true) {
    errors.push('receipt publication thirdPartyWritePerformed must not be true');
  }
  if (publication.redactionPolicyApplied !== true) {
    errors.push('receipt publication redactionPolicyApplied must be true');
  }
  if (!hasValue(publication.redactionPolicy)) errors.push('receipt publication redactionPolicy is required');
  if (publication.containsSecrets !== false) errors.push('receipt publication containsSecrets must be false');
  if (publication.containsRawLogs !== false) errors.push('receipt publication containsRawLogs must be false');
  if (publication.containsPrompts !== false) errors.push('receipt publication containsPrompts must be false');
  if (publication.containsRawTranscripts !== false) {
    errors.push('receipt publication containsRawTranscripts must be false');
  }
  if (publication.rawLogsIncluded === true) errors.push('receipt publication rawLogsIncluded must not be true');
  if (publication.promptsIncluded === true) errors.push('receipt publication promptsIncluded must not be true');
  if (publication.rawTranscriptIncluded === true) {
    errors.push('receipt publication rawTranscriptIncluded must not be true');
  }

  for (const evidence of rules.requiredEvidence || []) {
    if (!publication.requiredEvidence?.includes(evidence)) {
      errors.push(`receipt publication requiredEvidence must include ${evidence}`);
    }
  }
  if (!hasValue(publication.publicationEvidence)) {
    errors.push('receipt publication publicationEvidence is required');
  }
  if (publication.publicationSurface === 'Linear' && !hasValue(publication.linearEvidence)) {
    errors.push('receipt publication linearEvidence is required for Linear publication surface');
  }
  if (publication.publicationSurface === 'signed-release-record' && !hasValue(publication.signedReleaseRecord)) {
    errors.push('receipt publication signedReleaseRecord is required for signed-release-record publication surface');
  }
  if (!hasValue(publication.publicAccessFailClosedProof)) {
    errors.push('receipt publication publicAccessFailClosedProof is required');
  }
  if (!hasValue(publication.operatorSummary)) errors.push('receipt publication operatorSummary is required');

  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!publication.noExecutionMarkers?.includes(marker)) {
      errors.push(`receipt publication noExecutionMarkers must include ${marker}`);
    }
  }
  if (publication.currentPolicyBlocked !== true) errors.push('receipt publication currentPolicyBlocked must be true');
  if (publication.processSpawned === true) errors.push('receipt publication processSpawned must not be true');
  if (Array.isArray(publication.executedCommands) && publication.executedCommands.length > 0) {
    errors.push('receipt publication executedCommands must be empty');
  }
  if (publication.runnerEnabled === true) errors.push('receipt publication runnerEnabled must not be true');
  if (publication.executionReady === true) errors.push('receipt publication executionReady must not be true');
  if (publication.executionEnabled === true) errors.push('receipt publication executionEnabled must not be true');
  if (publication.executionApproved === true) errors.push('receipt publication executionApproved must not be true');
  if (publication.wouldExecute === true) errors.push('receipt publication wouldExecute must not be true');
  if (publication.writesPerformed !== 0) errors.push('receipt publication writesPerformed must be 0');
  if (receiptBundleReceipt.receiptBundleOk !== true) {
    errors.push('receipt publication requires valid receipt bundle receipt');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('receipt publication current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateReceiptPublicationReceipt(receipt, publication, publicationResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'receipt-publication-check') {
    errors.push('receipt publication receipt mode must be receipt-publication-check');
  }
  if (receipt.ok !== true || receipt.receiptPublicationOk !== true) {
    errors.push('receipt publication receipt must be ok');
  }
  if (receipt.receiptPublication !== rel(paths.receiptPublicationPath)) {
    errors.push('receipt publication receipt receiptPublication must match receipt publication artifact path');
  }
  if (receipt.receiptBundleReceipt !== rel(paths.receiptBundleReceiptPath)) {
    errors.push('receipt publication receipt receiptBundleReceipt must match receipt bundle receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`receipt publication receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`receipt publication receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`receipt publication receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.publicationPacketOnly !== true) {
    errors.push('receipt publication receipt publicationPacketOnly must be true');
  }
  if (receipt.requiresOperatorReview !== true) {
    errors.push('receipt publication receipt requiresOperatorReview must be true');
  }
  if (receipt.publicationSurface !== publication.publicationSurface) {
    errors.push('receipt publication receipt publicationSurface must match receipt publication');
  }
  if (receipt.publishMode !== publication.publishMode) {
    errors.push('receipt publication receipt publishMode must match receipt publication');
  }
  if (receipt.autoPublish !== false) errors.push('receipt publication receipt autoPublish must be false');
  if (receipt.publicationPerformed !== false) {
    errors.push('receipt publication receipt publicationPerformed must be false');
  }
  if (receipt.thirdPartyWritePerformed !== false) {
    errors.push('receipt publication receipt thirdPartyWritePerformed must be false');
  }
  if (receipt.redactionPolicyApplied !== true) {
    errors.push('receipt publication receipt redactionPolicyApplied must be true');
  }
  if (receipt.containsSecrets !== false) errors.push('receipt publication receipt containsSecrets must be false');
  if (receipt.containsRawLogs !== false) errors.push('receipt publication receipt containsRawLogs must be false');
  if (receipt.containsPrompts !== false) errors.push('receipt publication receipt containsPrompts must be false');
  if (receipt.containsRawTranscripts !== false) {
    errors.push('receipt publication receipt containsRawTranscripts must be false');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('receipt publication receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('receipt publication receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('receipt publication receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('receipt publication receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('receipt publication receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('receipt publication receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('receipt publication receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('receipt publication receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('receipt publication receipt writesPerformed must be 0');
  if (publicationResult.receiptPublicationOk !== true) {
    errors.push('receipt publication receipt requires valid receipt publication result');
  }

  return errors;
}

function validateReceiptReviewDecision(decision, receiptPublicationReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ReceiptReviewDecision || {};

  if (decision.authorityLevel !== 'A4') errors.push('receipt review decision authorityLevel must be A4');
  if (decision.issue !== constraints.expectedIssue) {
    errors.push(`receipt review decision issue mismatch: expected ${constraints.expectedIssue}, got ${decision.issue}`);
  }
  if (decision.target !== constraints.expectedTarget) {
    errors.push(`receipt review decision target mismatch: expected ${constraints.expectedTarget}, got ${decision.target}`);
  }
  if (decision.action !== constraints.expectedAction) {
    errors.push(`receipt review decision action mismatch: expected ${constraints.expectedAction}, got ${decision.action}`);
  }
  if (decision.receiptPublicationReceipt !== rel(paths.receiptPublicationReceiptPath)) {
    errors.push('receipt review decision receiptPublicationReceipt must match receipt publication receipt path');
  }
  if (decision.receiptPublication !== rel(paths.receiptPublicationPath)) {
    errors.push('receipt review decision receiptPublication must match receipt publication artifact path');
  }
  if (decision.decisionPacketOnly !== true) {
    errors.push('receipt review decision decisionPacketOnly must be true');
  }
  if (!hasValue(decision.reviewer)) errors.push('receipt review decision reviewer is required');
  if (!Number.isFinite(Date.parse(decision.reviewedAt || ''))) {
    errors.push('receipt review decision reviewedAt must be a valid timestamp');
  }
  if (!rules.allowedDecisions?.includes(decision.decision)) {
    errors.push('receipt review decision decision must be allowed');
  }
  for (const surface of rules.requiresReviewedSurfaces || []) {
    if (!decision.reviewedSurfaces?.includes(surface)) {
      errors.push(`receipt review decision reviewedSurfaces must include ${surface}`);
    }
  }
  if (decision.decision === 'approved-for-manual-next-step' && !hasValue(decision.requiredNextStep)) {
    errors.push('receipt review decision requiredNextStep is required for approved decisions');
  }
  if (decision.decision !== 'approved-for-manual-next-step' && !hasValue(decision.followUpRequired)) {
    errors.push('receipt review decision followUpRequired is required for non-approved decisions');
  }
  if (decision.redactionPolicyApplied !== true) {
    errors.push('receipt review decision redactionPolicyApplied must be true');
  }
  if (!hasValue(decision.redactionPolicy)) errors.push('receipt review decision redactionPolicy is required');
  if (decision.containsSecrets !== false) errors.push('receipt review decision containsSecrets must be false');
  if (decision.containsRawLogs !== false) errors.push('receipt review decision containsRawLogs must be false');
  if (decision.containsPrompts !== false) errors.push('receipt review decision containsPrompts must be false');
  if (decision.containsRawTranscripts !== false) {
    errors.push('receipt review decision containsRawTranscripts must be false');
  }
  if (decision.rawLogsIncluded === true) errors.push('receipt review decision rawLogsIncluded must not be true');
  if (decision.promptsIncluded === true) errors.push('receipt review decision promptsIncluded must not be true');
  if (decision.rawTranscriptIncluded === true) {
    errors.push('receipt review decision rawTranscriptIncluded must not be true');
  }
  for (const evidence of rules.requiredEvidence || []) {
    if (!decision.requiredEvidence?.includes(evidence)) {
      errors.push(`receipt review decision requiredEvidence must include ${evidence}`);
    }
  }
  if (!hasValue(decision.publicAccessFailClosedProof)) {
    errors.push('receipt review decision publicAccessFailClosedProof is required');
  }
  if (!hasValue(decision.operatorSummary)) errors.push('receipt review decision operatorSummary is required');
  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!decision.noExecutionMarkers?.includes(marker)) {
      errors.push(`receipt review decision noExecutionMarkers must include ${marker}`);
    }
  }
  if (decision.currentPolicyBlocked !== true) errors.push('receipt review decision currentPolicyBlocked must be true');
  if (decision.processSpawned === true) errors.push('receipt review decision processSpawned must not be true');
  if (Array.isArray(decision.executedCommands) && decision.executedCommands.length > 0) {
    errors.push('receipt review decision executedCommands must be empty');
  }
  if (decision.runnerEnabled === true) errors.push('receipt review decision runnerEnabled must not be true');
  if (decision.executionReady === true) errors.push('receipt review decision executionReady must not be true');
  if (decision.executionEnabled === true) errors.push('receipt review decision executionEnabled must not be true');
  if (decision.executionApproved === true) errors.push('receipt review decision executionApproved must not be true');
  if (decision.wouldExecute === true) errors.push('receipt review decision wouldExecute must not be true');
  if (decision.writesPerformed !== 0) errors.push('receipt review decision writesPerformed must be 0');
  if (receiptPublicationReceipt.receiptPublicationOk !== true) {
    errors.push('receipt review decision requires valid receipt publication receipt');
  }
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('receipt review decision current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateReceiptReviewDecisionReceipt(receipt, decision, decisionResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'receipt-review-decision-check') {
    errors.push('receipt review decision receipt mode must be receipt-review-decision-check');
  }
  if (receipt.ok !== true || receipt.receiptReviewDecisionOk !== true) {
    errors.push('receipt review decision receipt must be ok');
  }
  if (receipt.receiptReviewDecision !== rel(paths.receiptReviewDecisionPath)) {
    errors.push('receipt review decision receipt receiptReviewDecision must match receipt review decision artifact path');
  }
  if (receipt.receiptPublicationReceipt !== rel(paths.receiptPublicationReceiptPath)) {
    errors.push('receipt review decision receipt receiptPublicationReceipt must match receipt publication receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`receipt review decision receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`receipt review decision receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`receipt review decision receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.decisionPacketOnly !== true) {
    errors.push('receipt review decision receipt decisionPacketOnly must be true');
  }
  if (receipt.decision !== decision.decision) {
    errors.push('receipt review decision receipt decision must match receipt review decision');
  }
  if (receipt.decision !== 'approved-for-manual-next-step') {
    errors.push('receipt review decision receipt decision must be approved-for-manual-next-step for handoff');
  }
  if (receipt.redactionPolicyApplied !== true) {
    errors.push('receipt review decision receipt redactionPolicyApplied must be true');
  }
  if (receipt.containsSecrets !== false) errors.push('receipt review decision receipt containsSecrets must be false');
  if (receipt.containsRawLogs !== false) errors.push('receipt review decision receipt containsRawLogs must be false');
  if (receipt.containsPrompts !== false) errors.push('receipt review decision receipt containsPrompts must be false');
  if (receipt.containsRawTranscripts !== false) {
    errors.push('receipt review decision receipt containsRawTranscripts must be false');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('receipt review decision receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('receipt review decision receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('receipt review decision receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('receipt review decision receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('receipt review decision receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('receipt review decision receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('receipt review decision receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('receipt review decision receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('receipt review decision receipt writesPerformed must be 0');
  if (decisionResult.receiptReviewDecisionOk !== true) {
    errors.push('receipt review decision receipt requires valid receipt review decision result');
  }

  return errors;
}

function validateManualNextStepHandoff(handoff, reviewDecisionReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ManualNextStepHandoff || {};

  if (handoff.authorityLevel !== 'A4') errors.push('manual next-step handoff authorityLevel must be A4');
  if (handoff.issue !== constraints.expectedIssue) {
    errors.push(`manual next-step handoff issue mismatch: expected ${constraints.expectedIssue}, got ${handoff.issue}`);
  }
  if (handoff.target !== constraints.expectedTarget) {
    errors.push(`manual next-step handoff target mismatch: expected ${constraints.expectedTarget}, got ${handoff.target}`);
  }
  if (handoff.action !== constraints.expectedAction) {
    errors.push(`manual next-step handoff action mismatch: expected ${constraints.expectedAction}, got ${handoff.action}`);
  }
  if (handoff.receiptReviewDecision !== rel(paths.receiptReviewDecisionPath)) {
    errors.push('manual next-step handoff receiptReviewDecision must match receipt review decision artifact path');
  }
  if (handoff.receiptReviewDecisionReceipt !== rel(paths.receiptReviewDecisionReceiptPath)) {
    errors.push('manual next-step handoff receiptReviewDecisionReceipt must match receipt review decision receipt path');
  }
  if (handoff.handoffPacketOnly !== true) errors.push('manual next-step handoff handoffPacketOnly must be true');
  if (reviewDecisionReceipt.decision !== 'approved-for-manual-next-step') {
    errors.push('manual next-step handoff requires approved receipt review decision');
  }
  if (!rules.allowedHandoffSurfaces?.includes(handoff.handoffSurface)) {
    errors.push('manual next-step handoff handoffSurface must be allowed');
  }
  if (!hasValue(handoff.owner)) errors.push('manual next-step handoff owner is required');
  if (!handoff.proposedIssue || typeof handoff.proposedIssue !== 'object') {
    errors.push('manual next-step handoff proposedIssue is required');
  } else {
    if (!hasValue(handoff.proposedIssue.title)) {
      errors.push('manual next-step handoff proposedIssue.title is required');
    }
    if (!hasValue(handoff.proposedIssue.body)) {
      errors.push('manual next-step handoff proposedIssue.body is required');
    }
    if (handoff.proposedIssue.issueCreated === true) {
      errors.push('manual next-step handoff proposedIssue.issueCreated must not be true');
    }
    if (hasValue(handoff.proposedIssue.createdIssueId)) {
      errors.push('manual next-step handoff proposedIssue.createdIssueId must be empty');
    }
    if (hasValue(handoff.proposedIssue.createdIssueUrl)) {
      errors.push('manual next-step handoff proposedIssue.createdIssueUrl must be empty');
    }
  }
  if (handoff.issueCreationPerformed !== false) {
    errors.push('manual next-step handoff issueCreationPerformed must be false');
  }
  if (handoff.issueCreated === true) errors.push('manual next-step handoff issueCreated must not be true');
  if (hasValue(handoff.createdIssueId)) errors.push('manual next-step handoff createdIssueId must be empty');
  if (hasValue(handoff.createdIssueUrl)) errors.push('manual next-step handoff createdIssueUrl must be empty');
  if (handoff.thirdPartyWritePerformed === true) {
    errors.push('manual next-step handoff thirdPartyWritePerformed must not be true');
  }
  if (handoff.linearIssueCreated === true) {
    errors.push('manual next-step handoff linearIssueCreated must not be true');
  }
  for (const reference of rules.requiredReceiptReferences || []) {
    if (!handoff.requiredReceiptReferences?.includes(reference)) {
      errors.push(`manual next-step handoff requiredReceiptReferences must include ${reference}`);
    }
  }
  for (const evidence of rules.requiredEvidence || []) {
    if (!handoff.requiredEvidence?.includes(evidence)) {
      errors.push(`manual next-step handoff requiredEvidence must include ${evidence}`);
    }
  }
  if (handoff.redactionPolicyApplied !== true) {
    errors.push('manual next-step handoff redactionPolicyApplied must be true');
  }
  if (!hasValue(handoff.redactionPolicy)) errors.push('manual next-step handoff redactionPolicy is required');
  if (handoff.containsSecrets !== false) errors.push('manual next-step handoff containsSecrets must be false');
  if (handoff.containsRawLogs !== false) errors.push('manual next-step handoff containsRawLogs must be false');
  if (handoff.containsPrompts !== false) errors.push('manual next-step handoff containsPrompts must be false');
  if (handoff.containsRawTranscripts !== false) {
    errors.push('manual next-step handoff containsRawTranscripts must be false');
  }
  if (handoff.rawLogsIncluded === true) errors.push('manual next-step handoff rawLogsIncluded must not be true');
  if (handoff.promptsIncluded === true) errors.push('manual next-step handoff promptsIncluded must not be true');
  if (handoff.rawTranscriptIncluded === true) {
    errors.push('manual next-step handoff rawTranscriptIncluded must not be true');
  }
  if (!hasValue(handoff.publicAccessFailClosedProof)) {
    errors.push('manual next-step handoff publicAccessFailClosedProof is required');
  }
  if (!hasValue(handoff.operatorSummary)) errors.push('manual next-step handoff operatorSummary is required');
  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!handoff.noExecutionMarkers?.includes(marker)) {
      errors.push(`manual next-step handoff noExecutionMarkers must include ${marker}`);
    }
  }
  if (handoff.currentPolicyBlocked !== true) errors.push('manual next-step handoff currentPolicyBlocked must be true');
  if (handoff.processSpawned === true) errors.push('manual next-step handoff processSpawned must not be true');
  if (Array.isArray(handoff.executedCommands) && handoff.executedCommands.length > 0) {
    errors.push('manual next-step handoff executedCommands must be empty');
  }
  if (handoff.runnerEnabled === true) errors.push('manual next-step handoff runnerEnabled must not be true');
  if (handoff.executionReady === true) errors.push('manual next-step handoff executionReady must not be true');
  if (handoff.executionEnabled === true) errors.push('manual next-step handoff executionEnabled must not be true');
  if (handoff.executionApproved === true) errors.push('manual next-step handoff executionApproved must not be true');
  if (handoff.wouldExecute === true) errors.push('manual next-step handoff wouldExecute must not be true');
  if (handoff.writesPerformed !== 0) errors.push('manual next-step handoff writesPerformed must be 0');
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('manual next-step handoff current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateManualNextStepHandoffReceipt(receipt, handoff, handoffResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'manual-next-step-handoff-check') {
    errors.push('manual next-step handoff receipt mode must be manual-next-step-handoff-check');
  }
  if (receipt.ok !== true || receipt.manualNextStepHandoffOk !== true) {
    errors.push('manual next-step handoff receipt must be ok');
  }
  if (receipt.manualNextStepHandoff !== rel(paths.manualNextStepHandoffPath)) {
    errors.push('manual next-step handoff receipt manualNextStepHandoff must match manual next-step handoff artifact path');
  }
  if (receipt.receiptReviewDecisionReceipt !== rel(paths.receiptReviewDecisionReceiptPath)) {
    errors.push('manual next-step handoff receipt receiptReviewDecisionReceipt must match receipt review decision receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`manual next-step handoff receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`manual next-step handoff receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`manual next-step handoff receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.handoffPacketOnly !== true) {
    errors.push('manual next-step handoff receipt handoffPacketOnly must be true');
  }
  if (receipt.reviewDecision !== 'approved-for-manual-next-step') {
    errors.push('manual next-step handoff receipt reviewDecision must be approved-for-manual-next-step');
  }
  if (receipt.owner !== handoff.owner) {
    errors.push('manual next-step handoff receipt owner must match manual next-step handoff');
  }
  if (!sameJson(receipt.proposedIssue, handoff.proposedIssue)) {
    errors.push('manual next-step handoff receipt proposedIssue must match manual next-step handoff');
  }
  if (receipt.issueCreationPerformed !== false) {
    errors.push('manual next-step handoff receipt issueCreationPerformed must be false');
  }
  if (receipt.issueCreated !== false) errors.push('manual next-step handoff receipt issueCreated must be false');
  if (receipt.thirdPartyWritePerformed !== false) {
    errors.push('manual next-step handoff receipt thirdPartyWritePerformed must be false');
  }
  if (receipt.linearIssueCreated !== false) {
    errors.push('manual next-step handoff receipt linearIssueCreated must be false');
  }
  if (receipt.redactionPolicyApplied !== true) {
    errors.push('manual next-step handoff receipt redactionPolicyApplied must be true');
  }
  if (receipt.containsSecrets !== false) errors.push('manual next-step handoff receipt containsSecrets must be false');
  if (receipt.containsRawLogs !== false) errors.push('manual next-step handoff receipt containsRawLogs must be false');
  if (receipt.containsPrompts !== false) errors.push('manual next-step handoff receipt containsPrompts must be false');
  if (receipt.containsRawTranscripts !== false) {
    errors.push('manual next-step handoff receipt containsRawTranscripts must be false');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('manual next-step handoff receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('manual next-step handoff receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('manual next-step handoff receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('manual next-step handoff receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('manual next-step handoff receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('manual next-step handoff receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('manual next-step handoff receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('manual next-step handoff receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('manual next-step handoff receipt writesPerformed must be 0');
  if (handoffResult.manualNextStepHandoffOk !== true) {
    errors.push('manual next-step handoff receipt requires valid manual next-step handoff result');
  }

  return errors;
}

function validateManualFollowUpIssueEvidence(evidence, handoffReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4ManualFollowUpIssueEvidence || {};
  const proposedIssue = handoffReceipt.proposedIssue || {};

  if (evidence.authorityLevel !== 'A4') errors.push('manual follow-up issue evidence authorityLevel must be A4');
  if (evidence.issue !== constraints.expectedIssue) {
    errors.push(`manual follow-up issue evidence issue mismatch: expected ${constraints.expectedIssue}, got ${evidence.issue}`);
  }
  if (evidence.target !== constraints.expectedTarget) {
    errors.push(`manual follow-up issue evidence target mismatch: expected ${constraints.expectedTarget}, got ${evidence.target}`);
  }
  if (evidence.action !== constraints.expectedAction) {
    errors.push(`manual follow-up issue evidence action mismatch: expected ${constraints.expectedAction}, got ${evidence.action}`);
  }
  if (evidence.manualNextStepHandoff !== rel(paths.manualNextStepHandoffPath)) {
    errors.push('manual follow-up issue evidence manualNextStepHandoff must match manual next-step handoff artifact path');
  }
  if (evidence.manualNextStepHandoffReceipt !== rel(paths.manualNextStepHandoffReceiptPath)) {
    errors.push('manual follow-up issue evidence manualNextStepHandoffReceipt must match manual next-step handoff receipt path');
  }
  if (evidence.evidencePacketOnly !== true) {
    errors.push('manual follow-up issue evidence evidencePacketOnly must be true');
  }
  if (evidence.manualIssueCreated !== true) {
    errors.push('manual follow-up issue evidence manualIssueCreated must be true');
  }
  if (!rules.allowedIssueSurfaces?.includes(evidence.issueSurface)) {
    errors.push('manual follow-up issue evidence issueSurface must be allowed');
  }
  if (!hasValue(evidence.issueIdentifier)) {
    errors.push('manual follow-up issue evidence issueIdentifier is required');
  }
  if (!hasValue(evidence.issueUrl)) {
    errors.push('manual follow-up issue evidence issueUrl is required');
  }
  if (!hasValue(evidence.createdBy)) {
    errors.push('manual follow-up issue evidence createdBy is required');
  }
  if (!Number.isFinite(Date.parse(evidence.createdAt || ''))) {
    errors.push('manual follow-up issue evidence createdAt must be a valid timestamp');
  }
  if (!hasValue(evidence.owner)) errors.push('manual follow-up issue evidence owner is required');
  if (evidence.owner !== handoffReceipt.owner) {
    errors.push('manual follow-up issue evidence owner must match handoff owner');
  }
  if (!evidence.createdIssue || typeof evidence.createdIssue !== 'object') {
    errors.push('manual follow-up issue evidence createdIssue is required');
  } else {
    if (evidence.createdIssue.identifier !== evidence.issueIdentifier) {
      errors.push('manual follow-up issue evidence createdIssue.identifier must match issueIdentifier');
    }
    if (evidence.createdIssue.url !== evidence.issueUrl) {
      errors.push('manual follow-up issue evidence createdIssue.url must match issueUrl');
    }
    if (evidence.createdIssue.title !== proposedIssue.title) {
      errors.push('manual follow-up issue evidence createdIssue.title must match handoff proposedIssue.title');
    }
    if (!hasValue(evidence.createdIssue.bodySummary)) {
      errors.push('manual follow-up issue evidence createdIssue.bodySummary is required');
    }
    if (Array.isArray(proposedIssue.labels)) {
      const missingLabels = includesAll(evidence.createdIssue.labels || [], proposedIssue.labels);
      if (missingLabels.length) {
        errors.push(`manual follow-up issue evidence createdIssue.labels missing: ${missingLabels.join(', ')}`);
      }
    }
  }
  if (evidence.issueCreationPerformedByVerifier !== false) {
    errors.push('manual follow-up issue evidence issueCreationPerformedByVerifier must be false');
  }
  if (evidence.thirdPartyWritePerformedByVerifier !== false) {
    errors.push('manual follow-up issue evidence thirdPartyWritePerformedByVerifier must be false');
  }
  if (evidence.postedByVerifier === true) {
    errors.push('manual follow-up issue evidence postedByVerifier must not be true');
  }
  for (const reference of rules.requiredReceiptReferences || []) {
    if (!evidence.requiredReceiptReferences?.includes(reference)) {
      errors.push(`manual follow-up issue evidence requiredReceiptReferences must include ${reference}`);
    }
  }
  for (const requiredEvidence of rules.requiredEvidence || []) {
    if (!evidence.requiredEvidence?.includes(requiredEvidence)) {
      errors.push(`manual follow-up issue evidence requiredEvidence must include ${requiredEvidence}`);
    }
  }
  if (evidence.redactionPolicyApplied !== true) {
    errors.push('manual follow-up issue evidence redactionPolicyApplied must be true');
  }
  if (!hasValue(evidence.redactionPolicy)) errors.push('manual follow-up issue evidence redactionPolicy is required');
  if (evidence.containsSecrets !== false) errors.push('manual follow-up issue evidence containsSecrets must be false');
  if (evidence.containsRawLogs !== false) errors.push('manual follow-up issue evidence containsRawLogs must be false');
  if (evidence.containsPrompts !== false) errors.push('manual follow-up issue evidence containsPrompts must be false');
  if (evidence.containsRawTranscripts !== false) {
    errors.push('manual follow-up issue evidence containsRawTranscripts must be false');
  }
  if (evidence.rawLogsIncluded === true) errors.push('manual follow-up issue evidence rawLogsIncluded must not be true');
  if (evidence.promptsIncluded === true) errors.push('manual follow-up issue evidence promptsIncluded must not be true');
  if (evidence.rawTranscriptIncluded === true) {
    errors.push('manual follow-up issue evidence rawTranscriptIncluded must not be true');
  }
  if (!hasValue(evidence.publicAccessFailClosedProof)) {
    errors.push('manual follow-up issue evidence publicAccessFailClosedProof is required');
  }
  if (!hasValue(evidence.operatorSummary)) errors.push('manual follow-up issue evidence operatorSummary is required');
  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!evidence.noExecutionMarkers?.includes(marker)) {
      errors.push(`manual follow-up issue evidence noExecutionMarkers must include ${marker}`);
    }
  }
  if (evidence.currentPolicyBlocked !== true) errors.push('manual follow-up issue evidence currentPolicyBlocked must be true');
  if (evidence.processSpawned === true) errors.push('manual follow-up issue evidence processSpawned must not be true');
  if (Array.isArray(evidence.executedCommands) && evidence.executedCommands.length > 0) {
    errors.push('manual follow-up issue evidence executedCommands must be empty');
  }
  if (evidence.runnerEnabled === true) errors.push('manual follow-up issue evidence runnerEnabled must not be true');
  if (evidence.executionReady === true) errors.push('manual follow-up issue evidence executionReady must not be true');
  if (evidence.executionEnabled === true) errors.push('manual follow-up issue evidence executionEnabled must not be true');
  if (evidence.executionApproved === true) errors.push('manual follow-up issue evidence executionApproved must not be true');
  if (evidence.wouldExecute === true) errors.push('manual follow-up issue evidence wouldExecute must not be true');
  if (evidence.writesPerformed !== 0) errors.push('manual follow-up issue evidence writesPerformed must be 0');
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('manual follow-up issue evidence current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

  return errors;
}

function validateManualFollowUpIssueEvidenceReceipt(receipt, evidence, evidenceResult, paths, constraints) {
  const errors = [];

  if (receipt.mode !== 'manual-follow-up-issue-evidence-check') {
    errors.push('manual follow-up issue evidence receipt mode must be manual-follow-up-issue-evidence-check');
  }
  if (receipt.ok !== true || receipt.manualFollowUpIssueEvidenceOk !== true) {
    errors.push('manual follow-up issue evidence receipt must be ok');
  }
  if (receipt.manualFollowUpIssueEvidence !== rel(paths.manualFollowUpIssueEvidencePath)) {
    errors.push('manual follow-up issue evidence receipt manualFollowUpIssueEvidence must match manual follow-up issue evidence artifact path');
  }
  if (receipt.manualNextStepHandoffReceipt !== rel(paths.manualNextStepHandoffReceiptPath)) {
    errors.push('manual follow-up issue evidence receipt manualNextStepHandoffReceipt must match manual next-step handoff receipt path');
  }
  if (receipt.issue !== constraints.expectedIssue) {
    errors.push(`manual follow-up issue evidence receipt issue mismatch: expected ${constraints.expectedIssue}, got ${receipt.issue}`);
  }
  if (receipt.target !== constraints.expectedTarget) {
    errors.push(`manual follow-up issue evidence receipt target mismatch: expected ${constraints.expectedTarget}, got ${receipt.target}`);
  }
  if (receipt.action !== constraints.expectedAction) {
    errors.push(`manual follow-up issue evidence receipt action mismatch: expected ${constraints.expectedAction}, got ${receipt.action}`);
  }
  if (receipt.evidencePacketOnly !== true) {
    errors.push('manual follow-up issue evidence receipt evidencePacketOnly must be true');
  }
  if (receipt.manualIssueCreated !== true) {
    errors.push('manual follow-up issue evidence receipt manualIssueCreated must be true');
  }
  if (receipt.issueIdentifier !== evidence.issueIdentifier) {
    errors.push('manual follow-up issue evidence receipt issueIdentifier must match evidence');
  }
  if (receipt.issueUrl !== evidence.issueUrl) {
    errors.push('manual follow-up issue evidence receipt issueUrl must match evidence');
  }
  if (receipt.owner !== evidence.owner) {
    errors.push('manual follow-up issue evidence receipt owner must match evidence');
  }
  if (receipt.issueCreationPerformedByVerifier !== false) {
    errors.push('manual follow-up issue evidence receipt issueCreationPerformedByVerifier must be false');
  }
  if (receipt.thirdPartyWritePerformedByVerifier !== false) {
    errors.push('manual follow-up issue evidence receipt thirdPartyWritePerformedByVerifier must be false');
  }
  if (receipt.postedByVerifier !== false) {
    errors.push('manual follow-up issue evidence receipt postedByVerifier must be false');
  }
  if (receipt.redactionPolicyApplied !== true) {
    errors.push('manual follow-up issue evidence receipt redactionPolicyApplied must be true');
  }
  if (receipt.containsSecrets !== false) errors.push('manual follow-up issue evidence receipt containsSecrets must be false');
  if (receipt.containsRawLogs !== false) errors.push('manual follow-up issue evidence receipt containsRawLogs must be false');
  if (receipt.containsPrompts !== false) errors.push('manual follow-up issue evidence receipt containsPrompts must be false');
  if (receipt.containsRawTranscripts !== false) {
    errors.push('manual follow-up issue evidence receipt containsRawTranscripts must be false');
  }
  if (receipt.currentPolicyBlocked !== true) errors.push('manual follow-up issue evidence receipt currentPolicyBlocked must be true');
  if (receipt.processSpawned !== false) errors.push('manual follow-up issue evidence receipt processSpawned must be false');
  if (!Array.isArray(receipt.executedCommands) || receipt.executedCommands.length !== 0) {
    errors.push('manual follow-up issue evidence receipt executedCommands must be empty');
  }
  if (receipt.runnerEnabled !== false) errors.push('manual follow-up issue evidence receipt runnerEnabled must be false');
  if (receipt.executionReady !== false) errors.push('manual follow-up issue evidence receipt executionReady must be false');
  if (receipt.executionEnabled !== false) errors.push('manual follow-up issue evidence receipt executionEnabled must be false');
  if (receipt.executionApproved !== false) errors.push('manual follow-up issue evidence receipt executionApproved must be false');
  if (receipt.wouldExecute !== false) errors.push('manual follow-up issue evidence receipt wouldExecute must be false');
  if (receipt.writesPerformed !== 0) errors.push('manual follow-up issue evidence receipt writesPerformed must be 0');
  if (evidenceResult.manualFollowUpIssueEvidenceOk !== true) {
    errors.push('manual follow-up issue evidence receipt requires valid manual follow-up issue evidence result');
  }

  return errors;
}

function validateFollowUpWorkIntake(intake, evidenceReceipt, manifest, paths, constraints) {
  const errors = [];
  const rules = manifest.a4FollowUpWorkIntake || {};

  if (intake.authorityLevel !== 'A4') errors.push('follow-up work intake authorityLevel must be A4');
  if (intake.issue !== constraints.expectedIssue) {
    errors.push(`follow-up work intake issue mismatch: expected ${constraints.expectedIssue}, got ${intake.issue}`);
  }
  if (intake.target !== constraints.expectedTarget) {
    errors.push(`follow-up work intake target mismatch: expected ${constraints.expectedTarget}, got ${intake.target}`);
  }
  if (intake.action !== constraints.expectedAction) {
    errors.push(`follow-up work intake action mismatch: expected ${constraints.expectedAction}, got ${intake.action}`);
  }
  if (intake.manualFollowUpIssueEvidence !== rel(paths.manualFollowUpIssueEvidencePath)) {
    errors.push('follow-up work intake manualFollowUpIssueEvidence must match manual follow-up issue evidence artifact path');
  }
  if (intake.manualFollowUpIssueEvidenceReceipt !== rel(paths.manualFollowUpIssueEvidenceReceiptPath)) {
    errors.push('follow-up work intake manualFollowUpIssueEvidenceReceipt must match manual follow-up issue evidence receipt path');
  }
  if (intake.intakePacketOnly !== true) errors.push('follow-up work intake intakePacketOnly must be true');
  if (intake.issueIdentifier !== evidenceReceipt.issueIdentifier) {
    errors.push('follow-up work intake issueIdentifier must match manual issue evidence receipt');
  }
  if (intake.issueUrl !== evidenceReceipt.issueUrl) {
    errors.push('follow-up work intake issueUrl must match manual issue evidence receipt');
  }
  if (!hasValue(intake.owner)) errors.push('follow-up work intake owner is required');
  if (intake.owner !== evidenceReceipt.owner) errors.push('follow-up work intake owner must match manual issue evidence receipt');
  if (!hasValue(intake.intendedAssignee)) errors.push('follow-up work intake intendedAssignee is required');
  if (!rules.allowedImplementationSurfaces?.includes(intake.implementationSurface)) {
    errors.push('follow-up work intake implementationSurface must be allowed');
  }
  if (!Array.isArray(intake.scopedFilesOrModules) || intake.scopedFilesOrModules.length === 0) {
    errors.push('follow-up work intake scopedFilesOrModules must not be empty');
  }
  if (!Array.isArray(intake.validationPlan) || intake.validationPlan.length === 0) {
    errors.push('follow-up work intake validationPlan must not be empty');
  }
  if (!Array.isArray(intake.rollbackPlan) || intake.rollbackPlan.length === 0) {
    errors.push('follow-up work intake rollbackPlan must not be empty');
  }
  if (intake.issueClaimedByVerifier !== false) errors.push('follow-up work intake issueClaimedByVerifier must be false');
  if (intake.worktreeCreatedByVerifier !== false) {
    errors.push('follow-up work intake worktreeCreatedByVerifier must be false');
  }
  if (intake.branchCreatedByVerifier !== false) errors.push('follow-up work intake branchCreatedByVerifier must be false');
  if (intake.prCreatedByVerifier !== false) errors.push('follow-up work intake prCreatedByVerifier must be false');
  if (intake.thirdPartyWritePerformedByVerifier !== false) {
    errors.push('follow-up work intake thirdPartyWritePerformedByVerifier must be false');
  }
  for (const reference of rules.requiredReceiptReferences || []) {
    if (!intake.requiredReceiptReferences?.includes(reference)) {
      errors.push(`follow-up work intake requiredReceiptReferences must include ${reference}`);
    }
  }
  for (const evidence of rules.requiredEvidence || []) {
    if (!intake.requiredEvidence?.includes(evidence)) {
      errors.push(`follow-up work intake requiredEvidence must include ${evidence}`);
    }
  }
  if (intake.redactionPolicyApplied !== true) errors.push('follow-up work intake redactionPolicyApplied must be true');
  if (!hasValue(intake.redactionPolicy)) errors.push('follow-up work intake redactionPolicy is required');
  if (intake.containsSecrets !== false) errors.push('follow-up work intake containsSecrets must be false');
  if (intake.containsRawLogs !== false) errors.push('follow-up work intake containsRawLogs must be false');
  if (intake.containsPrompts !== false) errors.push('follow-up work intake containsPrompts must be false');
  if (intake.containsRawTranscripts !== false) {
    errors.push('follow-up work intake containsRawTranscripts must be false');
  }
  if (intake.rawLogsIncluded === true) errors.push('follow-up work intake rawLogsIncluded must not be true');
  if (intake.promptsIncluded === true) errors.push('follow-up work intake promptsIncluded must not be true');
  if (intake.rawTranscriptIncluded === true) errors.push('follow-up work intake rawTranscriptIncluded must not be true');
  if (!hasValue(intake.publicAccessFailClosedProof)) {
    errors.push('follow-up work intake publicAccessFailClosedProof is required');
  }
  if (!hasValue(intake.operatorSummary)) errors.push('follow-up work intake operatorSummary is required');
  for (const marker of rules.requiredNoExecutionMarkers || []) {
    if (!intake.noExecutionMarkers?.includes(marker)) {
      errors.push(`follow-up work intake noExecutionMarkers must include ${marker}`);
    }
  }
  if (intake.currentPolicyBlocked !== true) errors.push('follow-up work intake currentPolicyBlocked must be true');
  if (intake.processSpawned === true) errors.push('follow-up work intake processSpawned must not be true');
  if (Array.isArray(intake.executedCommands) && intake.executedCommands.length > 0) {
    errors.push('follow-up work intake executedCommands must be empty');
  }
  if (intake.runnerEnabled === true) errors.push('follow-up work intake runnerEnabled must not be true');
  if (intake.executionReady === true) errors.push('follow-up work intake executionReady must not be true');
  if (intake.executionEnabled === true) errors.push('follow-up work intake executionEnabled must not be true');
  if (intake.executionApproved === true) errors.push('follow-up work intake executionApproved must not be true');
  if (intake.wouldExecute === true) errors.push('follow-up work intake wouldExecute must not be true');
  if (intake.writesPerformed !== 0) errors.push('follow-up work intake writesPerformed must be 0');
  if (manifest.authority?.a4Execution !== 'blocked') {
    errors.push('follow-up work intake current manifest authority.a4Execution must remain blocked in this verifier PR');
  }

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

function buildRunnerImplementationDiffReceipt({
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
  planReceipt,
  planReceiptPath,
  runnerDiff,
  runnerDiffPath,
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
  planReceiptErrors,
  runnerDiffErrors,
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
    ...planReceiptErrors,
    ...runnerDiffErrors,
  ];
  const runnerImplementationDiffOk = errors.length === 0;

  return {
    mode: 'runner-implementation-diff-check',
    ok: runnerImplementationDiffOk,
    runnerImplementationDiffOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    runnerDiff: rel(runnerDiffPath),
    runnerImplementationPlanReceipt: rel(planReceiptPath),
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
    targetScope: runnerDiff.targetScope || planReceipt.targetScope || runnerPlan.targetScope,
    candidateOnly: runnerDiff.candidateOnly === true,
    checkedInEntrypointExists: runnerDiff.checkedInEntrypointExists === true,
    plannedEntrypoint: runnerDiff.plannedEntrypoint,
    filesToAdd: runnerDiff.filesToAdd || [],
    filesToModify: runnerDiff.filesToModify || [],
    maxWritesPerRun: runnerDiff.maxWritesPerRun,
    requiredGuards: runnerDiff.requiredGuards || [],
    proofHooks: runnerDiff.proofHooks || [],
    revalidationSequence: runnerDiff.revalidationSequence || [],
    receiptOutputs: runnerDiff.receiptOutputs || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: runnerImplementationDiffOk
      ? 'runner implementation diff admitted as a candidate artifact; executable runner entrypoint is not checked in and current policy remains blocked'
      : 'runner implementation diff rejected before any runner file is added',
    evidenceTarget: runnerDiff.evidenceTarget || planReceipt.evidenceTarget || runnerPlan.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator-reviewed implementation PR may add the exact candidate runner entrypoint only after checked-in policy is enabled and this diff is revalidated',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      runnerDiffRequiresPlanReceipt: manifest.a4RunnerImplementationDiff?.requiresRunnerImplementationPlanReceipt,
      runnerDiffCandidateOnly: manifest.a4RunnerImplementationDiff?.candidateOnly,
      runnerDiffEntrypointMustBeAbsent: manifest.a4RunnerImplementationDiff?.checkedInEntrypointMustBeAbsent,
    },
  };
}

function buildReleaseAdmissionReceipt({
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
  planReceipt,
  planReceiptPath,
  runnerDiff,
  runnerDiffPath,
  runnerDiffReceipt,
  runnerDiffReceiptPath,
  releaseAdmission,
  releaseAdmissionPath,
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
  planReceiptErrors,
  runnerDiffErrors,
  runnerDiffReceiptErrors,
  releaseAdmissionErrors,
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
    ...planReceiptErrors,
    ...runnerDiffErrors,
    ...runnerDiffReceiptErrors,
    ...releaseAdmissionErrors,
  ];
  const releaseAdmissionOk = errors.length === 0;

  return {
    mode: 'release-admission-check',
    ok: releaseAdmissionOk,
    releaseAdmissionOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    releaseAdmission: rel(releaseAdmissionPath),
    runnerImplementationDiffReceipt: rel(runnerDiffReceiptPath),
    runnerDiff: rel(runnerDiffPath),
    runnerImplementationPlanReceipt: rel(planReceiptPath),
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
    targetScope: releaseAdmission.targetScope || runnerDiffReceipt.targetScope || runnerDiff.targetScope,
    releaseMode: releaseAdmission.releaseMode,
    packetOnly: releaseAdmission.packetOnly === true,
    requiresManualMerge: releaseAdmission.requiresManualMerge === true,
    autoMerge: releaseAdmission.autoMerge === true,
    prs: releaseAdmission.prs || [],
    mergeOrder: releaseAdmission.mergeOrder || [],
    requiredEvidence: releaseAdmission.requiredEvidence || [],
    requiredGuards: releaseAdmission.requiredGuards || [],
    linearEvidence: releaseAdmission.linearEvidence || null,
    rollbackNote: releaseAdmission.rollbackNote || null,
    publicAccessFailClosedProof: releaseAdmission.publicAccessFailClosedProof || null,
    maxWritesPerRun: releaseAdmission.maxWritesPerRun,
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: releaseAdmissionOk
      ? 'release admission packet accepted for manual review; checked-in policy remains blocked and no runner execution occurred'
      : 'release admission packet rejected before any policy merge or runner execution',
    evidenceTarget: releaseAdmission.evidenceTarget || runnerDiffReceipt.evidenceTarget || runnerDiff.evidenceTarget || packet.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may review release admission evidence before merging policy enablement and runner entrypoint in the declared order',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      releaseAdmissionRequiresReadinessReceipt: manifest.a4ReleaseAdmission?.requiresEnabledManifestReadinessReceipt,
      releaseAdmissionRequiresRunnerDiffReceipt: manifest.a4ReleaseAdmission?.requiresRunnerImplementationDiffReceipt,
      releaseAdmissionPacketOnly: manifest.a4ReleaseAdmission?.packetOnly,
    },
  };
}

function buildExecutionRunbookReceipt({
  manifest,
  manifestValidation,
  releaseResult,
  releaseAdmission,
  releaseAdmissionPath,
  releaseAdmissionReceipt,
  releaseAdmissionReceiptPath,
  executionRunbook,
  executionRunbookPath,
  constraints,
  releaseAdmissionReceiptErrors,
  executionRunbookErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(releaseResult.errors || []),
    ...releaseAdmissionReceiptErrors,
    ...executionRunbookErrors,
  ];
  const executionRunbookOk = errors.length === 0;

  return {
    mode: 'execution-runbook-check',
    ok: executionRunbookOk,
    executionRunbookOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    executionRunbook: rel(executionRunbookPath),
    releaseAdmissionReceipt: rel(releaseAdmissionReceiptPath),
    releaseAdmission: rel(releaseAdmissionPath),
    runnerImplementationDiffReceipt: releaseResult.runnerImplementationDiffReceipt,
    runnerDiff: releaseResult.runnerDiff,
    readinessReceipt: releaseResult.readinessReceipt,
    candidateManifest: releaseResult.candidateManifest,
    packetPath: releaseResult.packetPath,
    issue: releaseResult.issue || constraints.expectedIssue,
    authorityLevel: releaseResult.authorityLevel,
    target: releaseResult.target,
    action: releaseResult.action,
    targetScope: executionRunbook.targetScope || releaseAdmissionReceipt.targetScope || releaseResult.targetScope,
    runbookOnly: executionRunbook.runbookOnly === true,
    executionMode: executionRunbook.executionMode,
    requiresManualTrigger: executionRunbook.requiresManualTrigger === true,
    targetValidationCommands: executionRunbook.targetValidationCommands || [],
    writeCommand: executionRunbook.writeCommand || null,
    postActionSmokeCommands: executionRunbook.postActionSmokeCommands || [],
    rollbackCommands: executionRunbook.rollbackCommands || [],
    publicAccessFailClosedProof: executionRunbook.publicAccessFailClosedProof || null,
    finalReceiptOutputs: executionRunbook.finalReceiptOutputs || [],
    stopConditions: executionRunbook.stopConditions || [],
    linearEvidence: executionRunbook.linearEvidence || null,
    maxWritesPerRun: executionRunbook.maxWritesPerRun,
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: executionRunbookOk
      ? 'execution runbook accepted for future operator-supervised use; checked-in policy remains blocked and no command executed'
      : 'execution runbook rejected before any runner process or write command',
    evidenceTarget: executionRunbook.evidenceTarget || releaseAdmissionReceipt.evidenceTarget || releaseAdmission.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may use this runbook only after checked-in policy enablement, exact command receipt, target validation, rollback readiness, smoke plan, and public fail-closed proof are revalidated',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      executionRunbookRequiresReleaseAdmissionReceipt: manifest.a4ExecutionRunbook?.requiresReleaseAdmissionReceipt,
      executionRunbookOnly: manifest.a4ExecutionRunbook?.runbookOnly,
    },
  };
}

function buildReceiptBundleReceipt({
  manifest,
  manifestValidation,
  runbookResult,
  executionRunbook,
  executionRunbookPath,
  executionRunbookReceipt,
  executionRunbookReceiptPath,
  receiptBundle,
  receiptBundlePath,
  constraints,
  executionRunbookReceiptErrors,
  receiptBundleErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(runbookResult.errors || []),
    ...executionRunbookReceiptErrors,
    ...receiptBundleErrors,
  ];
  const receiptBundleOk = errors.length === 0;

  return {
    mode: 'receipt-bundle-check',
    ok: receiptBundleOk,
    receiptBundleOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    receiptBundle: rel(receiptBundlePath),
    executionRunbookReceipt: rel(executionRunbookReceiptPath),
    executionRunbook: rel(executionRunbookPath),
    releaseAdmissionReceipt: runbookResult.releaseAdmissionReceipt,
    releaseAdmission: runbookResult.releaseAdmission,
    packetPath: runbookResult.packetPath,
    issue: runbookResult.issue || constraints.expectedIssue,
    authorityLevel: runbookResult.authorityLevel,
    target: runbookResult.target,
    action: runbookResult.action,
    targetScope: receiptBundle.targetScope || executionRunbookReceipt.targetScope || runbookResult.targetScope,
    bundleOnly: receiptBundle.bundleOnly === true,
    shareable: receiptBundle.shareable === true,
    redactionPolicyApplied: receiptBundle.redactionPolicyApplied === true,
    redactionPolicy: receiptBundle.redactionPolicy || null,
    containsSecrets: receiptBundle.containsSecrets === true,
    containsRawLogs: receiptBundle.containsRawLogs === true,
    containsPrompts: receiptBundle.containsPrompts === true,
    rawLogsIncluded: receiptBundle.rawLogsIncluded === true,
    promptsIncluded: receiptBundle.promptsIncluded === true,
    rawTranscriptIncluded: receiptBundle.rawTranscriptIncluded === true,
    receiptReferences: receiptBundle.receiptReferences || [],
    requiredEvidence: receiptBundle.requiredEvidence || [],
    linearEvidence: receiptBundle.linearEvidence || null,
    githubChecksPassed: receiptBundle.githubChecksPassed === true,
    publicAccessFailClosedProof: receiptBundle.publicAccessFailClosedProof || null,
    operatorSummary: receiptBundle.operatorSummary || null,
    noExecutionMarkers: receiptBundle.noExecutionMarkers || [],
    finalReceiptOutputs: executionRunbook.finalReceiptOutputs || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: receiptBundleOk
      ? 'shareable receipt bundle accepted for asynchronous operator review; checked-in policy remains blocked and no raw logs, prompts, secrets, commands, or writes are included'
      : 'receipt bundle rejected before sharing, runner process, or write command',
    evidenceTarget: receiptBundle.evidenceTarget || executionRunbookReceipt.evidenceTarget || runbookResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may review the redacted receipt bundle asynchronously; any production write still requires checked-in enabled policy, exact command receipt, manual trigger, and full-chain revalidation',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      receiptBundleRequiresExecutionRunbookReceipt: manifest.a4ReceiptBundle?.requiresExecutionRunbookReceipt,
      receiptBundleShareableOnly: manifest.a4ReceiptBundle?.shareableOnly,
      receiptBundleForbidsSecrets: manifest.a4ReceiptBundle?.forbidsSecrets,
      receiptBundleForbidsRawLogs: manifest.a4ReceiptBundle?.forbidsRawLogs,
      receiptBundleForbidsPrompts: manifest.a4ReceiptBundle?.forbidsPrompts,
    },
  };
}

function buildReceiptPublicationReceipt({
  manifest,
  manifestValidation,
  bundleResult,
  receiptBundle,
  receiptBundlePath,
  receiptBundleReceipt,
  receiptBundleReceiptPath,
  receiptPublication,
  receiptPublicationPath,
  constraints,
  receiptBundleReceiptErrors,
  receiptPublicationErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(bundleResult.errors || []),
    ...receiptBundleReceiptErrors,
    ...receiptPublicationErrors,
  ];
  const receiptPublicationOk = errors.length === 0;

  return {
    mode: 'receipt-publication-check',
    ok: receiptPublicationOk,
    receiptPublicationOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    receiptPublication: rel(receiptPublicationPath),
    receiptBundleReceipt: rel(receiptBundleReceiptPath),
    receiptBundle: rel(receiptBundlePath),
    executionRunbookReceipt: bundleResult.executionRunbookReceipt,
    executionRunbook: bundleResult.executionRunbook,
    packetPath: bundleResult.packetPath,
    issue: bundleResult.issue || constraints.expectedIssue,
    authorityLevel: bundleResult.authorityLevel,
    target: bundleResult.target,
    action: bundleResult.action,
    targetScope: receiptPublication.targetScope || receiptBundleReceipt.targetScope || bundleResult.targetScope,
    publicationPacketOnly: receiptPublication.publicationPacketOnly === true,
    requiresOperatorReview: receiptPublication.requiresOperatorReview === true,
    publicationSurface: receiptPublication.publicationSurface || null,
    intendedAudience: receiptPublication.intendedAudience || null,
    publishMode: receiptPublication.publishMode || null,
    autoPublish: receiptPublication.autoPublish === true,
    publicationPerformed: receiptPublication.publicationPerformed === true,
    thirdPartyWritePerformed: receiptPublication.thirdPartyWritePerformed === true,
    redactionPolicyApplied: receiptPublication.redactionPolicyApplied === true,
    redactionPolicy: receiptPublication.redactionPolicy || null,
    containsSecrets: receiptPublication.containsSecrets === true,
    containsRawLogs: receiptPublication.containsRawLogs === true,
    containsPrompts: receiptPublication.containsPrompts === true,
    containsRawTranscripts: receiptPublication.containsRawTranscripts === true,
    rawLogsIncluded: receiptPublication.rawLogsIncluded === true,
    promptsIncluded: receiptPublication.promptsIncluded === true,
    rawTranscriptIncluded: receiptPublication.rawTranscriptIncluded === true,
    requiredEvidence: receiptPublication.requiredEvidence || [],
    publicationEvidence: receiptPublication.publicationEvidence || null,
    linearEvidence: receiptPublication.linearEvidence || null,
    signedReleaseRecord: receiptPublication.signedReleaseRecord || null,
    publicAccessFailClosedProof: receiptPublication.publicAccessFailClosedProof || null,
    operatorSummary: receiptPublication.operatorSummary || null,
    noExecutionMarkers: receiptPublication.noExecutionMarkers || [],
    receiptBundleSummary: receiptBundle.operatorSummary || receiptBundleReceipt.operatorSummary || null,
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: receiptPublicationOk
      ? 'receipt publication packet accepted for manual operator review; no Linear post, signed record write, runner process, command, or production write occurred'
      : 'receipt publication packet rejected before sharing, third-party write, runner process, or write command',
    evidenceTarget: receiptPublication.evidenceTarget || receiptBundleReceipt.evidenceTarget || bundleResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may manually publish the redacted receipt bundle only through the declared surface; any automated posting or production write still requires a separate approved implementation path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      receiptPublicationRequiresReceiptBundleReceipt: manifest.a4ReceiptPublication?.requiresReceiptBundleReceipt,
      receiptPublicationPacketOnly: manifest.a4ReceiptPublication?.publicationPacketOnly,
      receiptPublicationRequiresOperatorReview: manifest.a4ReceiptPublication?.requiresOperatorReview,
      receiptPublicationRequiresNoThirdPartyWrite: manifest.a4ReceiptPublication?.requiresNoThirdPartyWrite,
    },
  };
}

function buildReceiptReviewDecisionReceipt({
  manifest,
  manifestValidation,
  publicationResult,
  receiptPublication,
  receiptPublicationPath,
  receiptPublicationReceipt,
  receiptPublicationReceiptPath,
  receiptReviewDecision,
  receiptReviewDecisionPath,
  constraints,
  receiptPublicationReceiptErrors,
  receiptReviewDecisionErrors,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(publicationResult.errors || []),
    ...receiptPublicationReceiptErrors,
    ...receiptReviewDecisionErrors,
  ];
  const receiptReviewDecisionOk = errors.length === 0;

  return {
    mode: 'receipt-review-decision-check',
    ok: receiptReviewDecisionOk,
    receiptReviewDecisionOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    receiptReviewDecision: rel(receiptReviewDecisionPath),
    receiptPublicationReceipt: rel(receiptPublicationReceiptPath),
    receiptPublication: rel(receiptPublicationPath),
    receiptBundleReceipt: publicationResult.receiptBundleReceipt,
    receiptBundle: publicationResult.receiptBundle,
    packetPath: publicationResult.packetPath,
    issue: publicationResult.issue || constraints.expectedIssue,
    authorityLevel: publicationResult.authorityLevel,
    target: publicationResult.target,
    action: publicationResult.action,
    targetScope: receiptReviewDecision.targetScope || receiptPublicationReceipt.targetScope || publicationResult.targetScope,
    decisionPacketOnly: receiptReviewDecision.decisionPacketOnly === true,
    reviewer: receiptReviewDecision.reviewer || null,
    reviewedAt: receiptReviewDecision.reviewedAt || null,
    decision: receiptReviewDecision.decision || null,
    reviewedSurfaces: receiptReviewDecision.reviewedSurfaces || [],
    requiredNextStep: receiptReviewDecision.requiredNextStep || null,
    followUpRequired: receiptReviewDecision.followUpRequired || null,
    redactionPolicyApplied: receiptReviewDecision.redactionPolicyApplied === true,
    redactionPolicy: receiptReviewDecision.redactionPolicy || null,
    containsSecrets: receiptReviewDecision.containsSecrets === true,
    containsRawLogs: receiptReviewDecision.containsRawLogs === true,
    containsPrompts: receiptReviewDecision.containsPrompts === true,
    containsRawTranscripts: receiptReviewDecision.containsRawTranscripts === true,
    rawLogsIncluded: receiptReviewDecision.rawLogsIncluded === true,
    promptsIncluded: receiptReviewDecision.promptsIncluded === true,
    rawTranscriptIncluded: receiptReviewDecision.rawTranscriptIncluded === true,
    requiredEvidence: receiptReviewDecision.requiredEvidence || [],
    publicAccessFailClosedProof: receiptReviewDecision.publicAccessFailClosedProof || null,
    operatorSummary: receiptReviewDecision.operatorSummary || null,
    noExecutionMarkers: receiptReviewDecision.noExecutionMarkers || [],
    publicationSummary: receiptPublication.operatorSummary || receiptPublicationReceipt.operatorSummary || null,
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: receiptReviewDecisionOk
      ? 'receipt review decision accepted as review-only evidence; no runner process, command, policy enablement, posting, or production write occurred'
      : 'receipt review decision rejected before any posting, runner process, policy enablement, or write command',
    evidenceTarget: receiptReviewDecision.evidenceTarget || receiptPublicationReceipt.evidenceTarget || publicationResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may use this review decision as evidence for a separate manual next step; automated execution still requires explicit checked-in policy enablement and a separate runner path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      receiptReviewDecisionRequiresReceiptPublicationReceipt: manifest.a4ReceiptReviewDecision?.requiresReceiptPublicationReceipt,
      receiptReviewDecisionPacketOnly: manifest.a4ReceiptReviewDecision?.decisionPacketOnly,
      receiptReviewDecisionRequiresNoExecutionOnApproval: manifest.a4ReceiptReviewDecision?.requiresNoExecutionOnApproval,
    },
  };
}

function buildManualNextStepHandoffReceipt({
  manifest,
  manifestValidation,
  decisionResult,
  receiptReviewDecision,
  receiptReviewDecisionPath,
  receiptReviewDecisionReceipt,
  receiptReviewDecisionReceiptPath,
  manualNextStepHandoff,
  manualNextStepHandoffPath,
  receiptReviewDecisionReceiptErrors,
  manualNextStepHandoffErrors,
  constraints,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(decisionResult.errors || []),
    ...receiptReviewDecisionReceiptErrors,
    ...manualNextStepHandoffErrors,
  ];
  const manualNextStepHandoffOk = errors.length === 0;

  return {
    mode: 'manual-next-step-handoff-check',
    ok: manualNextStepHandoffOk,
    manualNextStepHandoffOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    manualNextStepHandoff: rel(manualNextStepHandoffPath),
    receiptReviewDecision: rel(receiptReviewDecisionPath),
    receiptReviewDecisionReceipt: rel(receiptReviewDecisionReceiptPath),
    receiptPublicationReceipt: decisionResult.receiptPublicationReceipt,
    receiptPublication: decisionResult.receiptPublication,
    receiptBundleReceipt: decisionResult.receiptBundleReceipt,
    receiptBundle: decisionResult.receiptBundle,
    packetPath: decisionResult.packetPath,
    issue: decisionResult.issue || constraints.expectedIssue,
    authorityLevel: decisionResult.authorityLevel,
    target: decisionResult.target,
    action: decisionResult.action,
    targetScope: manualNextStepHandoff.targetScope || receiptReviewDecisionReceipt.targetScope || decisionResult.targetScope,
    handoffPacketOnly: manualNextStepHandoff.handoffPacketOnly === true,
    handoffSurface: manualNextStepHandoff.handoffSurface || null,
    owner: manualNextStepHandoff.owner || null,
    reviewDecision: receiptReviewDecisionReceipt.decision || receiptReviewDecision.decision || null,
    proposedIssue: manualNextStepHandoff.proposedIssue || null,
    issueCreationPerformed: manualNextStepHandoff.issueCreationPerformed === true,
    issueCreated: manualNextStepHandoff.issueCreated === true,
    thirdPartyWritePerformed: manualNextStepHandoff.thirdPartyWritePerformed === true,
    linearIssueCreated: manualNextStepHandoff.linearIssueCreated === true,
    requiredReceiptReferences: manualNextStepHandoff.requiredReceiptReferences || [],
    requiredEvidence: manualNextStepHandoff.requiredEvidence || [],
    redactionPolicyApplied: manualNextStepHandoff.redactionPolicyApplied === true,
    redactionPolicy: manualNextStepHandoff.redactionPolicy || null,
    containsSecrets: manualNextStepHandoff.containsSecrets === true,
    containsRawLogs: manualNextStepHandoff.containsRawLogs === true,
    containsPrompts: manualNextStepHandoff.containsPrompts === true,
    containsRawTranscripts: manualNextStepHandoff.containsRawTranscripts === true,
    rawLogsIncluded: manualNextStepHandoff.rawLogsIncluded === true,
    promptsIncluded: manualNextStepHandoff.promptsIncluded === true,
    rawTranscriptIncluded: manualNextStepHandoff.rawTranscriptIncluded === true,
    publicAccessFailClosedProof: manualNextStepHandoff.publicAccessFailClosedProof || null,
    operatorSummary: manualNextStepHandoff.operatorSummary || null,
    noExecutionMarkers: manualNextStepHandoff.noExecutionMarkers || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: manualNextStepHandoffOk
      ? 'manual next-step handoff accepted as handoff-only evidence; no issue was created, no post was made, no runner process spawned, and no production write occurred'
      : 'manual next-step handoff rejected before issue creation, posting, runner process, policy enablement, or write command',
    evidenceTarget: manualNextStepHandoff.evidenceTarget || receiptReviewDecisionReceipt.evidenceTarget || decisionResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may manually create the proposed follow-up issue; automated execution still requires explicit checked-in policy enablement and a separate runner path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      manualNextStepHandoffRequiresReceiptReviewDecisionReceipt: manifest.a4ManualNextStepHandoff?.requiresReceiptReviewDecisionReceipt,
      manualNextStepHandoffPacketOnly: manifest.a4ManualNextStepHandoff?.handoffPacketOnly,
      manualNextStepHandoffIssueCreationPerformed: manifest.a4ManualNextStepHandoff?.issueCreationPerformed,
      manualNextStepHandoffRequiresNoExecutionOnHandoff: manifest.a4ManualNextStepHandoff?.requiresNoExecutionOnHandoff,
    },
  };
}

function buildManualFollowUpIssueEvidenceReceipt({
  manifest,
  manifestValidation,
  handoffResult,
  manualNextStepHandoff,
  manualNextStepHandoffPath,
  manualNextStepHandoffReceipt,
  manualNextStepHandoffReceiptPath,
  manualFollowUpIssueEvidence,
  manualFollowUpIssueEvidencePath,
  manualNextStepHandoffReceiptErrors,
  manualFollowUpIssueEvidenceErrors,
  constraints,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(handoffResult.errors || []),
    ...manualNextStepHandoffReceiptErrors,
    ...manualFollowUpIssueEvidenceErrors,
  ];
  const manualFollowUpIssueEvidenceOk = errors.length === 0;

  return {
    mode: 'manual-follow-up-issue-evidence-check',
    ok: manualFollowUpIssueEvidenceOk,
    manualFollowUpIssueEvidenceOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    manualFollowUpIssueEvidence: rel(manualFollowUpIssueEvidencePath),
    manualNextStepHandoff: rel(manualNextStepHandoffPath),
    manualNextStepHandoffReceipt: rel(manualNextStepHandoffReceiptPath),
    receiptReviewDecisionReceipt: handoffResult.receiptReviewDecisionReceipt,
    receiptReviewDecision: handoffResult.receiptReviewDecision,
    receiptPublicationReceipt: handoffResult.receiptPublicationReceipt,
    receiptPublication: handoffResult.receiptPublication,
    receiptBundleReceipt: handoffResult.receiptBundleReceipt,
    receiptBundle: handoffResult.receiptBundle,
    packetPath: handoffResult.packetPath,
    issue: handoffResult.issue || constraints.expectedIssue,
    authorityLevel: handoffResult.authorityLevel,
    target: handoffResult.target,
    action: handoffResult.action,
    targetScope: manualFollowUpIssueEvidence.targetScope || manualNextStepHandoffReceipt.targetScope || handoffResult.targetScope,
    evidencePacketOnly: manualFollowUpIssueEvidence.evidencePacketOnly === true,
    issueSurface: manualFollowUpIssueEvidence.issueSurface || null,
    manualIssueCreated: manualFollowUpIssueEvidence.manualIssueCreated === true,
    issueIdentifier: manualFollowUpIssueEvidence.issueIdentifier || null,
    issueUrl: manualFollowUpIssueEvidence.issueUrl || null,
    createdBy: manualFollowUpIssueEvidence.createdBy || null,
    createdAt: manualFollowUpIssueEvidence.createdAt || null,
    owner: manualFollowUpIssueEvidence.owner || null,
    createdIssue: manualFollowUpIssueEvidence.createdIssue || null,
    handoffProposedIssue: manualNextStepHandoff.proposedIssue || manualNextStepHandoffReceipt.proposedIssue || null,
    issueCreationPerformedByVerifier: manualFollowUpIssueEvidence.issueCreationPerformedByVerifier === true,
    thirdPartyWritePerformedByVerifier: manualFollowUpIssueEvidence.thirdPartyWritePerformedByVerifier === true,
    postedByVerifier: manualFollowUpIssueEvidence.postedByVerifier === true,
    requiredReceiptReferences: manualFollowUpIssueEvidence.requiredReceiptReferences || [],
    requiredEvidence: manualFollowUpIssueEvidence.requiredEvidence || [],
    redactionPolicyApplied: manualFollowUpIssueEvidence.redactionPolicyApplied === true,
    redactionPolicy: manualFollowUpIssueEvidence.redactionPolicy || null,
    containsSecrets: manualFollowUpIssueEvidence.containsSecrets === true,
    containsRawLogs: manualFollowUpIssueEvidence.containsRawLogs === true,
    containsPrompts: manualFollowUpIssueEvidence.containsPrompts === true,
    containsRawTranscripts: manualFollowUpIssueEvidence.containsRawTranscripts === true,
    rawLogsIncluded: manualFollowUpIssueEvidence.rawLogsIncluded === true,
    promptsIncluded: manualFollowUpIssueEvidence.promptsIncluded === true,
    rawTranscriptIncluded: manualFollowUpIssueEvidence.rawTranscriptIncluded === true,
    publicAccessFailClosedProof: manualFollowUpIssueEvidence.publicAccessFailClosedProof || null,
    operatorSummary: manualFollowUpIssueEvidence.operatorSummary || null,
    noExecutionMarkers: manualFollowUpIssueEvidence.noExecutionMarkers || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: manualFollowUpIssueEvidenceOk
      ? 'manual follow-up issue evidence accepted as evidence-only proof; verifier did not create an issue, post updates, spawn a runner process, or perform a production write'
      : 'manual follow-up issue evidence rejected before issue creation, posting, runner process, policy enablement, or write command',
    evidenceTarget: manualFollowUpIssueEvidence.evidenceTarget || manualNextStepHandoffReceipt.evidenceTarget || handoffResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may use this manually created follow-up issue as the next reviewed work item; automated execution still requires explicit checked-in policy enablement and a separate runner path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      manualFollowUpIssueEvidenceRequiresManualNextStepHandoffReceipt: manifest.a4ManualFollowUpIssueEvidence?.requiresManualNextStepHandoffReceipt,
      manualFollowUpIssueEvidencePacketOnly: manifest.a4ManualFollowUpIssueEvidence?.evidencePacketOnly,
      manualFollowUpIssueEvidenceCreationPerformedByVerifier: manifest.a4ManualFollowUpIssueEvidence?.issueCreationPerformedByVerifier,
      manualFollowUpIssueEvidenceRequiresNoExecutionOnEvidence: manifest.a4ManualFollowUpIssueEvidence?.requiresNoExecutionOnEvidence,
    },
  };
}

function buildFollowUpWorkIntakeReceipt({
  manifest,
  manifestValidation,
  evidenceResult,
  manualFollowUpIssueEvidence,
  manualFollowUpIssueEvidencePath,
  manualFollowUpIssueEvidenceReceipt,
  manualFollowUpIssueEvidenceReceiptPath,
  followUpWorkIntake,
  followUpWorkIntakePath,
  manualFollowUpIssueEvidenceReceiptErrors,
  followUpWorkIntakeErrors,
  constraints,
  options,
}) {
  const errors = [
    ...manifestValidation.errors,
    ...(evidenceResult.errors || []),
    ...manualFollowUpIssueEvidenceReceiptErrors,
    ...followUpWorkIntakeErrors,
  ];
  const followUpWorkIntakeOk = errors.length === 0;

  return {
    mode: 'follow-up-work-intake-check',
    ok: followUpWorkIntakeOk,
    followUpWorkIntakeOk,
    errors,
    warnings: manifestValidation.warnings,
    manifest: options.manifest,
    followUpWorkIntake: rel(followUpWorkIntakePath),
    manualFollowUpIssueEvidence: rel(manualFollowUpIssueEvidencePath),
    manualFollowUpIssueEvidenceReceipt: rel(manualFollowUpIssueEvidenceReceiptPath),
    manualNextStepHandoffReceipt: evidenceResult.manualNextStepHandoffReceipt,
    manualNextStepHandoff: evidenceResult.manualNextStepHandoff,
    receiptReviewDecisionReceipt: evidenceResult.receiptReviewDecisionReceipt,
    receiptReviewDecision: evidenceResult.receiptReviewDecision,
    packetPath: evidenceResult.packetPath,
    issue: evidenceResult.issue || constraints.expectedIssue,
    authorityLevel: evidenceResult.authorityLevel,
    target: evidenceResult.target,
    action: evidenceResult.action,
    targetScope: followUpWorkIntake.targetScope || manualFollowUpIssueEvidenceReceipt.targetScope || evidenceResult.targetScope,
    intakePacketOnly: followUpWorkIntake.intakePacketOnly === true,
    issueIdentifier: followUpWorkIntake.issueIdentifier || null,
    issueUrl: followUpWorkIntake.issueUrl || null,
    owner: followUpWorkIntake.owner || null,
    intendedAssignee: followUpWorkIntake.intendedAssignee || null,
    implementationSurface: followUpWorkIntake.implementationSurface || null,
    scopedFilesOrModules: followUpWorkIntake.scopedFilesOrModules || [],
    validationPlan: followUpWorkIntake.validationPlan || [],
    rollbackPlan: followUpWorkIntake.rollbackPlan || [],
    issueClaimedByVerifier: followUpWorkIntake.issueClaimedByVerifier === true,
    worktreeCreatedByVerifier: followUpWorkIntake.worktreeCreatedByVerifier === true,
    branchCreatedByVerifier: followUpWorkIntake.branchCreatedByVerifier === true,
    prCreatedByVerifier: followUpWorkIntake.prCreatedByVerifier === true,
    thirdPartyWritePerformedByVerifier: followUpWorkIntake.thirdPartyWritePerformedByVerifier === true,
    requiredReceiptReferences: followUpWorkIntake.requiredReceiptReferences || [],
    requiredEvidence: followUpWorkIntake.requiredEvidence || [],
    redactionPolicyApplied: followUpWorkIntake.redactionPolicyApplied === true,
    redactionPolicy: followUpWorkIntake.redactionPolicy || null,
    containsSecrets: followUpWorkIntake.containsSecrets === true,
    containsRawLogs: followUpWorkIntake.containsRawLogs === true,
    containsPrompts: followUpWorkIntake.containsPrompts === true,
    containsRawTranscripts: followUpWorkIntake.containsRawTranscripts === true,
    rawLogsIncluded: followUpWorkIntake.rawLogsIncluded === true,
    promptsIncluded: followUpWorkIntake.promptsIncluded === true,
    rawTranscriptIncluded: followUpWorkIntake.rawTranscriptIncluded === true,
    publicAccessFailClosedProof: followUpWorkIntake.publicAccessFailClosedProof || null,
    operatorSummary: followUpWorkIntake.operatorSummary || null,
    noExecutionMarkers: followUpWorkIntake.noExecutionMarkers || [],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    blockedReason: followUpWorkIntakeOk
      ? 'follow-up work intake accepted as intake-only evidence; verifier did not claim an issue, create a worktree, create a branch, open a PR, spawn a runner process, or perform a production write'
      : 'follow-up work intake rejected before issue claim, worktree creation, branch creation, PR creation, runner process, policy enablement, or write command',
    evidenceTarget: followUpWorkIntake.evidenceTarget || manualFollowUpIssueEvidenceReceipt.evidenceTarget || evidenceResult.evidenceTarget || null,
    checkedAt: new Date().toISOString(),
    nextGate: 'operator may use this intake packet to create a separate claimed implementation worktree later; automated execution still requires explicit checked-in policy enablement and a separate runner path',
    policy: {
      a4Execution: manifest.authority?.a4Execution,
      authoritySource: manifest.authority?.authoritySource,
      omnigentRole: manifest.authority?.omnigentRole,
      runnerEnabled: manifest.a4ExecutionCommand?.runnerEnabled,
      executorRunnerEnabled: manifest.a4ExecutorProof?.runnerEnabled,
      followUpWorkIntakeRequiresManualFollowUpIssueEvidenceReceipt: manifest.a4FollowUpWorkIntake?.requiresManualFollowUpIssueEvidenceReceipt,
      followUpWorkIntakePacketOnly: manifest.a4FollowUpWorkIntake?.intakePacketOnly,
      followUpWorkIntakeIssueClaimedByVerifier: manifest.a4FollowUpWorkIntake?.issueClaimedByVerifier,
      followUpWorkIntakeWorktreeCreatedByVerifier: manifest.a4FollowUpWorkIntake?.worktreeCreatedByVerifier,
      followUpWorkIntakeRequiresNoExecutionOnIntake: manifest.a4FollowUpWorkIntake?.requiresNoExecutionOnIntake,
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

function commandRunnerImplementationDiffCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for runner-implementation-diff-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for runner-implementation-diff-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for runner-implementation-diff-check');
  if (!options.authorization) throw new Error('--authorization is required for runner-implementation-diff-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for runner-implementation-diff-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for runner-implementation-diff-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for runner-implementation-diff-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for runner-implementation-diff-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for runner-implementation-diff-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for runner-implementation-diff-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for runner-implementation-diff-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for runner-implementation-diff-check');
  if (!options.applicationDiffReceipt) {
    throw new Error('--application-diff-receipt is required for runner-implementation-diff-check');
  }
  if (!options.readinessReceipt) {
    throw new Error('--readiness-receipt is required for runner-implementation-diff-check');
  }
  if (!options.runnerContract) throw new Error('--runner-contract is required for runner-implementation-diff-check');
  if (!options.runnerContractReceipt) {
    throw new Error('--runner-contract-receipt is required for runner-implementation-diff-check');
  }
  if (!options.runnerPlan) throw new Error('--runner-plan is required for runner-implementation-diff-check');
  if (!options.runnerPlanReceipt) {
    throw new Error('--runner-plan-receipt is required for runner-implementation-diff-check');
  }
  if (!options.runnerDiff) throw new Error('--runner-diff is required for runner-implementation-diff-check');

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
  const planReceiptPath = resolveFromRoot(options.runnerPlanReceipt);
  const runnerDiffPath = resolveFromRoot(options.runnerDiff);
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
  const planReceipt = readJson(planReceiptPath);
  const runnerDiff = readJson(runnerDiffPath);
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
  const planReceiptErrors = validateRunnerImplementationPlanReceipt(planReceipt, runnerPlan, contractReceipt, packet, {
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
    contractReceiptPath,
    runnerPlanPath,
  }, constraints);
  const runnerDiffErrors = validateRunnerImplementationDiff(runnerDiff, packet, planReceipt, manifest, {
    planReceiptPath,
  }, constraints);
  const result = buildRunnerImplementationDiffReceipt({
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
    planReceipt,
    planReceiptPath,
    runnerDiff,
    runnerDiffPath,
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
    planReceiptErrors,
    runnerDiffErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandReleaseAdmissionCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for release-admission-check'));
  }
  if (!options.preflightReceipt) throw new Error('--preflight-receipt is required for release-admission-check');
  if (!options.executionReceipt) throw new Error('--execution-receipt is required for release-admission-check');
  if (!options.authorization) throw new Error('--authorization is required for release-admission-check');
  if (!options.commandArtifact) throw new Error('--command-artifact is required for release-admission-check');
  if (!options.commandReceipt) throw new Error('--command-receipt is required for release-admission-check');
  if (!options.executorProofReceipt) throw new Error('--executor-proof-receipt is required for release-admission-check');
  if (!options.enablementProposal) throw new Error('--enablement-proposal is required for release-admission-check');
  if (!options.enablementProposalReceipt) {
    throw new Error('--enablement-proposal-receipt is required for release-admission-check');
  }
  if (!options.policyPatch) throw new Error('--policy-patch is required for release-admission-check');
  if (!options.policyPatchReceipt) throw new Error('--policy-patch-receipt is required for release-admission-check');
  if (!options.candidateManifest) throw new Error('--candidate-manifest is required for release-admission-check');
  if (!options.applicationDiffReceipt) {
    throw new Error('--application-diff-receipt is required for release-admission-check');
  }
  if (!options.readinessReceipt) throw new Error('--readiness-receipt is required for release-admission-check');
  if (!options.runnerContract) throw new Error('--runner-contract is required for release-admission-check');
  if (!options.runnerContractReceipt) {
    throw new Error('--runner-contract-receipt is required for release-admission-check');
  }
  if (!options.runnerPlan) throw new Error('--runner-plan is required for release-admission-check');
  if (!options.runnerPlanReceipt) throw new Error('--runner-plan-receipt is required for release-admission-check');
  if (!options.runnerDiff) throw new Error('--runner-diff is required for release-admission-check');
  if (!options.runnerDiffReceipt) throw new Error('--runner-diff-receipt is required for release-admission-check');
  if (!options.releaseAdmission) throw new Error('--release-admission is required for release-admission-check');

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
  const planReceiptPath = resolveFromRoot(options.runnerPlanReceipt);
  const runnerDiffPath = resolveFromRoot(options.runnerDiff);
  const runnerDiffReceiptPath = resolveFromRoot(options.runnerDiffReceipt);
  const releaseAdmissionPath = resolveFromRoot(options.releaseAdmission);
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
  const planReceipt = readJson(planReceiptPath);
  const runnerDiff = readJson(runnerDiffPath);
  const runnerDiffReceipt = readJson(runnerDiffReceiptPath);
  const releaseAdmission = readJson(releaseAdmissionPath);
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
  const planReceiptErrors = validateRunnerImplementationPlanReceipt(planReceipt, runnerPlan, contractReceipt, packet, {
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
    contractReceiptPath,
    runnerPlanPath,
  }, constraints);
  const runnerDiffErrors = validateRunnerImplementationDiff(runnerDiff, packet, planReceipt, manifest, {
    planReceiptPath,
  }, constraints);
  const runnerDiffReceiptErrors = validateRunnerImplementationDiffReceipt(runnerDiffReceipt, runnerDiff, planReceipt, packet, {
    runnerDiffPath,
    planReceiptPath,
  }, constraints);
  const releaseAdmissionErrors = validateReleaseAdmission(releaseAdmission, packet, readinessReceipt, runnerDiffReceipt, runnerDiff, manifest, {
    readinessReceiptPath,
    runnerDiffReceiptPath,
    runnerDiffPath,
  }, constraints);
  const result = buildReleaseAdmissionReceipt({
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
    planReceipt,
    planReceiptPath,
    runnerDiff,
    runnerDiffPath,
    runnerDiffReceipt,
    runnerDiffReceiptPath,
    releaseAdmission,
    releaseAdmissionPath,
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
    planReceiptErrors,
    runnerDiffErrors,
    runnerDiffReceiptErrors,
    releaseAdmissionErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandExecutionRunbookCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for execution-runbook-check'));
  }
  if (!options.releaseAdmissionReceipt) {
    throw new Error('--release-admission-receipt is required for execution-runbook-check');
  }
  if (!options.executionRunbook) throw new Error('--execution-runbook is required for execution-runbook-check');

  const releaseResult = commandReleaseAdmissionCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const releaseAdmissionPath = resolveFromRoot(options.releaseAdmission);
  const releaseAdmissionReceiptPath = resolveFromRoot(options.releaseAdmissionReceipt);
  const executionRunbookPath = resolveFromRoot(options.executionRunbook);
  const runnerDiffReceiptPath = resolveFromRoot(options.runnerDiffReceipt);
  const releaseAdmission = readJson(releaseAdmissionPath);
  const releaseAdmissionReceipt = readJson(releaseAdmissionReceiptPath);
  const executionRunbook = readJson(executionRunbookPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const releaseAdmissionReceiptErrors = validateReleaseAdmissionReceipt(releaseAdmissionReceipt, releaseAdmission, releaseResult, {
    releaseAdmissionPath,
    runnerDiffReceiptPath,
  }, constraints);
  const executionRunbookErrors = validateExecutionRunbook(executionRunbook, releaseAdmissionReceipt, manifest, {
    releaseAdmissionPath,
    releaseAdmissionReceiptPath,
  }, constraints);
  const result = buildExecutionRunbookReceipt({
    manifest,
    manifestValidation,
    releaseResult,
    releaseAdmission,
    releaseAdmissionPath,
    releaseAdmissionReceipt,
    releaseAdmissionReceiptPath,
    executionRunbook,
    executionRunbookPath,
    constraints,
    releaseAdmissionReceiptErrors,
    executionRunbookErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandReceiptBundleCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for receipt-bundle-check'));
  }
  if (!options.executionRunbookReceipt) {
    throw new Error('--execution-runbook-receipt is required for receipt-bundle-check');
  }
  if (!options.receiptBundle) throw new Error('--receipt-bundle is required for receipt-bundle-check');

  const runbookResult = commandExecutionRunbookCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const executionRunbookPath = resolveFromRoot(options.executionRunbook);
  const releaseAdmissionReceiptPath = resolveFromRoot(options.releaseAdmissionReceipt);
  const executionRunbookReceiptPath = resolveFromRoot(options.executionRunbookReceipt);
  const receiptBundlePath = resolveFromRoot(options.receiptBundle);
  const executionRunbook = readJson(executionRunbookPath);
  const executionRunbookReceipt = readJson(executionRunbookReceiptPath);
  const receiptBundle = readJson(receiptBundlePath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const executionRunbookReceiptErrors = validateExecutionRunbookReceipt(executionRunbookReceipt, executionRunbook, runbookResult, {
    executionRunbookPath,
    releaseAdmissionReceiptPath,
  }, constraints);
  const receiptBundleErrors = validateReceiptBundle(receiptBundle, executionRunbookReceipt, manifest, {
    executionRunbookPath,
    executionRunbookReceiptPath,
  }, constraints);
  const result = buildReceiptBundleReceipt({
    manifest,
    manifestValidation,
    runbookResult,
    executionRunbook,
    executionRunbookPath,
    executionRunbookReceipt,
    executionRunbookReceiptPath,
    receiptBundle,
    receiptBundlePath,
    constraints,
    executionRunbookReceiptErrors,
    receiptBundleErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandReceiptPublicationCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for receipt-publication-check'));
  }
  if (!options.receiptBundleReceipt) {
    throw new Error('--receipt-bundle-receipt is required for receipt-publication-check');
  }
  if (!options.receiptPublication) {
    throw new Error('--receipt-publication is required for receipt-publication-check');
  }

  const bundleResult = commandReceiptBundleCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const receiptBundlePath = resolveFromRoot(options.receiptBundle);
  const executionRunbookReceiptPath = resolveFromRoot(options.executionRunbookReceipt);
  const receiptBundleReceiptPath = resolveFromRoot(options.receiptBundleReceipt);
  const receiptPublicationPath = resolveFromRoot(options.receiptPublication);
  const receiptBundle = readJson(receiptBundlePath);
  const receiptBundleReceipt = readJson(receiptBundleReceiptPath);
  const receiptPublication = readJson(receiptPublicationPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const receiptBundleReceiptErrors = validateReceiptBundleReceipt(receiptBundleReceipt, receiptBundle, bundleResult, {
    receiptBundlePath,
    executionRunbookReceiptPath,
  }, constraints);
  const receiptPublicationErrors = validateReceiptPublication(receiptPublication, receiptBundleReceipt, manifest, {
    receiptBundlePath,
    receiptBundleReceiptPath,
  }, constraints);
  const result = buildReceiptPublicationReceipt({
    manifest,
    manifestValidation,
    bundleResult,
    receiptBundle,
    receiptBundlePath,
    receiptBundleReceipt,
    receiptBundleReceiptPath,
    receiptPublication,
    receiptPublicationPath,
    constraints,
    receiptBundleReceiptErrors,
    receiptPublicationErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandReceiptReviewDecisionCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for receipt-review-decision-check'));
  }
  if (!options.receiptPublicationReceipt) {
    throw new Error('--receipt-publication-receipt is required for receipt-review-decision-check');
  }
  if (!options.receiptReviewDecision) {
    throw new Error('--receipt-review-decision is required for receipt-review-decision-check');
  }

  const publicationResult = commandReceiptPublicationCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const receiptPublicationPath = resolveFromRoot(options.receiptPublication);
  const receiptBundleReceiptPath = resolveFromRoot(options.receiptBundleReceipt);
  const receiptPublicationReceiptPath = resolveFromRoot(options.receiptPublicationReceipt);
  const receiptReviewDecisionPath = resolveFromRoot(options.receiptReviewDecision);
  const receiptPublication = readJson(receiptPublicationPath);
  const receiptPublicationReceipt = readJson(receiptPublicationReceiptPath);
  const receiptReviewDecision = readJson(receiptReviewDecisionPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const receiptPublicationReceiptErrors = validateReceiptPublicationReceipt(receiptPublicationReceipt, receiptPublication, publicationResult, {
    receiptPublicationPath,
    receiptBundleReceiptPath,
  }, constraints);
  const receiptReviewDecisionErrors = validateReceiptReviewDecision(receiptReviewDecision, receiptPublicationReceipt, manifest, {
    receiptPublicationPath,
    receiptPublicationReceiptPath,
  }, constraints);
  const result = buildReceiptReviewDecisionReceipt({
    manifest,
    manifestValidation,
    publicationResult,
    receiptPublication,
    receiptPublicationPath,
    receiptPublicationReceipt,
    receiptPublicationReceiptPath,
    receiptReviewDecision,
    receiptReviewDecisionPath,
    constraints,
    receiptPublicationReceiptErrors,
    receiptReviewDecisionErrors,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandManualNextStepHandoffCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for manual-next-step-handoff-check'));
  }
  if (!options.receiptReviewDecisionReceipt) {
    throw new Error('--receipt-review-decision-receipt is required for manual-next-step-handoff-check');
  }
  if (!options.manualNextStepHandoff) {
    throw new Error('--manual-next-step-handoff is required for manual-next-step-handoff-check');
  }

  const decisionResult = commandReceiptReviewDecisionCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const receiptPublicationReceiptPath = resolveFromRoot(options.receiptPublicationReceipt);
  const receiptReviewDecisionPath = resolveFromRoot(options.receiptReviewDecision);
  const receiptReviewDecisionReceiptPath = resolveFromRoot(options.receiptReviewDecisionReceipt);
  const manualNextStepHandoffPath = resolveFromRoot(options.manualNextStepHandoff);
  const receiptReviewDecision = readJson(receiptReviewDecisionPath);
  const receiptReviewDecisionReceipt = readJson(receiptReviewDecisionReceiptPath);
  const manualNextStepHandoff = readJson(manualNextStepHandoffPath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const receiptReviewDecisionReceiptErrors = validateReceiptReviewDecisionReceipt(
    receiptReviewDecisionReceipt,
    receiptReviewDecision,
    decisionResult,
    {
      receiptReviewDecisionPath,
      receiptPublicationReceiptPath,
    },
    constraints,
  );
  const manualNextStepHandoffErrors = validateManualNextStepHandoff(
    manualNextStepHandoff,
    receiptReviewDecisionReceipt,
    manifest,
    {
      receiptReviewDecisionPath,
      receiptReviewDecisionReceiptPath,
    },
    constraints,
  );
  const result = buildManualNextStepHandoffReceipt({
    manifest,
    manifestValidation,
    decisionResult,
    receiptReviewDecision,
    receiptReviewDecisionPath,
    receiptReviewDecisionReceipt,
    receiptReviewDecisionReceiptPath,
    manualNextStepHandoff,
    manualNextStepHandoffPath,
    receiptReviewDecisionReceiptErrors,
    manualNextStepHandoffErrors,
    constraints,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandManualFollowUpIssueEvidenceCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for manual-follow-up-issue-evidence-check'));
  }
  if (!options.manualNextStepHandoffReceipt) {
    throw new Error('--manual-next-step-handoff-receipt is required for manual-follow-up-issue-evidence-check');
  }
  if (!options.manualFollowUpIssueEvidence) {
    throw new Error('--manual-follow-up-issue-evidence is required for manual-follow-up-issue-evidence-check');
  }

  const handoffResult = commandManualNextStepHandoffCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const receiptReviewDecisionReceiptPath = resolveFromRoot(options.receiptReviewDecisionReceipt);
  const manualNextStepHandoffPath = resolveFromRoot(options.manualNextStepHandoff);
  const manualNextStepHandoffReceiptPath = resolveFromRoot(options.manualNextStepHandoffReceipt);
  const manualFollowUpIssueEvidencePath = resolveFromRoot(options.manualFollowUpIssueEvidence);
  const manualNextStepHandoff = readJson(manualNextStepHandoffPath);
  const manualNextStepHandoffReceipt = readJson(manualNextStepHandoffReceiptPath);
  const manualFollowUpIssueEvidence = readJson(manualFollowUpIssueEvidencePath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const manualNextStepHandoffReceiptErrors = validateManualNextStepHandoffReceipt(
    manualNextStepHandoffReceipt,
    manualNextStepHandoff,
    handoffResult,
    {
      manualNextStepHandoffPath,
      receiptReviewDecisionReceiptPath,
    },
    constraints,
  );
  const manualFollowUpIssueEvidenceErrors = validateManualFollowUpIssueEvidence(
    manualFollowUpIssueEvidence,
    manualNextStepHandoffReceipt,
    manifest,
    {
      manualNextStepHandoffPath,
      manualNextStepHandoffReceiptPath,
    },
    constraints,
  );
  const result = buildManualFollowUpIssueEvidenceReceipt({
    manifest,
    manifestValidation,
    handoffResult,
    manualNextStepHandoff,
    manualNextStepHandoffPath,
    manualNextStepHandoffReceipt,
    manualNextStepHandoffReceiptPath,
    manualFollowUpIssueEvidence,
    manualFollowUpIssueEvidencePath,
    manualNextStepHandoffReceiptErrors,
    manualFollowUpIssueEvidenceErrors,
    constraints,
    options,
  });

  if (options.writeReceipt) {
    result.receiptPath = writeReceipt(options, result);
  }
  return result;
}

function commandFollowUpWorkIntakeCheck(options) {
  try {
    approvalConstraintsFromOptions(options);
  } catch (error) {
    throw new Error(String(error instanceof Error ? error.message : error).replace('--packet is required', '--packet is required for follow-up-work-intake-check'));
  }
  if (!options.manualFollowUpIssueEvidenceReceipt) {
    throw new Error('--manual-follow-up-issue-evidence-receipt is required for follow-up-work-intake-check');
  }
  if (!options.followUpWorkIntake) {
    throw new Error('--follow-up-work-intake is required for follow-up-work-intake-check');
  }

  const evidenceResult = commandManualFollowUpIssueEvidenceCheck({
    ...options,
    writeReceipt: false,
  });
  const manifest = readJson(resolveFromRoot(options.manifest));
  const manualNextStepHandoffReceiptPath = resolveFromRoot(options.manualNextStepHandoffReceipt);
  const manualFollowUpIssueEvidencePath = resolveFromRoot(options.manualFollowUpIssueEvidence);
  const manualFollowUpIssueEvidenceReceiptPath = resolveFromRoot(options.manualFollowUpIssueEvidenceReceipt);
  const followUpWorkIntakePath = resolveFromRoot(options.followUpWorkIntake);
  const manualFollowUpIssueEvidence = readJson(manualFollowUpIssueEvidencePath);
  const manualFollowUpIssueEvidenceReceipt = readJson(manualFollowUpIssueEvidenceReceiptPath);
  const followUpWorkIntake = readJson(followUpWorkIntakePath);
  const manifestValidation = validateManifest(manifest);
  const constraints = approvalConstraintsFromOptions(options);
  const manualFollowUpIssueEvidenceReceiptErrors = validateManualFollowUpIssueEvidenceReceipt(
    manualFollowUpIssueEvidenceReceipt,
    manualFollowUpIssueEvidence,
    evidenceResult,
    {
      manualFollowUpIssueEvidencePath,
      manualNextStepHandoffReceiptPath,
    },
    constraints,
  );
  const followUpWorkIntakeErrors = validateFollowUpWorkIntake(
    followUpWorkIntake,
    manualFollowUpIssueEvidenceReceipt,
    manifest,
    {
      manualFollowUpIssueEvidencePath,
      manualFollowUpIssueEvidenceReceiptPath,
    },
    constraints,
  );
  const result = buildFollowUpWorkIntakeReceipt({
    manifest,
    manifestValidation,
    evidenceResult,
    manualFollowUpIssueEvidence,
    manualFollowUpIssueEvidencePath,
    manualFollowUpIssueEvidenceReceipt,
    manualFollowUpIssueEvidenceReceiptPath,
    followUpWorkIntake,
    followUpWorkIntakePath,
    manualFollowUpIssueEvidenceReceiptErrors,
    followUpWorkIntakeErrors,
    constraints,
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
  node scripts/operator-agent-omnigent-adapter.mjs runner-implementation-diff-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs release-admission-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs execution-runbook-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs receipt-bundle-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs receipt-publication-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --receipt-bundle-receipt <path> --receipt-publication <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs receipt-review-decision-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --receipt-bundle-receipt <path> --receipt-publication <path> --receipt-publication-receipt <path> --receipt-review-decision <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs manual-next-step-handoff-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --receipt-bundle-receipt <path> --receipt-publication <path> --receipt-publication-receipt <path> --receipt-review-decision <path> --receipt-review-decision-receipt <path> --manual-next-step-handoff <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs manual-follow-up-issue-evidence-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --receipt-bundle-receipt <path> --receipt-publication <path> --receipt-publication-receipt <path> --receipt-review-decision <path> --receipt-review-decision-receipt <path> --manual-next-step-handoff <path> --manual-next-step-handoff-receipt <path> --manual-follow-up-issue-evidence <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
  node scripts/operator-agent-omnigent-adapter.mjs follow-up-work-intake-check --packet <path> --preflight-receipt <path> --execution-receipt <path> --authorization <path> --command-artifact <path> --command-receipt <path> --executor-proof-receipt <path> --enablement-proposal <path> --enablement-proposal-receipt <path> --policy-patch <path> --policy-patch-receipt <path> --candidate-manifest <path> --application-diff-receipt <path> --readiness-receipt <path> --runner-contract <path> --runner-contract-receipt <path> --runner-plan <path> --runner-plan-receipt <path> --runner-diff <path> --runner-diff-receipt <path> --release-admission <path> --release-admission-receipt <path> --execution-runbook <path> --execution-runbook-receipt <path> --receipt-bundle <path> --receipt-bundle-receipt <path> --receipt-publication <path> --receipt-publication-receipt <path> --receipt-review-decision <path> --receipt-review-decision-receipt <path> --manual-next-step-handoff <path> --manual-next-step-handoff-receipt <path> --manual-follow-up-issue-evidence <path> --manual-follow-up-issue-evidence-receipt <path> --follow-up-work-intake <path> --expected-issue <CRE-123> --expected-target <target> --expected-action <action> [--max-age-hours <hours>] [--now <iso>] [--manifest <path>] [--json]
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
  else if (options.command === 'runner-implementation-diff-check') result = commandRunnerImplementationDiffCheck(options);
  else if (options.command === 'release-admission-check') result = commandReleaseAdmissionCheck(options);
  else if (options.command === 'execution-runbook-check') result = commandExecutionRunbookCheck(options);
  else if (options.command === 'receipt-bundle-check') result = commandReceiptBundleCheck(options);
  else if (options.command === 'receipt-publication-check') result = commandReceiptPublicationCheck(options);
  else if (options.command === 'receipt-review-decision-check') result = commandReceiptReviewDecisionCheck(options);
  else if (options.command === 'manual-next-step-handoff-check') result = commandManualNextStepHandoffCheck(options);
  else if (options.command === 'manual-follow-up-issue-evidence-check') result = commandManualFollowUpIssueEvidenceCheck(options);
  else if (options.command === 'follow-up-work-intake-check') result = commandFollowUpWorkIntakeCheck(options);
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
  commandRunnerImplementationDiffCheck,
  commandReleaseAdmissionCheck,
  commandExecutionRunbookCheck,
  commandReceiptBundleCheck,
  commandReceiptPublicationCheck,
  commandReceiptReviewDecisionCheck,
  commandManualNextStepHandoffCheck,
  commandManualFollowUpIssueEvidenceCheck,
  commandFollowUpWorkIntakeCheck,
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
