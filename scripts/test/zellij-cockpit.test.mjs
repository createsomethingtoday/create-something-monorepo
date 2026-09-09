import assert from 'node:assert/strict';
import test from 'node:test';
import { exactPane, hash, taskPath, normalizePrompt } from '../zellij-cockpit.mjs';
import { summarizeHook } from '../zellij-cockpit-hook.mjs';

test('exact worker refuses disappearance, plugins, exited and held panes', () => {
  const task = { paneId: 0 };
  assert.equal(exactPane(task, [{ id: 0 }]).id, 0);
  for (const panes of [
    [{ id: 1 }],
    [{ id: 0, is_plugin: true }],
    [{ id: 0, exited: true }],
    [{ id: 0, is_held: true }]
  ]) {
    assert.throws(() => exactPane(task, panes));
  }
});
test('task storage cannot escape its root', () => {
  for (const id of ['../secret', '/tmp/a', '', 'a/b']) assert.throws(() => taskPath(id));
  assert.match(taskPath('CRE-1975'), /tasks\/CRE-1975$/);
});
test('hook receipt confirms prompt hash without retaining sensitive content', () => {
  const receipt = summarizeHook({
    hook_event_name: 'UserPromptSubmit',
    session_id: 'abc',
    prompt: 'private text',
    tool_input: { secret: 'secret' }
  });
  assert.equal(receipt.promptHash, hash('private text'));
  assert.equal(receipt.state, 'working');
  assert.equal(JSON.stringify(receipt).includes('private text'), false);
  assert.equal(JSON.stringify(receipt).includes('secret'), false);
});
test('permission observation never grants permission and stop does not claim verified completion', () => {
  const permission = summarizeHook({ hook_event_name: 'PermissionRequest', session_id: 'abc' });
  assert.equal(permission.state, 'approval-required');
  assert.equal(permission.decision, undefined);
  assert.equal(permission.hookSpecificOutput, undefined);
  assert.equal(
    summarizeHook({ hook_event_name: 'Stop', session_id: 'abc' }).state,
    'response-finished'
  );
  assert.equal(summarizeHook({ hook_event_name: 'MadeUp', session_id: 'abc' }), null);
});

test('managed Claude process identity survives only the intended conversation', () => {
  const task = { paneId: 0, claudeSessionId: 'conversation-a' };
  assert.throws(
    () => exactPane(task, [{ id: 0, terminal_command: 'claude --session-id conversation-b' }]),
    /identity changed/
  );
  assert.equal(
    exactPane(task, [{ id: 0, terminal_command: 'claude --session-id conversation-a' }]).id,
    0
  );
});

test('file transport normalizes CRLF and trailing newlines without flattening paragraphs', () => {
  assert.equal(normalizePrompt('first\r\n\r\nsecond\r\n'), 'first\n\nsecond');
});
