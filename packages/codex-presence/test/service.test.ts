import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  createEvenTerminalExecutor,
  startPresenceServer,
  transcribeAudio
} from '../src/index';

describe('Codex Presence service', () => {
  it('authenticates card reads and emits idempotent action receipts', async () => {
    const codexHome = await workingCodexHome();
    const executed: unknown[] = [];
    const service = await startPresenceServer({
      token: 'presence-secret',
      codexHome,
      actionExecutor: async (request) => {
        executed.push(request);
        return { upstreamStatus: 202 };
      }
    });
    try {
      assert.equal((await fetch(`${service.origin}/v1/cards`)).status, 401);
      const cardsResponse = await fetch(`${service.origin}/v1/cards`, {
        headers: { authorization: 'Bearer presence-secret' }
      });
      assert.equal(cardsResponse.status, 200);
      const cards = await cardsResponse.json() as {
        cards: Array<{ taskId: string; state: string; actions: Array<{ id: string; type: string }> }>
      };
      assert.deepEqual(cards.cards.map((card) => [card.taskId, card.state]), [['thread-live', 'working']]);

      const body = {
        requestId: 'action-1',
        actionId: cards.cards[0]!.actions.find((action) => action.type === 'interrupt')!.id,
        taskId: 'thread-live',
        type: 'interrupt',
        confirmed: true
      };
      const first = await postJson(`${service.origin}/v1/actions`, body, 'presence-secret');
      const replay = await postJson(`${service.origin}/v1/actions`, body, 'presence-secret');
      assert.equal(first.response.status, 202);
      assert.equal(first.json.status, 'accepted');
      assert.deepEqual(replay.json, first.json);
      assert.equal(executed.length, 1);
    } finally {
      await service.close();
    }
  });

  it('fails closed for unconfirmed, unsupported, and state-mismatched actions', async () => {
    const service = await startPresenceServer({ token: 'secret', codexHome: await workingCodexHome() });
    try {
      const cards = await fetch(`${service.origin}/v1/cards`, {
        headers: { authorization: 'Bearer secret' }
      }).then((response) => response.json()) as {
        cards: Array<{ actions: Array<{ id: string; type: string }> }>
      };
      const interruptId = cards.cards[0]!.actions.find((action) => action.type === 'interrupt')!.id;
      const unconfirmed = await postJson(`${service.origin}/v1/actions`, {
        requestId: 'unconfirmed', actionId: interruptId, taskId: 'thread-live', type: 'interrupt'
      }, 'secret');
      const unsupported = await postJson(`${service.origin}/v1/actions`, {
        requestId: 'unsupported', actionId: 'stale-approval', taskId: 'thread-live', type: 'approve', confirmed: true
      }, 'secret');
      assert.equal(unconfirmed.response.status, 409);
      assert.equal(unsupported.response.status, 409);
    } finally {
      await service.close();
    }
  });

  it('records an upstream rejection once and replays the same failed receipt', async () => {
    let executions = 0;
    const service = await startPresenceServer({
      token: 'secret',
      codexHome: await workingCodexHome(),
      actionExecutor: async () => {
        executions += 1;
        throw new Error('Upstream rejected the action.');
      }
    });
    try {
      const cards = await fetch(`${service.origin}/v1/cards`, {
        headers: { authorization: 'Bearer secret' }
      }).then((response) => response.json()) as {
        cards: Array<{ actions: Array<{ id: string; type: string }> }>
      };
      const actionId = cards.cards[0]!.actions.find((action) => action.type === 'follow_up')!.id;
      const body = {
        requestId: 'upstream-rejection',
        actionId,
        taskId: 'thread-live',
        type: 'follow_up',
        text: 'Continue.'
      };
      const first = await postJson(`${service.origin}/v1/actions`, body, 'secret');
      const replay = await postJson(`${service.origin}/v1/actions`, body, 'secret');
      assert.equal(first.response.status, 502);
      assert.equal(first.json.status, 'rejected');
      assert.deepEqual(replay.json, first.json);
      assert.equal(executions, 1);
    } finally {
      await service.close();
    }
  });
});

describe('Codex Presence external adapters', () => {
  it('routes a follow-up through a live-shaped Even Terminal receipt without exposing its token', async () => {
    const instancesDir = await mkdtemp(join(tmpdir(), 'even-terminal-'));
    await writeFile(join(instancesDir, `${process.pid}.json`), JSON.stringify({
      pid: process.pid,
      port: 3456,
      token: 'terminal-secret',
      startedAt: '2026-07-17T05:00:00Z'
    }));
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const executor = createEvenTerminalExecutor({
      instancesDir,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init });
        return new Response(JSON.stringify({ ok: true, sessionId: 'thread-live' }), { status: 202 });
      }
    });

    const result = await executor({
      requestId: 'follow-up-1',
      actionId: 'thread-live:follow_up:complete:1',
      taskId: 'thread-live',
      type: 'follow_up',
      text: 'Continue with the recommended.'
    });

    assert.equal(result.upstreamStatus, 202);
    assert.equal(calls[0]?.url, 'http://127.0.0.1:3456/api/prompt');
    assert.equal(calls[0]?.init?.headers instanceof Headers, true);
    assert.equal((calls[0]?.init?.headers as Headers).get('authorization'), 'Bearer terminal-secret');
    assert.equal(JSON.stringify(result).includes('terminal-secret'), false);
  });

  it('wraps G2 PCM and transcribes it with the approved server-side key', async () => {
    await assert.rejects(
      () => transcribeAudio({ bytes: new Uint8Array([0, 0]), mimeType: 'audio/L16;rate=16000', apiKey: '' }),
      /OPENAI_API_KEY/
    );
    let uploadedType = '';
    const transcript = await transcribeAudio({
      bytes: new Uint8Array([0, 0, 1, 0]),
      mimeType: 'audio/L16;rate=16000',
      apiKey: 'approved-key',
      fetchImpl: async (_input, init) => {
        const form = init?.body as FormData;
        uploadedType = (form.get('file') as File).type;
        assert.equal(form.get('model'), 'gpt-4o-mini-transcribe');
        return new Response(JSON.stringify({ text: 'Continue with the recommended.' }), { status: 200 });
      }
    });
    assert.equal(uploadedType, 'audio/wav');
    assert.equal(transcript.text, 'Continue with the recommended.');
    assert.equal(JSON.stringify(transcript).includes('approved-key'), false);
  });
});

async function workingCodexHome(): Promise<string> {
  const codexHome = await mkdtemp(join(tmpdir(), 'codex-home-'));
  const directory = join(codexHome, 'sessions', '2026', '07', '17');
  await mkdir(directory, { recursive: true });
  await writeFile(join(codexHome, 'session_index.jsonl'), JSON.stringify({
    id: 'thread-live', thread_name: 'Live task', updated_at: '2026-07-17T05:00:02Z'
  }) + '\n');
  await writeFile(join(directory, 'rollout-2026-07-17T00-00-00-thread-live.jsonl'), [
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'session_meta', payload: { id: 'thread-live' } }),
    JSON.stringify({ timestamp: new Date().toISOString(), type: 'event_msg', payload: { type: 'task_started' } })
  ].join('\n') + '\n');
  return codexHome;
}

async function postJson(url: string, body: unknown, token: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { response, json: await response.json() as Record<string, unknown> };
}
