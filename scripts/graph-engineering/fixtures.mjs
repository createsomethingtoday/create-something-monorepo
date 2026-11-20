// Synthetic, offline inputs produced through the owning compiler/runtime APIs.
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  compileWorkflowDefinition,
  createWorkflowRuntimeManifest,
  writeCompiledWorkflowArtifacts,
  verifyWorkflowArtifactBundle
} from '../../packages/workflow-compiler/dist/index.js';
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest
} from '../../packages/workflow-runtime/dist/index.js';

const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
export async function createFixture() {
  const definition = JSON.parse(
    await readFile(
      new URL(
        '../../packages/workflow-compiler/fixtures/marketplace/workflow.json',
        import.meta.url
      ),
      'utf8'
    )
  );
  definition.schemaVersion = 'workflow_definition.v0.3';
  const bundle = compileWorkflowDefinition(definition);
  const manifest = createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2026-12-01T00:00:00.000Z',
    steps: [
      { id: 'validate', actionId: 'validate_submission', dependsOn: [] },
      { id: 'approve', actionId: 'approve_template', dependsOn: ['validate'] }
    ]
  });
  const root = await mkdtemp(join(tmpdir(), 'graph-evidence-fixture-'));
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  try {
    const output = join(root, 'artifact');
    await writeCompiledWorkflowArtifacts(
      bundle,
      output,
      undefined,
      { privateKey, keyId: 'synthetic-graph-fixture' },
      manifest
    );
    const inventory = await verifyWorkflowArtifactBundle(output, { publicKey });
    const files = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8')).files.map(
      (file) => file.path
    );
    const artifactFiles = Object.fromEntries(
      await Promise.all(
        [...files, 'manifest.json', 'attestation.json'].map(async (path) => [
          path,
          await readFile(join(output, path), 'utf8')
        ])
      )
    );
    const run = await createWorkflowRuntimeRun(parseWorkflowRuntimeManifest(manifest), {
      runId: 'synthetic-run',
      activation: { id: 'synthetic-activation', version: 1, policySha256: hash('policy') },
      registration: {
        buildReleaseId: 'synthetic-build',
        contractSha256: hash('contract'),
        runtimePolicySha256: hash('policy')
      },
      artifactManifestSha256: inventory.manifestHash,
      runtimeManifestSha256: hash(artifactFiles['runtime-manifest.json']),
      clock: '2026-11-02T00:00:00.000Z'
    });
    const scope = {
      accountId: 'synthetic-account',
      tenantId: 'synthetic-tenant',
      workspaceId: 'synthetic-workspace'
    };
    return {
      trustedPublicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      input: {
        schemaVersion: 'execution_evidence_input.v0.1',
        scope,
        asOf: '2026-11-02T01:00:00.000Z',
        maxAgeSeconds: 86400,
        runtime: {
          sourceId: 'runtime-export',
          evidenceRef: 'fixture:runtime-export',
          scope,
          observedAt: '2026-11-02T00:00:00.000Z',
          freshness: 'current',
          artifactFiles,
          run
        },
        reviews: [],
        bindings: []
      }
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
