#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? ''))
  throw new Error('Supply one exact public version: npm run release:registry -- 0.5.0');
const packageName = '@createsomething/workflow-compiler';
const root = await mkdtemp(join(tmpdir(), 'workflow-registry-consumer-'));
function run(command, args, ok = true) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status === 0, ok, result.stderr || result.stdout);
  return result.stdout;
}
try {
  await writeFile(join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    packageName + '@' + version
  ]);
  const trust = run('npm', ['audit', 'signatures']);
  assert.match(trust, /verified registry signature/);
  assert.match(trust, /verified attestation/);
  const require = createRequire(join(root, 'package.json'));
  const entry = require.resolve(packageName);
  const api = await import(pathToFileURL(entry).href);
  const installed = resolve(dirname(entry), '..');
  assert.equal(JSON.parse(await readFile(join(installed, 'package.json'))).version, version);
  assert.equal(api.WORKFLOW_COMPILER_PACKAGE_VERSION, version);
  const cli = join(installed, 'dist', 'cli.js');
  assert.equal(JSON.parse(run(process.execPath, [cli, '--version'])).packageVersion, version);
  const checks = [];
  for (const template of ['local-runbook', 'marketplace-submission']) {
    const dir = join(root, template);
    run(process.execPath, [cli, 'init', '--template', template, '--dir', dir]);
    const workflow = join(dir, 'workflow.json'),
      cases = join(dir, 'cases.json'),
      out = join(dir, 'compiled');
    run(process.execPath, [cli, 'validate', '--workflow', workflow]);
    run(process.execPath, [cli, 'simulate', '--workflow', workflow, '--cases', cases]);
    assert.match(
      run(process.execPath, [cli, 'explain', '--workflow', workflow, '--cases', cases]),
      /Adapter contract readiness/
    );
    for (const output of [out, join(dir, 'second')])
      run(process.execPath, [
        cli,
        'compile',
        '--workflow',
        workflow,
        '--cases',
        cases,
        '--out',
        output
      ]);
    assert.equal(
      await readFile(join(out, 'manifest.json'), 'utf8'),
      await readFile(join(dir, 'second', 'manifest.json'), 'utf8')
    );
    assert.equal((await api.verifyWorkflowArtifactBundle(out)).status, 'integrity_verified');
    const definition = JSON.parse(await readFile(workflow));
    definition.transitions[0].requiredApprovals = ['operator'];
    assert.throws(
      () => api.compileWorkflowDefinition(definition),
      (e) => e.diagnostics.some((d) => d.path === '$.transitions[0].requiredApprovals')
    );
    await writeFile(join(out, 'tool-contracts.json'), '{}');
    await assert.rejects(() => api.verifyWorkflowArtifactBundle(out));
    checks.push(template);
  }
  const definition = api.migrateWorkflowDefinitionToV0_3(
    JSON.parse(await readFile(join(installed, 'fixtures/release-promotion/workflow.json')))
  );
  const bundle = api.compileWorkflowDefinition(definition);
  const runtimeManifest = api.createWorkflowRuntimeManifest(bundle, {
    schemaVersion: 'workflow_runtime_manifest_input.v0.1',
    target: 'create-something/control-runtime.v1',
    approvalExpiresAt: '2099-01-01T00:00:00.000Z',
    steps: [
      { id: 'verify', actionId: 'verify_release', dependsOn: [] },
      { id: 'promote', actionId: 'promote_release', dependsOn: ['verify'] }
    ]
  });
  assert.equal(runtimeManifest.schemaVersion, 'workflow_runtime_manifest.v0.2');
  api.validateWorkflowRuntimeManifestArtifact(bundle, runtimeManifest);
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const signed = join(root, 'signed');
  await api.writeCompiledWorkflowArtifacts(
    bundle,
    signed,
    undefined,
    { privateKey, keyId: 'registry-consumer' },
    runtimeManifest
  );
  assert.equal((await api.verifyWorkflowArtifactBundle(signed, { publicKey })).status, 'verified');
  const metadata = JSON.parse(run('npm', ['view', packageName + '@' + version, '--json']));
  assert.ok(metadata.dist?.attestations?.provenance);
  console.log(
    JSON.stringify({
      ok: true,
      node: process.version,
      package: packageName,
      version,
      integrity: metadata.dist.integrity,
      registryTrustVerified: true,
      starters: checks,
      runtimeManifest: runtimeManifest.schemaVersion,
      signedArtifactVerified: true
    })
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
