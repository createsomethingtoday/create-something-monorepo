import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import policyOsStarter from '../extensions/policy-os-starter.js';

test('registers the Policy OS session signal and public command', () => {
  const events = new Map<string, (...args: unknown[]) => unknown>();
  const commands = new Map<string, unknown>();
  const api = {
    on(name: string, handler: (...args: unknown[]) => unknown) {
      events.set(name, handler);
    },
    registerCommand(name: string, command: unknown) {
      commands.set(name, command);
    },
    sendUserMessage() {}
  } as unknown as ExtensionAPI;

  policyOsStarter(api);

  assert.ok(events.has('session_start'));
  assert.ok(commands.has('policy-check'));
});
