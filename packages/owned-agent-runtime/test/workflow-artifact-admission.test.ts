import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflowArtifactAttestation, workflowArtifactManifestHash, compileWorkflowDefinition, createWorkflowRuntimeManifest, writeCompiledWorkflowArtifacts, verifyWorkflowArtifactBundle } from '@createsomething/workflow-compiler';
import { admitWorkflowArtifact, type WorkflowArtifactAdmissionPolicy } from '../src/workflow-artifact-admission.js';

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
    const policy: WorkflowArtifactAdmissionPolicy = {
      interactionHost:{hostId:'control',language:'create-something/control',schemaVersions:['governed_interaction_bundle.v0.1','governed_interaction_bundle.v0.2','governed_interaction_bundle.v0.3'],runtimeVersions:['0.1.0'],capabilities:['interaction.select','receipt.inspect','replay.inspect','workflow.inspect'],operations:['select_replay_case']},
      signer:{keyId:'test',publicKeyPem:publicKey.export({type:'spki',format:'pem'}).toString(),fingerprint:receipt.attestation.publicKeyFingerprint},
      compilerVersions:[receipt.compilerVersion], runtimeManifestSchemas:[runtime.schemaVersion],
      capabilities:runtime.steps.flatMap(step=>step.disposition==='pass'?[step.capability.id]:[])
    };
    const reader={async read(){return files;}};
    const admitted = await admitWorkflowArtifact(reader,registration,policy);
    assert.deepEqual(admitted,runtime);
    assert.throws(() => { admitted.workflow.id = 'mutated'; }, TypeError);
    assert.throws(() => { admitted.steps.push(admitted.steps[0]); }, TypeError);
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,interactionHost:{...policy.interactionHost,operations:[]}}));
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,interactionHost:{...policy.interactionHost,runtimeVersions:[]}}));
    for (const field of Object.keys(registration)) {
      await assert.rejects(admitWorkflowArtifact(reader,{...registration,[field]:'incorrect'},policy));
    }
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,capabilities:[]}));
    await assert.rejects(admitWorkflowArtifact(reader,registration,{...policy,compilerVersions:[]}));
    const stale = structuredClone(runtime);
    stale.artifacts.governedInteractionSha256 = 'sha256:'+'0'.repeat(64);
    const staleBytes = new TextEncoder().encode(JSON.stringify(stale));
    const staleDigest = 'sha256:'+createHash('sha256').update(staleBytes).digest('hex');
    const staleOuter = structuredClone(manifest);
    staleOuter.files.find((file:{path:string})=>file.path==='runtime-manifest.json').hash = staleDigest;
    const staleFiles = new Map(files);
    staleFiles.set('runtime-manifest.json',staleBytes);
    staleFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(staleOuter)));
    staleFiles.set('attestation.json',new TextEncoder().encode(JSON.stringify(createWorkflowArtifactAttestation(staleOuter,{privateKey,keyId:'test'}))));
    await assert.rejects(admitWorkflowArtifact({async read(){return staleFiles;}},{...registration,runtimeManifestSha256:staleDigest,artifactManifestSha256:workflowArtifactManifestHash(staleOuter)},policy),/not_admitted/);
    for (const field of ['workflowId','workflowVersion','definitionHash']) {
      const interaction = JSON.parse(new TextDecoder().decode(files.get('governed-interaction.json')!));
      interaction[field] = field === 'definitionHash' ? 'sha256:'+'e'.repeat(64) : 'another-workflow';
      const interactionBytes = new TextEncoder().encode(JSON.stringify(interaction));
      const hash = (bytes:Uint8Array) => 'sha256:'+createHash('sha256').update(bytes).digest('hex');
      const reboundRuntime = structuredClone(runtime);
      reboundRuntime.artifacts.governedInteractionSha256 = hash(interactionBytes) as `sha256:${string}`;
      const runtimeBytes = new TextEncoder().encode(JSON.stringify(reboundRuntime));
      const reboundOuter = structuredClone(manifest);
      for (const entry of reboundOuter.files) {
        if (entry.path === 'runtime-manifest.json') entry.hash = hash(runtimeBytes);
        if (entry.path === 'governed-interaction.json') entry.hash = hash(interactionBytes);
      }
      const reboundFiles = new Map(files);
      reboundFiles.set('governed-interaction.json',interactionBytes);
      reboundFiles.set('runtime-manifest.json',runtimeBytes);
      reboundFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(reboundOuter)));
      reboundFiles.set('attestation.json',new TextEncoder().encode(JSON.stringify(createWorkflowArtifactAttestation(reboundOuter,{privateKey,keyId:'test'}))));
      await assert.rejects(admitWorkflowArtifact({async read(){return reboundFiles;}},{...registration,runtimeManifestSha256:hash(runtimeBytes),artifactManifestSha256:workflowArtifactManifestHash(reboundOuter)},policy),/not_admitted/);
    }
    // Keep the allowlisted pass capability, but point it at an approval-required
    // compiled action. Re-sign all modified hashes to isolate semantic validation.
    const approvalBypass = structuredClone(runtime);
    approvalBypass.steps[0].actionId = 'approve_template';
    const bypassBytes = new TextEncoder().encode(JSON.stringify(approvalBypass));
    const bypassDigest = 'sha256:'+createHash('sha256').update(bypassBytes).digest('hex');
    const bypassOuter = structuredClone(manifest);
    bypassOuter.files.find((file:{path:string})=>file.path==='runtime-manifest.json').hash=bypassDigest;
    const bypassFiles = new Map(files);
    bypassFiles.set('runtime-manifest.json',bypassBytes);
    bypassFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(bypassOuter)));
    bypassFiles.set('attestation.json',new TextEncoder().encode(JSON.stringify(createWorkflowArtifactAttestation(bypassOuter,{privateKey,keyId:'test'}))));
    await assert.rejects(admitWorkflowArtifact({async read(){return bypassFiles;}},{...registration,runtimeManifestSha256:bypassDigest,artifactManifestSha256:workflowArtifactManifestHash(bypassOuter)},policy),/not_admitted/);
    const agentBytes = new TextEncoder().encode(JSON.stringify({...bundle.agentContracts,agents:[]}));
    const agentOuter = structuredClone(manifest);
    agentOuter.files.find((file:{path:string})=>file.path==='agent-contracts.json').hash =
      'sha256:'+createHash('sha256').update(agentBytes).digest('hex');
    const agentFiles = new Map(files);
    agentFiles.set('agent-contracts.json',agentBytes);
    agentFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(agentOuter)));
    agentFiles.set('attestation.json',new TextEncoder().encode(JSON.stringify(createWorkflowArtifactAttestation(agentOuter,{privateKey,keyId:'test'}))));
    await assert.rejects(admitWorkflowArtifact({async read(){return agentFiles;}},
      {...registration,artifactManifestSha256:workflowArtifactManifestHash(agentOuter)},policy),/not_admitted/);
    files.get('runtime-manifest.json')![0]^=1;
    await assert.rejects(admitWorkflowArtifact(reader,registration,policy));
  } finally { await rm(root,{recursive:true,force:true}); }
});
