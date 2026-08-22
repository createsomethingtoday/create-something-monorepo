import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseWorkflowDefinition, parseWorkflowReplayManifest } from '../dist/index.js';

const workflowFixture = new URL('../fixtures/marketplace/workflow.json', import.meta.url);
const replayFixture = new URL('../fixtures/marketplace/cases.json', import.meta.url);

test('public runtime parsers accept the versioned workflow and replay fixtures', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  const replay = JSON.parse(await readFile(replayFixture, 'utf8'));

  assert.equal(parseWorkflowDefinition(workflow).schemaVersion, 'workflow_definition.v0.1');
  assert.equal(parseWorkflowReplayManifest(replay).schemaVersion, 'workflow_replay_manifest.v0.1');
});

test('the public workflow parser fails closed on an unknown schema version', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.schemaVersion = 'workflow_definition.v9';

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'UNSUPPORTED_SCHEMA_VERSION',
          path: '$.schemaVersion',
          message: 'Expected workflow_definition.v0.1.'
        }
      ]);
      return true;
    }
  );
});

test('the public replay parser reports nested evidence and approval type errors', async () => {
  const replay = JSON.parse(await readFile(replayFixture, 'utf8'));
  replay.cases[0].evidence = [];
  replay.cases[0].approvals = 'reviewer';

  assert.throws(
    () => parseWorkflowReplayManifest(replay),
    (error) => {
      assert.equal(error.name, 'ReplayInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_TYPE',
          path: '$.cases[0].evidence',
          message: 'Expected an object.'
        },
        {
          code: 'INVALID_TYPE',
          path: '$.cases[0].approvals',
          message: 'Expected an array.'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser rejects duplicate action identifiers', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.actions.push({ ...workflow.actions[0] });

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'DUPLICATE_IDENTIFIER',
          path: `$.actions[${workflow.actions.length - 1}].id`,
          message: `Duplicate identifier ${workflow.actions[0].id}; first declared at $.actions[0].id.`
        }
      ]);
      return true;
    }
  );
});

for (const collection of [
  'systems',
  'objects',
  'events',
  'actors',
  'states',
  'transitions',
  'agents',
  'evaluations'
]) {
  test(`the public workflow parser rejects duplicate ${collection} identifiers`, async () => {
    const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
    workflow[collection].push({ ...workflow[collection][0] });

    assert.throws(
      () => parseWorkflowDefinition(workflow),
      (error) => {
        assert.equal(error.name, 'WorkflowInputValidationError');
        assert.deepEqual(error.diagnostics, [
          {
            code: 'DUPLICATE_IDENTIFIER',
            path: `$.${collection}[${workflow[collection].length - 1}].id`,
            message: `Duplicate identifier ${workflow[collection][0].id}; first declared at $.${collection}[0].id.`
          }
        ]);
        return true;
      }
    );
  });
}

test('the public replay parser rejects duplicate case identifiers', async () => {
  const replay = JSON.parse(await readFile(replayFixture, 'utf8'));
  replay.cases.push({ ...replay.cases[0] });

  assert.throws(
    () => parseWorkflowReplayManifest(replay),
    (error) => {
      assert.equal(error.name, 'ReplayInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'DUPLICATE_IDENTIFIER',
          path: `$.cases[${replay.cases.length - 1}].caseId`,
          message: `Duplicate identifier ${replay.cases[0].caseId}; first declared at $.cases[0].caseId.`
        }
      ]);
      return true;
    }
  );
});
