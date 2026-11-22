import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  lstatSync,
  readdirSync
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepare, activate } from './canon-occurrence-install.mjs';
test('prepares private portable snapshot, remaps commands, includes assets, activation opt-in', () => {
  const temp = mkdtempSync(join(tmpdir(), 'canon-install-'));
  try {
    const root = join(temp, 'source');
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'scripts/canon-adapter.mjs'), '// fixture');
    mkdirSync(join(root, 'apps/create-something-scheduler/scripts/canon-local-capture'), {
      recursive: true
    });
    writeFileSync(
      join(root, 'apps/create-something-scheduler/scripts/canon-local-capture/control.html'),
      'human start'
    );
    mkdirSync(join(root, 'packages/agency/static/fonts'), { recursive: true });
    writeFileSync(
      join(root, 'packages/agency/static/fonts/agency-geist-latin.woff2'),
      'font fixture'
    );
    const configPath = join(temp, 'input.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        occurrenceId: 'one',
        starts_at: '2026-11-24T15:00:00Z',
        ends_at: '2026-11-24T16:00:00Z',
        verifyCommand: ['node', join(root, 'scripts/canon-adapter.mjs')],
        joinCommand: ['node'],
        postcallCommand: ['node']
      })
    );
    const destination = join(temp, 'snapshot');
    const receipt = prepare({ configPath, destination, root, copyDependencies: false });
    assert.equal(lstatSync(destination).mode & 0o077, 0);
    assert.equal(lstatSync(receipt.configPath).mode & 0o077, 0);
    assert.match(
      JSON.parse(readFileSync(receipt.configPath)).verifyCommand[1],
      /snapshot\/runtime\/scripts/
    );
    assert.equal(
      readFileSync(
        join(
          receipt.runtime,
          'apps/create-something-scheduler/scripts/canon-local-capture/control.html'
        ),
        'utf8'
      ),
      'human start'
    );
    assert.equal(
      readFileSync(
        join(receipt.runtime, 'packages/agency/static/fonts/agency-geist-latin.woff2'),
        'utf8'
      ),
      'font fixture'
    );
    const rollbackCalls = [];
    const rollbackDirectory = join(temp, 'RollbackAgents');
    assert.throws(
      () =>
        activate(receipt, {
          agentsDirectory: rollbackDirectory,
          execute: (command, args) => {
            rollbackCalls.push(args);
            return { status: args[0] === 'bootstrap' && rollbackCalls.length === 2 ? 1 : 0 };
          }
        }),
      /bootstrap failed/
    );
    assert.deepEqual(
      rollbackCalls.map((x) => x[0]),
      ['bootstrap', 'bootstrap', 'bootout', 'bootout']
    );
    assert.equal(readdirSync(rollbackDirectory).length, 0);
    const calls = [];
    activate(receipt, {
      agentsDirectory: join(temp, 'LaunchAgents'),
      execute: (...args) => {
        calls.push(args);
        return { status: 0 };
      }
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0][1][0], 'bootstrap');
    assert.throws(
      () => prepare({ configPath, destination, root, copyDependencies: false }),
      /must not exist/
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
