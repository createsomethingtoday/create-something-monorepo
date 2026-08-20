import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createTranscriptEditorProject } from '@create-something/atlas-composition';

import { startStudioServer } from '../dist/studio/server.js';
import { addObservation, createSession, readSession } from '../dist/studio/store.js';
import { getAtlasMediaProjectPath } from '../dist/studio/media-project.js';

function mediaProjectInput() {
  return {
    id: 'media-project-http',
    currentRevisionId: 'revision-1',
    sourceAssets: [{
      id: 'source-1', uri: 'fixture://private/source.mp4', sha256: 'fixture-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    }],
    transcriptSegments: [{
      id: 'segment-1', assetId: 'source-1', startUs: 0, endUs: 3_000_000, text: 'Synthetic source.'
    }],
    revisions: [{
      id: 'revision-1', parentRevisionId: null, createdAt: '2026-08-14T00:00:00.000Z', createdBy: 'operator',
      cutList: [{ id: 'keep-1', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 3_000_000, reason: 'Keep source.' }],
      captions: [{ id: 'caption-1', segmentIds: ['segment-1'] }], overlays: [],
      graph: {
        nodes: [
          { id: 'source', kind: 'source-asset' }, { id: 'transcript', kind: 'transcript' },
          { id: 'cut-list', kind: 'cut-list' }, { id: 'timeline', kind: 'timeline' },
          { id: 'clip:keep-1', kind: 'clip', cutOperationId: 'keep-1', diffs: [{ id: 'diff:keep-1:created', at: '2026-08-14T00:00:00.000Z', event: 'created', actor: 'operator', summary: 'Created source clip.', after: { cutOperationId: 'keep-1' } }] }
        ],
        edges: [
          { id: 'source-to-transcript', source: 'source', target: 'transcript', port: 'produces' },
          { id: 'transcript-to-cut-list', source: 'transcript', target: 'cut-list', port: 'produces' },
          { id: 'cut-list-to-clip', source: 'cut-list', target: 'clip:keep-1', port: 'produces' },
          { id: 'clip-to-timeline', source: 'clip:keep-1', target: 'timeline', port: 'produces' }
        ]
      }
    }],
    proposals: []
  };
}

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

test('Atlas Studio reads and writes a transcript project through its local session API', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-transcript-api-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Transcript editing', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-api-local-only',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-api-local-only',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 3_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-api-local-only', assetId: 'asset-api-local-only', startUs: 0, endUs: 1_000_000, text: 'Um' },
      { id: 'segment-api-second', assetId: 'asset-api-local-only', startUs: 2_000_000, endUs: 3_000_000, text: 'Keep this.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');

  try {
    const endpoint = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;
    const missingResponse = await fetch(endpoint);
    assert.equal(missingResponse.status, 404);
    const writeResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project)
    });
    assert.equal(writeResponse.status, 200);
    assert.deepEqual(await writeResponse.json(), project);

    const readResponse = await fetch(endpoint);
    assert.equal(readResponse.status, 200);
    assert.deepEqual(await readResponse.json(), project);

    const cleanupResponse = await fetch(
      `${endpoint}/cleanup-candidates?fillerTerm=um&minPauseUs=750000`
    );
    assert.equal(cleanupResponse.status, 200);
    assert.deepEqual(await cleanupResponse.json(), [
      {
        id: 'filler:segment-api-local-only',
        kind: 'filler',
        startUs: 0,
        endUs: 1_000_000,
        transcriptSegmentIds: ['segment-api-local-only'],
        summary: 'Configured filler token: um.'
      },
      {
        id: 'pause:segment-api-local-only:segment-api-second',
        kind: 'long-pause',
        startUs: 1_000_000,
        endUs: 2_000_000,
        transcriptSegmentIds: ['segment-api-local-only', 'segment-api-second'],
        summary: 'Long pause: 1.0 seconds.'
      }
    ]);

    const captionsResponse = await fetch(`${endpoint}/captions.srt`);
    assert.equal(captionsResponse.status, 200);
    assert.match(captionsResponse.headers.get('content-type') ?? '', /application\/x-subrip/);
    assert.equal(
      await captionsResponse.text(),
      '1\n00:00:00,000 --> 00:00:01,000\nUm\n\n2\n00:00:01,000 --> 00:00:02,000\nKeep this.\n'
    );
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio records manual transcript removal as a proposal before it can create a revision', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-transcript-proposal-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Transcript proposal', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-proposal-local-only',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-proposal-local-only',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 2_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-keep', assetId: 'asset-proposal-local-only', startUs: 0, endUs: 1_000_000, text: 'Keep this.' },
      { id: 'segment-remove', assetId: 'asset-proposal-local-only', startUs: 1_000_000, endUs: 2_000_000, text: 'Remove this.' }
    ],
    createdAt: '2026-08-16T00:00:00.000Z'
  });
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const root = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;

  try {
    await fetch(root, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project)
    });
    const proposal = await fetch(`${root}/proposals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'remove-second-clip',
        baseRevisionId: 'revision-1',
        proposedBy: 'operator',
        rationale: 'Manual removal.',
        operations: [
          { id: 'keep:first', kind: 'keep', transcriptSegmentIds: ['segment-keep'], startUs: 0, endUs: 1_000_000, reason: 'Retain first clip.' },
          { id: 'remove:second', kind: 'remove', transcriptSegmentIds: ['segment-remove'], startUs: 1_000_000, endUs: 2_000_000, reason: 'Manual removal.' }
        ]
      })
    });
    assert.equal(proposal.status, 200);
    assert.equal((await proposal.json()).proposals[0].status, 'proposed');

    const approved = await fetch(`${root}/proposals/remove-second-clip`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decidedAt: '2026-08-16T00:01:00.000Z', decidedBy: 'Ops', decision: 'approved' })
    });
    assert.equal(approved.status, 200);
    assert.equal((await approved.json()).proposals[0].status, 'approved');

    const applied = await fetch(`${root}/proposals/remove-second-clip/apply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedAt: '2026-08-16T00:02:00.000Z', appliedBy: 'operator', revisionId: 'revision-2' })
    });
    assert.equal(applied.status, 200);
    const result = await applied.json();
    assert.equal(result.currentRevisionId, 'revision-2');
    assert.equal(result.proposals[0].status, 'applied');
    assert.deepEqual(result.revisions.at(-1).cutList.map((operation) => operation.kind), ['keep', 'remove']);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio prepares a consent-scoped managed Codex proposal without dispatching private transcript context', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-codex-proposal-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Managed Codex proposal boundary', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-codex-proposal',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-codex-proposal',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 2_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-codex-proposal', assetId: 'asset-codex-proposal', startUs: 0, endUs: 2_000_000, text: 'Private operator transcript copy.' }
    ],
    createdAt: '2026-08-17T00:00:00.000Z'
  });
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const root = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;

  try {
    const written = await fetch(root, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project)
    });
    assert.equal(written.status, 200);

    const blocked = await fetch(`${root}/codex-proposal/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'codex-request-1', prompt: 'Remove the opening filler.', includeAcceptedTranscript: false })
    });
    assert.equal(blocked.status, 200);
    const blockedPayload = await blocked.json();
    assert.equal(blockedPayload.status, 'consent-required');
    assert.equal(blockedPayload.transfer.includesAcceptedTranscript, false);
    assert.doesNotMatch(JSON.stringify(blockedPayload), /Private operator transcript copy/);

    const ready = await fetch(`${root}/codex-proposal/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'codex-request-2', prompt: 'Remove the opening filler.', includeAcceptedTranscript: true })
    });
    assert.equal(ready.status, 200);
    const readyPayload = await ready.json();
    assert.equal(readyPayload.status, 'ready-for-local-dispatch');
    assert.equal(readyPayload.transfer.includesAcceptedTranscript, true);
    assert.equal(readyPayload.dispatch, 'not-started');
    assert.doesNotMatch(JSON.stringify(readyPayload), /Private operator transcript copy/);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio dispatches an explicitly consented Codex result as a proposed edit only', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-codex-dispatch-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Managed Codex dispatch', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-codex-dispatch',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-codex-dispatch',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 2_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      {
        id: 'segment-codex-dispatch',
        assetId: 'asset-codex-dispatch',
        startUs: 0,
        endUs: 2_000_000,
        text: 'Remove this local filler.'
      }
    ],
    createdAt: '2026-08-17T00:00:00.000Z'
  });
  const listeners = new Set();
  let closed = false;
  const rpc = {
    async request(method) {
      if (method === 'thread/start') return { thread: { id: 'thread-dispatch-1' } };
      if (method === 'turn/start') {
        queueMicrotask(() => {
          for (const listener of listeners) {
            listener({
              method: 'item/completed',
              params: {
                threadId: 'thread-dispatch-1',
                turnId: 'turn-dispatch-1',
                item: {
                  type: 'agentMessage',
                  text: JSON.stringify({
                    rationale: 'The supplied clip is filler.',
                    operations: [
                      {
                        id: 'remove-codex-dispatch',
                        kind: 'remove',
                        transcriptSegmentIds: ['segment-codex-dispatch'],
                        startUs: 0,
                        endUs: 2_000_000,
                        reason: 'Remove the operator-marked filler.'
                      }
                    ]
                  })
                }
              }
            });
            listener({
              method: 'turn/completed',
              params: {
                threadId: 'thread-dispatch-1',
                turn: { id: 'turn-dispatch-1', status: 'completed' }
              }
            });
          }
        });
        return { turn: { id: 'turn-dispatch-1' } };
      }
      return {};
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      closed = true;
    }
  };
  const server = await startStudioServer({
    host: '127.0.0.1',
    port: 0,
    sessionId: session.id,
    cwd,
    codexAppServerRpcFactory: () => rpc
  });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const root = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;

  try {
    const written = await fetch(root, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project)
    });
    assert.equal(written.status, 200);
    const prepared = await fetch(`${root}/codex-proposal/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'codex-dispatch-proposal',
        prompt: 'Remove the marked filler.',
        includeAcceptedTranscript: true
      })
    });
    assert.equal(prepared.status, 200);
    const response = await fetch(`${root}/codex-proposal/dispatch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(await prepared.json())
    });
    assert.equal(response.status, 200);
    const next = await response.json();
    assert.equal(next.currentRevisionId, 'revision-1');
    assert.equal(next.proposals.length, 1);
    assert.equal(next.proposals[0].id, 'codex-dispatch-proposal');
    assert.equal(next.proposals[0].status, 'proposed');
    assert.equal(next.proposals[0].proposedBy, 'managed-codex');
    assert.equal(closed, true);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio creates an overlay preview plan only from the current accepted transcript revision', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-overlay-preview-plan-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Transcript overlay preview', owner: 'Ops' },
    cwd
  );
  const project = createTranscriptEditorProject({
    id: 'project-overlay-preview-plan',
    atlasSessionId: session.id,
    sourceAsset: {
      id: 'asset-overlay-preview-plan',
      uri: 'fixture://local-source.mp4',
      sha256: 'local-source-hash',
      media: { durationUs: 2_000_000, width: 1920, height: 1080, hasAudio: true }
    },
    transcriptSegments: [
      { id: 'segment-overlay-preview-plan', assetId: 'asset-overlay-preview-plan', startUs: 0, endUs: 2_000_000, text: 'Keep this.' }
    ],
    createdAt: '2026-08-17T00:00:00.000Z'
  });
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const root = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;

  try {
    const written = await fetch(root, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project)
    });
    assert.equal(written.status, 200);

    const initialPlan = await fetch(`${root}/overlay-preview-plan`);
    assert.equal(initialPlan.status, 200);
    assert.deepEqual(await initialPlan.json(), {
      schema: 'create-something/atlas-remotion-preview-plan@1',
      adapter: 'motion-studio',
      compositionId: 'AtlasTranscriptOverlays',
      revisionId: 'revision-1',
      media: { durationUs: 2_000_000, width: 1920, height: 1080 },
      overlays: []
    });

    const proposal = await fetch(`${root}/proposals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'add-local-title',
        baseRevisionId: 'revision-1',
        proposedBy: 'operator',
        rationale: 'Add a reviewable local title.',
        operations: [
          { id: 'keep:overlay-preview-plan', kind: 'keep', transcriptSegmentIds: ['segment-overlay-preview-plan'], startUs: 0, endUs: 2_000_000, reason: 'Retain source.' }
        ],
        overlays: [
          { id: 'title-overlay', kind: 'text', text: 'Local-first edit', startUs: 0, endUs: 1_500_000 }
        ]
      })
    });
    assert.equal(proposal.status, 200);

    const whileProposed = await fetch(`${root}/overlay-preview-plan`);
    assert.deepEqual((await whileProposed.json()).overlays, []);

    const approved = await fetch(`${root}/proposals/add-local-title`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decidedAt: '2026-08-17T00:01:00.000Z', decidedBy: 'Ops', decision: 'approved' })
    });
    assert.equal(approved.status, 200);
    const applied = await fetch(`${root}/proposals/add-local-title/apply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedAt: '2026-08-17T00:02:00.000Z', appliedBy: 'operator', revisionId: 'revision-2' })
    });
    assert.equal(applied.status, 200);

    const acceptedPlan = await fetch(`${root}/overlay-preview-plan`);
    assert.deepEqual(await acceptedPlan.json(), {
      schema: 'create-something/atlas-remotion-preview-plan@1',
      adapter: 'motion-studio',
      compositionId: 'AtlasTranscriptOverlays',
      revisionId: 'revision-2',
      media: { durationUs: 2_000_000, width: 1920, height: 1080 },
      overlays: [
        { id: 'title-overlay', kind: 'text', text: 'Local-first edit', startUs: 0, endUs: 1_500_000 }
      ]
    });
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio imports local audio-only media through a loopback intake route', async (t) => {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('ffmpeg is unavailable in this runtime');
    return;
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-transcript-intake-test-'));
  const sourcePath = path.join(cwd, 'source.m4a');
  const generated = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '1', '-c:a', 'aac', sourcePath],
    { encoding: 'utf8' }
  );
  assert.equal(generated.status, 0, generated.stderr);
  const session = await createSession(
    { client: 'Acme', workflow: 'Transcript intake', owner: 'Ops' },
    cwd
  );
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const endpoint = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project/intake`;

  try {
    const imported = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'project-intake',
        assetId: 'asset-intake',
        filePath: sourcePath,
        transcriptSegments: [
          { id: 'segment-intake', startUs: 0, endUs: 1_000_000, text: 'Local source.' }
        ]
      })
    });
    assert.equal(imported.status, 201);
    const project = await imported.json();
    assert.equal(project.sourceAssets[0].id, 'asset-intake');
    assert.equal(project.sourceAssets[0].media.width, 0);
    assert.equal(project.sourceAssets[0].media.height, 0);
    assert.equal(project.sourceAssets[0].media.hasAudio, true);
    assert.equal(project.transcriptSegments[0].assetId, 'asset-intake');

    const restored = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`
    );
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).id, 'project-intake');

    const missing = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'project-missing-source',
        assetId: 'asset-missing-source',
        filePath: path.join(cwd, 'missing.mp4'),
        transcriptSegments: [
          { id: 'segment-missing-source', startUs: 0, endUs: 1_000_000, text: 'Missing source.' }
        ]
      })
    });
    assert.equal(missing.status, 400);
  } finally {
    await closeServer(server);
  }

  const nonLoopback = await startStudioServer({ host: '0.0.0.0', port: 0, sessionId: session.id, cwd });
  const externalAddress = nonLoopback.address();
  assert.equal(typeof externalAddress, 'object');
  try {
    const rejected = await fetch(
      `http://127.0.0.1:${externalAddress.port}/api/sessions/${session.id}/transcript-project/intake`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      }
    );
    assert.equal(rejected.status, 403);
  } finally {
    await closeServer(nonLoopback);
  }
});

test('Atlas Studio imports a local silent video without fabricating a transcript or caption track', async (t) => {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('ffmpeg is unavailable in this runtime');
    return;
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-silent-intake-test-'));
  const sourcePath = path.join(cwd, 'silent.mov');
  const generated = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=24', '-t', '1', '-an', '-c:v', 'libx264', sourcePath],
    { encoding: 'utf8' }
  );
  assert.equal(generated.status, 0, generated.stderr);
  const session = await createSession(
    { client: 'Acme', workflow: 'Silent walkthrough', owner: 'Ops' },
    cwd
  );
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const endpoint = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project/intake`;

  try {
    const imported = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: 'project-silent-intake',
        assetId: 'asset-silent-intake',
        filePath: sourcePath,
        transcriptSegments: []
      })
    });
    assert.equal(imported.status, 201);
    const project = await imported.json();
    assert.equal(project.sourceAssets[0].media.hasAudio, false);
    assert.equal(project.transcriptSegments.length, 0);
    assert.equal(project.revisions[0].captions.length, 0);
    assert.equal(project.revisions[0].cutList.length, 0);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio renders only the accepted local transcript revision and records an FFprobe receipt', async (t) => {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('ffmpeg is unavailable in this runtime');
    return;
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-transcript-render-test-'));
  const sourcePath = path.join(cwd, 'source.mp4');
  const outputPath = path.join(cwd, 'accepted.mp4');
  const generated = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', sourcePath],
    { encoding: 'utf8' }
  );
  assert.equal(generated.status, 0, generated.stderr);
  const session = await createSession({ client: 'Acme', workflow: 'Transcript render', owner: 'Ops' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const root = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/transcript-project`;

  try {
    const intake = await fetch(`${root}/intake`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        assetId: 'source-render',
        filePath: sourcePath,
        projectId: 'project-render',
        transcriptSegments: [
          { id: 'segment-render-first', startUs: 0, endUs: 1_000_000, text: 'Render this first accepted clip.' },
          { id: 'segment-render-second', startUs: 1_000_000, endUs: 2_000_000, text: 'Render this second accepted clip.' }
        ]
      })
    });
    assert.equal(intake.status, 201);

    const rendered = await fetch(`${root}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outputPath })
    });
    assert.equal(rendered.status, 200);
    const result = await rendered.json();
    assert.equal(result.receipt.status, 'completed');
    assert.equal(result.receipt.request.revisionId, 'revision-1');
    assert.equal(result.receipt.inspection.width, 320);
    assert.equal(result.receipt.inspection.audioStreams, 1);
    assert.equal(result.project.receipts.length, 1);
    assert.equal(spawnSync('ffprobe', ['-v', 'error', outputPath], { stdio: 'ignore' }).status, 0);
    const captions = await fetch(`${root}/captions.srt`);
    assert.equal(captions.status, 200);
    const captionSha256 = createHash('sha256').update(await captions.text()).digest('hex');
    assert.equal(result.receipt.request.captionSha256, captionSha256);
    assert.equal(captions.headers.get('x-atlas-caption-sha256'), captionSha256);

    const reused = await fetch(`${root}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outputPath })
    });
    assert.equal(reused.status, 200);
    const reuseResult = await reused.json();
    assert.equal(reuseResult.receipt.cacheHit, true);
    assert.equal(reuseResult.receipt.outputSha256, result.receipt.outputSha256);
    assert.equal(reuseResult.project.receipts.length, 2);
    assert.equal(reuseResult.receipt.request.cacheKey, result.receipt.request.cacheKey);

    const changedProposal = await fetch(`${root}/proposals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'remove-render-second',
        baseRevisionId: 'revision-1',
        proposedBy: 'operator',
        rationale: 'Prove changed revisions invalidate renders.',
        operations: [
          { id: 'keep:render-first', kind: 'keep', transcriptSegmentIds: ['segment-render-first'], startUs: 0, endUs: 1_000_000, reason: 'Keep the first clip.' },
          { id: 'remove:render-second', kind: 'remove', transcriptSegmentIds: ['segment-render-second'], startUs: 1_000_000, endUs: 2_000_000, reason: 'Remove the second clip.' }
        ],
        overlays: [
          { id: 'accepted-render-title', kind: 'text', text: 'Approved title', startUs: 0, endUs: 1_000_000 }
        ]
      })
    });
    assert.equal(changedProposal.status, 200);
    const changedApproved = await fetch(`${root}/proposals/remove-render-second`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decidedAt: '2026-08-17T00:00:01.000Z', decidedBy: 'Ops', decision: 'approved' })
    });
    assert.equal(changedApproved.status, 200);
    const changedApplied = await fetch(`${root}/proposals/remove-render-second/apply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedAt: '2026-08-17T00:00:02.000Z', appliedBy: 'operator', revisionId: 'revision-2' })
    });
    assert.equal(changedApplied.status, 200);

    const rerendered = await fetch(`${root}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outputPath })
    });
    assert.equal(rerendered.status, 200);
    const rerenderedResult = await rerendered.json();
    assert.equal(rerenderedResult.receipt.cacheHit, false);
    assert.equal(rerenderedResult.receipt.request.revisionId, 'revision-2');
    assert.notEqual(rerenderedResult.receipt.request.cacheKey, result.receipt.request.cacheKey);
    const acceptedOverlayFrame = spawnSync(
      'ffmpeg',
      ['-v', 'error', '-ss', '0.5', '-i', outputPath, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']
    );
    assert.equal(acceptedOverlayFrame.status, 0, acceptedOverlayFrame.stderr.toString());
    assert.ok([...acceptedOverlayFrame.stdout].some((value) => value > 32), 'accepted text overlays must visibly affect the local MP4');
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio serves the shared fast canvas shell and bundled assets', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-assets-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const html = await fetch(`http://127.0.0.1:${address.port}/sessions/${session.id}`);
    assert.equal(html.status, 200);
    const body = await html.text();
    assert.match(body, /id="root"/);
    assert.match(body, /\/studio\/assets\/app\.js/);
    assert.match(body, /\/studio\/assets\/app\.css/);

    const script = await fetch(`http://127.0.0.1:${address.port}/studio/assets/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get('cache-control') ?? '', /immutable/);
    assert.match(script.headers.get('content-type') ?? '', /text\/javascript/);
    const scriptText = await script.text();
    assert.match(scriptText, /CanvasKernel|fast-topology-canvas/);
    assert.match(scriptText, /client-handoff\.md/);

    const css = await fetch(`http://127.0.0.1:${address.port}/studio/assets/app.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('cache-control') ?? '', /immutable/);
    assert.match(css.headers.get('content-type') ?? '', /text\/css/);
    assert.match(await css.text(), /fast-topology-canvas/);

    const sourceMap = await fetch(`http://127.0.0.1:${address.port}/studio/assets/app.js.map`);
    assert.equal(sourceMap.status, 200);
    assert.match(sourceMap.headers.get('cache-control') ?? '', /immutable/);

    const favicon = await fetch(`http://127.0.0.1:${address.port}/favicon.ico`);
    assert.equal(favicon.status, 204);
    assert.equal(await favicon.text(), '');
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio reads and writes a local transcript media project through the session API', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-media-project-api-test-'));
  const session = await createSession({ client: 'Acme', workflow: 'Video edit', owner: 'Micah' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const url = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project`;

  try {
    const created = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mediaProjectInput())
    });
    assert.equal(created.status, 201);
    const createdPayload = await created.json();
    assert.equal(createdPayload.project.atlasSessionId, session.id);
    assert.equal(createdPayload.session.mediaProject.projectId, 'media-project-http');

    const read = await fetch(url);
    assert.equal(read.status, 200);
    const project = await read.json();
    assert.equal(project.currentRevisionId, 'revision-1');
    assert.equal(project.sourceAssets[0].uri, 'fixture://private/source.mp4');

    const captions = await fetch(`${url}/captions.srt`);
    assert.equal(captions.status, 200);
    assert.match(captions.headers.get('content-type') ?? '', /application\/x-subrip/);
    assert.equal(await captions.text(), '1\n00:00:00,000 --> 00:00:03,000\nSynthetic source.\n');

    project.revisions[0].captions = [];
    const updated = await fetch(url, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project)
    });
    assert.equal(updated.status, 200);
    assert.deepEqual((await updated.json()).project.revisions[0].captions, []);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio stores selected transcript cuts as a proposal before changing the accepted revision', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-manual-transcript-proposal-api-test-'));
  const session = await createSession({ client: 'Acme', workflow: 'Video edit', owner: 'Micah' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const baseUrl = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project`;

  try {
    const created = await fetch(baseUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mediaProjectInput())
    });
    assert.equal(created.status, 201);

    const proposal = await fetch(`${baseUrl}/manual-transcript-proposals`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'operator-selected-cut', proposedAt: '2026-08-15T00:00:01.000Z', transcriptSegmentIds: ['segment-1'] })
    });
    assert.equal(proposal.status, 201);
    const payload = await proposal.json();
    assert.equal(payload.project.currentRevisionId, 'revision-1');
    assert.equal(payload.project.proposals.at(-1).status, 'proposed');
    assert.equal(payload.project.proposals.at(-1).proposedBy, 'operator-transcript-selection');
    assert.equal(payload.project.proposals.at(-1).operations[0].kind, 'remove');
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio creates a private transcript project from a local MP4 and timestamped transcript', async (t) => {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('ffmpeg is unavailable in this runtime');
    return;
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-local-import-api-test-'));
  const sourcePath = path.join(cwd, 'synthetic-source.mp4');
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', sourcePath
  ], { stdio: 'ignore' });
  const session = await createSession({ client: 'Acme', workflow: 'Local video import', owner: 'Micah' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const importUrl = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project/import`;

  try {
    const response = await fetch(importUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'local-import-project',
        sourcePath,
        transcript: '00:00.000 --> 00:01.000 | Synthetic local source.',
        includeTitleOverlay: true
      })
    });
    assert.equal(response.status, 201);
    const { project } = await response.json();
    assert.match(project.sourceAssets[0].uri, /^file:\/\//);
    assert.match(project.sourceAssets[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(project.sourceAssets[0].media.width, 320);
    assert.equal(project.sourceAssets[0].media.hasAudio, true);
    assert.equal(project.revisions[0].captions[0].segmentIds.length, 1);
    assert.equal(project.revisions[0].overlays[0].kind, 'text');
    assert.ok(project.revisions[0].graph.edges.some((edge) => edge.source === 'cut-list' && edge.target === 'clip:keep:segment-1'));
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio stores managed Codex suggestions as operator-approved clip-node revisions', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-codex-proposal-api-test-'));
  const session = await createSession({ client: 'Acme', workflow: 'Video edit', owner: 'Micah' }, cwd);
  const server = await startStudioServer({
    host: '127.0.0.1',
    port: 0,
    sessionId: session.id,
    cwd,
    codexTranscriptProposalRunner: {
      async propose(project, request) {
        return {
          id: request.id,
          baseRevisionId: project.currentRevisionId,
          proposedBy: 'codex-managed-session',
          rationale: 'Keep the complete synthetic source.',
          operations: [{ id: 'keep-2', kind: 'keep', transcriptSegmentIds: ['segment-1'], startUs: 0, endUs: 3_000_000, reason: 'Preserve the only segment.' }],
          instruction: { id: `instruction:${request.id}`, text: request.operatorPrompt, source: 'operator', createdAt: request.requestedAt },
          agentRun: {
            provider: 'codex-app-server', threadId: 'thread-test', turnId: 'turn-test',
            startedAt: request.requestedAt, completedAt: request.requestedAt,
            inputSha256: 'input-hash', responseSha256: 'response-hash', usage: 'managed-account-unreported'
          }
        };
      }
    }
  });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const projectUrl = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project`;
  const proposalUrl = `${projectUrl}/codex-proposals`;

  try {
    const created = await fetch(projectUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mediaProjectInput())
    });
    assert.equal(created.status, 201);

    const denied = await fetch(proposalUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'codex-proposal-1', operatorPrompt: 'Tighten the opening.', operatorConfirmedPrivateContent: false })
    });
    assert.equal(denied.status, 400);

    const proposed = await fetch(proposalUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'codex-proposal-1', operatorPrompt: 'Tighten the opening.', requestedAt: '2026-08-14T00:00:01.000Z', operatorConfirmedPrivateContent: true })
    });
    assert.equal(proposed.status, 201);
    assert.equal((await proposed.json()).project.proposals[0].status, 'proposed');

    const decision = await fetch(`${projectUrl}/proposals/codex-proposal-1`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'approved', decidedAt: '2026-08-14T00:00:02.000Z', decidedBy: 'Micah' })
    });
    assert.equal(decision.status, 200);
    assert.equal((await decision.json()).project.proposals[0].status, 'approved');

    const applied = await fetch(`${projectUrl}/proposals/codex-proposal-1/apply`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revisionId: 'revision-2', appliedAt: '2026-08-14T00:00:03.000Z' })
    });
    assert.equal(applied.status, 200);
    const project = (await applied.json()).project;
    assert.equal(project.currentRevisionId, 'revision-2');
    const clip = project.revisions.at(-1).graph.nodes.find((node) => node.id === 'clip:keep-2');
    assert.equal(project.proposals[0].instruction.text, 'Tighten the opening.');
    assert.equal(clip.diffs.at(-1).event, 'applied');
    assert.equal(project.proposals[0].agentRun.usage, 'managed-account-unreported');

    const secondProposal = await fetch(proposalUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'codex-proposal-2', operatorPrompt: 'Try an alternate cut.', requestedAt: '2026-08-14T00:00:04.000Z', operatorConfirmedPrivateContent: true })
    });
    assert.equal(secondProposal.status, 201);
    const rejected = await fetch(`${projectUrl}/proposals/codex-proposal-2`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'rejected', decidedAt: '2026-08-14T00:00:05.000Z', decidedBy: 'Micah' })
    });
    assert.equal(rejected.status, 200);
    const rejectedProject = (await rejected.json()).project;
    assert.equal(rejectedProject.currentRevisionId, 'revision-3');
    assert.equal(rejectedProject.revisions.length, 3);
    assert.equal(rejectedProject.proposals.at(-1).status, 'rejected');
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio previews only receipt-owned local render outputs', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-media-preview-api-test-'));
  const session = await createSession({ client: 'Acme', workflow: 'Video preview', owner: 'Micah' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const projectUrl = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project`;

  try {
    const created = await fetch(projectUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mediaProjectInput())
    });
    const project = (await created.json()).project;
    const outputPath = path.join(path.dirname(getAtlasMediaProjectPath(project.id, cwd)), 'renders', 'preview.mp4');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from('local-preview-fixture'));
    project.receipts.push({
      id: 'render-preview', kind: 'render', status: 'completed', completedAt: '2026-08-14T00:00:01.000Z', cacheHit: false,
      outputSha256: 'fixture-output-hash', inspection: { inspectedAt: '2026-08-14T00:00:01.000Z', tool: 'ffprobe', durationUs: 1_000_000, width: 320, height: 180, videoCodec: 'h264', audioStreams: 1 },
      request: { id: 'request-preview', projectId: project.id, revisionId: 'revision-1', compositionId: 'AtlasTranscriptTimeline', compositionVersion: 'fixture', rendererVersion: 'fixture', timelineHash: 'fixture-timeline', cacheKey: 'fixture-cache', requestedAt: '2026-08-14T00:00:00.000Z', output: { path: outputPath, width: 320, height: 180, fps: 30, codec: 'h264' } }
    });
    const written = await fetch(projectUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(project) });
    assert.equal(written.status, 200);
    const preview = await fetch(`${projectUrl}/renders/render-preview.mp4`);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get('content-type') ?? '', /video\/mp4/);
    assert.deepEqual(Buffer.from(await preview.arrayBuffer()), Buffer.from('local-preview-fixture'));
    const outside = await fetch(`${projectUrl}/renders/not-a-receipt.mp4`);
    assert.equal(outside.status, 404);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio previews only the project-owned local source asset with byte-range support', async (t) => {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('ffmpeg is unavailable in this runtime');
    return;
  }
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-source-preview-api-test-'));
  const sourcePath = path.join(cwd, 'source.mp4');
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i', 'color=c=black:s=320x180:d=1',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', sourcePath
  ], { stdio: 'ignore' });
  const session = await createSession({ client: 'Acme', workflow: 'Source preview', owner: 'Micah' }, cwd);
  const server = await startStudioServer({ host: '127.0.0.1', port: 0, sessionId: session.id, cwd });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const projectUrl = `http://127.0.0.1:${address.port}/api/sessions/${session.id}/media-project`;

  try {
    const imported = await fetch(`${projectUrl}/import`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'source-preview-project', sourcePath, transcript: '00:00.000 --> 00:01.000 | Local source.' })
    });
    assert.equal(imported.status, 201);
    const preview = await fetch(`${projectUrl}/source/source-1`, { headers: { range: 'bytes=0-31' } });
    assert.equal(preview.status, 206);
    assert.match(preview.headers.get('content-type') ?? '', /video\/mp4/);
    assert.match(preview.headers.get('content-range') ?? '', /^bytes 0-31\//);
    assert.equal((await preview.arrayBuffer()).byteLength, 32);
    const unknown = await fetch(`${projectUrl}/source/not-a-project-asset`);
    assert.equal(unknown.status, 404);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio serves a distinct GET-only client Map-to-Build handoff', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-client-handoff-server-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
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

  try {
    const clientHandoff = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/client-handoff.md`
    );
    assert.equal(clientHandoff.status, 200);
    assert.match(clientHandoff.headers.get('content-type') ?? '', /text\/markdown/);
    const clientMarkdown = await clientHandoff.text();
    assert.match(clientMarkdown, /CREATE SOMETHING Map-to-Build Handoff/);
    assert.match(clientMarkdown, /Public sequence: Map -> Build -> Control/);

    const internalExport = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/export.md`
    );
    assert.equal(internalExport.status, 200);
    assert.match(await internalExport.text(), /Acme - Atlas Workflow Map/);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio tidies the canvas with one persisted session update', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-tidy-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/tidy`,
      { body: '{}', method: 'POST' }
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(result.updates.length > 0);
    assert.equal(result.session.canvas.nodes.find((node) => node.id === 'actor_client')?.x, 84);

    const written = await readSession(session.id, cwd);
    assert.equal(written.updatedAt, result.session.updatedAt);
    assert.equal(written.canvas.nodes.find((node) => node.id === 'actor_client')?.x, 84);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio exposes shared canvas state over HTTP', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-canvas-state-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const initialResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/canvas-state`
    );
    assert.equal(initialResponse.status, 200);
    const initial = await initialResponse.json();
    assert.equal(initial.version, 'flow.shared-canvas-state.v1');
    assert.equal(initial.renderer, 'canvas-kernel');
    assert.equal(initial.sessionId, session.id);
    assert.equal(initial.counts.totalNodes, 4);
    assert.equal(initial.visibleNodeIds.length, 4);
    assert.equal(initial.joins.length, 4);

    const updateResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/canvas-state`,
      {
        body: JSON.stringify({
          query: 'Agent support',
          selectedNodeId: 'actor_agent',
          viewport: { x: 12, y: 34, width: 900, height: 600, zoom: 0.42 }
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PUT'
      }
    );
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.query, 'Agent support');
    assert.equal(updated.selectedNodeId, 'actor_agent');
    assert.equal(updated.viewport.x, 12);
    assert.equal(updated.viewport.y, 34);
    assert.equal(updated.viewport.width, 900);
    assert.equal(updated.viewport.height, 600);
    assert.equal(updated.viewport.zoom, 0.42);
    assert.deepEqual(updated.visibleNodeIds, ['actor_agent']);

    const written = await readSession(session.id, cwd);
    assert.equal(written.canvas.nodes.length, 4);
    assert.equal(written.canvas.edges.length, 3);
    assert.equal(written.canvasState?.version, 'flow.shared-canvas-state.v1');
    assert.equal(written.canvasState?.query, 'Agent support');
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio deletes a canvas node and connected edges over HTTP', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-delete-node-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/nodes/data_workflow`,
      { method: 'DELETE' }
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.removedNode.id, 'data_workflow');
    assert.deepEqual(
      result.removedEdges.map((edge) => edge.id).sort(),
      ['edge_client_workflow', 'edge_workflow_agent']
    );

    const written = await readSession(session.id, cwd);
    assert.equal(written.canvas.nodes.some((node) => node.id === 'data_workflow'), false);
    assert.equal(
      written.canvas.edges.some(
        (edge) => edge.source === 'data_workflow' || edge.target === 'data_workflow'
      ),
      false
    );
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio updates edge communication fields over HTTP', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-update-edge-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/edges/edge_client_workflow`,
      {
        body: JSON.stringify({
          evidence: 'Slack thread, app version, and security review feed this decision.',
          label: 'request enters governed intake'
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH'
      }
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    const edge = result.canvas.edges.find((item) => item.id === 'edge_client_workflow');
    assert.equal(edge.label, 'request enters governed intake');
    assert.equal(edge.evidence, 'Slack thread, app version, and security review feed this decision.');
    assert.equal(edge.source, 'actor_client');
    assert.equal(edge.target, 'data_workflow');

    const written = await readSession(session.id, cwd);
    const writtenEdge = written.canvas.edges.find((item) => item.id === 'edge_client_workflow');
    assert.equal(writtenEdge?.label, 'request enters governed intake');
    assert.equal(
      writtenEdge?.evidence,
      'Slack thread, app version, and security review feed this decision.'
    );
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio Story API normalizes endpoint payloads over HTTP', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-story-api-http-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/story`,
      {
        body: JSON.stringify({
          active_step_id: 'intro',
          focus_node_ids: ['data_workflow', 'missing-node'],
          next_action: 'Confirm the system of record.',
          steps: [
            {
              id: 'intro',
              title: 'Intro',
              summary: 'Show the operator-owned source.',
              focus_node_ids: ['data_workflow']
            }
          ]
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.meta.apiVersion, 1);
    assert.equal(result.meta.storyContract, 'atlas-story-v1');
    assert.deepEqual(result.meta.invalidFocusNodeIds, ['missing-node']);
    assert.equal(result.story.activeStepId, 'intro');
    assert.equal(result.session.story.nextAction, 'Confirm the system of record.');

    const getResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/story`
    );
    assert.equal(getResponse.status, 200);
    const current = await getResponse.json();
    assert.equal(current.story.activeStepId, 'intro');
    assert.equal(current.meta.apiVersion, 1);
  } finally {
    await closeServer(server);
  }
});

test('Atlas Studio exposes session database health as an API endpoint', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-database-health-test-'));
  const session = await createSession(
    { client: 'CREATE SOMETHING Test', workflow: 'Agent-assisted Atlas onboarding' },
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

  try {
    const storyResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/story`,
      {
        body: JSON.stringify({
          steps: [
            {
              id: 'topology-diagnostics',
              title: 'Business health signals',
              summary: 'Automation has 237 record(s); Database has 21 record(s).',
              proof: '0 hard gaps / 6 review signals'
            },
            {
              id: 'substrate-performance',
              title: 'Substrate speed contract',
              summary: 'Record navigation, Direct record URLs, Agent read path, Proof refresh keep the operator path close to obsidian_like_operator_speed.',
              proof: '4 budgets / 5 fast paths'
            },
            {
              id: 'organization-review',
              title: 'Organization review',
              summary: 'Atlas is showing value for CREATE SOMETHING, especially automation/database imbalance and worker/MCP concentration.',
              proof: '5 findings / 4 recommended moves'
            }
          ],
          callouts: [
            {
              id: 'diagnostic_callout_1',
              node_id: 'data_workflow',
              severity: 'decision',
              text: 'Automation and Database balance: review signal.'
            }
          ]
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }
    );
    assert.equal(storyResponse.status, 200);

    await addObservation(
      session.id,
      {
        source: 'system',
        text: 'Substrate performance contract: obsidian_like_operator_speed, 439 topology records, 488 API/MCP/agent resources, 4 budgets, and 5 fast paths.'
      },
      cwd
    );
    await addObservation(
      session.id,
      {
        source: 'system',
        text: 'Organization review: valuable_with_review_signals, 0 hard gaps, 6 review signals, 5 findings, and 4 recommended moves.'
      },
      cwd
    );

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/sessions/${session.id}/database-health`
    );
    assert.equal(response.status, 200);
    const health = await response.json();

    assert.equal(health.sessionId, session.id);
    assert.equal(health.topology.title, 'Business health signals');
    assert.equal(health.topology.proof, '0 hard gaps / 6 review signals');
    assert.equal(health.topology.signals.length, 1);
    assert.equal(health.topology.signals[0].nodeLabel, 'Agent-assisted Atlas onboarding');
    assert.equal(health.performance.title, 'Substrate speed contract');
    assert.equal(health.performance.proof, '4 budgets / 5 fast paths');
    assert.match(health.performance.observation, /obsidian_like_operator_speed/);
    assert.equal(health.organization.title, 'Organization review');
    assert.equal(health.organization.proof, '5 findings / 4 recommended moves');
    assert.match(health.organization.observation, /valuable_with_review_signals/);
  } finally {
    await closeServer(server);
  }
});
