import { composeTemplateReviewControl } from '../src/template-review-control-composition.js';
import { createControlRunWorker } from '../src/control-worker.js';
import { D1WorkflowRuntimeWakeReconciler } from '../src/workflow-runtime-wake-reconciler.js';
import { WorkflowRuntimeQueue, type WorkflowRuntimeWake } from '../src/workflow-runtime-queue.js';
import { workflowRuntimeIdentity } from '../src/workflow-runtime-identity.js';
import { createTemplateReviewHost } from '../src/template-review-host.js';
import { D1VerifiedWorkflowRuntimeReceiptSink } from '../src/workflow-runtime-receipt-sink.js';
import { D1WorkflowRuntimeSourceBindings, handoffRequestDigest } from '../src/workflow-runtime-source-binding.js';
import { D1TemplateReviewHandoffEvidenceStore } from '../src/template-review-handoff-store.js';
import { reduceWorkflowRuntimeRun, planWorkflowRuntimeStep } from '@createsomething/workflow-runtime';
import { D1WorkflowRuntimeHandoffProofReader } from '../src/workflow-runtime-handoff-proof.js';
import { createControlRunService, ControlRunConflictError } from '../src/control.js';
import { D1ControlRunRepository, D1ControlActivationAuthority } from '../src/control-store.js';
import { D1VerifiedBuildWorkflowRuntimeProofReader } from '../src/workflow-runtime-proof-projection.js';
import { createWorkflowRuntimeRun, type RuntimeDigest } from '../../workflow-runtime/src/index.js';
import { D1WorkflowRuntimeCheckpointStore } from '../src/workflow-runtime-store.js';
import { RegisteredWorkflowManifestAuthority } from '../src/registered-workflow-manifest-authority.js';
import { publishControlBuildBinding } from '../src/control-build-binding-publication.js';
import { execFileSync } from 'node:child_process';
import { d1, literal } from './sqlite-d1.fixture.js';
import { activationColumns } from '../src/control-activation-binding.js';
import { registerVerifiedBuildRuntime } from '../src/build-runtime-registration-writer.js';
import { D1WorkflowArtifactRegistrationReader } from '../src/workflow-artifact-registration.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
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
    const observationAction = definition.actions.find((action: {id:string}) => action.id === 'validate_submission');
    observationAction.kind = 'read';
    observationAction.title = 'Observe template handoff';
    observationAction.requiredEvidence.push('assetId', 'versionId');
    const gate = definition.actions.find((action: {id:string}) => action.id === 'run_published_validation');
    gate.title = 'Authorize handoff observation';
    gate.kind = 'decision';
    gate.autonomy = 'approval_required';
    gate.approval = { required: true, owner: 'account-owner' };
    delete gate.tool;
    observationAction.tool = { name: 'template_review_observe_handoff', targetSystemId: 'template-review-mcp',
      parameters: [{ name: 'assetId', type: 'string', description: 'Exact registered asset ID.' },
        { name: 'versionId', type: 'string', description: 'Exact registered version ID.' }] };
    const bundle = compileWorkflowDefinition(definition);
    const runtime = createWorkflowRuntimeManifest(bundle, {
      schemaVersion: 'workflow_runtime_manifest_input.v0.1', target: 'create-something/control-runtime.v1',
      approvalExpiresAt: '2026-12-31T00:00:00.000Z', steps: [
        {id:'authorize',actionId:'run_published_validation',dependsOn:[]},
        {id:'validate',actionId:'validate_submission',dependsOn:['authorize']}]
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
      sourceDefinition:definition,
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
        entitlementSnapshotSha256:'d'.repeat(64),allowedTools:['template_review_observe_handoff'],
        allowedResources:['https://webflow-template-review-mcp.createsomething.workers.dev/mcp']
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
      await assert.rejects(registerVerifiedBuildRuntime(database,request,reader,
        {...policy,sourceDefinition:{...definition,title:'A different registered source'}}),/not_admitted/);
      assert.equal(execFileSync('sqlite3',[databasePath,'SELECT COUNT(*) FROM customer_control_runtime_registrations;'],{encoding:'utf8'}).trim(),'0');
      // Suspension while signed bytes are being read must prevent the write.
      await assert.rejects(registerVerifiedBuildRuntime(database,request,{async read(){
        execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='suspended';"});
        return files;
      }},policy),/activation_changed/);
      assert.equal(execFileSync('sqlite3',[databasePath,'SELECT COUNT(*) FROM customer_control_runtime_registrations;'],{encoding:'utf8'}).trim(),'0');
      execFileSync('sqlite3',[databasePath],{input:"UPDATE customer_control_activations SET status='active';"});
      const written = await registerVerifiedBuildRuntime(database,request,reader,policy);
      for (const migration of (await readdir(new URL('../migrations/',import.meta.url))).filter(name => /^\d{4}_control/.test(name)).sort())
        execFileSync('sqlite3',[databasePath],{input:await readFile(new URL('../migrations/'+migration,import.meta.url),'utf8')});
      const control = createControlRunService({
        repository:new D1ControlRunRepository(database),
        activations:new D1ControlActivationAuthority(database),
        executor:{supports:()=>true,async execute(){assert.fail('admission must not execute');}},
        id:()=> 'published-run',clock:()=>new Date('2026-09-15T00:00:00.000Z')
      });
      const parent = await control.start(activation,{subject:'fixture-operator',role:'account_owner'},{
        activationId:activation.id,idempotencyKey:'signed-parent',requestedTools:[],
        requestedResources:[],concurrencyKey:'publication'
      });
      const publication = {scope:activation,runId:parent.id};
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
      const manifests = new RegisteredWorkflowManifestAuthority(reader,[{registration,policy}]);
      const checkpoints = new D1WorkflowRuntimeCheckpointStore(database,manifests,
        manifests.approvalSurfaces,'verified-build-v2');
      const verifiedRuntime = await manifests.findByRuntimeManifestSha256(registration.runtimeManifestSha256 as RuntimeDigest);
      assert.ok(verifiedRuntime);
      const admittedRun = await createWorkflowRuntimeRun(verifiedRuntime,{
        runId:publication.runId,
        activation:{id:activation.id,version:activation.activationVersion,
          policySha256:('sha256:'+activation.policySha256) as RuntimeDigest},
        registration:{buildReleaseId:activation.buildReleaseId,
          contractSha256:('sha256:'+activation.contractSha256) as RuntimeDigest,
          runtimePolicySha256:('sha256:'+activation.policySha256) as RuntimeDigest},
        artifactManifestSha256:registration.artifactManifestSha256 as RuntimeDigest,
        runtimeManifestSha256:registration.runtimeManifestSha256 as RuntimeDigest,
        clock:'2026-09-15T00:00:00.000Z'
      });
      await checkpoints.apply({scope:activation,run:admittedRun,expectedVersion:null,
        idempotencyKey:'signed-admission',commandDigest:'a'.repeat(64)});
      assert.deepEqual(await checkpoints.find(activation,publication.runId),admittedRun);
      const legacyStore = new D1WorkflowRuntimeCheckpointStore(database, manifests, manifests.approvalSurfaces);
      assert.equal(await legacyStore.find(activation, publication.runId), undefined);
      assert.equal(await legacyStore.replay(activation, 'signed-admission', 'a'.repeat(64)), undefined);
      await assert.rejects(legacyStore.apply({ scope: activation, run: admittedRun, expectedVersion: admittedRun.version,
        idempotencyKey: 'legacy-v2-update', commandDigest: 'f'.repeat(64) }), /selected binding mode/);
      const sourceBindings = new D1WorkflowRuntimeSourceBindings(database, manifests);
      const signedStep = verifiedRuntime.steps.find(step => step.id === 'validate')!;
      assert.equal(signedStep.disposition, 'pass');
      const sourceInput = { scope: activation, runId: publication.runId, stepId: signedStep.id,
        capabilityId: signedStep.capability.id, capabilityParameterSha256: signedStep.capability.parameterDigest,
        assetId: 'recAAAAAAAAAAAAAA', versionId: 'recBBBBBBBBBBBBBB' };
      await assert.rejects(sourceBindings.publish({ ...sourceInput, capabilityId: 'prototype-capability' }), /compiled_capability_mismatch/);
      const sourceBinding = await sourceBindings.publish(sourceInput);
      assert.equal(sourceBinding.request_sha256, await handoffRequestDigest(sourceInput.assetId, sourceInput.versionId));
      assert.notEqual(sourceBinding.request_sha256, sourceBinding.capability_parameter_sha256);
      assert.deepEqual(await sourceBindings.publish(sourceInput), sourceBinding);
      await assert.rejects(sourceBindings.publish({ ...sourceInput, assetId: 'recCCCCCCCCCCCCCC' }), /binding_conflict/);
      await assert.rejects(sourceBindings.find({ ...activation, tenantId: 'other' }, publication.runId, signedStep.id), /checkpoint_unavailable/);
      for (const sql of [
        "UPDATE control_workflow_runtime_source_bindings SET asset_id='recCCCCCCCCCCCCCC'",
        'DELETE FROM control_workflow_runtime_source_bindings',
        'INSERT OR REPLACE INTO control_workflow_runtime_source_bindings SELECT * FROM control_workflow_runtime_source_bindings'
      ]) assert.throws(() => execFileSync('sqlite3', [databasePath], { input: sql }), /immutable|unexecuted_checkpoint/);
      assert.equal(execFileSync('sqlite3',[databasePath,
        'SELECT build_binding_version FROM control_workflow_runtime_runs;'],{encoding:'utf8'}).trim(),'2');
      const proof = await new D1VerifiedBuildWorkflowRuntimeProofReader(database,manifests).find(publication);
      assert.ok(proof && proof.schema === 'create-something/workflow-runtime-proof@2');
      assert.equal(proof.buildBinding.bindingSha256,written.bindingSha256);
      assert.equal(proof.buildBinding.buildManifestSha256,'sha256:'+written.buildManifestSha256);
      assert.equal(proof.run.artifactManifestSha256,registration.artifactManifestSha256);
      const proofScope = {accountId:activation.accountId,tenantId:activation.tenantId,
        workspaceAccountId:activation.workspaceAccountId};
      const transport = createControlRunWorker({service:control,
        identity:{async resolve(request){
          if(request.headers.get('authorization') !== 'Bearer fixture') return undefined;
          return {scope:proofScope,actor:{subject:'fixture-operator',role:'account_owner'},credentialSource:'bearer'};
        }},
        proofs:new D1WorkflowRuntimeHandoffProofReader(database,manifests,30_000,'verified-build-v2')
      });
      const headers={authorization:'Bearer fixture','content-type':'application/json'};
      const proofUrl=`https://runtime.example/v1/control/runs/${parent.id}/proof`;
      assert.equal((await transport.fetch(new Request(proofUrl)))?.status,401);
      const http = await transport.fetch(new Request(proofUrl,{headers}));
      assert.equal(http?.status,200);
      const httpBody = await http!.json() as {proof:{runtime:unknown}};
      assert.deepEqual(httpBody.proof.runtime,proof);
      const mcp = await transport.fetch(new Request('https://runtime.example/mcp',{
        method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',
          params:{name:'control_run_proof',arguments:{run_id:parent.id}}})
      }));
      const mcpBody=await mcp!.json() as {result:{structuredContent:unknown}};
      assert.deepEqual(mcpBody.result.structuredContent,httpBody);
      const approvalPlan = await planWorkflowRuntimeStep(verifiedRuntime, admittedRun);
      assert.equal(approvalPlan.type, 'wait');
      const waiting = await reduceWorkflowRuntimeRun(verifiedRuntime, admittedRun, {
        type: 'wait_created', stepId: approvalPlan.stepId, approval: approvalPlan.approval,
        observedAt: '2026-09-15T00:00:00.000Z' });
      await checkpoints.apply({ scope: proofScope, run: waiting, expectedVersion: admittedRun.version,
        idempotencyKey: 'mapped-wait', commandDigest: '1'.repeat(64) });
      const authorized = await reduceWorkflowRuntimeRun(verifiedRuntime, waiting, {
        type: 'approval_decided', stepId: approvalPlan.stepId, approvalId: approvalPlan.approval.id,
        approvalBindingSha256: approvalPlan.approval.bindingSha256, decision: 'approved',
        actorSubject: 'fixture-operator', actorRole: 'account_owner', observedAt: '2026-09-15T00:00:00.000Z' });
      await checkpoints.apply({ scope: proofScope, run: authorized, expectedVersion: waiting.version,
        idempotencyKey: 'mapped-approve', commandDigest: '2'.repeat(64) });
      const prepared = await reduceWorkflowRuntimeRun(verifiedRuntime, authorized, {
        type: 'effect_intent', stepId: signedStep.id, attemptId: 'mapped-attempt',
        capability: signedStep.capability, observedAt: '2026-09-15T00:00:01.000Z' });
      await checkpoints.apply({ scope: proofScope, run: prepared, expectedVersion: authorized.version,
        idempotencyKey: 'mapped-intent', commandDigest: 'c'.repeat(64) });
      const evidenceStore = new D1TemplateReviewHandoffEvidenceStore(database, manifests, 30_000, 0, true);
      const observationInput = { scope: activation, runId: parent.id, stepId: signedStep.id, attemptId: 'mapped-attempt',
        sourceInvocationSha256: 'sha256:'+'d'.repeat(64), dispatchedAt: '2026-09-15T00:00:02.000Z',
        receivedAt: '2026-09-15T00:00:03.000Z', observation: {
          schema: 'create-something/template-handoff-observation@1', dataClassification: 'minimized_status_evidence',
          requestSha256: sourceBinding.request_sha256, observedAt: '2026-09-15T00:00:02.000Z',
          state: 'confirmed', reason: 'review_ready', nextAction: 'await_review', evidenceSha256: 'sha256:'+'e'.repeat(64) } };
      await assert.rejects(evidenceStore.record({ ...observationInput,
        observation: { ...observationInput.observation, requestSha256: signedStep.capability.parameterDigest } }), /handoff_observation_context_mismatch/);
      const mappedEvidence = await evidenceStore.record(observationInput);
      assert.deepEqual(mappedEvidence.sourceBinding, sourceBinding);
      assert.deepEqual(await evidenceStore.record(observationInput), mappedEvidence);
      const mappedProof = await new D1WorkflowRuntimeHandoffProofReader(database, manifests, 30_000, 'verified-build-v2', true).find(publication);
      assert.deepEqual(mappedProof?.handoffObservations, [mappedEvidence]);
      await assert.rejects(new D1WorkflowRuntimeHandoffProofReader(database, manifests, 30_000, 'verified-build-v2').find(publication), /attempt_mismatch/);
      execFileSync('sqlite3', [databasePath], { input: await readFile(new URL('../../agency/migrations/0056_control_source_permits.sql', import.meta.url), 'utf8') });
      let sourceCalls = 0;
      let scheduledQueue: WorkflowRuntimeQueue;
      const wakes: WorkflowRuntimeWake[] = [];
      let earlyDelivery = true;
      let sourceMode: 'healthy' | 'unknown' | 'late-stop' = 'healthy';
      let stopDuringSource: (() => Promise<void>) | undefined;
      const hostInput: Parameters<typeof createTemplateReviewHost>[0] = { runtimeDb: database, agencyDb: database, activation, policy,
        artifacts: reader, parameters: { assetId: sourceInput.assetId, versionId: sourceInput.versionId },
        observationStep: { stepId: signedStep.id, capabilityId: signedStep.capability.id,
          capabilityParameterSha256: signedStep.capability.parameterDigest },
        source: { async observe(parameters) {
          sourceCalls++;
          assert.deepEqual(parameters, { assetId: sourceInput.assetId, versionId: sourceInput.versionId });
          if (sourceMode === 'unknown') throw new Error('fixture transport lost response');
          if (sourceMode === 'late-stop') await stopDuringSource!();
          return { ...observationInput.observation, observedAt: '2026-09-15T00:00:05.000Z' };
        } }, maximumAgeMs: 30_000, maximumClockSkewMs: 0, schedulerSubject: 'fixture-scheduler',
        clock: () => '2026-09-15T00:00:05.000Z',
        identity: actor => workflowRuntimeIdentity({
          context: { scope: proofScope, actor: actor ?? { subject: 'fixture-scheduler', role: 'control_scheduler' },
            credentialSource: 'bearer', ...(actor ? {} : { schedulerActivationId: activation.id }) },
          activationId: activation.id, approvalPolicies: { 'account-owner': ['account_owner'] }
        }), queue: { async enqueue(message) { await scheduledQueue.enqueue(message); } } };
      const host = await createTemplateReviewHost(hostInput);
      assert.equal(host.executor.supports({ ...activation, contractSha256: 'f'.repeat(64) }), false);
      let executionId = 0;
      const executingControl = createControlRunService({ repository: new D1ControlRunRepository(database),
        activations: new D1ControlActivationAuthority(database), executor: host.executor,
        runtimeApprovals: host.runtimeApprovals, id: () => `signed-execution-${++executionId}`,
        clock: () => new Date('2026-09-15T00:00:05.000Z') });
      scheduledQueue = new WorkflowRuntimeQueue({ scope: proofScope, checkpoints, parents: new D1ControlRunRepository(database),
        async send(message) { if (message.expectedVersion !== null) assert.ok(await sourceBindings.find(proofScope, message.runId, signedStep.id), 'source binding precedes exposed checkpoint wake'); wakes.push(message); if (earlyDelivery) assert.equal(await scheduledQueue.consume(message), 'retry', 'wake before parent transition must wait'); },
        process: (runId, key) => executingControl.process(proofScope, { subject: 'fixture-scheduler', role: 'control_scheduler' }, runId, key, activation.id) });
      const reconciler = new D1WorkflowRuntimeWakeReconciler(database, activation, scheduledQueue);
      const execution = await executingControl.start(proofScope, { subject: 'fixture-operator', role: 'account_owner' },
        { activationId: activation.id, idempotencyKey: 'signed-execution-start', concurrencyKey: 'signed-execution',
          requestedTools: activation.allowedTools, requestedResources: activation.allowedResources });
      async function approveSignedRun(runId: string) {
        const before: number = sourceCalls;
        earlyDelivery = false;
        assert.equal(await reconciler.reconcile(), 1);
        const initialWake = wakes.at(-1)!;
        assert.equal(initialWake.expectedVersion, null);
        earlyDelivery = true;
        assert.equal(await scheduledQueue.consume(initialWake), 'ack');
        const waitingParent = await executingControl.get(proofScope, { subject: 'fixture-operator', role: 'account_owner' }, runId);
        assert.equal(waitingParent.status, 'waiting_for_approval');
        assert.equal(sourceCalls, before, 'signed wait cannot invoke source');
        const waitingProof = await host.proofs.find({ scope: proofScope, runId });
        assert.equal(waitingProof?.runtime.run.status, 'waiting_for_approval');
        const waitingCheckpoint = (await checkpoints.find(proofScope, runId))!;
        const step = waitingCheckpoint.steps.find(step => step.id === 'authorize')!;
        const binding = { step_id: step.id, approval_id: step.approval!.id,
          binding_sha256: step.approval!.bindingSha256, checkpoint_version: waitingProof!.runtime.run.version };
        const owner = { subject: 'fixture-operator', role: 'account_owner' as const };
        await assert.rejects(executingControl.approve(proofScope, owner, runId, `${runId}-approve`, 'explicit observation approval'), /Exact runtime approval/);
        await executingControl.approve(proofScope, owner, runId, `${runId}-approve`, 'explicit observation approval', binding);
        await executingControl.approve(proofScope, owner, runId, `${runId}-approve`, 'explicit observation approval', binding);
        assert.equal(sourceCalls, before);
      }
      await approveSignedRun(execution.id);
      wakes.length = 0; // Simulate lost transport delivery after the approval commit.
      earlyDelivery = false;
      assert.equal(await reconciler.reconcile(), 1);
      const approvedWake = wakes.at(-1)!;
      assert.equal(await scheduledQueue.consume(approvedWake), 'ack');
      const completed = await executingControl.get(proofScope, { subject: 'fixture-operator', role: 'account_owner' }, execution.id);
      assert.equal(completed.status, 'completed');
      assert.equal(sourceCalls, 1);
      const executionProof = await host.proofs.find({ scope: proofScope, runId: execution.id });
      assert.equal(executionProof?.runtime.run.status, 'completed');
      assert.equal(executionProof?.handoffObservations.length, 1);
      assert.equal(executionProof?.sourceBindings?.[0].capability_id, signedStep.capability.id);
      const completedCheckpoint = (await checkpoints.find(proofScope, execution.id))!;
      const sink = new D1VerifiedWorkflowRuntimeReceiptSink(database, manifests, proofScope);
      await sink.write(completedCheckpoint);
      assert.equal(executionProof!.runtime.receipts.length, completedCheckpoint.receipts.length);
      await assert.rejects(new D1VerifiedWorkflowRuntimeReceiptSink(database, manifests,
        { ...proofScope, tenantId: 'other' }).write(completedCheckpoint), /ledger_mismatch/);
      const corrupted = structuredClone(completedCheckpoint);
      corrupted.receipts[0].receiptSha256 = ('sha256:' + 'f'.repeat(64)) as RuntimeDigest;
      await assert.rejects(sink.write(corrupted));
      for (const wake of wakes) assert.equal(await scheduledQueue.consume(wake), 'ack');
      assert.equal(sourceCalls, 1, 'signed execution replay never calls the source twice');
      assert.equal(await reconciler.reconcile(), 0, 'terminal runs are not republished');
      const composedWakes: WorkflowRuntimeWake[] = [];
      const ownerActor = { subject: 'fixture-operator', role: 'account_owner' as const };
      const compositionInput = { ...hostInput, approvalPolicies: { 'account-owner': ['account_owner' as const] },
        async send(message: WorkflowRuntimeWake) { composedWakes.push(message); } };
      const operatorComposition = await composeTemplateReviewControl({ ...compositionInput,
        context: { scope: proofScope, actor: ownerActor, credentialSource: 'bearer' } });
      await assert.rejects(operatorComposition.consume({}), /activation-bound scheduler/);
      await assert.rejects(operatorComposition.reconcile(), /activation-bound scheduler/);
      const schedulerComposition = await composeTemplateReviewControl({ ...compositionInput,
        context: { scope: proofScope, actor: { subject: 'fixture-scheduler', role: 'control_scheduler' },
          credentialSource: 'bearer', schedulerActivationId: activation.id } });
      const composedRun = await operatorComposition.service.start(proofScope, ownerActor,
        { activationId: activation.id, idempotencyKey: 'composition-start', concurrencyKey: 'composition',
          requestedTools: activation.allowedTools, requestedResources: activation.allowedResources });
      const beforeComposition = sourceCalls;
      assert.equal(await schedulerComposition.reconcile(), 1);
      assert.equal(await schedulerComposition.consume(composedWakes.at(-1)), 'ack');
      assert.equal(sourceCalls, beforeComposition);
      const composedCheckpoint = (await checkpoints.find(proofScope, composedRun.id))!;
      const composedApproval = composedCheckpoint.steps.find(step => step.id === 'authorize')!.approval!;
      await operatorComposition.service.approve(proofScope, ownerActor, composedRun.id,
        'composition-approve', 'explicit observation approval', { step_id: 'authorize',
          approval_id: composedApproval.id, binding_sha256: composedApproval.bindingSha256,
          checkpoint_version: composedCheckpoint.version });
      assert.equal(await schedulerComposition.consume(composedWakes.at(-1)), 'ack');
      const composedProof = await operatorComposition.proofs.find({ scope: proofScope, runId: composedRun.id });
      assert.equal(composedProof?.runtime.run.status, 'completed');
      assert.equal(sourceCalls, beforeComposition + 1);
      for (const wake of composedWakes) assert.equal(await schedulerComposition.consume(wake), 'ack');
      assert.equal(sourceCalls, beforeComposition + 1);
      earlyDelivery = true;
      for (const mode of ['unknown', 'late-stop'] as const) {
        sourceMode = mode;
        const before: number = sourceCalls;
        const interrupted = await executingControl.start(proofScope, { subject: 'fixture-operator', role: 'account_owner' },
          { activationId: activation.id, idempotencyKey: `signed-${mode}-start`, concurrencyKey: `signed-${mode}`,
            requestedTools: activation.allowedTools, requestedResources: activation.allowedResources });
        stopDuringSource = async () => {
          await executingControl.stop(proofScope, { subject: 'fixture-operator', role: 'account_owner' },
            interrupted.id, 'signed-late-stop', 'operator stopped during source read');
        };
        await approveSignedRun(interrupted.id);
        const process = () => executingControl.process(proofScope, { subject: 'fixture-scheduler', role: 'control_scheduler' },
          interrupted.id, `signed-${mode}-process`, activation.id);
        if (mode === 'late-stop') await assert.rejects(process, ControlRunConflictError);
        else assert.equal((await process()).status, 'failed');
        const stopped = await executingControl.get(proofScope, { subject: 'fixture-operator', role: 'account_owner' }, interrupted.id);
        assert.equal(stopped.status, mode === 'late-stop' ? 'stopped' : 'failed');
        const interruptedProof = await host.proofs.find({ scope: proofScope, runId: interrupted.id });
        assert.equal(interruptedProof?.runtime.run.status, 'running');
        assert.equal(interruptedProof?.handoffObservations.length, mode === 'late-stop' ? 1 : 0);
        assert.equal(interruptedProof?.runtime.receipts.some(receipt => receipt.eventType === 'step_succeeded'), false);
        if (mode === 'late-stop') await assert.rejects(process, ControlRunConflictError);
        else await process();
        assert.equal(sourceCalls, before + 1, 'interrupted signed process is never redispatched on replay');
        if (mode === 'unknown') {
          await assert.rejects(executingControl.retry(proofScope, { subject: 'fixture-operator', role: 'account_owner' },
            interrupted.id, 'unknown-retry'), /failed terminally/);
        } else {
          await executingControl.retry(proofScope, { subject: 'fixture-operator', role: 'account_owner' },
            interrupted.id, 'stopped-retry');
          const resumed = await executingControl.process(proofScope, { subject: 'fixture-scheduler', role: 'control_scheduler' },
            interrupted.id, 'stopped-resume', activation.id);
          assert.equal(resumed.status, 'failed', 'prepared effect requires reconciliation before recovery');
        }
        assert.equal(sourceCalls, before + 1, 'retry cannot dispatch an unresolved prepared effect');
      }
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
    const configured = [{registration:{...registration},policy:structuredClone(policy)}];
    const authority = new RegisteredWorkflowManifestAuthority(reader,configured);
    configured[0].registration.runtimeManifestSha256='sha256:'+'0'.repeat(64);
    configured[0].policy.capabilities=[];
    assert.deepEqual(await authority.findByRuntimeManifestSha256(registration.runtimeManifestSha256 as `sha256:${string}`),runtime);
    assert.equal(await authority.findByRuntimeManifestSha256('sha256:'+'0'.repeat(64) as `sha256:${string}`),undefined);
    assert.throws(()=>new RegisteredWorkflowManifestAuthority(reader,[{registration,policy},{registration,policy}]),/ambiguous/);
    const approvalSurface = await authority.approvalSurfaces.findByRuntimeManifestSha256(registration.runtimeManifestSha256 as `sha256:${string}`);
    assert.deepEqual(approvalSurface,{schemaVersion:bundle.approvalSurfaces.schemaVersion,sha256:runtime.artifacts.approvalSurfacesSha256});
    assert.ok(Object.isFrozen(approvalSurface));
    assert.equal(await authority.approvalSurfaces.findByRuntimeManifestSha256('sha256:'+'0'.repeat(64) as `sha256:${string}`),undefined);


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
    approvalBypass.steps.find((step: {disposition:string}) => step.disposition === 'pass')!.actionId = 'approve_template';
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
    const omittedFiles = new Map(files);
    const omittedBundle = structuredClone(bundle);
    omittedBundle.agentContracts.agents=[];
    omittedFiles.set('compiled-workflow.json',new TextEncoder().encode(JSON.stringify(omittedBundle)));
    omittedFiles.set('agent-contracts.json',new TextEncoder().encode(JSON.stringify(omittedBundle.agentContracts)));
    const omittedOuter=structuredClone(manifest);
    for(const entry of omittedOuter.files) entry.hash='sha256:'+createHash('sha256').update(omittedFiles.get(entry.path)!).digest('hex');
    omittedFiles.set('manifest.json',new TextEncoder().encode(JSON.stringify(omittedOuter)));
    omittedFiles.set('attestation.json',new TextEncoder().encode(JSON.stringify(createWorkflowArtifactAttestation(omittedOuter,{privateKey,keyId:'test'}))));
    await assert.rejects(admitWorkflowArtifact({async read(){return omittedFiles;}},
      {...registration,artifactManifestSha256:workflowArtifactManifestHash(omittedOuter)},policy),/not_admitted/);
    files.get('runtime-manifest.json')![0]^=1;
    await assert.rejects(authority.findByRuntimeManifestSha256(registration.runtimeManifestSha256 as `sha256:${string}`));
    await assert.rejects(authority.approvalSurfaces.findByRuntimeManifestSha256(registration.runtimeManifestSha256 as `sha256:${string}`));
    await assert.rejects(admitWorkflowArtifact(reader,registration,policy));
  } finally { await rm(root,{recursive:true,force:true}); }
});
