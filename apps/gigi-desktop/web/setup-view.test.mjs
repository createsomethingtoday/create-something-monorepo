import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceView, setupSummary } from './setup-view.mjs';

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
    label: 'Sign in again',
    description: 'Your connector session expired. Sign in again, then check source status.',
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
