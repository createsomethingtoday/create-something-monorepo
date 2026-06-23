import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyStatus,
  decideSoloPosture,
  parseArgs,
  parseDivergence,
} from '../agent-solo-loop.mjs';

test('parseArgs supports solo-loop flags', () => {
  const options = parseArgs(['node', 'scripts/agent-solo-loop.mjs', '--', '--json', '--check', '--strict']);

  assert.equal(options.json, true);
  assert.equal(options.check, true);
  assert.equal(options.strict, true);
});

test('classifyStatus counts staged, unstaged, and untracked changes', () => {
  const status = classifyStatus([' M docs/a.md', 'M  scripts/b.mjs', 'MM package.json', '?? notes.md'].join('\n'));

  assert.equal(status.clean, false);
  assert.equal(status.total, 4);
  assert.equal(status.staged, 2);
  assert.equal(status.unstaged, 2);
  assert.equal(status.untracked, 1);
});

test('parseDivergence reads ahead and behind counts', () => {
  assert.deepEqual(parseDivergence('## main...origin/main [ahead 2, behind 5]'), {
    ahead: 2,
    behind: 5,
  });
  assert.deepEqual(parseDivergence('## main...origin/main'), { ahead: 0, behind: 0 });
});

test('decideSoloPosture allows dirty current-checkout work unless strict', () => {
  const status = classifyStatus(' M docs/a.md\n');
  const divergence = { ahead: 0, behind: 1 };

  const relaxed = decideSoloPosture({ status, divergence, strict: false });
  assert.equal(relaxed.ok, true);
  assert.equal(relaxed.warnings.length, 2);

  const strict = decideSoloPosture({ status, divergence, strict: true });
  assert.equal(strict.ok, false);
});
