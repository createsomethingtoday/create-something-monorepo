#!/usr/bin/env node
// Observational only: never returns a permission decision or logs tool arguments.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function summarizeHook(input) {
  const states = {
    SessionStart: 'starting',
    UserPromptSubmit: 'working',
    PreToolUse: 'working',
    PostToolUse: 'working',
    PermissionRequest: 'approval-required',
    Stop: 'response-finished',
    SessionEnd: 'disconnected'
  };
  const state =
    input.hook_event_name === 'Notification' && input.notification_type === 'idle_prompt'
      ? 'waiting-for-input'
      : states[input.hook_event_name];
  if (!state || typeof input.session_id !== 'string') return null;
  return {
    event: input.hook_event_name,
    state,
    sessionId: input.session_id,
    at: new Date().toISOString(),
    ...(input.hook_event_name === 'UserPromptSubmit' && typeof input.prompt === 'string'
      ? { promptHash: crypto.createHash('sha256').update(input.prompt).digest('hex') }
      : {})
  };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    const event = summarizeHook(JSON.parse(fs.readFileSync(0, 'utf8')));
    const dir = process.argv[2];
    if (event && dir) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      // Independent files avoid lost updates across simultaneous hooks.
      fs.writeFileSync(
        path.join(dir, `${Date.now()}-${crypto.randomUUID()}.json`),
        JSON.stringify(event),
        { mode: 0o600 }
      );
      const taskDir = path.dirname(dir);
      if (fs.existsSync(path.join(taskDir, 'task.json'))) {
        spawnSync(
          process.execPath,
          [
            fileURLToPath(new URL('./zellij-cockpit.mjs', import.meta.url)),
            'publish',
            '--id',
            path.basename(taskDir)
          ],
          {
            stdio: 'ignore',
            timeout: 2000
          }
        );
      }
    }
  } catch {
    /* Observability failure must not change Claude permission behavior. */
  }
}
