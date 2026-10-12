import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceView, setupSummary, sourceJourney, sourceErrorMessage } from './setup-view.mjs';

test('source feedback names the verified account state and keeps import separate', () => {
  assert.deepEqual(sourceView({ state: 'connected', connectedAccountId: 'acct-1' }), {
    label: 'Account verified',
    description: 'Account verified. Import records when you are ready.',
  });
  assert.deepEqual(sourceView({ state: 'pending', provider: 'gmail', connectedAccountId: 'acct-1' }), {
    label: 'Consent pending',
    description: 'Finish consent in your browser, then check status and verify the account.',
  });
});

test('source feedback explains a session refresh without asking for another connection', () => {
  assert.deepEqual(sourceView({ state: 'unavailable', detail: 'refresh_in_progress' }), {
    label: 'Checking session',
    description: 'The connector is refreshing your session. Wait a moment, then check status again.',
  });
  assert.deepEqual(sourceView({ state: 'attention', detail: 'refresh_outcome_unknown' }), {
    label: 'Check status',
    description: 'The session refresh outcome is uncertain. Check status before trying to connect again.',
  });
});

test('source feedback gives sign-in recovery without exposing connector codes', () => {
  assert.deepEqual(sourceView({ state: 'unavailable', detail: 'reauthentication_required' }), {
    label: 'Sign in needed',
    description: 'Sign in to GiGi sources, then check source status.',
  });
  assert.deepEqual(sourceView({ state: 'attention', detail: 'unauthorized' }), {
    label: 'Sign in needed',
    description: 'Sign in to the source account, then check status before retrying.',
  });
});

test('setup summary gives a next step from receipts without upgrading agent or phone proof', () => {
  const summary = setupSummary({
    workspace: { name: 'Danny’s work' },
    sources: { gmail: { state: 'connected', connectedAccountId: 'acct-1' }, googlecalendar: { state: 'pending' } },
    agentReceipt: { prepared: true, phoneVerified: false },
  });
  assert.equal(summary.nextStep, 'Finish Google Calendar consent, then verify the account.');
  assert.equal(summary.steps[1].label, '1 of 2 verified');
  assert.equal(summary.steps[2].label, 'Prepared · Not verified');
  assert.equal(summary.steps[3].label, 'Needs device test');

  const used = setupSummary({
    workspace: { name: 'Danny’s work' },
    sources: { gmail: { state: 'connected' }, googlecalendar: { state: 'connected' } },
    agentReceipt: { prepared: true, lastCall: { tool: 'workspace.get', lastToolAt: 1 }, phoneVerified: false },
  });
  assert.equal(used.steps[2].label, 'Local tool used · Phone unverified');
  assert.equal(used.nextStep, 'Confirm the tool result in your agent, then test phone access separately if needed.');
});

test('summary directs uncertain refresh outcomes to status recovery alongside its card', () => {
  const sources = { gmail: { state: 'unavailable', detail: 'refresh_outcome_unknown' }, googlecalendar: { state: 'connected' } };
  const summary = setupSummary({ workspace: { name: 'Synthetic' }, sources });
  assert.match(summary.nextStep, /Check source status before trying to connect again/);
  assert.match(summary.steps[1].description, /refresh outcome is uncertain/i);
  assert.equal(summary.steps[1].label, '1 of 2 verified');
});


test('admission, session expiry and service failures have distinct next steps', () => {
  assert.match(sourceView({ state: 'unavailable', detail: 'session_expired' }).description, /Sign in to GiGi sources/);
  assert.match(sourceView({ state: 'unavailable', detail: 'access_denied' }).description, /operator/);
  assert.doesNotMatch(sourceView({ state: 'unavailable', detail: 'access_denied' }).description, /Sign in again/);
  assert.match(sourceView({ state: 'unavailable', detail: 'provider_unavailable' }).description, /Check status later/);
});

test('source journey advances only from receipts and preserves pending consent', () => {
  assert.equal(sourceJourney({}).current, 1);
  assert.equal(sourceJourney({ gmail: { state: 'disconnected' } }).current, 2);
  assert.equal(sourceJourney({ gmail: { state: 'pending', provider: 'gmail', connectedAccountId: 'ca_one', url: 'https://connect.composio.dev/session', expiresAt: '2030-01-01T00:00:00Z' } }).current, 3);
  assert.equal(sourceJourney({ gmail: { state: 'pending' } }).current, 4);
  assert.equal(sourceJourney({ gmail: { state: 'connected', connectedAccountId: 'ca_one' } }).current, 5);
  assert.match(sourceJourney({ gmail: { state: 'unavailable', detail: 'access_denied' } }).next, /operator/);
});


test('journey directs each guarded recovery to its available action', () => {
  assert.match(sourceJourney({ gmail: { state: 'attention', recovery: 'operator_review' } }).next, /operator to review/);
  assert.match(sourceJourney({ gmail: { state: 'attention', reconnectable: true } }).next, /Choose Reconnect/);
  assert.equal(sourceJourney({ gmail: { state: 'attention', reconnectable: true } }).current, 2);
  assert.match(sourceJourney({ gmail: { state: 'pending' } }).next, /Check status and verify/);
  assert.doesNotMatch(sourceJourney({ gmail: { state: 'pending' } }).next, /Resume/);
});


for (const detail of ['journal_unavailable', 'link_outcome_unknown', 'connection_changed', 'connection_not_found', 'invalid_readback']) {
  test(`source recovery card gives a guarded next action for ${detail}`, () => {
    const source = { state: 'unavailable', detail };
    assert.match(sourceView(source).description, /Check status/);
    assert.doesNotMatch(sourceView(source).description, /account ID|Try again later/);
    assert.match(sourceJourney({ gmail: source }).next, /Check status/);
    assert.match(setupSummary({ workspace: { name: 'Synthetic' }, sources: { gmail: source } }).nextStep, /Check status/);
  });
}

for (const code of ['browser_unavailable', 'loopback_unavailable', 'identity_contract_mismatch', 'redirect_registration_mismatch', 'identity_mismatch', 'invalid_token_readback']) {
  test(`sign-in recovery explains ${code} without exposing technical codes`, () => {
    const copy = sourceErrorMessage(code);
    assert.equal(typeof copy, 'string');
    assert.doesNotMatch(copy, /_|account ID|password|disable/i);
    assert.match(copy, /browser|GiGi operator|Sign in to GiGi sources/);
  });
}
test('unknown source errors are not interpolated by the fixed recovery map', () => {
  for (const code of ['SECRET https://private.test', 'constructor', 'toString', '__proto__', undefined]) assert.equal(sourceErrorMessage(code), undefined);
});
