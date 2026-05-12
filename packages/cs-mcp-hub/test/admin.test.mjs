import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAdminArgs } from '../dist/admin.js';

test('parseAdminArgs returns null when there are no admin tokens (server mode)', () => {
  assert.equal(parseAdminArgs([]), null);
});

test('parseAdminArgs recognizes --status', () => {
  const result = parseAdminArgs(['--status']);
  assert.ok(result);
  assert.equal(result.status, true);
  assert.equal(result.help, false);
});

test('parseAdminArgs collects multiple bundle/server toggles', () => {
  const result = parseAdminArgs([
    '--enable-bundle', 'core',
    '--enable-bundle', 'ops',
    '--disable-server', 'cs-telemetry',
  ]);
  assert.deepEqual(result.enableBundles, ['core', 'ops']);
  assert.deepEqual(result.disableServers, ['cs-telemetry']);
});

test('parseAdminArgs --write-codex and --no-write-codex toggle explicit flag', () => {
  const writeOn = parseAdminArgs(['--write-codex']);
  assert.equal(writeOn.writeCodex, true);
  assert.equal(writeOn.writeCodexExplicit, true);

  const writeOff = parseAdminArgs(['--no-write-codex']);
  assert.equal(writeOff.writeCodex, false);
  assert.equal(writeOff.writeCodexExplicit, true);
});

test('parseAdminArgs --help sets help and admin mode', () => {
  const result = parseAdminArgs(['--help']);
  assert.ok(result);
  assert.equal(result.help, true);
});

test('parseAdminArgs throws on missing value for flag', () => {
  assert.throws(() => parseAdminArgs(['--enable-bundle']), /Missing value for --enable-bundle/);
});

test('parseAdminArgs throws on unknown flag', () => {
  assert.throws(() => parseAdminArgs(['--frobnicate']), /Unknown argument: --frobnicate/);
});

test('parseAdminArgs supports -h alias', () => {
  const result = parseAdminArgs(['-h']);
  assert.ok(result);
  assert.equal(result.help, true);
});
