import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  validateApprovalPacket,
  validateManifest,
  validateScoutProfile,
  validateTrialReceipt,
} from '../operator-agent-omnigent-adapter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'operator-agent-omnigent-adapter.mjs');
const MANIFEST_PATH = path.join(REPO_ROOT, 'config', 'operator-agent', 'omnigent-a4-adapter.json');
const PROFILE_PATH = path.join(REPO_ROOT, 'config', 'operator-agent', 'omnigent-readonly-scout.profile.json');
const TRIAL_RECEIPT_PATH = path.join(
  REPO_ROOT,
  'config',
  'operator-agent',
  'fixtures',
  'omnigent-readonly-scout.receipt.json',
);
const EXPECTED_ISSUE = 'CRE-1083';
const EXPECTED_TARGET = 'create-something-internal-production';
const EXPECTED_ACTION = 'example high-risk action approved for fixture validation only';
const FIXED_NOW = '2026-07-06T20:00:00.000Z';

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function readProfile() {
  return JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
}

function readTrialReceipt() {
  return JSON.parse(readFileSync(TRIAL_RECEIPT_PATH, 'utf8'));
}

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'omnigent-adapter-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function validPacket() {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    approver: 'Micah Johnson',
    approvalSurface: 'Linear',
    approvedAt: '2026-07-06T19:00:00.000Z',
    expiresAt: '2026-07-07T19:00:00.000Z',
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    riskClass: 'high',
    namedRisks: [
      'credential-write',
      'billing-change',
      'client-production',
      'destructive-write',
      'irreversible-data-operation',
    ],
    forbiddenSideEffects: ['anything outside the packet target and action'],
    validation: ['run target-specific validation before execution'],
    rollback: ['run target-specific rollback after failed smoke'],
    postActionSmoke: ['run target-specific smoke after execution'],
    stopConditions: ['target mismatch', 'action mismatch', 'missing rollback'],
    evidenceTarget: 'Linear issue',
  };
}

function approvalCheckArgs(packetPath, receiptDir) {
  return [
    SCRIPT,
    'approval-check',
    '--packet',
    packetPath,
    '--expected-issue',
    EXPECTED_ISSUE,
    '--expected-target',
    EXPECTED_TARGET,
    '--expected-action',
    EXPECTED_ACTION,
    '--now',
    FIXED_NOW,
    '--receipt-dir',
    receiptDir,
    '--json',
  ];
}

function preflightCheckArgs(packetPath, receiptDir) {
  const args = approvalCheckArgs(packetPath, receiptDir);
  args[1] = 'preflight-check';
  return args;
}

function executionReceiptCheckArgs(packetPath, preflightReceiptPath, receiptDir) {
  const args = approvalCheckArgs(packetPath, receiptDir);
  args[1] = 'execution-receipt-check';
  args.splice(4, 0, '--preflight-receipt', preflightReceiptPath);
  return args;
}

function executionAuthorizationCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, receiptDir) {
  const args = executionReceiptCheckArgs(packetPath, preflightReceiptPath, receiptDir);
  args[1] = 'execution-authorization-check';
  args.splice(6, 0, '--execution-receipt', executionReceiptPath, '--authorization', authorizationPath);
  return args;
}

function executionCommandCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, receiptDir) {
  const args = executionAuthorizationCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, receiptDir);
  args[1] = 'execution-command-check';
  args.splice(10, 0, '--command-artifact', commandPath);
  return args;
}

function executorProofCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, receiptDir) {
  const args = executionCommandCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, receiptDir);
  args[1] = 'executor-proof-check';
  args.splice(12, 0, '--command-receipt', commandReceiptPath);
  return args;
}

function executorEnableProposalCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, receiptDir) {
  const args = executorProofCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, receiptDir);
  args[1] = 'executor-enable-proposal-check';
  args.splice(14, 0, '--executor-proof-receipt', executorProofPath, '--enablement-proposal', proposalPath);
  return args;
}

function policyPatchDryRunCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, receiptDir) {
  const args = executorEnableProposalCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    receiptDir,
  );
  args[1] = 'policy-patch-dry-run-check';
  args.splice(16, 0, '--enablement-proposal-receipt', proposalReceiptPath, '--policy-patch', policyPatchPath);
  return args;
}

function policyApplicationDiffCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, receiptDir) {
  const args = policyPatchDryRunCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    receiptDir,
  );
  args[1] = 'policy-application-diff-check';
  args.push('--policy-patch-receipt', policyPatchReceiptPath, '--candidate-manifest', candidateManifestPath);
  return args;
}

function enabledManifestReadinessCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, receiptDir) {
  const args = policyApplicationDiffCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
    proposalReceiptPath,
    policyPatchPath,
    policyPatchReceiptPath,
    candidateManifestPath,
    receiptDir,
  );
  args[1] = 'enabled-manifest-readiness-check';
  args.push('--application-diff-receipt', applicationDiffReceiptPath);
  return args;
}

function runnerImplementationContractCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, receiptDir) {
  const args = enabledManifestReadinessCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    receiptDir,
  );
  args[1] = 'runner-implementation-contract-check';
  args.push('--readiness-receipt', readinessReceiptPath, '--runner-contract', runnerContractPath);
  return args;
}

function runnerImplementationPlanCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, receiptDir) {
  const args = runnerImplementationContractCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    receiptDir,
  );
  args[1] = 'runner-implementation-plan-check';
  args.push('--runner-contract-receipt', runnerContractReceiptPath, '--runner-plan', runnerPlanPath);
  return args;
}

function runnerImplementationDiffCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, receiptDir) {
  const args = runnerImplementationPlanCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    runnerContractReceiptPath,
    runnerPlanPath,
    receiptDir,
  );
  args[1] = 'runner-implementation-diff-check';
  args.push('--runner-plan-receipt', runnerPlanReceiptPath, '--runner-diff', runnerDiffPath);
  return args;
}

function releaseAdmissionCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, runnerDiffReceiptPath, releaseAdmissionPath, receiptDir) {
  const args = runnerImplementationDiffCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    runnerContractReceiptPath,
    runnerPlanPath,
    runnerPlanReceiptPath,
    runnerDiffPath,
    receiptDir,
  );
  args[1] = 'release-admission-check';
  args.push('--runner-diff-receipt', runnerDiffReceiptPath, '--release-admission', releaseAdmissionPath);
  return args;
}

function executionRunbookCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, runnerDiffReceiptPath, releaseAdmissionPath, releaseAdmissionReceiptPath, executionRunbookPath, receiptDir) {
  const args = releaseAdmissionCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    runnerContractReceiptPath,
    runnerPlanPath,
    runnerPlanReceiptPath,
    runnerDiffPath,
    runnerDiffReceiptPath,
    releaseAdmissionPath,
    receiptDir,
  );
  args[1] = 'execution-runbook-check';
  args.push('--release-admission-receipt', releaseAdmissionReceiptPath, '--execution-runbook', executionRunbookPath);
  return args;
}

function receiptBundleCheckArgs(packetPath, preflightReceiptPath, executionReceiptPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, runnerDiffReceiptPath, releaseAdmissionPath, releaseAdmissionReceiptPath, executionRunbookPath, executionRunbookReceiptPath, receiptBundlePath, receiptDir) {
  const args = executionRunbookCheckArgs(
    packetPath,
    preflightReceiptPath,
    executionReceiptPath,
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
    runnerContractReceiptPath,
    runnerPlanPath,
    runnerPlanReceiptPath,
    runnerDiffPath,
    runnerDiffReceiptPath,
    releaseAdmissionPath,
    releaseAdmissionReceiptPath,
    executionRunbookPath,
    receiptDir,
  );
  args[1] = 'receipt-bundle-check';
  args.push('--execution-runbook-receipt', executionRunbookReceiptPath, '--receipt-bundle', receiptBundlePath);
  return args;
}

function mergePatch(base, patch) {
  const result = JSON.parse(JSON.stringify(base));
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = mergePatch(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function writeValidPreflightReceipt(t, packetPath) {
  const root = makeWorkspace(t);
  const preflightResult = spawnSync(process.execPath, preflightCheckArgs(packetPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(preflightResult.status, 0, preflightResult.stderr || preflightResult.stdout);
  const preflightPayload = JSON.parse(preflightResult.stdout);
  return {
    root,
    preflightPath: path.join(REPO_ROOT, preflightPayload.receiptPath),
    preflightPayload,
  };
}

function writeValidExecutionReceipt(t, packetPath, preflightPath) {
  const root = makeWorkspace(t);
  const executionResult = spawnSync(process.execPath, executionReceiptCheckArgs(packetPath, preflightPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(executionResult.status, 0, executionResult.stderr || executionResult.stdout);
  const executionPayload = JSON.parse(executionResult.stdout);
  return {
    root,
    executionPath: path.join(REPO_ROOT, executionPayload.receiptPath),
    executionPayload,
  };
}

function writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath) {
  const root = makeWorkspace(t);
  const commandResult = spawnSync(
    process.execPath,
    executionCommandCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(commandResult.status, 0, commandResult.stderr || commandResult.stdout);
  const commandPayload = JSON.parse(commandResult.stdout);
  return {
    root,
    commandReceiptPath: path.join(REPO_ROOT, commandPayload.receiptPath),
    commandPayload,
  };
}

function writeValidExecutorProofReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath) {
  const root = makeWorkspace(t);
  const proofResult = spawnSync(
    process.execPath,
    executorProofCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(proofResult.status, 0, proofResult.stderr || proofResult.stdout);
  const proofPayload = JSON.parse(proofResult.stdout);
  return {
    root,
    executorProofPath: path.join(REPO_ROOT, proofPayload.receiptPath),
    proofPayload,
  };
}

function writeValidEnablementProposalReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath) {
  const root = makeWorkspace(t);
  const proposalResult = spawnSync(
    process.execPath,
    executorEnableProposalCheckArgs(
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
      commandPath,
      commandReceiptPath,
      executorProofPath,
      proposalPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(proposalResult.status, 0, proposalResult.stderr || proposalResult.stdout);
  const proposalPayload = JSON.parse(proposalResult.stdout);
  return {
    root,
    proposalReceiptPath: path.join(REPO_ROOT, proposalPayload.receiptPath),
    proposalPayload,
  };
}

function writeValidPolicyPatchDryRunReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath) {
  const root = makeWorkspace(t);
  const dryRunResult = spawnSync(
    process.execPath,
    policyPatchDryRunCheckArgs(
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
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(dryRunResult.status, 0, dryRunResult.stderr || dryRunResult.stdout);
  const dryRunPayload = JSON.parse(dryRunResult.stdout);
  return {
    root,
    policyPatchReceiptPath: path.join(REPO_ROOT, dryRunPayload.receiptPath),
    dryRunPayload,
  };
}

function writeValidPolicyApplicationDiffReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath) {
  const root = makeWorkspace(t);
  const diffResult = spawnSync(
    process.execPath,
    policyApplicationDiffCheckArgs(
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
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(diffResult.status, 0, diffResult.stderr || diffResult.stdout);
  const diffPayload = JSON.parse(diffResult.stdout);
  return {
    root,
    applicationDiffReceiptPath: path.join(REPO_ROOT, diffPayload.receiptPath),
    diffPayload,
  };
}

function writeValidEnabledManifestReadinessReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath) {
  const root = makeWorkspace(t);
  const readinessResult = spawnSync(
    process.execPath,
    enabledManifestReadinessCheckArgs(
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
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(readinessResult.status, 0, readinessResult.stderr || readinessResult.stdout);
  const readinessPayload = JSON.parse(readinessResult.stdout);
  return {
    root,
    readinessReceiptPath: path.join(REPO_ROOT, readinessPayload.receiptPath),
    readinessPayload,
  };
}

function writeValidRunnerImplementationContractReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath) {
  const root = makeWorkspace(t);
  const contractResult = spawnSync(
    process.execPath,
    runnerImplementationContractCheckArgs(
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
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(contractResult.status, 0, contractResult.stderr || contractResult.stdout);
  const contractPayload = JSON.parse(contractResult.stdout);
  return {
    root,
    runnerContractReceiptPath: path.join(REPO_ROOT, contractPayload.receiptPath),
    contractPayload,
  };
}

function writeValidRunnerImplementationPlanReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath) {
  const root = makeWorkspace(t);
  const planResult = spawnSync(
    process.execPath,
    runnerImplementationPlanCheckArgs(
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
      runnerContractReceiptPath,
      runnerPlanPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(planResult.status, 0, planResult.stderr || planResult.stdout);
  const planPayload = JSON.parse(planResult.stdout);
  return {
    root,
    runnerPlanReceiptPath: path.join(REPO_ROOT, planPayload.receiptPath),
    planPayload,
  };
}

function writeValidRunnerImplementationDiffReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath) {
  const root = makeWorkspace(t);
  const diffResult = spawnSync(
    process.execPath,
    runnerImplementationDiffCheckArgs(
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
      runnerContractReceiptPath,
      runnerPlanPath,
      runnerPlanReceiptPath,
      runnerDiffPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(diffResult.status, 0, diffResult.stderr || diffResult.stdout);
  const diffPayload = JSON.parse(diffResult.stdout);
  return {
    root,
    runnerDiffReceiptPath: path.join(REPO_ROOT, diffPayload.receiptPath),
    diffPayload,
  };
}

function writeValidReleaseAdmissionReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, runnerDiffReceiptPath, releaseAdmissionPath) {
  const root = makeWorkspace(t);
  const releaseResult = spawnSync(
    process.execPath,
    releaseAdmissionCheckArgs(
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
      runnerContractReceiptPath,
      runnerPlanPath,
      runnerPlanReceiptPath,
      runnerDiffPath,
      runnerDiffReceiptPath,
      releaseAdmissionPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(releaseResult.status, 0, releaseResult.stderr || releaseResult.stdout);
  const releasePayload = JSON.parse(releaseResult.stdout);
  return {
    root,
    releaseAdmissionReceiptPath: path.join(REPO_ROOT, releasePayload.receiptPath),
    releasePayload,
  };
}

function writeValidExecutionRunbookReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, executorProofPath, proposalPath, proposalReceiptPath, policyPatchPath, policyPatchReceiptPath, candidateManifestPath, applicationDiffReceiptPath, readinessReceiptPath, runnerContractPath, runnerContractReceiptPath, runnerPlanPath, runnerPlanReceiptPath, runnerDiffPath, runnerDiffReceiptPath, releaseAdmissionPath, releaseAdmissionReceiptPath, executionRunbookPath) {
  const root = makeWorkspace(t);
  const runbookResult = spawnSync(
    process.execPath,
    executionRunbookCheckArgs(
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
      runnerContractReceiptPath,
      runnerPlanPath,
      runnerPlanReceiptPath,
      runnerDiffPath,
      runnerDiffReceiptPath,
      releaseAdmissionPath,
      releaseAdmissionReceiptPath,
      executionRunbookPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  assert.equal(runbookResult.status, 0, runbookResult.stderr || runbookResult.stdout);
  const runbookPayload = JSON.parse(runbookResult.stdout);
  return {
    root,
    executionRunbookReceiptPath: path.join(REPO_ROOT, runbookPayload.receiptPath),
    runbookPayload,
  };
}

function validAuthorization({ packetPath, preflightPath, executionPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    approver: 'Micah Johnson',
    approvalSurface: 'Linear',
    approvedAt: '2026-07-06T19:30:00.000Z',
    expiresAt: '2026-07-07T19:30:00.000Z',
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    namedRisks: [
      'credential-write',
      'billing-change',
      'client-production',
      'destructive-write',
      'irreversible-data-operation',
    ],
    packet: packetPath ? path.relative(REPO_ROOT, packetPath) : 'packet.json',
    preflightReceipt: preflightPath ? path.relative(REPO_ROOT, preflightPath) : 'preflight.json',
    executionReceipt: executionPath ? path.relative(REPO_ROOT, executionPath) : 'execution.json',
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validExecutionCommand({ packetPath, preflightPath, executionPath, authorizationPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    commandId: 'fixture-operator-command',
    commandSurface: 'Linear',
    requestedBy: 'Micah Johnson',
    requestedAt: '2026-07-06T19:45:00.000Z',
    expiresAt: '2026-07-07T19:45:00.000Z',
    executionMode: 'operator-supervised',
    packet: packetPath ? path.relative(REPO_ROOT, packetPath) : 'packet.json',
    preflightReceipt: preflightPath ? path.relative(REPO_ROOT, preflightPath) : 'preflight.json',
    executionReceipt: executionPath ? path.relative(REPO_ROOT, executionPath) : 'execution.json',
    authorization: authorizationPath ? path.relative(REPO_ROOT, authorizationPath) : 'authorization.json',
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validEnablementProposal({ executorProofPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    approvalSurface: 'Linear',
    approvedBy: 'Micah Johnson',
    approvedAt: '2026-07-06T19:55:00.000Z',
    expiresAt: '2026-07-07T19:55:00.000Z',
    targetScope: EXPECTED_TARGET,
    maxWritesPerRun: 1,
    requiredProofs: ['rollback', 'post-action-smoke', 'public-access-fail-closed'],
    policyPatch: {
      authority: {
        a4Execution: 'enabled',
      },
      a4ExecutionCommand: {
        runnerEnabled: true,
      },
      a4ExecutorProof: {
        runnerEnabled: true,
      },
    },
    executorProofReceipt: executorProofPath ? path.relative(REPO_ROOT, executorProofPath) : 'executor-proof.json',
    rollbackProofRequired: true,
    postActionSmokeRequired: true,
    publicAccessFailClosedRequired: true,
    policyChangeApplied: false,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validPolicyPatchDryRun({ proposalReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    maxWritesPerRun: 1,
    requiredProofs: ['rollback', 'post-action-smoke', 'public-access-fail-closed'],
    policyPatch: {
      authority: {
        a4Execution: 'enabled',
      },
      a4ExecutionCommand: {
        runnerEnabled: true,
      },
      a4ExecutorProof: {
        runnerEnabled: true,
      },
    },
    enablementProposalReceipt: proposalReceiptPath ? path.relative(REPO_ROOT, proposalReceiptPath) : 'proposal-receipt.json',
    dryRunOnly: true,
    policyFileChanged: false,
    policyChangeApplied: false,
    writesPerformed: 0,
    rollbackProofRequired: true,
    postActionSmokeRequired: true,
    publicAccessFailClosedRequired: true,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validRunnerImplementationContract({ readinessReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    implementationSurface: 'repo-pr',
    enabledManifestReadinessReceipt: readinessReceiptPath
      ? path.relative(REPO_ROOT, readinessReceiptPath)
      : 'enabled-manifest-readiness-check.json',
    revalidatesFullChainImmediatelyBeforeWrite: true,
    requiresCommandReceipt: true,
    requiresEnabledCheckedInPolicy: true,
    allowedWhenCurrentPolicyBlocked: false,
    processSpawnPolicy: 'blocked-until-checked-in-policy-enabled',
    maxWritesPerRun: 1,
    requiredProofs: ['rollback', 'post-action-smoke', 'public-access-fail-closed'],
    rollbackProofRequired: true,
    postActionSmokeRequired: true,
    publicAccessFailClosedRequired: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validRunnerImplementationPlan({ runnerContractReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    implementationSurface: 'repo-pr',
    plannedEntrypoint: 'scripts/operator-agent-omnigent-runner.mjs',
    runnerImplementationContractReceipt: runnerContractReceiptPath
      ? path.relative(REPO_ROOT, runnerContractReceiptPath)
      : 'runner-implementation-contract-check.json',
    implementationPlanOnly: true,
    executableEntrypointAdded: false,
    revalidatesFullChainImmediatelyBeforeWrite: true,
    requiresCommandReceipt: true,
    requiresEnabledCheckedInPolicy: true,
    allowedWhenCurrentPolicyBlocked: false,
    maxWritesPerRun: 1,
    requiredProofs: ['rollback', 'post-action-smoke', 'public-access-fail-closed'],
    requiredGuards: [
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
    ],
    revalidationSequence: [
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
    ],
    rollbackPlan: ['run target-specific rollback before recording final failure'],
    postActionSmokePlan: ['run target-specific post-action smoke before final success'],
    publicAccessFailClosedPlan: ['run public operator-agent smoke and require rawOriginExposed=false'],
    stopConditions: ['receipt drift', 'expired command', 'checked-in policy disabled'],
    receiptOutputs: [
      'pre-action-receipt',
      'execution-receipt',
      'post-action-smoke',
      'rollback-readiness',
      'final-outcome',
    ],
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validRunnerImplementationDiff({ runnerPlanReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    runnerImplementationPlanReceipt: runnerPlanReceiptPath
      ? path.relative(REPO_ROOT, runnerPlanReceiptPath)
      : 'runner-implementation-plan-check.json',
    candidateOnly: true,
    checkedInEntrypointExists: false,
    plannedEntrypoint: 'scripts/operator-agent-omnigent-runner.mjs',
    filesToAdd: ['scripts/operator-agent-omnigent-runner.mjs'],
    filesToModify: [],
    maxWritesPerRun: 1,
    requiredGuards: [
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
    ],
    proofHooks: ['rollback', 'post-action-smoke', 'public-access-fail-closed'],
    revalidationSequence: [
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
    ],
    receiptOutputs: [
      'pre-action-receipt',
      'execution-receipt',
      'post-action-smoke',
      'rollback-readiness',
      'final-outcome',
    ],
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validReleaseAdmission({ readinessReceiptPath, runnerDiffPath, runnerDiffReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    enabledManifestReadinessReceipt: readinessReceiptPath
      ? path.relative(REPO_ROOT, readinessReceiptPath)
      : 'enabled-manifest-readiness-check.json',
    runnerDiff: runnerDiffPath ? path.relative(REPO_ROOT, runnerDiffPath) : 'runner-diff.json',
    runnerImplementationDiffReceipt: runnerDiffReceiptPath
      ? path.relative(REPO_ROOT, runnerDiffReceiptPath)
      : 'runner-implementation-diff-check.json',
    releaseMode: 'operator-reviewed-pr',
    packetOnly: true,
    requiresManualMerge: true,
    autoMerge: false,
    prs: [
      {
        role: 'policy-enabled-manifest',
        url: 'https://github.com/createsomethingtoday/create-something-monorepo/pull/901',
        checkStatus: 'success',
        checksPassed: true,
        mergeReady: true,
      },
      {
        role: 'runner-entrypoint',
        url: 'https://github.com/createsomethingtoday/create-something-monorepo/pull/902',
        checkStatus: 'success',
        checksPassed: true,
        mergeReady: true,
      },
    ],
    mergeOrder: ['policy-enabled-manifest', 'runner-entrypoint'],
    requiredEvidence: [
      'linear-done-evidence',
      'github-checks-passed',
      'rollback-note',
      'public-access-fail-closed-proof',
    ],
    requiredGuards: [
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
    ],
    linearEvidence: `Linear ${EXPECTED_ISSUE} release admission evidence`,
    rollbackNote: 'Rollback by reverting runner-entrypoint PR first, then policy-enabled-manifest PR.',
    publicAccessFailClosedProof: 'operator-agent-public-smoke rawOriginExposed=false and redirectsToAccess=true',
    currentPolicyBlocked: true,
    maxWritesPerRun: 1,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validExecutionRunbook({ releaseAdmissionPath, releaseAdmissionReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    releaseAdmission: releaseAdmissionPath ? path.relative(REPO_ROOT, releaseAdmissionPath) : 'release-admission.json',
    releaseAdmissionReceipt: releaseAdmissionReceiptPath
      ? path.relative(REPO_ROOT, releaseAdmissionReceiptPath)
      : 'release-admission-check.json',
    runbookOnly: true,
    executionMode: 'operator-supervised',
    requiresManualTrigger: true,
    targetValidationCommands: [
      'node scripts/operator-agent-omnigent-adapter.mjs check --json',
      'node scripts/operator-agent-public-smoke.mjs --target create-something-internal-production --json',
    ],
    writeCommand: {
      command: 'node scripts/operator-agent-omnigent-runner.mjs --command fixture-operator-command --json',
      requiresManualTrigger: true,
      approvedCommandOnly: true,
    },
    postActionSmokeCommands: [
      'node scripts/operator-agent-public-smoke.mjs --target create-something-internal-production --json',
    ],
    rollbackCommands: [
      'git revert <runner-entrypoint-merge-sha>',
      'git revert <policy-enabled-manifest-merge-sha>',
    ],
    publicAccessFailClosedProof: 'operator-agent-public-smoke rawOriginExposed=false and redirectsToAccess=true',
    finalReceiptOutputs: [
      'pre-action-receipt',
      'execution-receipt',
      'post-action-smoke',
      'rollback-readiness',
      'final-outcome',
    ],
    stopConditions: [
      'target-mismatch',
      'command-expired',
      'receipt-drift',
      'smoke-failed',
      'rollback-unavailable',
    ],
    linearEvidence: `Linear ${EXPECTED_ISSUE} execution runbook evidence`,
    currentPolicyBlocked: true,
    maxWritesPerRun: 1,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function validReceiptBundle({ executionRunbookPath, executionRunbookReceiptPath } = {}) {
  return {
    authorityLevel: 'A4',
    issue: EXPECTED_ISSUE,
    target: EXPECTED_TARGET,
    action: EXPECTED_ACTION,
    targetScope: EXPECTED_TARGET,
    executionRunbook: executionRunbookPath ? path.relative(REPO_ROOT, executionRunbookPath) : 'execution-runbook.json',
    executionRunbookReceipt: executionRunbookReceiptPath
      ? path.relative(REPO_ROOT, executionRunbookReceiptPath)
      : 'execution-runbook-check.json',
    bundleOnly: true,
    shareable: true,
    redactionPolicyApplied: true,
    redactionPolicy: {
      excludes: ['secrets', 'raw-logs', 'prompts', 'raw-transcripts'],
      evidenceOnly: true,
    },
    containsSecrets: false,
    containsRawLogs: false,
    containsPrompts: false,
    rawLogsIncluded: false,
    promptsIncluded: false,
    rawTranscriptIncluded: false,
    receiptReferences: [
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
      {
        mode: 'execution-runbook-check',
        path: executionRunbookReceiptPath ? path.relative(REPO_ROOT, executionRunbookReceiptPath) : 'execution-runbook-check.json',
        redacted: true,
      },
    ],
    requiredEvidence: [
      'linear-evidence',
      'github-checks-passed',
      'public-access-fail-closed-proof',
      'redaction-policy',
      'operator-summary',
    ],
    linearEvidence: `Linear ${EXPECTED_ISSUE} receipt bundle evidence`,
    githubChecksPassed: true,
    publicAccessFailClosedProof: 'operator-agent-public-smoke rawOriginExposed=false and redirectsToAccess=true',
    operatorSummary: 'Redacted A4 receipt bundle for asynchronous operator review; no raw logs, prompts, secrets, commands, or writes included.',
    noExecutionMarkers: [
      'current-policy-blocked',
      'process-not-spawned',
      'executed-commands-empty',
      'runner-disabled',
      'execution-not-ready',
      'execution-disabled',
      'execution-not-approved',
      'would-execute-false',
      'writes-performed-zero',
    ],
    currentPolicyBlocked: true,
    processSpawned: false,
    executedCommands: [],
    runnerEnabled: false,
    executionReady: false,
    executionEnabled: false,
    executionApproved: false,
    wouldExecute: false,
    writesPerformed: 0,
    evidenceTarget: `Linear ${EXPECTED_ISSUE}`,
  };
}

function writePolicyApplicationFixture(t) {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const { executorProofPath } = writeValidExecutorProofReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  );
  const proposalPath = path.join(root, 'enablement-proposal.json');
  writeFileSync(
    proposalPath,
    `${JSON.stringify(validEnablementProposal({ executorProofPath }), null, 2)}\n`,
  );
  const { proposalReceiptPath } = writeValidEnablementProposalReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  );
  const policyPatchPath = path.join(root, 'policy-patch-dry-run.json');
  const policyPatch = validPolicyPatchDryRun({ proposalReceiptPath });
  writeFileSync(policyPatchPath, `${JSON.stringify(policyPatch, null, 2)}\n`);
  const { policyPatchReceiptPath } = writeValidPolicyPatchDryRunReceipt(
    t,
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
  );
  const candidateManifestPath = path.join(root, 'candidate-manifest.json');
  writeFileSync(candidateManifestPath, `${JSON.stringify(mergePatch(readManifest(), policyPatch.policyPatch), null, 2)}\n`);
  const { applicationDiffReceiptPath } = writeValidPolicyApplicationDiffReceipt(
    t,
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
  );
  const { readinessReceiptPath } = writeValidEnabledManifestReadinessReceipt(
    t,
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
  );

  return {
    root,
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
    policyPatch,
  };
}

test('Omnigent adapter manifest stays read-only/local-only before A4 approval', () => {
  const manifest = readManifest();
  const result = validateManifest(manifest);

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(manifest.authority.a4Execution, 'blocked');
  assert.equal(manifest.authority.omnigentRole, 'transport-policy-host');
  assert.ok(manifest.allowedCommands.every((command) => ['A0', 'A1'].includes(command.autonomyLevel)));
  assert.ok(manifest.forbiddenCommands.includes('wrangler pages deploy'));
});

test('manifest check writes a local receipt and reports blocked A4 execution', (t) => {
  const root = makeWorkspace(t);
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'check', '--receipt-dir', root, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.a4Execution, 'blocked');
  assert.match(payload.receiptPath, /\.cache|omnigent-adapter-|operator-agent-omnigent/);
});

test('high-risk command exposure fails unless the command requires approval', () => {
  const manifest = readManifest();
  manifest.allowedCommands.push({
    id: 'bad-production-deploy',
    autonomyLevel: 'A1',
    command: 'wrangler pages deploy public --project-name=landing-page-filter',
    writes: true,
    writeScope: 'production',
    requiresApprovalPacket: false,
  });

  const result = validateManifest(manifest);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /requires an approval packet/);
});

test('A4 approval packet must name exact high-risk classes', () => {
  const manifest = readManifest();
  const packet = validPacket();
  packet.namedRisks = ['credential-write'];

  const result = validateApprovalPacket(packet, manifest, {
    expectedIssue: EXPECTED_ISSUE,
    expectedTarget: EXPECTED_TARGET,
    expectedAction: EXPECTED_ACTION,
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /billing-change/);
  assert.match(result.errors.join('\n'), /client-production/);
});

test('approval-check requires an expected issue, target, and action binding', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'approval-check', '--packet', packetPath, '--receipt-dir', root, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--expected-issue is required/);
});

test('valid A4 approval packet fixture passes deterministic packet validation', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    approvalCheckArgs(packetPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.constraints.expectedIssue, EXPECTED_ISSUE);
  assert.equal(payload.constraints.expectedTarget, EXPECTED_TARGET);
  assert.equal(payload.constraints.expectedAction, EXPECTED_ACTION);
  assert.match(payload.receiptPath, /approval-check\.json$/);
  const receipt = JSON.parse(readFileSync(path.join(REPO_ROOT, payload.receiptPath), 'utf8'));
  assert.equal(receipt.issue, EXPECTED_ISSUE);
});

test('approval-check fails closed on stale or mismatched packets', (t) => {
  const root = makeWorkspace(t);

  const cases = [
    {
      name: 'wrong-issue',
      patch: { issue: 'CRE-9999' },
      pattern: /issue mismatch/,
    },
    {
      name: 'wrong-target',
      patch: { target: 'different-production-surface' },
      pattern: /target mismatch/,
    },
    {
      name: 'wrong-action',
      patch: { action: 'different action' },
      pattern: /action mismatch/,
    },
    {
      name: 'stale',
      patch: { approvedAt: '2026-07-04T19:00:00.000Z' },
      pattern: /stale/,
    },
    {
      name: 'expired',
      patch: { expiresAt: '2026-07-06T19:30:00.000Z' },
      pattern: /expiresAt must be in the future/,
    },
    {
      name: 'missing-rollback',
      patch: { rollback: [] },
      pattern: /rollback must be non-empty/,
    },
    {
      name: 'missing-smoke',
      patch: { postActionSmoke: [] },
      pattern: /postActionSmoke must be non-empty/,
    },
    {
      name: 'missing-stop-conditions',
      patch: { stopConditions: [] },
      pattern: /stopConditions must be non-empty/,
    },
  ];

  for (const entry of cases) {
    const packetPath = path.join(root, `${entry.name}.json`);
    writeFileSync(packetPath, `${JSON.stringify({ ...validPacket(), ...entry.patch }, null, 2)}\n`);
    const result = spawnSync(process.execPath, approvalCheckArgs(packetPath, root), {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('preflight-check emits a dry-run execution receipt without granting authority', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);

  const result = spawnSync(process.execPath, preflightCheckArgs(packetPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'preflight-check');
  assert.equal(payload.issue, EXPECTED_ISSUE);
  assert.equal(payload.authorityLevel, 'A4');
  assert.equal(payload.admissionOk, true);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.target, EXPECTED_TARGET);
  assert.equal(payload.action, EXPECTED_ACTION);
  assert.deepEqual(payload.validationPlan, validPacket().validation);
  assert.deepEqual(payload.rollbackPlan, validPacket().rollback);
  assert.deepEqual(payload.postActionSmokePlan, validPacket().postActionSmoke);
  assert.deepEqual(payload.stopConditions, validPacket().stopConditions);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.match(payload.nextGate, /does not grant execution authority/);
  assert.match(payload.receiptPath, /preflight-check\.json$/);

  const receipt = JSON.parse(readFileSync(path.join(REPO_ROOT, payload.receiptPath), 'utf8'));
  assert.equal(receipt.mode, 'preflight-check');
  assert.equal(receipt.wouldExecute, false);
  assert.equal(receipt.writesPerformed, 0);
  assert.equal(receipt.executionPlan[1].dryRunOnly, true);
});

test('preflight-check fails closed without an executable plan when admission fails', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'expired.json');
  writeFileSync(
    packetPath,
    `${JSON.stringify({ ...validPacket(), expiresAt: '2026-07-06T19:30:00.000Z' }, null, 2)}\n`,
  );

  const result = spawnSync(process.execPath, preflightCheckArgs(packetPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.admissionOk, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.deepEqual(payload.executionPlan, []);
  assert.deepEqual(payload.validationPlan, []);
  assert.deepEqual(payload.rollbackPlan, []);
  assert.deepEqual(payload.postActionSmokePlan, []);
  assert.match(payload.errors.join('\n'), /expiresAt must be in the future/);
});

test('execution-receipt-check emits a disabled execution receipt from valid packet and preflight', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);

  const result = spawnSync(process.execPath, executionReceiptCheckArgs(packetPath, preflightPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'execution-receipt-check');
  assert.equal(payload.issue, EXPECTED_ISSUE);
  assert.equal(payload.authorityLevel, 'A4');
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.blockedReason, /explicit operator execution approval/);
  assert.deepEqual(payload.validationPlan, validPacket().validation);
  assert.deepEqual(payload.rollbackPlan, validPacket().rollback);
  assert.deepEqual(payload.postActionSmokePlan, validPacket().postActionSmoke);
  assert.deepEqual(payload.stopConditions, validPacket().stopConditions);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.match(payload.nextGate, /explicit operator execution approval/);
  assert.match(payload.receiptPath, /execution-receipt-check\.json$/);

  const receipt = JSON.parse(readFileSync(path.join(REPO_ROOT, payload.receiptPath), 'utf8'));
  assert.equal(receipt.executionEnabled, false);
  assert.equal(receipt.executionApproved, false);
  assert.equal(receipt.writesPerformed, 0);
});

test('execution-receipt-check fails closed on mismatched preflight receipt', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const preflight = JSON.parse(readFileSync(preflightPath, 'utf8'));
  preflight.target = 'different-production-surface';
  const mismatchedPath = path.join(root, 'mismatched-preflight.json');
  writeFileSync(mismatchedPath, `${JSON.stringify(preflight, null, 2)}\n`);

  const result = spawnSync(process.execPath, executionReceiptCheckArgs(packetPath, mismatchedPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.prerequisitesOk, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.deepEqual(payload.validationPlan, []);
  assert.deepEqual(payload.rollbackPlan, []);
  assert.deepEqual(payload.postActionSmokePlan, []);
  assert.match(payload.errors.join('\n'), /preflight receipt target mismatch/);
});

test('execution-receipt-check fails closed when preflight admission failed', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const failedPreflightPath = path.join(root, 'failed-preflight.json');
  writeFileSync(
    failedPreflightPath,
    `${JSON.stringify({
      mode: 'preflight-check',
      ok: false,
      admissionOk: false,
      issue: EXPECTED_ISSUE,
      authorityLevel: 'A4',
      target: EXPECTED_TARGET,
      action: EXPECTED_ACTION,
      wouldExecute: false,
      writesPerformed: 0,
      executionPlan: [],
      validationPlan: [],
      rollbackPlan: [],
      postActionSmokePlan: [],
      stopConditions: [],
      evidenceTarget: 'Linear issue',
    }, null, 2)}\n`,
  );

  const result = spawnSync(process.execPath, executionReceiptCheckArgs(packetPath, failedPreflightPath, root), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /preflight receipt admission must be ok/);
});

test('execution-authorization-check validates authorization but keeps execution disabled', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    executionAuthorizationCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'execution-authorization-check');
  assert.equal(payload.authorizationOk, true);
  assert.equal(payload.issue, EXPECTED_ISSUE);
  assert.equal(payload.authorityLevel, 'A4');
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.blockedReason, /separate explicit execution command/);
  assert.match(payload.nextGate, /revalidates this authorization/);
  assert.deepEqual(payload.validationPlan, validPacket().validation);
  assert.deepEqual(payload.rollbackPlan, validPacket().rollback);
  assert.deepEqual(payload.postActionSmokePlan, validPacket().postActionSmoke);
  assert.match(payload.receiptPath, /execution-authorization-check\.json$/);
});

test('execution-authorization-check fails closed on stale or mismatched authorization', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);

  const cases = [
    {
      name: 'wrong-issue',
      patch: { issue: 'CRE-9999' },
      pattern: /execution authorization issue mismatch/,
    },
    {
      name: 'missing-risk',
      patch: { namedRisks: ['credential-write'] },
      pattern: /execution authorization must name risk: billing-change/,
    },
    {
      name: 'stale',
      patch: { approvedAt: '2026-07-04T19:00:00.000Z' },
      pattern: /execution authorization is stale/,
    },
    {
      name: 'unsupported-approval-surface',
      patch: { approvalSurface: 'chat-message' },
      pattern: /execution authorization approvalSurface is not allowed/,
    },
    {
      name: 'wrong-preflight-binding',
      patch: { preflightReceipt: 'wrong-preflight.json' },
      pattern: /preflightReceipt must match preflight receipt path/,
    },
    {
      name: 'wrong-execution-binding',
      patch: { executionReceipt: 'wrong-execution.json' },
      pattern: /executionReceipt must match execution receipt path/,
    },
  ];

  for (const entry of cases) {
    const authorizationPath = path.join(root, `${entry.name}.json`);
    writeFileSync(
      authorizationPath,
      `${JSON.stringify({
        ...validAuthorization({ packetPath, preflightPath, executionPath }),
        ...entry.patch,
      }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      executionAuthorizationCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, root),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.authorizationOk, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.deepEqual(payload.validationPlan, [], entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('execution-command-check admits command artifact but keeps runner disabled', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    executionCommandCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'execution-command-check');
  assert.equal(payload.commandOk, true);
  assert.equal(payload.commandAdmitted, true);
  assert.equal(payload.issue, EXPECTED_ISSUE);
  assert.equal(payload.commandId, 'fixture-operator-command');
  assert.equal(payload.commandSurface, 'Linear');
  assert.equal(payload.executionMode, 'operator-supervised');
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.match(payload.blockedReason, /runner remains disabled/);
  assert.match(payload.nextGate, /executor implementation/);
  assert.deepEqual(payload.validationPlan, validPacket().validation);
  assert.deepEqual(payload.rollbackPlan, validPacket().rollback);
  assert.deepEqual(payload.postActionSmokePlan, validPacket().postActionSmoke);
  assert.match(payload.receiptPath, /execution-command-check\.json$/);
});

test('execution-command-check fails closed on stale, unsupported, or mismatched command artifacts', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );

  const cases = [
    {
      name: 'wrong-action',
      patch: { action: 'different action' },
      pattern: /execution command action mismatch/,
    },
    {
      name: 'unsupported-surface',
      patch: { commandSurface: 'chat-message' },
      pattern: /execution command commandSurface is not allowed/,
    },
    {
      name: 'unsupported-mode',
      patch: { executionMode: 'unsupervised' },
      pattern: /execution command executionMode is not allowed/,
    },
    {
      name: 'stale',
      patch: { requestedAt: '2026-07-04T19:00:00.000Z' },
      pattern: /execution command is stale/,
    },
    {
      name: 'wrong-authorization-binding',
      patch: { authorization: 'wrong-authorization.json' },
      pattern: /execution command authorization must match authorization artifact path/,
    },
  ];

  for (const entry of cases) {
    const commandPath = path.join(root, `${entry.name}.json`);
    writeFileSync(
      commandPath,
      `${JSON.stringify({
        ...validExecutionCommand({
          packetPath,
          preflightPath,
          executionPath,
          authorizationPath,
        }),
        ...entry.patch,
      }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      executionCommandCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, root),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.commandOk, false, entry.name);
    assert.equal(payload.commandAdmitted, false, entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.deepEqual(payload.executionPlan, [], entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('executor-proof-check validates command receipt chain and stops before process spawn', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);

  const result = spawnSync(
    process.execPath,
    executorProofCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, commandReceiptPath, root),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'executor-proof-check');
  assert.equal(payload.executorProofOk, true);
  assert.equal(payload.runnerBlocked, true);
  assert.equal(payload.processSpawnPolicy, 'blocked');
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.equal(payload.policy.processSpawnPolicy, 'blocked');
  assert.match(payload.blockedReason, /stopped before process spawn/);
  assert.match(payload.nextGate, /operator-approved repo policy change/);
  assert.deepEqual(payload.validationPlan, validPacket().validation);
  assert.deepEqual(payload.rollbackPlan, validPacket().rollback);
  assert.deepEqual(payload.postActionSmokePlan, validPacket().postActionSmoke);
  assert.match(payload.receiptPath, /executor-proof-check\.json$/);
});

test('executor-proof-check fails closed on command receipt drift or process execution markers', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const baseReceipt = JSON.parse(readFileSync(commandReceiptPath, 'utf8'));

  const cases = [
    {
      name: 'wrong-target',
      patch: { target: 'different-production-surface' },
      pattern: /execution command receipt target mismatch/,
    },
    {
      name: 'runner-enabled',
      patch: { runnerEnabled: true },
      pattern: /execution command receipt runnerEnabled must be false/,
    },
    {
      name: 'execution-ready',
      patch: { executionReady: true },
      pattern: /execution command receipt executionReady must be false/,
    },
    {
      name: 'process-spawned',
      patch: { processSpawned: true },
      pattern: /must not report processSpawned/,
    },
    {
      name: 'executed-commands',
      patch: { executedCommands: ['wrangler deploy'] },
      pattern: /executedCommands must be empty/,
    },
  ];

  for (const entry of cases) {
    const driftedReceiptPath = path.join(root, `${entry.name}-command-receipt.json`);
    writeFileSync(
      driftedReceiptPath,
      `${JSON.stringify({ ...baseReceipt, ...entry.patch }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      executorProofCheckArgs(packetPath, preflightPath, executionPath, authorizationPath, commandPath, driftedReceiptPath, root),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.executorProofOk, false, entry.name);
    assert.equal(payload.runnerBlocked, true, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.deepEqual(payload.executionPlan, [], entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('executor-enable-proposal-check validates proposal but applies no policy change', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const { executorProofPath } = writeValidExecutorProofReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  );
  const proposalPath = path.join(root, 'enablement-proposal.json');
  writeFileSync(
    proposalPath,
    `${JSON.stringify(validEnablementProposal({ executorProofPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    executorEnableProposalCheckArgs(
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
      commandPath,
      commandReceiptPath,
      executorProofPath,
      proposalPath,
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'executor-enable-proposal-check');
  assert.equal(payload.enablementProposalOk, true);
  assert.equal(payload.policyChangeApplied, false);
  assert.equal(payload.runnerBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.targetScope, EXPECTED_TARGET);
  assert.equal(payload.maxWritesPerRun, 1);
  assert.deepEqual(payload.requiredProofs, ['rollback', 'post-action-smoke', 'public-access-fail-closed']);
  assert.equal(payload.proposedPolicyPatch.authority.a4Execution, 'enabled');
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.enablementPolicyChangeApplied, false);
  assert.match(payload.blockedReason, /repo policy remains blocked/);
  assert.match(payload.nextGate, /separate PR/);
  assert.match(payload.receiptPath, /executor-enable-proposal-check\.json$/);
});

test('executor-enable-proposal-check fails closed on widened or already-applied proposals', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const { executorProofPath } = writeValidExecutorProofReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  );

  const cases = [
    {
      name: 'widened-target',
      patch: { targetScope: 'all-production-surfaces' },
      pattern: /targetScope must equal packet target/,
    },
    {
      name: 'unbounded-writes',
      patch: { maxWritesPerRun: 99 },
      pattern: /maxWritesPerRun must be 1/,
    },
    {
      name: 'missing-public-proof',
      patch: {
        requiredProofs: ['rollback', 'post-action-smoke'],
        publicAccessFailClosedRequired: false,
      },
      pattern: /publicAccessFailClosedRequired must be true/,
    },
    {
      name: 'already-applied',
      patch: { policyChangeApplied: true },
      pattern: /policyChangeApplied must be false/,
    },
    {
      name: 'runner-not-enabled-in-patch',
      patch: { policyPatch: { authority: { a4Execution: 'enabled' }, a4ExecutionCommand: { runnerEnabled: false }, a4ExecutorProof: { runnerEnabled: true } } },
      pattern: /policyPatch\.a4ExecutionCommand\.runnerEnabled must be true/,
    },
    {
      name: 'wrong-proof-binding',
      patch: { executorProofReceipt: 'wrong-proof.json' },
      pattern: /executorProofReceipt must match executor proof receipt path/,
    },
  ];

  for (const entry of cases) {
    const proposalPath = path.join(root, `${entry.name}.json`);
    writeFileSync(
      proposalPath,
      `${JSON.stringify({
        ...validEnablementProposal({ executorProofPath }),
        ...entry.patch,
      }, null, 2)}\n`,
    );

    const result = spawnSync(
      process.execPath,
      executorEnableProposalCheckArgs(
        packetPath,
        preflightPath,
        executionPath,
        authorizationPath,
        commandPath,
        commandReceiptPath,
        executorProofPath,
        proposalPath,
        root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.enablementProposalOk, false, entry.name);
    assert.equal(payload.policyChangeApplied, false, entry.name);
    assert.equal(payload.runnerBlocked, true, entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.equal(payload.proposedPolicyPatch, null, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('policy-patch-dry-run-check validates exact patch preview without mutating policy', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const { executorProofPath } = writeValidExecutorProofReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  );
  const proposalPath = path.join(root, 'enablement-proposal.json');
  writeFileSync(
    proposalPath,
    `${JSON.stringify(validEnablementProposal({ executorProofPath }), null, 2)}\n`,
  );
  const { proposalReceiptPath } = writeValidEnablementProposalReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  );
  const policyPatchPath = path.join(root, 'policy-patch-dry-run.json');
  writeFileSync(
    policyPatchPath,
    `${JSON.stringify(validPolicyPatchDryRun({ proposalReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    policyPatchDryRunCheckArgs(
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
      root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'policy-patch-dry-run-check');
  assert.equal(payload.policyPatchDryRunOk, true);
  assert.equal(payload.dryRunOnly, true);
  assert.equal(payload.policyFileChanged, false);
  assert.equal(payload.policyChangeApplied, false);
  assert.equal(payload.runnerBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.targetScope, EXPECTED_TARGET);
  assert.equal(payload.maxWritesPerRun, 1);
  assert.deepEqual(payload.requiredProofs, ['rollback', 'post-action-smoke', 'public-access-fail-closed']);
  assert.equal(payload.policyPatchPreview.authority.a4Execution, 'enabled');
  assert.equal(payload.policyPatchPreview.a4ExecutionCommand.runnerEnabled, true);
  assert.equal(payload.policyPatchPreview.a4ExecutorProof.runnerEnabled, true);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.equal(payload.policy.policyPatchFileChanged, false);
  assert.equal(payload.policy.policyPatchChangeApplied, false);
  assert.match(payload.blockedReason, /checked-in repo policy remains blocked/);
  assert.match(payload.nextGate, /separate operator-reviewed PR/);
  assert.match(payload.receiptPath, /policy-patch-dry-run-check\.json$/);
});

test('policy-patch-dry-run-check fails closed on broader scope, mutation claims, or receipt drift', (t) => {
  const root = makeWorkspace(t);
  const packetPath = path.join(root, 'packet.json');
  writeFileSync(packetPath, `${JSON.stringify(validPacket(), null, 2)}\n`);
  const { preflightPath } = writeValidPreflightReceipt(t, packetPath);
  const { executionPath } = writeValidExecutionReceipt(t, packetPath, preflightPath);
  const authorizationPath = path.join(root, 'authorization.json');
  writeFileSync(
    authorizationPath,
    `${JSON.stringify(validAuthorization({ packetPath, preflightPath, executionPath }), null, 2)}\n`,
  );
  const commandPath = path.join(root, 'command.json');
  writeFileSync(
    commandPath,
    `${JSON.stringify(validExecutionCommand({
      packetPath,
      preflightPath,
      executionPath,
      authorizationPath,
    }), null, 2)}\n`,
  );
  const { commandReceiptPath } = writeValidCommandReceipt(t, packetPath, preflightPath, executionPath, authorizationPath, commandPath);
  const { executorProofPath } = writeValidExecutorProofReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
  );
  const proposalPath = path.join(root, 'enablement-proposal.json');
  writeFileSync(
    proposalPath,
    `${JSON.stringify(validEnablementProposal({ executorProofPath }), null, 2)}\n`,
  );
  const { proposalReceiptPath } = writeValidEnablementProposalReceipt(
    t,
    packetPath,
    preflightPath,
    executionPath,
    authorizationPath,
    commandPath,
    commandReceiptPath,
    executorProofPath,
    proposalPath,
  );
  const validDryRun = validPolicyPatchDryRun({ proposalReceiptPath });
  const driftedProposalReceipt = JSON.parse(readFileSync(proposalReceiptPath, 'utf8'));
  driftedProposalReceipt.policyChangeApplied = true;
  const driftedProposalReceiptPath = path.join(root, 'drifted-proposal-receipt.json');
  writeFileSync(driftedProposalReceiptPath, `${JSON.stringify(driftedProposalReceipt, null, 2)}\n`);

  const cases = [
    {
      name: 'extra-policy-field',
      artifact: {
        ...validDryRun,
        policyPatch: {
          ...validDryRun.policyPatch,
          a4PolicyPatchDryRun: { policyChangeApplied: true },
        },
      },
      proposalReceiptPath,
      pattern: /may not patch a4PolicyPatchDryRun/,
    },
    {
      name: 'changed-policy-file',
      artifact: { ...validDryRun, policyFileChanged: true },
      proposalReceiptPath,
      pattern: /policyFileChanged must be false/,
    },
    {
      name: 'already-applied',
      artifact: { ...validDryRun, policyChangeApplied: true },
      proposalReceiptPath,
      pattern: /policyChangeApplied must be false/,
    },
    {
      name: 'missing-public-proof',
      artifact: {
        ...validDryRun,
        requiredProofs: ['rollback', 'post-action-smoke'],
        publicAccessFailClosedRequired: false,
      },
      proposalReceiptPath,
      pattern: /publicAccessFailClosedRequired must be true/,
    },
    {
      name: 'patch-differs-from-proposal',
      artifact: {
        ...validDryRun,
        policyPatch: {
          ...validDryRun.policyPatch,
          a4ExecutionCommand: { runnerEnabled: false },
        },
      },
      proposalReceiptPath,
      pattern: /policyPatch must match enablement proposal receipt/,
    },
    {
      name: 'proposal-receipt-drift',
      artifact: {
        ...validDryRun,
        enablementProposalReceipt: path.relative(REPO_ROOT, driftedProposalReceiptPath),
      },
      proposalReceiptPath: driftedProposalReceiptPath,
      pattern: /executor enablement proposal receipt policyChangeApplied must be false/,
    },
  ];

  for (const entry of cases) {
    const policyPatchPath = path.join(root, `${entry.name}.json`);
    writeFileSync(policyPatchPath, `${JSON.stringify(entry.artifact, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      policyPatchDryRunCheckArgs(
        packetPath,
        preflightPath,
        executionPath,
        authorizationPath,
        commandPath,
        commandReceiptPath,
        executorProofPath,
        proposalPath,
        entry.proposalReceiptPath,
        policyPatchPath,
        root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.policyPatchDryRunOk, false, entry.name);
    assert.equal(payload.dryRunOnly, true, entry.name);
    assert.equal(payload.policyFileChanged, false, entry.name);
    assert.equal(payload.policyChangeApplied, false, entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.equal(payload.policyPatchPreview, null, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('policy-application-diff-check validates candidate manifest against dry-run receipt', (t) => {
  const fixture = writePolicyApplicationFixture(t);

  const result = spawnSync(
    process.execPath,
    policyApplicationDiffCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'policy-application-diff-check');
  assert.equal(payload.policyApplicationDiffOk, true);
  assert.equal(payload.exactPatchOnly, true);
  assert.deepEqual(payload.expectedDiffPaths, [
    'a4ExecutionCommand.runnerEnabled',
    'a4ExecutorProof.runnerEnabled',
    'authority.a4Execution',
  ]);
  assert.deepEqual(payload.actualDiffPaths, payload.expectedDiffPaths);
  assert.equal(payload.candidateA4Execution, 'enabled');
  assert.equal(payload.candidateCommandRunnerEnabled, true);
  assert.equal(payload.candidateExecutorRunnerEnabled, true);
  assert.equal(payload.policyPatchPreview.authority.a4Execution, 'enabled');
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.equal(payload.policyChangeApplied, false);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.blockedReason, /current checked-in policy remains blocked/);
  assert.match(payload.nextGate, /operator-reviewed policy application PR/);
  assert.match(payload.receiptPath, /policy-application-diff-check\.json$/);
});

test('policy-application-diff-check fails closed on extra candidate manifest changes', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const candidate = JSON.parse(readFileSync(fixture.candidateManifestPath, 'utf8'));
  candidate.status = 'candidate-local-only';
  const changedCandidatePath = path.join(fixture.root, 'candidate-extra-change.json');
  writeFileSync(changedCandidatePath, `${JSON.stringify(candidate, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    policyApplicationDiffCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      changedCandidatePath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.policyApplicationDiffOk, false);
  assert.equal(payload.policyPatchPreview, null);
  assert.equal(payload.policyChangeApplied, false);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /extra changed paths: status/);
});

test('policy-application-diff-check fails closed on missing patch fields or drifted dry-run receipts', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const missingRunnerCandidate = JSON.parse(readFileSync(fixture.candidateManifestPath, 'utf8'));
  missingRunnerCandidate.a4ExecutionCommand.runnerEnabled = false;
  const missingRunnerPath = path.join(fixture.root, 'candidate-missing-runner.json');
  writeFileSync(missingRunnerPath, `${JSON.stringify(missingRunnerCandidate, null, 2)}\n`);

  const driftedReceipt = JSON.parse(readFileSync(fixture.policyPatchReceiptPath, 'utf8'));
  driftedReceipt.policyFileChanged = true;
  const driftedReceiptPath = path.join(fixture.root, 'drifted-policy-patch-receipt.json');
  writeFileSync(driftedReceiptPath, `${JSON.stringify(driftedReceipt, null, 2)}\n`);

  const cases = [
    {
      name: 'missing-runner-field',
      policyPatchReceiptPath: fixture.policyPatchReceiptPath,
      candidateManifestPath: missingRunnerPath,
      pattern: /candidate manifest must equal base manifest plus policy patch preview/,
    },
    {
      name: 'drifted-dry-run-receipt',
      policyPatchReceiptPath: driftedReceiptPath,
      candidateManifestPath: fixture.candidateManifestPath,
      pattern: /policy patch dry-run receipt policyFileChanged must be false/,
    },
  ];

  for (const entry of cases) {
    const result = spawnSync(
      process.execPath,
      policyApplicationDiffCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        entry.policyPatchReceiptPath,
        entry.candidateManifestPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.policyApplicationDiffOk, false, entry.name);
    assert.equal(payload.policyPatchPreview, null, entry.name);
    assert.equal(payload.policyChangeApplied, false, entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('enabled-manifest-readiness-check validates candidate readiness without spawning a runner', (t) => {
  const fixture = writePolicyApplicationFixture(t);

  const result = spawnSync(
    process.execPath,
    enabledManifestReadinessCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'enabled-manifest-readiness-check');
  assert.equal(payload.enabledManifestReadinessOk, true);
  assert.equal(payload.candidateOnly, true);
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.candidateA4Execution, 'enabled');
  assert.equal(payload.candidateCommandRunnerEnabled, true);
  assert.equal(payload.candidateExecutorRunnerEnabled, true);
  assert.equal(payload.candidateExecutionReady, true);
  assert.equal(payload.processSpawnPolicy, 'blocked');
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.match(payload.blockedReason, /current checked-in policy remains blocked/);
  assert.match(payload.nextGate, /implementation PR/);
  assert.match(payload.receiptPath, /enabled-manifest-readiness-check\.json$/);
});

test('enabled-manifest-readiness-check fails closed on non-enabled candidates or missing proofs', (t) => {
  const nonEnabledFixture = writePolicyApplicationFixture(t);
  const nonEnabledCandidate = JSON.parse(readFileSync(nonEnabledFixture.candidateManifestPath, 'utf8'));
  nonEnabledCandidate.a4ExecutorProof.runnerEnabled = false;
  writeFileSync(nonEnabledFixture.candidateManifestPath, `${JSON.stringify(nonEnabledCandidate, null, 2)}\n`);

  const missingProofFixture = writePolicyApplicationFixture(t);
  const missingProofCandidate = JSON.parse(readFileSync(missingProofFixture.candidateManifestPath, 'utf8'));
  missingProofCandidate.a4ExecutorEnablementProposal.requiredProofs = ['rollback', 'post-action-smoke'];
  writeFileSync(missingProofFixture.candidateManifestPath, `${JSON.stringify(missingProofCandidate, null, 2)}\n`);

  const cases = [
    {
      name: 'non-enabled-candidate',
      fixture: nonEnabledFixture,
      pattern: /candidate executor runner must be enabled/,
    },
    {
      name: 'missing-public-proof',
      fixture: missingProofFixture,
      pattern: /requiredProofs must include public-access-fail-closed/,
    },
  ];

  for (const entry of cases) {
    const result = spawnSync(
      process.execPath,
      enabledManifestReadinessCheckArgs(
        entry.fixture.packetPath,
        entry.fixture.preflightPath,
        entry.fixture.executionPath,
        entry.fixture.authorizationPath,
        entry.fixture.commandPath,
        entry.fixture.commandReceiptPath,
        entry.fixture.executorProofPath,
        entry.fixture.proposalPath,
        entry.fixture.proposalReceiptPath,
        entry.fixture.policyPatchPath,
        entry.fixture.policyPatchReceiptPath,
        entry.fixture.candidateManifestPath,
        entry.fixture.applicationDiffReceiptPath,
        entry.fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.enabledManifestReadinessOk, false, entry.name);
    assert.equal(payload.candidateExecutionReady, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('enabled-manifest-readiness-check fails closed on drifted application diff execution markers', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const driftedReceipt = JSON.parse(readFileSync(fixture.applicationDiffReceiptPath, 'utf8'));
  driftedReceipt.processSpawned = true;
  driftedReceipt.executedCommands = ['node scripts/operator-agent-omnigent-adapter.mjs print'];
  const driftedReceiptPath = path.join(fixture.root, 'drifted-application-diff-receipt.json');
  writeFileSync(driftedReceiptPath, `${JSON.stringify(driftedReceipt, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    enabledManifestReadinessCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      driftedReceiptPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.enabledManifestReadinessOk, false);
  assert.equal(payload.candidateExecutionReady, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /processSpawned must not be true/);
  assert.match(payload.errors.join('\n'), /executedCommands must be empty/);
});

test('runner-implementation-contract-check validates future runner obligations without spawning', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
  writeFileSync(
    runnerContractPath,
    `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationContractCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      runnerContractPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'runner-implementation-contract-check');
  assert.equal(payload.runnerImplementationContractOk, true);
  assert.equal(payload.implementationSurface, 'repo-pr');
  assert.equal(payload.revalidatesFullChainImmediatelyBeforeWrite, true);
  assert.equal(payload.requiresEnabledCheckedInPolicy, true);
  assert.equal(payload.allowedWhenCurrentPolicyBlocked, false);
  assert.equal(payload.maxWritesPerRun, 1);
  assert.deepEqual(payload.requiredProofs, ['rollback', 'post-action-smoke', 'public-access-fail-closed']);
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.candidateExecutionReady, true);
  assert.equal(payload.processSpawnPolicy, 'blocked-until-checked-in-policy-enabled');
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.match(payload.blockedReason, /current checked-in policy remains blocked/);
  assert.match(payload.nextGate, /checked-in policy is enabled/);
  assert.match(payload.receiptPath, /runner-implementation-contract-check\.json$/);
});

test('runner-implementation-contract-check fails closed on unsafe contract claims', (t) => {
  const cases = [
    {
      name: 'missing-full-chain-revalidation',
      mutate(contract) {
        contract.revalidatesFullChainImmediatelyBeforeWrite = false;
      },
      pattern: /revalidate full chain immediately before write/,
    },
    {
      name: 'excessive-write-ceiling',
      mutate(contract) {
        contract.maxWritesPerRun = 2;
      },
      pattern: /maxWritesPerRun must be 1/,
    },
    {
      name: 'missing-public-proof',
      mutate(contract) {
        contract.requiredProofs = ['rollback', 'post-action-smoke'];
        contract.publicAccessFailClosedRequired = false;
      },
      pattern: /public-access-fail-closed/,
    },
    {
      name: 'execution-markers',
      mutate(contract) {
        contract.processSpawned = true;
        contract.executedCommands = ['wrangler deploy'];
        contract.executionReady = true;
        contract.wouldExecute = true;
        contract.writesPerformed = 1;
      },
      pattern: /processSpawned must not be true/,
    },
    {
      name: 'allows-blocked-current-policy',
      mutate(contract) {
        contract.allowedWhenCurrentPolicyBlocked = true;
      },
      pattern: /must not allow execution while current policy is blocked/,
    },
  ];

  for (const entry of cases) {
    const fixture = writePolicyApplicationFixture(t);
    const runnerContract = validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath });
    entry.mutate(runnerContract);
    const runnerContractPath = path.join(fixture.root, `${entry.name}-runner-contract.json`);
    writeFileSync(runnerContractPath, `${JSON.stringify(runnerContract, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      runnerImplementationContractCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        runnerContractPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.runnerImplementationContractOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('runner-implementation-contract-check fails closed on drifted readiness receipts', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const readinessReceipt = JSON.parse(readFileSync(fixture.readinessReceiptPath, 'utf8'));
  readinessReceipt.processSpawned = true;
  readinessReceipt.executedCommands = ['node scripts/operator-agent-omnigent-adapter.mjs print'];
  const driftedReadinessPath = path.join(fixture.root, 'drifted-readiness-receipt.json');
  writeFileSync(driftedReadinessPath, `${JSON.stringify(readinessReceipt, null, 2)}\n`);
  const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
  writeFileSync(
    runnerContractPath,
    `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: driftedReadinessPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationContractCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      driftedReadinessPath,
      runnerContractPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.runnerImplementationContractOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /executedCommands must be empty/);
});

test('runner-implementation-plan-check validates a plan-only future runner implementation', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
  writeFileSync(
    runnerContractPath,
    `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath }), null, 2)}\n`,
  );
  const { runnerContractReceiptPath } = writeValidRunnerImplementationContractReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    runnerContractPath,
  );
  const runnerPlanPath = path.join(fixture.root, 'runner-plan.json');
  writeFileSync(
    runnerPlanPath,
    `${JSON.stringify(validRunnerImplementationPlan({ runnerContractReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationPlanCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      runnerContractPath,
      runnerContractReceiptPath,
      runnerPlanPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'runner-implementation-plan-check');
  assert.equal(payload.runnerImplementationPlanOk, true);
  assert.equal(payload.implementationSurface, 'repo-pr');
  assert.equal(payload.plannedEntrypoint, 'scripts/operator-agent-omnigent-runner.mjs');
  assert.equal(payload.implementationPlanOnly, true);
  assert.equal(payload.executableEntrypointAdded, false);
  assert.equal(payload.revalidatesFullChainImmediatelyBeforeWrite, true);
  assert.equal(payload.requiresEnabledCheckedInPolicy, true);
  assert.equal(payload.allowedWhenCurrentPolicyBlocked, false);
  assert.equal(payload.maxWritesPerRun, 1);
  assert.ok(payload.requiredGuards.includes('checked-in-policy-enabled'));
  assert.ok(payload.requiredGuards.includes('public-access-fail-closed'));
  assert.ok(payload.revalidationSequence.includes('runner-implementation-contract-check'));
  assert.ok(payload.receiptOutputs.includes('final-outcome'));
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.match(payload.blockedReason, /no executable entrypoint was added/);
  assert.match(payload.nextGate, /planned runner entrypoint/);
  assert.match(payload.receiptPath, /runner-implementation-plan-check\.json$/);
});

test('runner-implementation-plan-check fails closed on unsafe implementation plans', (t) => {
  const cases = [
    {
      name: 'missing-policy-guard',
      mutate(plan) {
        plan.requiredGuards = plan.requiredGuards.filter((guard) => guard !== 'checked-in-policy-enabled');
      },
      pattern: /requiredGuards must include checked-in-policy-enabled/,
    },
    {
      name: 'missing-public-plan',
      mutate(plan) {
        plan.publicAccessFailClosedPlan = [];
      },
      pattern: /publicAccessFailClosedPlan is required/,
    },
    {
      name: 'excessive-write-ceiling',
      mutate(plan) {
        plan.maxWritesPerRun = 2;
      },
      pattern: /maxWritesPerRun must be 1/,
    },
    {
      name: 'entrypoint-added',
      mutate(plan) {
        plan.executableEntrypointAdded = true;
      },
      pattern: /executableEntrypointAdded must be false/,
    },
    {
      name: 'execution-markers',
      mutate(plan) {
        plan.processSpawned = true;
        plan.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
        plan.executionReady = true;
        plan.wouldExecute = true;
        plan.writesPerformed = 1;
      },
      pattern: /processSpawned must not be true/,
    },
  ];

  for (const entry of cases) {
    const fixture = writePolicyApplicationFixture(t);
    const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
    writeFileSync(
      runnerContractPath,
      `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath }), null, 2)}\n`,
    );
    const { runnerContractReceiptPath } = writeValidRunnerImplementationContractReceipt(
      t,
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      runnerContractPath,
    );
    const runnerPlan = validRunnerImplementationPlan({ runnerContractReceiptPath });
    entry.mutate(runnerPlan);
    const runnerPlanPath = path.join(fixture.root, `${entry.name}-runner-plan.json`);
    writeFileSync(runnerPlanPath, `${JSON.stringify(runnerPlan, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      runnerImplementationPlanCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        runnerContractPath,
        runnerContractReceiptPath,
        runnerPlanPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.runnerImplementationPlanOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('runner-implementation-plan-check fails closed on drifted contract receipts', (t) => {
  const fixture = writePolicyApplicationFixture(t);
  const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
  writeFileSync(
    runnerContractPath,
    `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath }), null, 2)}\n`,
  );
  const { runnerContractReceiptPath } = writeValidRunnerImplementationContractReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    runnerContractPath,
  );
  const driftedContractReceipt = JSON.parse(readFileSync(runnerContractReceiptPath, 'utf8'));
  driftedContractReceipt.processSpawned = true;
  driftedContractReceipt.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
  const driftedContractReceiptPath = path.join(fixture.root, 'drifted-runner-contract-receipt.json');
  writeFileSync(driftedContractReceiptPath, `${JSON.stringify(driftedContractReceipt, null, 2)}\n`);
  const runnerPlanPath = path.join(fixture.root, 'runner-plan.json');
  writeFileSync(
    runnerPlanPath,
    `${JSON.stringify(validRunnerImplementationPlan({ runnerContractReceiptPath: driftedContractReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationPlanCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      runnerContractPath,
      driftedContractReceiptPath,
      runnerPlanPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.runnerImplementationPlanOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /executedCommands must be empty/);
});

function writeRunnerPlanFixture(t) {
  const fixture = writePolicyApplicationFixture(t);
  const runnerContractPath = path.join(fixture.root, 'runner-contract.json');
  writeFileSync(
    runnerContractPath,
    `${JSON.stringify(validRunnerImplementationContract({ readinessReceiptPath: fixture.readinessReceiptPath }), null, 2)}\n`,
  );
  const { runnerContractReceiptPath } = writeValidRunnerImplementationContractReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    runnerContractPath,
  );
  const runnerPlanPath = path.join(fixture.root, 'runner-plan.json');
  writeFileSync(
    runnerPlanPath,
    `${JSON.stringify(validRunnerImplementationPlan({ runnerContractReceiptPath }), null, 2)}\n`,
  );
  const { runnerPlanReceiptPath } = writeValidRunnerImplementationPlanReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    runnerContractPath,
    runnerContractReceiptPath,
    runnerPlanPath,
  );

  return {
    ...fixture,
    runnerContractPath,
    runnerContractReceiptPath,
    runnerPlanPath,
    runnerPlanReceiptPath,
  };
}

function writeReleaseAdmissionFixture(t) {
  const fixture = writeRunnerPlanFixture(t);
  const runnerDiffPath = path.join(fixture.root, 'runner-diff.json');
  writeFileSync(
    runnerDiffPath,
    `${JSON.stringify(validRunnerImplementationDiff({ runnerPlanReceiptPath: fixture.runnerPlanReceiptPath }), null, 2)}\n`,
  );
  const { runnerDiffReceiptPath } = writeValidRunnerImplementationDiffReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    fixture.runnerContractPath,
    fixture.runnerContractReceiptPath,
    fixture.runnerPlanPath,
    fixture.runnerPlanReceiptPath,
    runnerDiffPath,
  );
  const releaseAdmissionPath = path.join(fixture.root, 'release-admission.json');
  writeFileSync(
    releaseAdmissionPath,
    `${JSON.stringify(validReleaseAdmission({
      readinessReceiptPath: fixture.readinessReceiptPath,
      runnerDiffPath,
      runnerDiffReceiptPath,
    }), null, 2)}\n`,
  );
  const { releaseAdmissionReceiptPath } = writeValidReleaseAdmissionReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    fixture.runnerContractPath,
    fixture.runnerContractReceiptPath,
    fixture.runnerPlanPath,
    fixture.runnerPlanReceiptPath,
    runnerDiffPath,
    runnerDiffReceiptPath,
    releaseAdmissionPath,
  );

  return {
    ...fixture,
    runnerDiffPath,
    runnerDiffReceiptPath,
    releaseAdmissionPath,
    releaseAdmissionReceiptPath,
  };
}

function writeExecutionRunbookFixture(t) {
  const fixture = writeReleaseAdmissionFixture(t);
  const executionRunbookPath = path.join(fixture.root, 'execution-runbook.json');
  writeFileSync(
    executionRunbookPath,
    `${JSON.stringify(validExecutionRunbook({
      releaseAdmissionPath: fixture.releaseAdmissionPath,
      releaseAdmissionReceiptPath: fixture.releaseAdmissionReceiptPath,
    }), null, 2)}\n`,
  );
  const { executionRunbookReceiptPath } = writeValidExecutionRunbookReceipt(
    t,
    fixture.packetPath,
    fixture.preflightPath,
    fixture.executionPath,
    fixture.authorizationPath,
    fixture.commandPath,
    fixture.commandReceiptPath,
    fixture.executorProofPath,
    fixture.proposalPath,
    fixture.proposalReceiptPath,
    fixture.policyPatchPath,
    fixture.policyPatchReceiptPath,
    fixture.candidateManifestPath,
    fixture.applicationDiffReceiptPath,
    fixture.readinessReceiptPath,
    fixture.runnerContractPath,
    fixture.runnerContractReceiptPath,
    fixture.runnerPlanPath,
    fixture.runnerPlanReceiptPath,
    fixture.runnerDiffPath,
    fixture.runnerDiffReceiptPath,
    fixture.releaseAdmissionPath,
    fixture.releaseAdmissionReceiptPath,
    executionRunbookPath,
  );

  return {
    ...fixture,
    executionRunbookPath,
    executionRunbookReceiptPath,
  };
}

test('runner-implementation-diff-check validates candidate-only runner implementation diff', (t) => {
  const fixture = writeRunnerPlanFixture(t);
  const runnerDiffPath = path.join(fixture.root, 'runner-diff.json');
  writeFileSync(
    runnerDiffPath,
    `${JSON.stringify(validRunnerImplementationDiff({ runnerPlanReceiptPath: fixture.runnerPlanReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationDiffCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      runnerDiffPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'runner-implementation-diff-check');
  assert.equal(payload.runnerImplementationDiffOk, true);
  assert.equal(payload.candidateOnly, true);
  assert.equal(payload.checkedInEntrypointExists, false);
  assert.equal(payload.plannedEntrypoint, 'scripts/operator-agent-omnigent-runner.mjs');
  assert.deepEqual(payload.filesToAdd, ['scripts/operator-agent-omnigent-runner.mjs']);
  assert.deepEqual(payload.filesToModify, []);
  assert.equal(payload.maxWritesPerRun, 1);
  assert.ok(payload.requiredGuards.includes('checked-in-policy-enabled'));
  assert.ok(payload.proofHooks.includes('public-access-fail-closed'));
  assert.ok(payload.revalidationSequence.includes('runner-implementation-plan-check'));
  assert.ok(payload.receiptOutputs.includes('final-outcome'));
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.runnerEnabled, false);
  assert.equal(payload.policy.executorRunnerEnabled, false);
  assert.match(payload.blockedReason, /executable runner entrypoint is not checked in/);
  assert.match(payload.nextGate, /exact candidate runner entrypoint/);
  assert.match(payload.receiptPath, /runner-implementation-diff-check\.json$/);
});

test('runner-implementation-diff-check fails closed on unsafe candidate diffs', (t) => {
  const cases = [
    {
      name: 'wrong-entrypoint',
      mutate(diff) {
        diff.plannedEntrypoint = 'scripts/unsafe-runner.mjs';
        diff.filesToAdd = ['scripts/unsafe-runner.mjs'];
      },
      pattern: /plannedEntrypoint must be scripts\/operator-agent-omnigent-runner\.mjs/,
    },
    {
      name: 'entrypoint-already-checked-in',
      mutate(diff) {
        diff.checkedInEntrypointExists = true;
      },
      pattern: /checkedInEntrypointExists must be false/,
    },
    {
      name: 'unrelated-file-addition',
      mutate(diff) {
        diff.filesToAdd = ['scripts/operator-agent-omnigent-runner.mjs', 'scripts/extra-runner.mjs'];
      },
      pattern: /file addition is not allowed/,
    },
    {
      name: 'missing-public-proof-hook',
      mutate(diff) {
        diff.proofHooks = ['rollback', 'post-action-smoke'];
      },
      pattern: /proofHooks must include public-access-fail-closed/,
    },
    {
      name: 'excessive-write-ceiling',
      mutate(diff) {
        diff.maxWritesPerRun = 2;
      },
      pattern: /maxWritesPerRun must be 1/,
    },
    {
      name: 'execution-markers',
      mutate(diff) {
        diff.processSpawned = true;
        diff.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
        diff.executionReady = true;
        diff.wouldExecute = true;
        diff.writesPerformed = 1;
      },
      pattern: /processSpawned must not be true/,
    },
  ];

  for (const entry of cases) {
    const fixture = writeRunnerPlanFixture(t);
    const runnerDiff = validRunnerImplementationDiff({ runnerPlanReceiptPath: fixture.runnerPlanReceiptPath });
    entry.mutate(runnerDiff);
    const runnerDiffPath = path.join(fixture.root, `${entry.name}-runner-diff.json`);
    writeFileSync(runnerDiffPath, `${JSON.stringify(runnerDiff, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      runnerImplementationDiffCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        fixture.runnerContractPath,
        fixture.runnerContractReceiptPath,
        fixture.runnerPlanPath,
        fixture.runnerPlanReceiptPath,
        runnerDiffPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.runnerImplementationDiffOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('runner-implementation-diff-check fails closed on drifted plan receipts', (t) => {
  const fixture = writeRunnerPlanFixture(t);
  const driftedPlanReceipt = JSON.parse(readFileSync(fixture.runnerPlanReceiptPath, 'utf8'));
  driftedPlanReceipt.processSpawned = true;
  driftedPlanReceipt.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
  const driftedPlanReceiptPath = path.join(fixture.root, 'drifted-runner-plan-receipt.json');
  writeFileSync(driftedPlanReceiptPath, `${JSON.stringify(driftedPlanReceipt, null, 2)}\n`);
  const runnerDiffPath = path.join(fixture.root, 'runner-diff.json');
  writeFileSync(
    runnerDiffPath,
    `${JSON.stringify(validRunnerImplementationDiff({ runnerPlanReceiptPath: driftedPlanReceiptPath }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    runnerImplementationDiffCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      driftedPlanReceiptPath,
      runnerDiffPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.runnerImplementationDiffOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /executedCommands must be empty/);
});

test('release-admission-check validates manual release evidence without execution', (t) => {
  const fixture = writeReleaseAdmissionFixture(t);
  const releaseAdmissionPath = path.join(fixture.root, 'release-admission.json');
  writeFileSync(
    releaseAdmissionPath,
    `${JSON.stringify(validReleaseAdmission({
      readinessReceiptPath: fixture.readinessReceiptPath,
      runnerDiffPath: fixture.runnerDiffPath,
      runnerDiffReceiptPath: fixture.runnerDiffReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    releaseAdmissionCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      fixture.runnerDiffReceiptPath,
      releaseAdmissionPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'release-admission-check');
  assert.equal(payload.releaseAdmissionOk, true);
  assert.equal(payload.releaseMode, 'operator-reviewed-pr');
  assert.equal(payload.packetOnly, true);
  assert.equal(payload.requiresManualMerge, true);
  assert.equal(payload.autoMerge, false);
  assert.deepEqual(payload.mergeOrder, ['policy-enabled-manifest', 'runner-entrypoint']);
  assert.equal(payload.prs.length, 2);
  assert.ok(payload.requiredEvidence.includes('public-access-fail-closed-proof'));
  assert.ok(payload.requiredGuards.includes('checked-in-policy-enabled'));
  assert.match(payload.linearEvidence, new RegExp(EXPECTED_ISSUE));
  assert.match(payload.rollbackNote, /reverting runner-entrypoint PR first/);
  assert.match(payload.publicAccessFailClosedProof, /rawOriginExposed=false/);
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.releaseAdmissionRequiresReadinessReceipt, true);
  assert.equal(payload.policy.releaseAdmissionRequiresRunnerDiffReceipt, true);
  assert.match(payload.nextGate, /merging policy enablement and runner entrypoint/);
  assert.match(payload.receiptPath, /release-admission-check\.json$/);
});

test('release-admission-check fails closed on unsafe release packets', (t) => {
  const cases = [
    {
      name: 'missing-runner-pr',
      mutate(admission) {
        admission.prs = admission.prs.filter((entry) => entry.role !== 'runner-entrypoint');
      },
      pattern: /missing PR evidence for runner-entrypoint/,
    },
    {
      name: 'failed-checks',
      mutate(admission) {
        admission.prs[0].checkStatus = 'failure';
        admission.prs[0].checksPassed = false;
      },
      pattern: /checks must be success/,
    },
    {
      name: 'wrong-merge-order',
      mutate(admission) {
        admission.mergeOrder = ['runner-entrypoint', 'policy-enabled-manifest'];
      },
      pattern: /mergeOrder must match required merge order/,
    },
    {
      name: 'missing-public-proof',
      mutate(admission) {
        admission.requiredEvidence = ['linear-done-evidence', 'github-checks-passed', 'rollback-note'];
        admission.publicAccessFailClosedProof = '';
      },
      pattern: /publicAccessFailClosedProof is required/,
    },
    {
      name: 'automerge-and-execution',
      mutate(admission) {
        admission.autoMerge = true;
        admission.processSpawned = true;
        admission.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
        admission.executionReady = true;
        admission.wouldExecute = true;
        admission.writesPerformed = 1;
      },
      pattern: /autoMerge must not be true/,
    },
  ];

  for (const entry of cases) {
    const fixture = writeReleaseAdmissionFixture(t);
    const admission = validReleaseAdmission({
      readinessReceiptPath: fixture.readinessReceiptPath,
      runnerDiffPath: fixture.runnerDiffPath,
      runnerDiffReceiptPath: fixture.runnerDiffReceiptPath,
    });
    entry.mutate(admission);
    const releaseAdmissionPath = path.join(fixture.root, `${entry.name}-release-admission.json`);
    writeFileSync(releaseAdmissionPath, `${JSON.stringify(admission, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      releaseAdmissionCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        fixture.runnerContractPath,
        fixture.runnerContractReceiptPath,
        fixture.runnerPlanPath,
        fixture.runnerPlanReceiptPath,
        fixture.runnerDiffPath,
        fixture.runnerDiffReceiptPath,
        releaseAdmissionPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.releaseAdmissionOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('release-admission-check fails closed on drifted runner diff receipts', (t) => {
  const fixture = writeReleaseAdmissionFixture(t);
  const driftedRunnerDiffReceipt = JSON.parse(readFileSync(fixture.runnerDiffReceiptPath, 'utf8'));
  driftedRunnerDiffReceipt.processSpawned = true;
  driftedRunnerDiffReceipt.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
  const driftedRunnerDiffReceiptPath = path.join(fixture.root, 'drifted-runner-diff-receipt.json');
  writeFileSync(driftedRunnerDiffReceiptPath, `${JSON.stringify(driftedRunnerDiffReceipt, null, 2)}\n`);
  const releaseAdmissionPath = path.join(fixture.root, 'release-admission.json');
  writeFileSync(
    releaseAdmissionPath,
    `${JSON.stringify(validReleaseAdmission({
      readinessReceiptPath: fixture.readinessReceiptPath,
      runnerDiffPath: fixture.runnerDiffPath,
      runnerDiffReceiptPath: driftedRunnerDiffReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    releaseAdmissionCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      driftedRunnerDiffReceiptPath,
      releaseAdmissionPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.releaseAdmissionOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /runner implementation diff receipt processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /runner implementation diff receipt executedCommands must be empty/);
});

test('execution-runbook-check validates future supervised runbook without execution', (t) => {
  const fixture = writeReleaseAdmissionFixture(t);
  const executionRunbookPath = path.join(fixture.root, 'execution-runbook.json');
  writeFileSync(
    executionRunbookPath,
    `${JSON.stringify(validExecutionRunbook({
      releaseAdmissionPath: fixture.releaseAdmissionPath,
      releaseAdmissionReceiptPath: fixture.releaseAdmissionReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    executionRunbookCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      fixture.runnerDiffReceiptPath,
      fixture.releaseAdmissionPath,
      fixture.releaseAdmissionReceiptPath,
      executionRunbookPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'execution-runbook-check');
  assert.equal(payload.executionRunbookOk, true);
  assert.equal(payload.runbookOnly, true);
  assert.equal(payload.executionMode, 'operator-supervised');
  assert.equal(payload.requiresManualTrigger, true);
  assert.ok(payload.targetValidationCommands.some((command) => command.includes('operator-agent-public-smoke')));
  assert.match(payload.writeCommand.command, /operator-agent-omnigent-runner/);
  assert.equal(payload.writeCommand.requiresManualTrigger, true);
  assert.equal(payload.writeCommand.approvedCommandOnly, true);
  assert.ok(payload.postActionSmokeCommands.length > 0);
  assert.ok(payload.rollbackCommands.length > 0);
  assert.match(payload.publicAccessFailClosedProof, /rawOriginExposed=false/);
  assert.ok(payload.finalReceiptOutputs.includes('final-outcome'));
  assert.ok(payload.stopConditions.includes('rollback-unavailable'));
  assert.equal(payload.maxWritesPerRun, 1);
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.executionRunbookRequiresReleaseAdmissionReceipt, true);
  assert.match(payload.nextGate, /checked-in policy enablement/);
  assert.match(payload.receiptPath, /execution-runbook-check\.json$/);
});

test('execution-runbook-check fails closed on unsafe runbooks', (t) => {
  const cases = [
    {
      name: 'missing-validation',
      mutate(runbook) {
        runbook.targetValidationCommands = [];
      },
      pattern: /targetValidationCommands must be non-empty/,
    },
    {
      name: 'unapproved-write-command',
      mutate(runbook) {
        runbook.writeCommand.approvedCommandOnly = false;
      },
      pattern: /writeCommand\.approvedCommandOnly must be true/,
    },
    {
      name: 'missing-smoke',
      mutate(runbook) {
        runbook.postActionSmokeCommands = [];
      },
      pattern: /postActionSmokeCommands must be non-empty/,
    },
    {
      name: 'missing-rollback',
      mutate(runbook) {
        runbook.rollbackCommands = [];
      },
      pattern: /rollbackCommands must be non-empty/,
    },
    {
      name: 'missing-final-output',
      mutate(runbook) {
        runbook.finalReceiptOutputs = ['pre-action-receipt'];
      },
      pattern: /finalReceiptOutputs must include final-outcome/,
    },
    {
      name: 'execution-markers',
      mutate(runbook) {
        runbook.processSpawned = true;
        runbook.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
        runbook.executionReady = true;
        runbook.wouldExecute = true;
        runbook.writesPerformed = 1;
      },
      pattern: /processSpawned must not be true/,
    },
  ];

  for (const entry of cases) {
    const fixture = writeReleaseAdmissionFixture(t);
    const runbook = validExecutionRunbook({
      releaseAdmissionPath: fixture.releaseAdmissionPath,
      releaseAdmissionReceiptPath: fixture.releaseAdmissionReceiptPath,
    });
    entry.mutate(runbook);
    const executionRunbookPath = path.join(fixture.root, `${entry.name}-execution-runbook.json`);
    writeFileSync(executionRunbookPath, `${JSON.stringify(runbook, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      executionRunbookCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        fixture.runnerContractPath,
        fixture.runnerContractReceiptPath,
        fixture.runnerPlanPath,
        fixture.runnerPlanReceiptPath,
        fixture.runnerDiffPath,
        fixture.runnerDiffReceiptPath,
        fixture.releaseAdmissionPath,
        fixture.releaseAdmissionReceiptPath,
        executionRunbookPath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.executionRunbookOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('execution-runbook-check fails closed on drifted release admission receipts', (t) => {
  const fixture = writeReleaseAdmissionFixture(t);
  const driftedReleaseReceipt = JSON.parse(readFileSync(fixture.releaseAdmissionReceiptPath, 'utf8'));
  driftedReleaseReceipt.processSpawned = true;
  driftedReleaseReceipt.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
  const driftedReleaseReceiptPath = path.join(fixture.root, 'drifted-release-admission-receipt.json');
  writeFileSync(driftedReleaseReceiptPath, `${JSON.stringify(driftedReleaseReceipt, null, 2)}\n`);
  const executionRunbookPath = path.join(fixture.root, 'execution-runbook.json');
  writeFileSync(
    executionRunbookPath,
    `${JSON.stringify(validExecutionRunbook({
      releaseAdmissionPath: fixture.releaseAdmissionPath,
      releaseAdmissionReceiptPath: driftedReleaseReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    executionRunbookCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      fixture.runnerDiffReceiptPath,
      fixture.releaseAdmissionPath,
      driftedReleaseReceiptPath,
      executionRunbookPath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.executionRunbookOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /release admission receipt processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /release admission receipt executedCommands must be empty/);
});

test('receipt-bundle-check validates shareable redacted receipt bundle without execution', (t) => {
  const fixture = writeExecutionRunbookFixture(t);
  const receiptBundlePath = path.join(fixture.root, 'receipt-bundle.json');
  writeFileSync(
    receiptBundlePath,
    `${JSON.stringify(validReceiptBundle({
      executionRunbookPath: fixture.executionRunbookPath,
      executionRunbookReceiptPath: fixture.executionRunbookReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    receiptBundleCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      fixture.runnerDiffReceiptPath,
      fixture.releaseAdmissionPath,
      fixture.releaseAdmissionReceiptPath,
      fixture.executionRunbookPath,
      fixture.executionRunbookReceiptPath,
      receiptBundlePath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.mode, 'receipt-bundle-check');
  assert.equal(payload.receiptBundleOk, true);
  assert.equal(payload.bundleOnly, true);
  assert.equal(payload.shareable, true);
  assert.equal(payload.redactionPolicyApplied, true);
  assert.equal(payload.containsSecrets, false);
  assert.equal(payload.containsRawLogs, false);
  assert.equal(payload.containsPrompts, false);
  assert.equal(payload.rawLogsIncluded, false);
  assert.equal(payload.promptsIncluded, false);
  assert.equal(payload.rawTranscriptIncluded, false);
  assert.ok(payload.receiptReferences.some((entry) => entry.mode === 'execution-runbook-check'));
  assert.ok(payload.requiredEvidence.includes('operator-summary'));
  assert.equal(payload.githubChecksPassed, true);
  assert.match(payload.publicAccessFailClosedProof, /rawOriginExposed=false/);
  assert.match(payload.operatorSummary, /Redacted A4 receipt bundle/);
  assert.ok(payload.noExecutionMarkers.includes('writes-performed-zero'));
  assert.equal(payload.currentPolicyBlocked, true);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.policy.a4Execution, 'blocked');
  assert.equal(payload.policy.receiptBundleRequiresExecutionRunbookReceipt, true);
  assert.equal(payload.policy.receiptBundleForbidsSecrets, true);
  assert.match(payload.nextGate, /review the redacted receipt bundle asynchronously/);
  assert.match(payload.receiptPath, /receipt-bundle-check\.json$/);
});

test('receipt-bundle-check fails closed on unsafe or leaky bundles', (t) => {
  const cases = [
    {
      name: 'secret-leak',
      mutate(bundle) {
        bundle.containsSecrets = true;
      },
      pattern: /containsSecrets must be false/,
    },
    {
      name: 'raw-log-leak',
      mutate(bundle) {
        bundle.rawLogsIncluded = true;
      },
      pattern: /rawLogsIncluded must not be true/,
    },
    {
      name: 'prompt-leak',
      mutate(bundle) {
        bundle.containsPrompts = true;
      },
      pattern: /containsPrompts must be false/,
    },
    {
      name: 'missing-reference',
      mutate(bundle) {
        bundle.receiptReferences = bundle.receiptReferences.filter((entry) => entry !== 'release-admission-check');
      },
      pattern: /receiptReferences must include release-admission-check/,
    },
    {
      name: 'unredacted-reference',
      mutate(bundle) {
        const reference = bundle.receiptReferences.find((entry) => entry.mode === 'execution-runbook-check');
        reference.redacted = false;
      },
      pattern: /reference execution-runbook-check must be redacted/,
    },
    {
      name: 'execution-markers',
      mutate(bundle) {
        bundle.processSpawned = true;
        bundle.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
        bundle.executionApproved = true;
        bundle.wouldExecute = true;
        bundle.writesPerformed = 1;
      },
      pattern: /processSpawned must not be true/,
    },
  ];

  for (const entry of cases) {
    const fixture = writeExecutionRunbookFixture(t);
    const bundle = validReceiptBundle({
      executionRunbookPath: fixture.executionRunbookPath,
      executionRunbookReceiptPath: fixture.executionRunbookReceiptPath,
    });
    entry.mutate(bundle);
    const receiptBundlePath = path.join(fixture.root, `${entry.name}-receipt-bundle.json`);
    writeFileSync(receiptBundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      receiptBundleCheckArgs(
        fixture.packetPath,
        fixture.preflightPath,
        fixture.executionPath,
        fixture.authorizationPath,
        fixture.commandPath,
        fixture.commandReceiptPath,
        fixture.executorProofPath,
        fixture.proposalPath,
        fixture.proposalReceiptPath,
        fixture.policyPatchPath,
        fixture.policyPatchReceiptPath,
        fixture.candidateManifestPath,
        fixture.applicationDiffReceiptPath,
        fixture.readinessReceiptPath,
        fixture.runnerContractPath,
        fixture.runnerContractReceiptPath,
        fixture.runnerPlanPath,
        fixture.runnerPlanReceiptPath,
        fixture.runnerDiffPath,
        fixture.runnerDiffReceiptPath,
        fixture.releaseAdmissionPath,
        fixture.releaseAdmissionReceiptPath,
        fixture.executionRunbookPath,
        fixture.executionRunbookReceiptPath,
        receiptBundlePath,
        fixture.root,
      ),
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0, entry.name);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false, entry.name);
    assert.equal(payload.receiptBundleOk, false, entry.name);
    assert.equal(payload.processSpawned, false, entry.name);
    assert.deepEqual(payload.executedCommands, [], entry.name);
    assert.equal(payload.runnerEnabled, false, entry.name);
    assert.equal(payload.executionReady, false, entry.name);
    assert.equal(payload.executionEnabled, false, entry.name);
    assert.equal(payload.executionApproved, false, entry.name);
    assert.equal(payload.wouldExecute, false, entry.name);
    assert.equal(payload.writesPerformed, 0, entry.name);
    assert.match(payload.errors.join('\n'), entry.pattern, entry.name);
  }
});

test('receipt-bundle-check fails closed on drifted execution runbook receipts', (t) => {
  const fixture = writeExecutionRunbookFixture(t);
  const driftedRunbookReceipt = JSON.parse(readFileSync(fixture.executionRunbookReceiptPath, 'utf8'));
  driftedRunbookReceipt.processSpawned = true;
  driftedRunbookReceipt.executedCommands = ['node scripts/operator-agent-omnigent-runner.mjs'];
  driftedRunbookReceipt.executionApproved = true;
  const driftedRunbookReceiptPath = path.join(fixture.root, 'drifted-execution-runbook-receipt.json');
  writeFileSync(driftedRunbookReceiptPath, `${JSON.stringify(driftedRunbookReceipt, null, 2)}\n`);
  const receiptBundlePath = path.join(fixture.root, 'receipt-bundle.json');
  writeFileSync(
    receiptBundlePath,
    `${JSON.stringify(validReceiptBundle({
      executionRunbookPath: fixture.executionRunbookPath,
      executionRunbookReceiptPath: driftedRunbookReceiptPath,
    }), null, 2)}\n`,
  );

  const result = spawnSync(
    process.execPath,
    receiptBundleCheckArgs(
      fixture.packetPath,
      fixture.preflightPath,
      fixture.executionPath,
      fixture.authorizationPath,
      fixture.commandPath,
      fixture.commandReceiptPath,
      fixture.executorProofPath,
      fixture.proposalPath,
      fixture.proposalReceiptPath,
      fixture.policyPatchPath,
      fixture.policyPatchReceiptPath,
      fixture.candidateManifestPath,
      fixture.applicationDiffReceiptPath,
      fixture.readinessReceiptPath,
      fixture.runnerContractPath,
      fixture.runnerContractReceiptPath,
      fixture.runnerPlanPath,
      fixture.runnerPlanReceiptPath,
      fixture.runnerDiffPath,
      fixture.runnerDiffReceiptPath,
      fixture.releaseAdmissionPath,
      fixture.releaseAdmissionReceiptPath,
      fixture.executionRunbookPath,
      driftedRunbookReceiptPath,
      receiptBundlePath,
      fixture.root,
    ),
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.receiptBundleOk, false);
  assert.equal(payload.processSpawned, false);
  assert.deepEqual(payload.executedCommands, []);
  assert.equal(payload.runnerEnabled, false);
  assert.equal(payload.executionReady, false);
  assert.equal(payload.executionEnabled, false);
  assert.equal(payload.executionApproved, false);
  assert.equal(payload.wouldExecute, false);
  assert.equal(payload.writesPerformed, 0);
  assert.match(payload.errors.join('\n'), /execution runbook receipt processSpawned must be false/);
  assert.match(payload.errors.join('\n'), /execution runbook receipt executedCommands must be empty/);
});

test('read-only scout profile and receipt match the local harness parity contract', () => {
  const manifest = readManifest();
  const profile = readProfile();
  const receipt = readTrialReceipt();

  assert.deepEqual(validateScoutProfile(profile, manifest), []);
  assert.deepEqual(validateTrialReceipt(receipt, profile, manifest), []);
  assert.equal(receipt.authorityLevel, 'A0');
  assert.equal(receipt.writesPerformed, 0);
  assert.equal(receipt.linearMirror.issue, 'CRE-1062');
});

test('trial check writes a local receipt and keeps Omnigent read-only', (t) => {
  const root = makeWorkspace(t);
  const result = spawnSync(
    process.execPath,
    [SCRIPT, 'trial-check', '--receipt-dir', root, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, payload.errors.join('\n'));
  assert.equal(payload.authorityLevel, 'A0');
  assert.equal(payload.writesPerformed, 0);
  assert.equal(payload.linearMirrorIssue, 'CRE-1062');
  assert.match(payload.receiptPath, /trial-check\.json$/);
});

test('trial receipt fails closed when action writes or omits Linear mirror', () => {
  const manifest = readManifest();
  const profile = readProfile();
  const receipt = readTrialReceipt();
  receipt.action.writes = true;
  delete receipt.linearMirror;

  const errors = validateTrialReceipt(receipt, profile, manifest);
  assert.match(errors.join('\n'), /action\.writes must be false/);
  assert.match(errors.join('\n'), /Linear mirror/);
});
