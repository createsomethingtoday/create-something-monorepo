import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadChecks } from '../dist/checks/load.js';
import { evaluateCheck } from '../dist/checks/eval.js';

test('loadChecks loads checks.toml entries', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const dir = join(cwd, '.judgment');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'checks.toml'),
      `
[[checks]]
id = "signal_low"
enabled = true
server = "notion"
tool = "query_database"
args_json = "{\\"database_id\\":\\"abc\\"}"
value_path = "value.score"
operator = "lt"
target = 10
severity = "high"
cooldown_minutes = 15
notify_channel = "console"
allow_auto_write = false
`,
      'utf-8'
    );

    const loaded = loadChecks(cwd);
    assert.equal(loaded.checks.length, 1);
    assert.equal(loaded.checks[0].id, 'signal_low');
    assert.equal(loaded.checks[0].server, 'notion');
    assert.equal(loaded.checks[0].operator, 'lt');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('evaluateCheck compares extracted values deterministically', () => {
  const check = {
    id: 'signal_low',
    enabled: true,
    server: 'notion',
    tool: 'query_database',
    argsJson: '{}',
    valuePath: 'value.score',
    operator: 'lt',
    target: 10,
    severity: 'high',
    cooldownMinutes: 60,
    notifyChannel: 'console',
    allowAutoWrite: false
  };

  const triggered = evaluateCheck(check, { value: { score: 8 } });
  assert.equal(triggered.extracted, true);
  assert.equal(triggered.triggered, true);

  const notTriggered = evaluateCheck(check, { value: { score: 12 } });
  assert.equal(notTriggered.extracted, true);
  assert.equal(notTriggered.triggered, false);
});

