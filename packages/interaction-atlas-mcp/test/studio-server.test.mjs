import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { startStudioServer } from '../dist/studio/server.js';
import { addObservation, createSession } from '../dist/studio/store.js';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function readSessionEvent(reader, buffer, predicate) {
  const decoder = new TextDecoder();
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const result = await Promise.race([
      reader.read(),
      wait(remaining).then(() => {
        throw new Error('Timed out waiting for session event');
      })
    ]);
    if (result.done) throw new Error('Session event stream ended');
    buffer.value += decoder.decode(result.value, { stream: true });
    const matches = [...buffer.value.matchAll(/event: session\ndata: (.*?)\n\n/gs)];
    for (const match of matches) {
      const session = JSON.parse(match[1]);
      if (predicate(session)) return session;
    }
  }
  throw new Error('Timed out waiting for matching session event');
}

test('Atlas Studio streams session changes to open canvas clients', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-server-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Agent-assisted call', owner: 'Ops' },
    cwd
  );
  const server = await startStudioServer({
    host: '127.0.0.1',
    port: 0,
    sessionId: session.id,
    cwd
  });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const controller = new AbortController();

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/events`,
      { signal: controller.signal }
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
    assert.ok(response.body);

    const reader = response.body.getReader();
    const buffer = { value: '' };
    await readSessionEvent(reader, buffer, (eventSession) => eventSession.id === session.id);

    await addObservation(
      session.id,
      {
        text: 'Client says the canvas should update while Codex owns the chat.',
        source: 'agent',
        suggest: true
      },
      cwd
    );

    const updated = await readSessionEvent(
      reader,
      buffer,
      (eventSession) => eventSession.observations.length === 1
    );
    assert.equal(updated.observations[0].source, 'agent');
    assert.match(updated.observations[0].text, /Codex owns the chat/);
  } finally {
    controller.abort();
    await closeServer(server);
  }
});
