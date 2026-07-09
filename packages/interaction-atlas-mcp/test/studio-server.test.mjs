import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { startStudioServer } from '../dist/studio/server.js';
import { addObservation, createSession, readSession } from '../dist/studio/store.js';

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
    assert.match(await script.text(), /CanvasKernel|fast-topology-canvas/);

    const css = await fetch(`http://127.0.0.1:${address.port}/studio/assets/app.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('cache-control') ?? '', /immutable/);
    assert.match(css.headers.get('content-type') ?? '', /text\/css/);
    assert.match(await css.text(), /fast-topology-canvas/);

    const sourceMap = await fetch(`http://127.0.0.1:${address.port}/studio/assets/app.js.map`);
    assert.equal(sourceMap.status, 200);
    assert.match(sourceMap.headers.get('cache-control') ?? '', /immutable/);
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
