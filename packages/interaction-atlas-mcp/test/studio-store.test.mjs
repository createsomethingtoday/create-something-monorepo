import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  acceptSuggestion,
  addEdge,
  addNode,
  addObservation,
  createSession,
  exportSessionMarkdown,
  readSession
} from '../dist/studio/store.js';

test('local Atlas Studio sessions can be mutated by agent commands', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'atlas-studio-test-'));
  const session = await createSession(
    { client: 'Acme', workflow: 'Support recovery', owner: 'Ops' },
    cwd
  );

  assert.equal(session.client, 'Acme');
  assert.equal(session.canvas.nodes.length, 4);

  const withObservation = await addObservation(
    session.id,
    {
      text: 'The account owner must approve refunds before the agent drafts a note and logs a receipt in Linear.',
      source: 'agent',
      suggest: true
    },
    cwd
  );

  assert.equal(withObservation.observations.length, 1);
  assert.ok(withObservation.suggestions.length >= 3);

  const accepted = await acceptSuggestion(session.id, withObservation.suggestions[0].id, cwd);
  assert.equal(accepted.canvas.nodes.length, 5);

  const withNode = await addNode(
    session.id,
    { kind: 'touchpoint', label: 'Linear issue', status: 'run', createdBy: 'agent' },
    cwd
  );
  const node = withNode.canvas.nodes.at(-1);
  assert.equal(node?.label, 'Linear issue');
  assert.equal(node?.y, 475);

  const withEdge = await addEdge(
    session.id,
    { source: 'data_workflow', target: node.id, label: 'records evidence', createdBy: 'agent' },
    cwd
  );
  assert.equal(withEdge.canvas.edges.at(-1)?.target, node.id);

  const reloaded = await readSession(session.id, cwd);
  const markdown = exportSessionMarkdown(reloaded);
  assert.match(markdown, /Acme - Atlas Workflow Map/);
  assert.match(markdown, /Linear issue/);
});
