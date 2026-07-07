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
const EXPECTED_ISSUE = 'CRE-1070';
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
    evidenceTarget: 'Linear CRE-1070',
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
    evidenceTarget: 'Linear CRE-1070',
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
