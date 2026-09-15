import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBuildRuntimeBinding } from '../src/build-runtime-binding.js';
const digest = 'sha256:'+'a'.repeat(64);
const binding = {
  schema:'create-something/build-runtime-binding@1',buildReleaseId:'release',contractSha256:digest,runtimePolicySha256:digest,
  artifactManifestSha256:digest,runtimeManifestSha256:digest,workflowId:'marketplace',workflowVersion:'1',definitionHash:digest,
  compilerVersion:'compiler-v1',runtimeManifestSchema:'workflow_runtime_manifest.v0.2',attestationKeyId:'signer',
  attestationPublicKeyFingerprint:digest,artifactPrefix:'workflow-artifacts/'+'a'.repeat(64)+'/'
};
test('binding parses a closed immutable compiler identity without containing Build hash',()=>{
  const result = parseBuildRuntimeBinding(binding);
  assert.deepEqual(result,binding);
  assert.ok(Object.isFrozen(result));
  assert.throws(()=>parseBuildRuntimeBinding({...binding,buildManifestSha256:digest}));
  for (const field of Object.keys(binding)) {
    const missing: Record<string,unknown> = {...binding}; delete missing[field];
    assert.throws(()=>parseBuildRuntimeBinding(missing),field);
    assert.throws(()=>parseBuildRuntimeBinding({...binding,[field]:null}),field);
  }
});
test('binding rejects unknown schemas, unsafe prefix and malformed identity',()=>{
  for (const changed of [
    {schema:'unknown'},{runtimeManifestSchema:'workflow_runtime_manifest.v9'},
    {artifactPrefix:'other/'},{artifactManifestSha256:'a'.repeat(64)},
    {contractSha256:'sha256:'+'A'.repeat(64)},{workflowId:' '},{buildReleaseId:' release'},
    {attestationKeyId:'x'.repeat(301)}
  ]) assert.throws(()=>parseBuildRuntimeBinding({...binding,...changed}));
});
