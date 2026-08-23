import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  migrateWorkflowDefinition,
  parseWorkflowDefinition,
  parseWorkflowReplayManifest
} from '../dist/index.js';

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
          message: 'Expected workflow_definition.v0.1 or workflow_definition.v0.2.'
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

test('the public workflow parser accepts legacy tools and validates declared parameters', async () => {
  const legacy = JSON.parse(await readFile(workflowFixture, 'utf8'));
  delete legacy.actions[0].tool.parameters;
  assert.equal(parseWorkflowDefinition(legacy).actions[0].tool.parameters, undefined);

  const invalid = JSON.parse(await readFile(workflowFixture, 'utf8'));
  invalid.actions[0].tool.parameters = 'ambient';
  assert.throws(
    () => parseWorkflowDefinition(invalid),
    (error) => {
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_TYPE',
          path: '$.actions[0].tool.parameters',
          message: 'Expected an array.'
        }
      ]);
      return true;
    }
  );

  const duplicate = JSON.parse(await readFile(workflowFixture, 'utf8'));
  duplicate.actions[0].tool.parameters.push({ ...duplicate.actions[0].tool.parameters[0] });
  assert.throws(
    () => parseWorkflowDefinition(duplicate),
    (error) => {
      assert.deepEqual(error.diagnostics, [
        {
          code: 'DUPLICATE_IDENTIFIER',
          path: '$.actions[0].tool.parameters[1].name',
          message:
            'Duplicate identifier published_url; first declared at $.actions[0].tool.parameters[0].name.'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser rejects duplicate evidence matcher values', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.schemaVersion = 'workflow_definition.v0.2';
  workflow.actions[0].requiredEvidenceMatchers = {
    published_url: {
      kind: 'contains_case_insensitive',
      values: ['example.com', 'example.com']
    }
  };

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'DUPLICATE_IDENTIFIER',
          path: '$.actions[0].requiredEvidenceMatchers.published_url.values[1]',
          message:
            'Duplicate identifier example.com; first declared at $.actions[0].requiredEvidenceMatchers.published_url.values[0].'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser rejects unknown evidence matcher fields', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.schemaVersion = 'workflow_definition.v0.2';
  workflow.actions[0].requiredEvidenceMatchers = {
    published_url: {
      kind: 'contains_case_insensitive',
      values: ['example.com'],
      typo: true
    }
  };

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_VALUE',
          path: '$.actions[0].requiredEvidenceMatchers.published_url',
          message: 'Evidence matcher fields must be kind and values only (unknown: typo).'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser rejects misspelled evidence-constraint fields', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.schemaVersion = 'workflow_definition.v0.2';
  workflow.actions[0].requiredEvidenceValue = { published_url: 'https://example.com' };
  workflow.actions[0].requiredEvidenceMatcher = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] }
  };

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_VALUE',
          path: '$.actions[0].requiredEvidenceMatcher',
          message: 'Unknown action field requiredEvidenceMatcher.'
        },
        {
          code: 'INVALID_VALUE',
          path: '$.actions[0].requiredEvidenceValue',
          message: 'Unknown action field requiredEvidenceValue.'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser requires v0.2 for evidence constraints', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_VALUE',
          path: '$.actions[0].requiredEvidenceValues',
          message: 'Evidence constraints require workflow_definition.v0.2.'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow parser rejects empty exact evidence values', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  workflow.schemaVersion = 'workflow_definition.v0.2';
  workflow.actions[0].requiredEvidenceValues = { published_url: '' };

  assert.throws(
    () => parseWorkflowDefinition(workflow),
    (error) => {
      assert.equal(error.name, 'WorkflowInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_VALUE',
          path: '$.actions[0].requiredEvidenceValues.published_url',
          message: 'Expected a non-empty string, finite number, or boolean.'
        }
      ]);
      return true;
    }
  );
});

test('the public workflow migration upgrades a detached v0.1 copy to v0.2', async () => {
  const workflow = JSON.parse(await readFile(workflowFixture, 'utf8'));
  const migrated = migrateWorkflowDefinition(workflow);

  assert.equal(workflow.schemaVersion, 'workflow_definition.v0.1');
  assert.equal(migrated.schemaVersion, 'workflow_definition.v0.2');
  assert.notStrictEqual(migrated, workflow);
  assert.deepEqual(migrated.actions, workflow.actions);
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
