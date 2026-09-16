import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function run({ confirmed = false, mismatch = false, unset = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'app-review-smoke-'));
  try {
    writeFileSync(join(dir, 'curl'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const rpc = JSON.parse(args[args.indexOf('-d')+1]);
fs.appendFileSync(process.env.CALLS_FILE, JSON.stringify(rpc.params)+'\\n');
const reading = rpc.params.arguments.proxyToolName.endsWith('__app_review_get_review_context');
const payload = reading ? {ok:true,data:{context:{versionId:process.env.MISMATCH === 'true' ? 'recOther' : 'recVersion',reviewStatus:process.env.UNSET === 'true' ? null : '❌Rejected'}}} : {ok:true,data:{}};
console.log(JSON.stringify({jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:JSON.stringify(payload)}]}}));
`, { mode: 0o755 });
    const callsFile = join(dir, 'calls.jsonl');
    writeFileSync(callsFile, '');
    const result = spawnSync('bash', [resolve('scripts/webflow-app-review-phase-b-smoke.sh')], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, REVIEWER: 'shea', ACTION: 'set_review_status', VERSION_ID: 'recVersion', REVIEW_STATUS: '🏃🏾In Review', CONFIRM_STATUS_CHANGE: String(confirmed), CS_HUB_WF_APP_REVIEW_SHEA_API_TOKEN: 'test-only', CALLS_FILE: callsFile, MISMATCH: String(mismatch), UNSET: String(unset) },
    });
    const calls = readFileSync(callsFile, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    return { result, calls };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('status smoke requires explicit opt-in before any network request', () => {
  const { result, calls } = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONFIRM_STATUS_CHANGE=true/);
  assert.deepEqual(calls, []);
});
for (const unset of [false, true]) test(`status smoke reads fresh context before confirming write (unset=${unset})`, () => {
  const { result, calls } = run({ confirmed: true, unset });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls.length, 2);
  assert.match(calls[0].arguments.proxyToolName, /__app_review_get_review_context$/);
  assert.deepEqual(calls[1].arguments.args, {version_id:'recVersion',review_status:'🏃🏾In Review',status_change:{confirmed:true,expected_status:unset ? null : '❌Rejected'}});
});
test('status smoke refuses a mismatched context before writing', () => {
  const { result, calls } = run({ confirmed: true, mismatch: true });
  assert.notEqual(result.status, 0);
  assert.equal(calls.length, 1);
});
