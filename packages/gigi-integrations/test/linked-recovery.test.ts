import assert from 'node:assert/strict';
import test from 'node:test';
import { recoverStaleLinked, type AccountScan, type DeploymentReceipt, type LinkedAttempt,
  type RecoveryInput, type RecoveryPorts, type ScanKind } from '../worker/linked-recovery.ts';

const row: LinkedAttempt = {
  subject: 'owner-subject', provider: 'gmail', request_id: 'request-old', status: 'linked',
  connected_account_id: 'ca_lb1WbyU07_b-', reconnectable: 0,
  redirect_url: 'https://connect.composio.dev/session/old',
  expires_at: '2026-09-30T15:01:57.505Z', created_at: '2026-09-30T14:51:57.225Z',
};
const old = 'ac_s2YEkh21bMT8';
const current = 'ac_qXoEQURadG-h';
const control = 'ca_BlstebUrbBn_';
const scopes = [
  'userinfo.profile', 'userinfo.email', 'contacts.readonly', 'contacts.other.readonly',
  'profile.language.read', 'user.addresses.read', 'user.birthday.read', 'user.emails.read',
  'user.phonenumbers.read', 'profile.emails.read',
].map((suffix) => 'https://www.googleapis.com/auth/' + suffix).concat('https://mail.google.com/');
const deployment: DeploymentReceipt = {
  accountId: '9645bd52e640b8a4f40a3a55ff1dd75a',
  deploymentId: '2c9066a0-b7a5-4f1d-a7c7-d1c3b420f027',
  deployedAt: '2026-09-30T12:33:59.563454Z',
  versionId: 'e6c10c86-94ae-44ae-9a2d-7fdd8fc9fc90', percentage: 100,
  gmailConfigId: old, gmailScopes: 'https://www.googleapis.com/auth/gmail.readonly',
  databaseId: 'bcefe77e-d4b7-4d70-9002-1f969eef3457',
  completeHistory: true, coversAttemptCreation: true,
};
const input: RecoveryInput = {
  subject: row.subject, provider: 'gmail', requestId: row.request_id, accountId: row.connected_account_id!,
  oldAuthConfigId: old, operator: 'Micah', reason: 'Expired removed-config consent',
};
function fixture(overrides: Partial<RecoveryPorts> = {}) {
  let now = Date.parse('2026-10-02T00:00:00Z');
  const calls: string[] = [];
  const ports: RecoveryPorts = {
    now: () => now,
    readRecoveryFence: async () => true,
    readInsertFence: async () => true,
    readAttemptHistory: async () => [{ ...row }],
    wait: async (ms) => { now += ms; calls.push('wait'); },
    readAttempt: async () => { calls.push('d1'); return { ...row }; },
    readDeployment: async () => { calls.push('deployment'); return { ...deployment }; },
    getAuthConfig: async (id) => { calls.push('config:' + id);
      return id === old ? { status: 404 } : { status: 200, id: current, toolkitSlug: 'gmail',
        authScheme: 'OAUTH2', isComposioManaged: true, state: 'ENABLED', scopes }; },
    getAccount: async (id) => { calls.push('account:' + id);
      return id === control ? { status: 200, account: { id: control, user_id: 'playground-user',
        auth_config: { id: current } } } : { status: 404 }; },
    scanAccounts: async (kind) => { calls.push('scan:' + kind);
      return { status: 200, items: [], complete: true, pages: 1 }; },
    beforeWrite: async () => { calls.push('receipt'); },
    conditionalUpdate: async () => { calls.push('write'); return { changes: 1 }; },
    ...overrides,
  };
  return { ports, calls };
}
test('removed old config can be proved through pinned live deployment and project controls', async () => {
  const f = fixture();
  const result = await recoverStaleLinked(input, f.ports);
  assert.equal(result.outcome, 'eligible_preview');
  assert.equal(result.evidence?.sourceCommit, '1e0decc916');
  assert.equal(result.evidence?.oldAuthConfigStatus, 404);
  assert.equal(result.evidence?.checks.length, 2);
  assert.equal(f.calls.filter((call) => call === 'scan:project').length, 2);
  assert.equal(f.calls.includes('write'), false);
  assert.ok(!JSON.stringify(result).includes(row.redirect_url!));
});
test('apply syncs receipt before exact CAS; changed D1 or zero-row CAS fails', async () => {
  const f = fixture();
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, f.ports)).outcome, 'released');
  assert.ok(f.calls.indexOf('receipt') < f.calls.indexOf('write'));
  assert.equal(f.calls.filter((call) => call === 'deployment').length, 2);
  let reads = 0;
  const changed = fixture({ readAttempt: async () => ++reads === 1 ? { ...row } : { ...row, status: 'active' } });
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, changed.ports)).reason, 'd1_changed');
  const zero = fixture({ conditionalUpdate: async () => ({ changes: 0 }) });
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, zero.ports)).reason, 'write_not_exactly_one');
});
test('historical deployment must prove exact pin, D1, 100 percent rollout and creation coverage', async () => {
  for (const invalid of [
    { ...deployment, gmailConfigId: current },
    { ...deployment, databaseId: 'wrong' },
    { ...deployment, percentage: 50 },
    { ...deployment, completeHistory: false },
    { ...deployment, coversAttemptCreation: false },
  ]) {
    const f = fixture({ readDeployment: async () => invalid });
    assert.equal((await recoverStaleLinked({ ...input, apply: true }, f.ports)).reason,
      'historical_deployment_unverified');
    assert.equal(f.calls.includes('write'), false);
  }
});
test('reviewed target account and creation timestamp are hard-pinned', async () => {
  const other = fixture();
  assert.equal((await recoverStaleLinked({ ...input, accountId: 'ca_other' }, other.ports)).reason,
    'invalid_or_unreviewed_input');
  const wrongTime = fixture({ readAttempt: async () => ({ ...row, created_at: '2026-09-30T14:51:58.225Z' }) });
  assert.equal((await recoverStaleLinked(input, wrongTime.ports)).reason, 'd1_not_exact_linked');
});
test('wrong current project, positive control, and removed-config status fail closed', async () => {
  const invalidConfig = fixture({ getAuthConfig: async (id) => id === old ? { status: 404 } :
    { status: 200, id: current, toolkitSlug: 'gmail', authScheme: 'OAUTH2',
      isComposioManaged: true, state: 'ENABLED', scopes: scopes.slice(1) } });
  assert.equal((await recoverStaleLinked(input, invalidConfig.ports)).reason, 'current_project_control_invalid');
  const oldLive = fixture({ getAuthConfig: async () => ({ status: 200 }) });
  assert.equal((await recoverStaleLinked(input, oldLive.ports)).reason, 'old_config_not_removed');
  const noControl = fixture({ getAccount: async () => ({ status: 404 }) });
  assert.equal((await recoverStaleLinked(input, noControl.ports)).reason, 'known_account_control_invalid');
});
test('every owner/old/combined/project scan must be complete and must exclude target', async () => {
  for (const kind of ['owner', 'old_config', 'combined', 'project'] as const) {
    const incomplete = fixture({ scanAccounts: async (seen) => ({ status: 200, items: [],
      complete: seen !== kind, pages: 1 }) });
    assert.equal((await recoverStaleLinked(input, incomplete.ports)).outcome, 'blocked');
    const target = fixture({ scanAccounts: async (seen) => ({ status: 200, complete: true, pages: 1,
      items: seen === kind ? [{ id: 'ca_lb1WbyU07_b-', user_id: 'gigi_owner', auth_config: { id: old } }] : [] }) });
    assert.equal((await recoverStaleLinked(input, target.ports)).outcome, 'blocked');
  }
});
test('creation time, expiry, provider resurrection, spacing and receipt availability are hard gates', async () => {
  const young = fixture({ now: () => Date.parse('2026-09-30T14:00:00Z') });
  assert.equal((await recoverStaleLinked(input, young.ports)).reason, 'attempt_time_invalid');
  const unexpired = fixture({ readAttempt: async () => ({ ...row, expires_at: '2026-10-03T00:00:00Z' }) });
  assert.equal((await recoverStaleLinked(input, unexpired.ports)).reason, 'consent_not_expired');
  let gets = 0;
  const resurrected = fixture({ getAccount: async (id) => id === control ?
    { status: 200, account: { id: control, user_id: 'playground', auth_config: { id: current } } } :
    { status: ++gets === 1 ? 404 : 200 } });
  assert.equal((await recoverStaleLinked(input, resurrected.ports)).reason, 'exact_get_not_404');
  const close = fixture({ wait: async () => undefined });
  assert.equal((await recoverStaleLinked(input, close.ports)).reason, 'checks_too_close');
  const noReceipt = fixture({ beforeWrite: undefined });
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, noReceipt.ports)).reason,
    'prewrite_receipt_required');
});

test('recovery requires durable exact-row fence and rechecks it before release', async () => {
  const missing = fixture({ readRecoveryFence: undefined });
  assert.equal((await recoverStaleLinked(input, missing.ports)).reason, 'recovery_fence_unverified');
  assert.equal(missing.calls.includes('write'), false);
  const wrong = fixture({ readRecoveryFence: async () => false });
  assert.equal((await recoverStaleLinked(input, wrong.ports)).reason, 'recovery_fence_unverified');
  let checks = 0;
  const removed = fixture({ readRecoveryFence: async () => ++checks === 1 });
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, removed.ports)).reason, 'recovery_fence_changed');
  assert.equal(removed.calls.includes('write'), false);
});

test('expired recovery can proceed before 24 hours only with verified legacy-insert protection', async () => {
  let earlyNow = Date.parse('2026-09-30T20:00:00Z');
  const early = fixture({ now: () => earlyNow, wait: async (ms) => { earlyNow += ms; }, readInsertFence: async () => true });
  assert.equal((await recoverStaleLinked(input, early.ports)).outcome, 'eligible_preview');
  const absent = fixture({ readInsertFence: undefined });
  assert.equal((await recoverStaleLinked(input, absent.ports)).reason, 'legacy_insert_fence_unverified');
  assert.equal(absent.calls.includes('write'), false);
});

test('changed legacy insertion protection blocks release without a write', async () => {
  let checks = 0;
  const changed = fixture({ readInsertFence: async () => ++checks === 1 });
  assert.equal((await recoverStaleLinked({ ...input, apply: true }, changed.ports)).reason, 'legacy_insert_fence_changed');
  assert.equal(changed.calls.includes('write'), false);
});

test('an ambiguous earlier provider POST keeps recovery guarded despite schema protection', async () => {
  const uncertain = fixture({ readAttemptHistory: async () => [{ ...row }, { ...row,
    request_id: 'earlier-uncertain', status: 'attention', reconnectable: 1, connected_account_id: null }] });
  assert.equal((await recoverStaleLinked(input, uncertain.ports)).reason, 'owner_attempt_history_ambiguous');
  assert.equal(uncertain.calls.includes('write'), false);
});
