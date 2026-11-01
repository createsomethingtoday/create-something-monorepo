import assert from 'node:assert/strict';
import test from 'node:test';
import { composeTopology } from '../scripts/lib/ontology.mjs';

const node = (id) => ({ id, title: id, path: id, tier: 'Database', surface: 'package', status: 'mapped', owner: 'CREATE SOMETHING' });
test('independent modules compose without order dependence and reject identity conflicts', () => {
  const a = { id: 'a', nodes: [node('a')], edges: [] };
  const b = { id: 'b', nodes: [node('b')], edges: [{ id: 'b-a', source: 'b', target: 'a', relation: 'depends_on' }] };
  assert.deepEqual(composeTopology([a, b]), composeTopology([b, a]));
  assert.throws(() => composeTopology([a, { ...b, nodes: [{ ...node('a'), tier: 'Judgment' }] }]), /conflicting node/);
  assert.throws(() => composeTopology([b]), /unknown target/);
});

test('root package empty path is retained as repository-root evidence', () => {
  const graph = composeTopology([{ id: 'root', nodes: [{ ...node('root'), path: '' }], edges: [] }]);
  assert.equal(graph.nodes[0].path, '');
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exportTopologyRdf, exportShapes, exportVocabulary, topologyDigest, planTopologyChange } from '../scripts/lib/ontology.mjs';
const edge = (source, target) => ({ id: `${source}-${target}`, source, target, relation: 'depends_on' });
const fixture = () => ({ id: 'fixture', nodes: ['a', 'b', 'c'].map(node), edges: [edge('b', 'a'), edge('c', 'b'), edge('a', 'c')] });

test('unknown terms, duplicates, missing roots and malformed evidence fail closed', () => {
  for (const patch of [{ tier: 'Future' }, { status: 'verified' }, { surface: 'unknown' }]) {
    assert.throws(() => composeTopology([{ id: 'x', nodes: [{ ...node('a'), ...patch }], edges: [] }]), /unknown/);
  }
  assert.throws(() => composeTopology([{ id: 'x', nodes: [node('a'), node('a')], edges: [] }]), /duplicate node/);
  assert.throws(() => composeTopology([{ ...fixture(), rootNodeId: 'missing' }]), /unknown root/);
  for (const patch of [{ relation: '__proto__' }, { evidence: {} }]) {
    assert.throws(() => composeTopology([{ ...fixture(), edges: [{ ...edge('a', 'b'), ...patch }] }]), /unknown relation|evidence must/);
  }
});

test('equivalent shared identities deduplicate and RDF stays stable across module order', () => {
  const a = { id: 'a', nodes: [node('a')], edges: [] };
  const b = { id: 'b', nodes: [node('a'), node('b')], edges: [edge('b', 'a')] };
  const graph = composeTopology([a, b]);
  assert.equal(graph.nodes.length, 2);
  assert.equal(exportTopologyRdf(graph), exportTopologyRdf(composeTopology([b, a])));
  assert.equal(topologyDigest(graph), topologyDigest(composeTopology([b, a])));
  assert.match(exportVocabulary(), /owl:Ontology/);
  assert.match(exportShapes(), /sh:targetClass cs:Node/);
});

test('changed upstream records propagate through dependencies and cycles with protection', () => {
  const before = fixture();
  const after = structuredClone(before);
  after.nodes[0].owner = 'New owner';
  const plan = planTopologyChange(before, after, { protectedNodeIds: ['c'] });
  assert.deepEqual(plan.changedNodeIds, ['a']);
  assert.deepEqual(plan.affectedNodeIds, ['a', 'b', 'c']);
  assert.equal(plan.protectedContractsSatisfied, false);
  assert.equal(plan.authority, 'review_only');
  assert.notEqual(plan.baselineDigest, plan.proposedDigest);
  assert.throws(() => planTopologyChange(before, after, { protectedNodeIds: ['unknown'] }), /not in baseline/);
});

test('removed edges and nodes retain baseline impact; unchanged graphs need no review', () => {
  const before = fixture();
  const after = { ...fixture(), nodes: ['b', 'c'].map(node), edges: [edge('c', 'b')] };
  const plan = planTopologyChange(before, after, { protectedNodeIds: ['a'] });
  assert.equal(plan.protectedContractsSatisfied, false);
  assert.deepEqual(plan.affectedNodeIds, ['a', 'b', 'c']);
  assert.deepEqual(plan.changedEdgeIds, ['a-c', 'b-a']);
  assert.equal(planTopologyChange(before, structuredClone(before)).requiresReview, false);
});

test('dependency impact follows declared direction and conservatively flags edge changes', () => {
  const before = { id: 'x', nodes: ['a', 'b'].map(node), edges: [edge('b', 'a')] };
  const after = structuredClone(before); after.nodes[1].title = 'Changed dependent';
  assert.deepEqual(planTopologyChange(before, after).affectedNodeIds, ['b']);
  after.edges = [];
  assert.deepEqual(planTopologyChange(before, after).affectedNodeIds, ['a', 'b']);
});

test('RDF escapes untrusted literals and keeps node and edge identities separate', () => {
  const graph = { id: 'x', nodes: [{ ...node('edge:x'), title: '"line\n<injection>\\' }], edges: [{ id: 'x', source: 'edge:x', target: 'edge:x', relation: 'depends_on' }] };
  const rdf = exportTopologyRdf(graph);
  assert.ok(rdf.includes(JSON.stringify(graph.nodes[0].title)));
  assert.match(rdf, /substrate:node:edge%3Ax/);
  assert.match(rdf, /substrate:edge:x/);
});

test('CLI validates repository topology, exports a bundle and refuses overwrites', () => {
  const cli = new URL('../scripts/ontology.mjs', import.meta.url);
  const run = (...args) => spawnSync(process.execPath, [cli.pathname, ...args], { encoding: 'utf8' });
  const check = run('check');
  assert.equal(check.status, 0, check.stderr);
  assert.ok(JSON.parse(check.stdout).nodes > 500);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'substrate-ontology-test-'));
  try {
    const output = path.join(temporary, 'bundle');
    const exported = run('export', output);
    assert.equal(exported.status, 0, exported.stderr);
    assert.deepEqual(fs.readdirSync(output).sort(), ['manifest.json', 'shapes.ttl', 'topology.ttl', 'vocabulary.ttl']);
    assert.equal(run('export', output).status, 1);
    const before = path.join(temporary, 'before.json'); const after = path.join(temporary, 'after.json');
    fs.writeFileSync(before, JSON.stringify(fixture()));
    const proposed = fixture(); proposed.nodes[0].owner = 'Changed';
    fs.writeFileSync(after, JSON.stringify(proposed));
    const plan = run('plan', before, after, 'c');
    assert.equal(plan.status, 1);
    assert.equal(JSON.parse(plan.stdout).protectedViolations[0].id, 'c');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});

test('engine verifier rejects exit-zero nonconformance and incomplete or malformed replies', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'substrate-engine-test-'));
  const cli = new URL('../scripts/verify-ontology-engine.mjs', import.meta.url).pathname;
  try {
    for (const name of ['topology.ttl', 'vocabulary.ttl', 'shapes.ttl']) fs.writeFileSync(path.join(temporary, name), '');
    const binary = path.join(temporary, 'engine');
    const write = (mode) => fs.writeFileSync(binary, `#!/usr/bin/env node\nconst fs=require('node:fs');const b=JSON.parse(fs.readFileSync(0,'utf8'));const mode=${JSON.stringify(mode)};if(mode==='bad-json'){console.log('bad');process.exit(0)};for(const [i,x] of b.entries()){if(mode==='incomplete'&&i===6)break;console.log(JSON.stringify({seq:i,command:x.command,result:{conforms:mode!=='nonconforming',ontology_terms:20,checked_namespaces:[${JSON.stringify('https://createsomething.agency/ontology/substrate/v1#')}]}}))}`, { mode: 0o755 });
    for (const mode of ['nonconforming', 'incomplete', 'bad-json', 'valid']) {
      write(mode);
      const run = spawnSync(process.execPath, [cli, temporary, binary], { encoding: 'utf8' });
      assert.equal(run.status, mode === 'valid' ? 0 : 1, run.stderr);
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
