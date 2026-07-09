import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const coveragePath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));

test('atlas coverage maps every non-root topology node not covered by earlier waves', () => {
  assert.equal(coverage.id, 'substrate:create-something:atlas-coverage:internal');
  assert.equal(coverage.topologyId, topology.id);
  assert.ok(coverage.groups.length > 0);
  assert.ok(coverage.records.length > 0);
  assert.ok(coverage.records.every((record) => record.sourceRecord.status === 'ready'));
  assert.ok(coverage.records.every((record) => record.sourceRecord.bindingHealth === 'bound'));
});

test('atlas coverage groups packages, automation, policy, guide, and docs separately', () => {
  const surfaces = new Set(coverage.groups.map((group) => group.surface));
  const kinds = new Set(coverage.groups.map((group) => group.kind));

  assert.ok(surfaces.has('package'));
  assert.ok(surfaces.has('worker'));
  assert.ok(surfaces.has('policy'));
  assert.ok(surfaces.has('guide'));
  assert.ok(surfaces.has('doc'));
  assert.ok(kinds.has('automation_surface'));
  assert.ok(kinds.has('judgment_surface'));
  assert.ok(kinds.has('knowledge_surface'));
});

test('atlas coverage creates proof receipts and local review actions', () => {
  for (const record of coverage.records) {
    assert.equal(record.receipt.type, 'proof');
    assert.equal(record.receipt.recordId, record.recordId);
    assert.equal(record.reviewAction.recordId, record.recordId);
    assert.equal(record.reviewAction.state, 'wait');
    assert.ok(record.reviewAction.policy.includes('Atlas coverage review'));
  }
});

test('atlas coverage closes the current root topology gap queue', () => {
  assert.equal(topology.nodes.some((node) => node.status === 'needs_atlas'), false);
  assert.equal(topology.nodes.some((node) => node.status === 'needs_substrate'), false);
});
