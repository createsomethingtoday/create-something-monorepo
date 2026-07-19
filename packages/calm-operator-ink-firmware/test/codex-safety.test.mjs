import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/main.cpp', import.meta.url), 'utf8');

test('firmware exposes a physical two-step Codex confirmation surface', () => {
  assert.match(source, /enum class Screen[\s\S]*Codex/);
  assert.match(source, /\{"Operator", "Codex"\}/);
  assert.match(source, /CODEX_ARM_WINDOW_MS/);
  assert.match(source, /codexArmed/);
  assert.equal(source.includes('\\"confirmed\\":true'), true);
  assert.match(source, /CODEX ARMED/);
  assert.match(source, /B confirm/);
});

test('firmware sends only current bridge identifiers and contains no prompt text', () => {
  assert.match(source, /\/ink\/codex\?device_id=/);
  assert.match(source, /\/ink\/codex\/commands/);
  assert.match(source, /codexView\.taskId/);
  assert.match(source, /codexView\.actionId/);
  assert.doesNotMatch(source, /Continue with the recommended next step/);
  assert.doesNotMatch(source, /"text"\s*:/);
});

test('firmware polls terminal receipts and provides quiet-compatible visual states', () => {
  assert.match(source, /CODEX_RECEIPT_POLL_MS/);
  assert.match(source, /accepted/);
  assert.match(source, /rejected/);
  assert.match(source, /expired/);
  assert.match(source, /beepAccepted/);
  assert.match(source, /quietMode/);
});

test('firmware emits sanitized evidence for real physical selection and correlated receipts', () => {
  assert.match(source, /physical_select source=/);
  assert.match(source, /\[ink\]\[codex\] armed task=/);
  assert.match(source, /\[ink\]\[codex\] confirmed task=/);
  assert.match(source, /state=%s request=%s receipt=%s/);
  assert.match(source, /arm_expired/);
  assert.doesNotMatch(source, /\[ink\]\[codex\].*TOKEN/);
});
