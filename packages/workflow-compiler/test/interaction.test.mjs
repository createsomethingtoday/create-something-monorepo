import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  evaluateGovernedInteractionCompatibility,
  GovernedInteractionValidationError,
  inspectClientWorkspaceGovernedInteraction,
  migrateGovernedInteractionBundle,
  migrateGovernedInteractionBundleToV0_3,
  parseGovernedInteractionBundle,
} from '../dist/index.js';

const fixtureUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('parses a serialized compiled interaction bundle through the public interface', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);
  const serialized = JSON.parse(JSON.stringify(compiled.governedInteraction));

  assert.deepEqual(parseGovernedInteractionBundle(serialized), compiled.governedInteraction);
});

test('the public interaction migration upgrades a detached v0.1 copy to v0.2', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);
  const migrated = migrateGovernedInteractionBundle(compiled.governedInteraction);

  assert.equal(compiled.governedInteraction.schemaVersion, 'governed_interaction_bundle.v0.1');
  assert.equal(migrated.schemaVersion, 'governed_interaction_bundle.v0.2');
  assert.notStrictEqual(migrated, compiled.governedInteraction);
  assert.deepEqual(migrated.actions, compiled.governedInteraction.actions);
});

test('the public interaction migration upgrades a detached constrained copy to v0.3', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const compiled = compileWorkflowDefinition(definition);
  const migrated = migrateGovernedInteractionBundleToV0_3(compiled.governedInteraction);

  assert.equal(compiled.governedInteraction.schemaVersion, 'governed_interaction_bundle.v0.2');
  assert.equal(migrated.schemaVersion, 'governed_interaction_bundle.v0.3');
  assert.notStrictEqual(migrated, compiled.governedInteraction);
  assert.deepEqual(migrated.actions, compiled.governedInteraction.actions);
});

test('parses serialized exact evidence constraints in the public interaction bundle', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] }
  };
  const compiled = compileWorkflowDefinition(definition);
  assert.equal(compiled.schemaVersion, 'compiled_workflow_bundle.v0.2');
  assert.equal(compiled.decisionInventory.schemaVersion, 'decision_inventory.v0.2');
  assert.equal(compiled.governedInteraction.schemaVersion, 'governed_interaction_bundle.v0.2');
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

test('parses an exact-enum evidence matcher in the public interaction bundle', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: {
      kind: 'equals_one_of',
      values: ['https://example.test/a', 'https://example.test/b'],
    },
  };
  const compiled = compileWorkflowDefinition(definition);
  assert.equal(compiled.schemaVersion, 'compiled_workflow_bundle.v0.3');
  assert.equal(compiled.decisionInventory.schemaVersion, 'decision_inventory.v0.3');
  assert.equal(compiled.governedInteraction.schemaVersion, 'governed_interaction_bundle.v0.3');
  assert.equal(compiled.approvalSurfaces.schemaVersion, 'approval_surfaces.v0.3');
  assert.equal(compiled.toolContracts.schemaVersion, 'tool_contracts.v0.3');
  const serialized = JSON.parse(JSON.stringify(compiled.governedInteraction));

  assert.deepEqual(parseGovernedInteractionBundle(serialized), compiled.governedInteraction);
  assert.equal(
    inspectClientWorkspaceGovernedInteraction(serialized, serialized.definitionHash).schemaVersion,
    'client_workspace_governed_interaction_inspection.v0.3',
  );
});

test('the legacy interaction schema rejects evidence constraints instead of ignoring them', async () => {
  const interaction = await compiledInteraction();
  interaction.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith('INVALID_BUNDLE', 'bundle.actions[0]'),
  );
});

test('the interaction parser rejects empty exact evidence values', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  const interaction = JSON.parse(
    JSON.stringify(compileWorkflowDefinition(definition).governedInteraction),
  );
  const actionIndex = interaction.actions.findIndex(
    (action) => action.actionId === 'run_published_validation',
  );
  assert.notEqual(actionIndex, -1);
  const action = interaction.actions[actionIndex];
  assert.ok(action.requiredEvidenceValues);
  action.requiredEvidenceValues.published_url = '   ';

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith(
      'INVALID_BUNDLE',
      `bundle.actions[${actionIndex}].requiredEvidenceValues.published_url`,
    ),
  );
});

test('the interaction parser rejects empty evidence matcher values', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] },
  };
  const interaction = JSON.parse(
    JSON.stringify(compileWorkflowDefinition(definition).governedInteraction),
  );
  const actionIndex = interaction.actions.findIndex(
    (action) => action.actionId === 'run_published_validation',
  );
  assert.notEqual(actionIndex, -1);
  const action = interaction.actions[actionIndex];
  assert.ok(action.requiredEvidenceMatchers);

  for (const candidate of ['', '   ']) {
    action.requiredEvidenceMatchers.published_url.values = [candidate];
    assert.throws(
      () => parseGovernedInteractionBundle(interaction),
      rejectsWith(
        'INVALID_BUNDLE',
        `bundle.actions[${actionIndex}].requiredEvidenceMatchers.published_url.values[0]`,
      ),
    );
  }
});

test('the interaction parser rejects non-plain evidence-constraint maps', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] },
  };
  const compiled = compileWorkflowDefinition(definition).governedInteraction;
  const actionIndex = compiled.actions.findIndex(
    (action) => action.actionId === 'run_published_validation',
  );
  assert.notEqual(actionIndex, -1);

  const valuesMap = structuredClone(compiled);
  valuesMap.actions[actionIndex].requiredEvidenceValues = new Map([
    ['published_url', 'https://example.com'],
  ]);
  assert.throws(
    () => parseGovernedInteractionBundle(valuesMap),
    rejectsWith('INVALID_BUNDLE', `bundle.actions[${actionIndex}].requiredEvidenceValues`),
  );

  const matchersMap = structuredClone(compiled);
  matchersMap.actions[actionIndex].requiredEvidenceMatchers = new Map([
    ['published_url', { kind: 'contains_case_insensitive', values: ['example.com'] }],
  ]);
  assert.throws(
    () => parseGovernedInteractionBundle(matchersMap),
    rejectsWith('INVALID_BUNDLE', `bundle.actions[${actionIndex}].requiredEvidenceMatchers`),
  );
});

test('the interaction parser rejects an exact evidence value that conflicts with its matcher', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'contains_case_insensitive', values: ['example.com'] }
  };
  const interaction = JSON.parse(
    JSON.stringify(compileWorkflowDefinition(definition).governedInteraction),
  );
  const actionIndex = interaction.actions.findIndex(
    (action) => action.actionId === 'run_published_validation',
  );
  assert.notEqual(actionIndex, -1);
  const action = interaction.actions[actionIndex];
  assert.ok(action.requiredEvidenceValues);
  action.requiredEvidenceValues.published_url = true;

  assert.throws(
    () => parseGovernedInteractionBundle(interaction),
    rejectsWith(
      'INVALID_ACTION_GOVERNANCE',
      `bundle.actions[${actionIndex}].requiredEvidenceValues.published_url`,
    ),
  );
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
      schemaVersions: ['governed_interaction_bundle.v0.1'],
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
      schemaVersion: 'governed_interaction_compatibility.v0.2',
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

test('rejects a governed interaction schema the host did not explicitly support', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  const interaction = compileWorkflowDefinition(definition).governedInteraction;

  const compatibility = evaluateGovernedInteractionCompatibility(interaction, {
    hostId: 'v0.1-host',
    language: 'create-something/control',
    schemaVersions: ['governed_interaction_bundle.v0.1'],
    runtimeVersions: ['0.1.0'],
    capabilities: [
      'interaction.select',
      'receipt.inspect',
      'replay.inspect',
      'workflow.inspect',
    ],
    operations: ['select_replay_case'],
  });

  assert.equal(compatibility.compatible, false);
  assert.deepEqual(compatibility.errors, [
    { code: 'UNSUPPORTED_SCHEMA_VERSION', value: 'governed_interaction_bundle.v0.2' },
  ]);
});

test('treats an omitted host schema allowlist as legacy v0.1-only support', async () => {
  const legacyInteraction = await compiledInteraction();
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  definition.actions[0].requiredEvidenceValues = { published_url: 'https://example.com' };
  const constrainedInteraction = compileWorkflowDefinition(definition).governedInteraction;
  const legacyHost = {
    hostId: 'legacy-host',
    language: 'create-something/control',
    runtimeVersions: ['0.1.0'],
    capabilities: [
      'interaction.select',
      'receipt.inspect',
      'replay.inspect',
      'workflow.inspect',
    ],
    operations: ['select_replay_case'],
  };

  assert.equal(
    evaluateGovernedInteractionCompatibility(legacyInteraction, legacyHost).compatible,
    true,
  );
  assert.deepEqual(
    evaluateGovernedInteractionCompatibility(constrainedInteraction, legacyHost).errors,
    [{ code: 'UNSUPPORTED_SCHEMA_VERSION', value: 'governed_interaction_bundle.v0.2' }],
  );
});

test('Client Workspace validates the same bundle and binds it to the signed definition hash', async () => {
  const interaction = await compiledInteraction();
  const valid = inspectClientWorkspaceGovernedInteraction(
    interaction,
    interaction.definitionHash,
  );
  assert.equal(valid.schemaVersion, 'client_workspace_governed_interaction_inspection.v0.2');
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
