import assert from 'node:assert/strict';
import test from 'node:test';
import { R2WorkflowArtifactReader, type WorkflowArtifactBucket } from '../src/workflow-artifact-reader.js';
const digest = `sha256:${'a'.repeat(64)}`;
const prefix = `workflow-artifacts/${'a'.repeat(64)}/`;
const encode = (value: string) => new TextEncoder().encode(value);
function bucket(files: Record<string, string>, calls: string[]): WorkflowArtifactBucket {
  return { async get(key) {
    calls.push(key);
    const value = files[key.slice(prefix.length)];
    if (value === undefined) return null;
    const bytes = encode(value);
    return { size: bytes.length, body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
  } };
}
test('loads only the content-addressed signed inventory without treating it as verified', async () => {
  const calls: string[] = [];
  const files = { 'manifest.json': JSON.stringify({ files: [{ path: 'runtime/manifest.json' }] }), 'attestation.json': '{}', 'runtime/manifest.json': '{}' };
  const result = await new R2WorkflowArtifactReader(bucket(files, calls)).read(digest);
  assert.deepEqual([...result.keys()], Object.keys(files));
  assert.deepEqual(calls, Object.keys(files).map(path => prefix + path));
});
test('rejects traversal, duplicates and reserved inventory paths before fetching them', async () => {
  for (const paths of [['../escape'], ['/escape'], ['x', 'x'], ['manifest.json'], ['attestation.json'], ['a/./b'], ['a%2fb']]) {
    const calls: string[] = [];
    await assert.rejects(new R2WorkflowArtifactReader(bucket({ 'manifest.json': JSON.stringify({ files: paths.map(path => ({path})) }) }, calls)).read(digest), /artifact_path_invalid/);
    assert.deepEqual(calls, [prefix + 'manifest.json']);
  }
});
test('rejects missing attestation and invalid digest', async () => {
  const calls: string[] = [];
  const reader = new R2WorkflowArtifactReader(bucket({ 'manifest.json': '{"files":[]}' }, calls));
  await assert.rejects(reader.read('../other'), /artifact_digest_invalid/);
  assert.equal(calls.length, 0);
  await assert.rejects(reader.read(digest), /artifact_missing/);
});
test('enforces actual stream bytes even when object metadata understates size', async () => {
  let cancelled = false;
  const reader = new R2WorkflowArtifactReader({ async get() { return { size: 1, body: new ReadableStream({ start(controller) { controller.enqueue(encode('too large')); }, cancel() { cancelled = true; } }) }; } });
  await assert.rejects(reader.read(digest), /artifact_size_limit/);
  assert.equal(cancelled, true);
});
