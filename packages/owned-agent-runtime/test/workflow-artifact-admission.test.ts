import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileWorkflowDefinition, createWorkflowRuntimeManifest, writeCompiledWorkflowArtifacts, verifyWorkflowArtifactBundle } from '@createsomething/workflow-compiler';
import { admitWorkflowArtifact } from '../src/workflow-artifact-admission.js';

test('admits a real signed compiler release and rejects mismatched registration, policy and bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'control-admission-'));
  try {
    const definition = JSON.parse(await readFile(new URL('../../workflow-compiler/fixtures/marketplace/workflow.json', import.meta.url), 'utf8'));
    definition.schemaVersion = 'workflow_definition.v0.3';
    const bundle = compileWorkflowDefinition(definition);
    const runtime = createWorkflowRuntimeManifest(bundle, {
      schemaVersion: 'workflow_runtime_manifest_input.v0.1', target: 'create-something/control-runtime.v1',
      approvalExpiresAt: '2026-12-31T00:00:00.000Z', steps: [{id:'validate',actionId:'validate_submission',dependsOn:[]}]
    });
    const {privateKey, publicKey} = generateKeyPairSync('ed25519');
    await writeCompiledWorkflowArtifacts(bundle, join(root,'release'), undefined, {privateKey,keyId:'test'}, runtime);
    const receipt = await verifyWorkflowArtifactBundle(join(root,'release'), {publicKey});
    assert.equal(receipt.attestation.status, 'verified');
    if (receipt.attestation.status !== 'verified') throw new Error('unsigned fixture');
    const manifest = JSON.parse(await readFile(join(root,'release/manifest.json'),'utf8'));
    const files = new Map<string,Uint8Array>();
    for (const path of ['manifest.json','attestation.json',...manifest.files.map((file: {path:string}) => file.path)]) files.set(path,await readFile(join(root,'release',path)));
    const registration = {
      artifactManifestSha256:receipt.manifestHash,
      runtimeManifestSha256:`sha256:${createHash('sha256').update(files.get('runtime-manifest.json')!).digest('hex')}`,
      workflowId:receipt.workflowId, workflowVersion:receipt.workflowVersion, definitionHash:receipt.definitionHash,
      compilerVersion:receipt.compilerVersion, runtimeManifestSchema:runtime.schemaVersion,
      attestationKeyId:'test',attestationPublicKeyFingerprint:receipt.attestation.publicKeyFingerprint
    };
    const policy = {
      signer:{keyId:'test',publicKeyPem:publicKey.export({type:'spki',format:'pem'}).toString(),fingerprint:receipt.attestation.publicKeyFingerprint},
      compilerVersions:[receipt.compilerVersion], runtimeManifestSchemas:[runtime.schemaVersion],
      capabilities:runtime.steps.flatMap(step=>step.disposition==='pass'?[step.capability.id]:[])
    };
    const reader={async read(){return files;}};
    assert.deepEqual(await admitWorkflowArtifact(reader,registration,policy),runtime);
    for (const field of Object.keys(registration)) {
      await assert.rejects(admitWorkflowArtifact(reader,{...registration,[field]:'incorrect'},policy));
    }
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,capabilities:[]}));
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,compilerVersions:[]}));
    files.get('runtime-manifest.json')![0]^=1;
    await assert.rejects(admitWorkflowArtifact(reader,registration,policy));
  } finally { await rm(root,{recursive:true,force:true}); }
});
