import { publishControlBuildBinding } from '../src/control-build-binding-publication.js';
import { execFileSync } from 'node:child_process';
import { d1, literal } from './sqlite-d1.fixture.js';
import { activationColumns } from '../src/control-activation-binding.js';
import { registerVerifiedBuildRuntime } from '../src/build-runtime-registration-writer.js';
import { D1WorkflowArtifactRegistrationReader } from '../src/workflow-artifact-registration.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkflowArtifactAttestation, workflowArtifactManifestHash, compileWorkflowDefinition, createWorkflowRuntimeManifest, writeCompiledWorkflowArtifacts, verifyWorkflowArtifactBundle } from '@createsomething/workflow-compiler';
import { verifyBuildRuntimeRegistration } from '../src/build-runtime-registration-verifier.js';
import { writeRepresentativePackage } from '../../delivery-schema/test/build-release.fixture.js';
import { inspectBuildReleasePackage } from '@create-something/delivery-schema/build-release';
import type { FrozenControlActivation } from '../src/control.js';
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
    const binding = {
      ...registration, schema:'create-something/build-runtime-binding@1',
      buildReleaseId:'release_example_001',
      runtimePolicySha256:'sha256:'+'b'.repeat(64),
      artifactPrefix:`workflow-artifacts/${registration.artifactManifestSha256.slice(7)}/`
    };
    const build = writeRepresentativePackage({runtimeBinding:JSON.stringify(binding)});
    try {
      const inspected = inspectBuildReleasePackage(build.manifestPath);
      const buildManifest = inspected.manifest!;
      const activation: FrozenControlActivation = {
        id:'activation-test', activationVersion:1, activationKind:'initial', status:'active',
        accountId:'account_example',tenantId:'tenant_example',workspaceAccountId:'workspace_example',
        mapId:'map_example_001',mapVersionId:'map-version-test',mapVersion:3,mapCanvasSha256:'c'.repeat(64),
        handoffId:'handoff_example_001',handoffReceiptSha256:buildManifest.handoff.receiptSha256,
        buildReleaseId:buildManifest.releaseId,buildManifestSha256:inspected.manifestSha256!,
        buildArtifactSetSha256:inspected.acceptanceReceipt!.artifactSetSha256,
        buildAcceptanceReceiptId:inspected.acceptanceReceipt!.receiptId,
        buildAcceptanceReceiptSha256:buildManifest.acceptance.receiptSha256,
        contractSha256:'a'.repeat(64),policySha256:'b'.repeat(64),policyVersion:'test',
        entitlementSnapshotSha256:'d'.repeat(64),allowedTools:[],allowedResources:[]
      };
      // Agency derives this enclosing contract only after accepted Build hashes
      // exist. It is deliberately absent from the hashed binding artifact.
      activation.contractSha256 = createHash('sha256').update(JSON.stringify({
        source:{buildManifestSha256:activation.buildManifestSha256,buildArtifactSetSha256:activation.buildArtifactSetSha256},
        policy:{sha256:activation.policySha256}
      })).digest('hex');
      assert.equal('contractSha256' in binding,false);
      const databasePath = join(build.root,'registration.sqlite');
      const columns = Object.entries(activationColumns);
      const values = columns.map(([key]) => {
        const value = activation[key as keyof typeof activation];
        return literal(Array.isArray(value)?JSON.stringify(value):value);
      });
      execFileSync('sqlite3',[databasePath],{input:`CREATE TABLE customer_control_activations (
        ${columns.map(([key,column])=>`${column} ${typeof activation[key as keyof typeof activation] === 'number'?'INTEGER':'TEXT'} ${key==='id'?'PRIMARY KEY':''}`).join(',')});
        INSERT INTO customer_control_activations VALUES (${values.join(',')});
        ${await readFile(new URL('../../agency/migrations/0057_control_runtime_registrations.sql',import.meta.url),'utf8')}`});
      const database = d1(databasePath);
      const request = {manifestPath:build.manifestPath,scope:activation,activationId:activation.id,verifiedBy:'fixture-operator'};
      // Suspension while signed bytes are being read must prevent the write.
      await assert.rejects(registerVerifiedBuildRuntime(database,request,{async read(){
        execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='suspended';"});
        return files;
      }},policy),/activation_changed/);
      assert.equal(execFileSync('sqlite3',[databasePath,'SELECT COUNT(*) FROM customer_control_runtime_registrations;'],{encoding:'utf8'}).trim(),'0');
      execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='active';"});
      const written = await registerVerifiedBuildRuntime(database,request,reader,policy);
      for (const migration of ['0003_control_run_lifecycle.sql','0004_control_workflow_runtime_zero_write.sql','0014_control_verified_build_bindings.sql'])
        execFileSync('sqlite3',[databasePath],{input:await readFile(new URL('../migrations/'+migration,import.meta.url),'utf8')});
      execFileSync('sqlite3',[databasePath],{input:`INSERT INTO control_runs
        (id,account_id,tenant_id,workspace_account_id,activation_id,activation_version,activation_json,status,version,attempt,concurrency_key,
         requested_tools_json,requested_resources_json,created_by,created_at,updated_at)
        VALUES ('published-run',${literal(activation.accountId)},${literal(activation.tenantId)},${literal(activation.workspaceAccountId)},
          ${literal(activation.id)},1,${literal(JSON.stringify(activation))},'queued',1,1,'publication','[]','[]','fixture','2026-09-15T00:00:00.000Z','2026-09-15T00:00:00.000Z');`});
      const publication = {scope:activation,runId:'published-run'};
      await assert.rejects(publishControlBuildBinding(database,database,publication,{async read(){
        execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='suspended';"});
        return files;
      }},policy),/registration_changed/);
      assert.equal(execFileSync('sqlite3',[databasePath,'SELECT COUNT(*) FROM control_workflow_runtime_build_bindings;'],{encoding:'utf8'}).trim(),'0');
      execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='active';"});
      await publishControlBuildBinding(database,database,publication,reader,policy);
      const published = JSON.parse(execFileSync('sqlite3',['-json',databasePath,'SELECT * FROM control_workflow_runtime_build_bindings;'],{encoding:'utf8'}))[0];
      assert.equal(published.binding_sha256,written.bindingSha256);
      assert.equal(published.artifact_manifest_sha256,registration.artifactManifestSha256);
      assert.equal(published.build_manifest_sha256,'sha256:'+written.buildManifestSha256);
      await publishControlBuildBinding(database,database,publication,reader,policy);
      assert.equal(execFileSync('sqlite3',[databasePath,'SELECT COUNT(*) FROM control_workflow_runtime_build_bindings;'],{encoding:'utf8'}).trim(),'1');
      const stored = await new D1WorkflowArtifactRegistrationReader(database).find(activation);
      assert.equal(stored?.bindingSha256,written.bindingSha256);
      assert.equal(stored?.buildManifestSha256,written.buildManifestSha256);
      assert.equal(stored?.artifactManifestSha256,written.binding.artifactManifestSha256);
      await assert.rejects(registerVerifiedBuildRuntime(database,request,reader,policy),/immutable/);
      const verified = await verifyBuildRuntimeRegistration(build.manifestPath,activation,reader,policy);
      assert.equal(verified.buildManifestSha256, inspected.manifestSha256);
      assert.notEqual('sha256:'+verified.buildManifestSha256, verified.binding.artifactManifestSha256);
      assert.equal(verified.binding.artifactManifestSha256,registration.artifactManifestSha256);
      assert.equal(verified.bindingSha256,'sha256:'+buildManifest.artifacts.runtime_binding!.sha256);
      assert.ok(Object.isFrozen(verified) && Object.isFrozen(verified.binding));
      for (const field of ['status','accountId','workspaceAccountId','mapId','mapVersion','handoffId',
        'handoffReceiptSha256','buildReleaseId','buildManifestSha256','buildArtifactSetSha256',
        'buildAcceptanceReceiptId','buildAcceptanceReceiptSha256','policySha256']) {
        await assert.rejects(verifyBuildRuntimeRegistration(build.manifestPath,{...activation,[field]:'wrong'},reader,policy),/not_verified/);
      }
      await assert.rejects(verifyBuildRuntimeRegistration(build.manifestPath,activation,reader,{...policy,signer:{...policy.signer,keyId:'other'}}));
      const missing = new Map(files); missing.delete('runtime-manifest.json');
      await assert.rejects(verifyBuildRuntimeRegistration(build.manifestPath,activation,{async read(){return missing;}},policy));
    } finally { await rm(build.root,{recursive:true,force:true}); }
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
    files.get('runtime-manifest.json')![0]^=1;
    await assert.rejects(admitWorkflowArtifact(reader,registration,policy));
  } finally { await rm(root,{recursive:true,force:true}); }
});
