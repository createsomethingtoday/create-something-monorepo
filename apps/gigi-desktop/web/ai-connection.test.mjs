import test from 'node:test';
import assert from 'node:assert/strict';
import { aiConnectionView } from './ai-connection.mjs';

test('unapproved app-owned connection cannot advertise active sign-in', () => {
  const view = aiConnectionView();
  assert.match(view, /<button[^>]*disabled/);
  assert.match(view, /Not available in this build/);
  assert.match(view, /installed Codex connection/);
  assert.doesNotMatch(view, /data-(?:action|auth|login|chatgpt)|href=|onclick=/);
});

test('renderer input cannot override admission or inject connection content', () => {
  const view = aiConnectionView({ approved: true, account: '<script>token</script>' });
  assert.equal(view, aiConnectionView());
  assert.doesNotMatch(view, /<script>|token/);
  assert.match(view, /source sign-in and Google or Instagram permissions remain separate/);
});
