import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  evaluateGovernedInteractionCompatibility,
  GovernedInteractionValidationError,
  inspectClientWorkspaceGovernedInteraction,
  parseGovernedInteractionBundle,
} from '../dist/index.js';

const fixtureUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('parses a serialized compiled interaction bundle through the public interface', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);
  const serialized = JSON.parse(JSON.stringify(compiled.governedInteraction));

  assert.deepEqual(parseGovernedInteractionBundle(serialized), compiled.governedInteraction);
});

test('parses serialized exact evidence constraints in the public interaction bundle', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] }
  };
  const compiled = compileWorkflowDefinition(definition);
  const serialized = JSON.parse(JSON.stringify(compiled.governedInteraction));

  assert.deepEqual(parseGovernedInteractionBundle(serialized), compiled.governedInteraction);
  const constrainedAction = inspectClientWorkspaceGovernedInteraction(
    serialized,
    serialized.definitionHash,
  ).bundle.actions.find((action) => action.actionId === 'run_published_validation');
  assert.deepEqual(
    constrainedAction?.requiredEvidenceValues,
    { published_url: 'https://example.com' },
  );
  assert.deepEqual(constrainedAction?.requiredEvidenceMatchers, {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] }
  });
});

async function compiledInteraction() {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  return JSON.parse(JSON.stringify(compileWorkflowDefinition(definition).governedInteraction));
}

function rejectsWith(code, path) {
  return (error) => {
    assert.ok(error instanceof GovernedInteractionValidationError);
    assert.equal(error.code, code);
    assert.equal(error.path, path);
    return true;
  };
}

test('rejects an unknown interaction runtime version with a stable diagnostic', async () => {
  const interaction = await compiledInteraction();
  interaction.runtimeVersion = '99.0.0';

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('UNKNOWN_RUNTIME_VERSION', 'bundle.runtimeVersion'),
  );
});

test('rejects an undeclared capability instead of granting ambient browser authority', async () => {
  const interaction = await compiledInteraction();
  interaction.capabilities.push('javascript.eval');

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('UNKNOWN_CAPABILITY', 'bundle.capabilities[4]'),
  );
});

test('rejects executable operations outside the finite interaction vocabulary', async () => {
  const interaction = await compiledInteraction();
  interaction.surfaces[0].operations[0] = { kind: 'execute_javascript' };

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('UNKNOWN_OPERATION', 'bundle.surfaces[0].operations[0].kind'),
  );
});

test('rejects an entry surface that is not declared by the bundle', async () => {
  const interaction = await compiledInteraction();
  interaction.entrySurfaceId = 'missing-surface';

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('INVALID_REFERENCE', 'bundle.entrySurfaceId'),
  );
});

test('rejects approval-required actions without an owning approver', async () => {
  const interaction = await compiledInteraction();
  const actionIndex = interaction.actions.findIndex(
    (candidate) => candidate.autonomy === 'approval_required',
  );
  const action = interaction.actions[actionIndex];
  assert.ok(action);
  delete action.approvalOwner;

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('INVALID_ACTION_GOVERNANCE', `bundle.actions[${actionIndex}].approvalOwner`),
  );
});

test('returns one normalized compatibility decision for a finite desktop host', async () => {
  const interaction = await compiledInteraction();

  assert.deepEqual(
    evaluateGovernedInteractionCompatibility(interaction, {
      hostId: 'atlas-studio',
      language: 'create-something/control',
      runtimeVersions: ['0.1.0'],
      capabilities: [
        'interaction.select',
        'receipt.inspect',
        'replay.inspect',
        'workflow.inspect',
      ],
      operations: ['select_replay_case'],
    }),
    {
      schemaVersion: 'governed_interaction_compatibility.v0.1',
      compatible: true,
      hostId: 'atlas-studio',
      language: 'create-something/control',
      runtimeVersion: '0.1.0',
      requiredCapabilities: [
        'interaction.select',
        'receipt.inspect',
        'replay.inspect',
        'workflow.inspect',
      ],
      requiredOperations: ['select_replay_case'],
      errors: [],
    },
  );
});

test('Client Workspace validates the same bundle and binds it to the signed definition hash', async () => {
  const interaction = await compiledInteraction();
  const valid = inspectClientWorkspaceGovernedInteraction(
    interaction,
    interaction.definitionHash,
  );
  assert.equal(valid.authority, 'signed_delivery_read_only');
  assert.equal(valid.compatibility.hostId, 'client-workspace');
  assert.equal(valid.compatibility.compatible, true);

  const mismatched = inspectClientWorkspaceGovernedInteraction(
    interaction,
    'sha256:tampered',
  );
  assert.equal(mismatched.compatibility.compatible, false);
  assert.deepEqual(mismatched.compatibility.errors, [
    { code: 'DEFINITION_HASH_MISMATCH', value: interaction.definitionHash },
  ]);
});
