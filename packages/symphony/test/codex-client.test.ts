import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CodexAppServerClient } from '../src/codex-client.js';
import { MemoryLogger } from '../src/logger.js';
import type { CodexEvent, ServiceConfig } from '../src/types.js';

const fixturePath = resolve(process.cwd(), 'test/fixtures/fake-app-server.mjs');

function shellQuote(value: string): string {
  return JSON.stringify(value);
}

function createConfig(command: string): ServiceConfig {
  return {
    workflow_path: '/tmp/WORKFLOW.md',
    tracker: {
      kind: 'linear',
      endpoint: 'https://api.linear.app/graphql',
      api_key: 'linear-token',
      project_slug: 'repo',
      active_states: ['Todo'],
      terminal_states: ['Done'],
      network_timeout_ms: 30_000,
      page_size: 50,
    },
    polling: { interval_ms: 30_000 },
    workspace: { root: '/tmp/symphony' },
    hooks: {
      after_create: null,
      before_run: null,
      after_run: null,
      before_remove: null,
      timeout_ms: 60_000,
    },
    agent: {
      max_concurrent_agents: 1,
      max_turns: 20,
      max_retry_backoff_ms: 300_000,
      max_concurrent_agents_by_state: {},
    },
    codex: {
      command,
      approval_policy: 'never',
      thread_sandbox: 'danger-full-access',
      turn_sandbox_policy: { type: 'dangerFullAccess' },
      turn_timeout_ms: 5_000,
      read_timeout_ms: 5_000,
      stall_timeout_ms: 5_000,
    },
    server: { port: null },
  };
}

describe('codex app-server client', () => {
  it('runs the startup handshake and completes a streamed turn', async () => {
    const events: CodexEvent[] = [];
    const client = new CodexAppServerClient({
      config: createConfig(`node ${shellQuote(fixturePath)} normal`),
      cwd: process.cwd(),
      logger: new MemoryLogger(),
      on_event: (event) => events.push(event),
    });

    const session = await client.start_session();
    expect(session.thread_id).toBe('thread-1');

    const result = await client.run_turn('Work', 'ABC-1: Demo');
    expect(result.turn_id).toBe('turn-1');
    expect(result.text).toContain('Working in progress');
    expect(events.some((event) => event.event === 'session_started')).toBe(true);
    expect(events.some((event) => event.usage?.total_tokens === 12)).toBe(true);

    await client.close();
  });

  it('auto-approves requests and rejects unsupported tool calls without stalling', async () => {
    const events: CodexEvent[] = [];
    const client = new CodexAppServerClient({
      config: createConfig(`node ${shellQuote(fixturePath)} approval-tool`),
      cwd: process.cwd(),
      logger: new MemoryLogger(),
      on_event: (event) => events.push(event),
    });

    await client.start_session();
    const result = await client.run_turn('Work', 'ABC-2: Demo');
    expect(result.status).toBe('completed');
    expect(events.some((event) => event.event === 'approval_auto_approved')).toBe(true);
    expect(events.some((event) => event.event === 'unsupported_tool_call')).toBe(true);
    await client.close();
  });

  it('fails unattended turns when user input is requested', async () => {
    const client = new CodexAppServerClient({
      config: createConfig(`node ${shellQuote(fixturePath)} user-input`),
      cwd: process.cwd(),
      logger: new MemoryLogger(),
    });

    await client.start_session();
    await expect(client.run_turn('Work', 'ABC-3: Demo')).rejects.toMatchObject({
      code: 'turn_input_required',
    });
    await client.close();
  });
});
