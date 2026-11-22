import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertVerification, run, launchdPlist } from './canon-occurrence-runner.mjs';
const now = Date.parse('2026-11-24T15:00:00Z');
const identity = {
  identity_email: 'canon@example.com',
  event_id: 'event-1',
  starts_at: new Date(now).toISOString(),
  ends_at: new Date(now + 3600000).toISOString(),
  organizer_email: 'owner@halfdozen.co',
  meeting_url: 'https://zoom.us/j/123'
};
const verified = {
  ...identity,
  status: 'confirmed',
  verified_at: new Date(now).toISOString(),
  platform: 'zoom',
  selection_scope: 'halfdozen-guest-occurrence',
  invitation_verified: true,
  invited_emails: [identity.identity_email]
};
test('rejects canceled, moved, wrong identity, removed invitation, stale verification', () => {
  assert.doesNotThrow(() => assertVerification(identity, verified, now));
  for (const change of [
    { status: 'cancelled' },
    { starts_at: '2026-11-25T15:00:00Z' },
    { identity_email: 'other@example.com' },
    { invited_emails: [] },
    { verified_at: new Date(now - 61000).toISOString() }
  ])
    assert.throws(() => assertVerification(identity, { ...verified, ...change }, now));
});
test('verifies immediately before join, idempotent receipt, postcall requires join', () => {
  const dir = mkdtempSync(join(tmpdir(), 'canon-occurrence-'));
  try {
    const config = {
      ...identity,
      occurrenceId: 'test-1',
      stateDirectory: dir,
      verifyCommand: ['verify'],
      joinCommand: ['join'],
      postcallCommand: ['postcall']
    };
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify(config));
    const calls = [];
    const execute = (argv) => {
      calls.push(argv[0]);
      return verified;
    };
    assert.throws(
      () => run(path, 'postcall', { now: () => now + 4200000, execute }),
      /No verified selection/
    );
    run(path, 'join', { now: () => now, execute });
    assert.deepEqual(calls, ['verify', 'join']);
    assert.equal(run(path, 'join', { now: () => now, execute }).status, 'already-completed');
    run(path, 'postcall', { now: () => now + 4200000, execute });
    assert.deepEqual(calls, ['verify', 'join', 'postcall']);
    assert.ok(existsSync(join(dir, 'test-1.postcall.json')));
    assert.throws(() => run(path, 'join', { now: () => now + 366 * 86400000, execute }), /Outside/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('failure never invokes join or writes receipt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'canon-occurrence-'));
  try {
    const path = join(dir, 'config.json');
    writeFileSync(
      path,
      JSON.stringify({
        ...identity,
        occurrenceId: 'test',
        stateDirectory: dir,
        verifyCommand: ['verify'],
        joinCommand: ['join']
      })
    );
    const calls = [];
    assert.throws(() =>
      run(path, 'join', {
        now: () => now,
        execute: (argv) => {
          calls.push(argv[0]);
          return { ...verified, status: 'cancelled' };
        }
      })
    );
    assert.deepEqual(calls, ['verify']);
    assert.equal(existsSync(join(dir, 'test.join.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('plist has no RunAtLoad or KeepAlive and escapes argv', () => {
  const plist = launchdPlist({
    configPath: '/private/a&b.json',
    runnerPath: '/repo/runner.mjs',
    nodePath: '/bin/node',
    stage: 'join',
    config: { ...identity, occurrenceId: 'one' }
  });
  assert.match(plist, /a&amp;b.json/);
  assert.match(plist, /StartCalendarInterval/);
  assert.doesNotMatch(plist, /RunAtLoad|KeepAlive/);
});

test('verified selection permits postcall after join blocker; missing selection still blocks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'canon-occurrence-'));
  try {
    const config = {
      ...identity,
      occurrenceId: 'blocked',
      stateDirectory: dir,
      verifyCommand: ['verify'],
      joinCommand: ['join'],
      postcallCommand: ['postcall']
    };
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify(config));
    const calls = [];
    const execute = (argv) => {
      calls.push(argv[0]);
      if (argv[0] === 'join') throw Error('host admission blocker');
      return verified;
    };
    assert.throws(() => run(path, 'join', { now: () => now, execute }), /blocker/);
    assert.equal(existsSync(join(dir, 'blocked.join.json')), false);
    run(path, 'postcall', { now: () => now + 4200000, execute });
    assert.deepEqual(calls, ['verify', 'join', 'postcall']);
    assert.throws(
      () => run(path, 'postcall', { now: () => now + 366 * 86400000, execute }),
      /Outside/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
