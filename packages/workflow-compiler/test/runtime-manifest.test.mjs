import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createWorkflowRuntimeManifest,
  validateWorkflowRuntimeManifestArtifact,
  verifyWorkflowArtifactBundle,
  writeCompiledWorkflowArtifacts
} from '../dist/index.js';

const fixtureUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('emits an explicit runtime manifest inside a signed compiler artifact inventory', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const bundle = compileWorkflowDefinition(definition);
  const runtimeManifest = createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2026-08-26T00:00:00.000Z',
    steps: [
      { id: 'validate', actionId: 'validate_submission', dependsOn: [] },
      { id: 'approve', actionId: 'approve_template', dependsOn: ['validate'] }
    ]
  });
  assert.equal(runtimeManifest.schemaVersion, 'workflow_runtime_manifest.v0.2');
  assert.equal(runtimeManifest.runtimeCompatibility, 'workflow-runtime.v0.2');
  assert.equal(runtimeManifest.steps[0].disposition, 'pass');
  assert.equal(runtimeManifest.steps[0].actionId, 'validate_submission');
  assert.equal(runtimeManifest.steps[0].recovery, 'escalate');
  assert.equal(runtimeManifest.steps[1].disposition, 'wait');

  const root = await mkdtemp(join(tmpdir(), 'workflow-runtime-artifact-'));
  const output = join(root, 'artifact');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  try {
    await writeCompiledWorkflowArtifacts(
      bundle,
      output,
      undefined,
      { privateKey, keyId: 'runtime-fixture' },
      runtimeManifest
    );
    const receipt = await verifyWorkflowArtifactBundle(output, { publicKey });
    assert.equal(receipt.attestation.status, 'verified');
    assert.equal(receipt.fileCount, 12);
    assert.deepEqual(
      JSON.parse(await readFile(join(output, 'runtime-manifest.json'), 'utf8')),
      runtimeManifest
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validates historical v0.1 runtime manifests without reinterpreting their recovery', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const bundle = compileWorkflowDefinition(definition);
  const current = createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2026-08-26T00:00:00.000Z',
    steps: [
      { id: 'validate', actionId: 'validate_submission', dependsOn: [] },
      { id: 'approve', actionId: 'approve_template', dependsOn: ['validate'] }
    ]
  });
  const legacy = {
    ...current,
    schemaVersion: 'workflow_runtime_manifest.v0.1',
    runtimeCompatibility: 'workflow-runtime.v0.1',
    steps: current.steps.map((step) => ({ ...step, recovery: 'manual_fallback' }))
  };
  assert.doesNotThrow(() => validateWorkflowRuntimeManifestArtifact(bundle, legacy));
});

test('rejects a tampered runtime manifest and a graph that could create concurrent ready steps', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const bundle = compileWorkflowDefinition(definition);
  const input = {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2026-08-26T00:00:00.000Z',
    steps: [
      { id: 'validate', actionId: 'validate_submission', dependsOn: [] },
      { id: 'approve', actionId: 'approve_template', dependsOn: ['validate'] }
    ]
  };
  const runtimeManifest = createWorkflowRuntimeManifest(bundle, input);
  const tampered = structuredClone(runtimeManifest);
  tampered.steps[1] = {
    ...tampered.steps[1],
    disposition: 'pass',
    capability: {
      id: 'forged:capability',
      parameterDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }
  };
  delete tampered.steps[1].approval;
  const root = await mkdtemp(join(tmpdir(), 'workflow-runtime-tamper-'));
  try {
    await assert.rejects(
      () =>
        writeCompiledWorkflowArtifacts(
          bundle,
          join(root, 'artifact'),
          undefined,
          undefined,
          tampered
        ),
      /exact compiled workflow artifact family/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  assert.throws(
    () =>
      createWorkflowRuntimeManifest(bundle, {
        ...input,
        steps: [
          input.steps[0],
          input.steps[1],
          { id: 'duplicate-ready', actionId: 'request_changes', dependsOn: ['validate'] }
        ]
      }),
    /one deterministic successor/
  );
  assert.throws(
    () =>
      createWorkflowRuntimeManifest(bundle, {
        ...input,
        steps: [
          { id: 'validation-request', actionId: 'run_published_validation', dependsOn: [] },
          { id: 'approve', actionId: 'approve_template', dependsOn: ['validation-request'] }
        ]
      }),
    /compiled workflow transition/
  );
});

test('rejects runtime manifests re-derived from divergent compiled governance', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const source = compileWorkflowDefinition(definition);
  const mutations = [
    bundle => { bundle.decisionInventory.decisions.find(d => d.actionId === 'approve_template').autonomy = 'auto_allow'; },
    bundle => { bundle.approvalSurfaces.actions.find(d => d.actionId === 'approve_template').owner = 'another-owner'; },
    bundle => { bundle.governedInteraction.actions.find(d => d.actionId === 'approve_template').requiredEvidence = []; },
    bundle => { bundle.toolContracts.tools = []; }
  ];
  for (const mutate of mutations) {
    const bundle = structuredClone(source);
    mutate(bundle);
    const runtime = createWorkflowRuntimeManifest(bundle, {
      schemaVersion:'workflow_runtime_manifest_input.v0.1',target:'create-something/control-runtime.v1',
      approvalExpiresAt:'2026-12-31T00:00:00.000Z',steps:[{id:'approve',actionId:'approve_template',dependsOn:[]}]
    });
    assert.throws(() => validateWorkflowRuntimeManifestArtifact(bundle,runtime), /exact compiled workflow/);
  }
});


test('runtime validation rejects duplicate policy IDs and mismatched nested artifact headers', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl,'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  const source = compileWorkflowDefinition(definition);
  const mutations = [bundle => {
    const duplicate = structuredClone(bundle.decisionInventory.decisions.find(d=>d.actionId==='approve_template'));
    duplicate.autonomy='auto_allow';
    bundle.decisionInventory.decisions.push(duplicate);
    const {toolContract,...interaction} = duplicate;
    bundle.governedInteraction.actions.push(interaction);
    if (toolContract) bundle.toolContracts.tools.push(toolContract);
  }];
  for (const artifact of ['decisionInventory','governedInteraction','approvalSurfaces','toolContracts']) {
    for (const field of ['schemaVersion','workflowId','workflowVersion','definitionHash'])
      mutations.push(bundle => {bundle[artifact][field]='foreign';});
  }
  for (const mutate of mutations) {
    const bundle = structuredClone(source); mutate(bundle);
    const runtime = createWorkflowRuntimeManifest(bundle,{
      schemaVersion:'workflow_runtime_manifest_input.v0.1',target:'create-something/control-runtime.v1',
      approvalExpiresAt:'2026-12-31T00:00:00.000Z',steps:[{id:'approve',actionId:'approve_template',dependsOn:[]}]
    });
    assert.throws(()=>validateWorkflowRuntimeManifestArtifact(bundle,runtime),/exact compiled workflow/);
  }
});
