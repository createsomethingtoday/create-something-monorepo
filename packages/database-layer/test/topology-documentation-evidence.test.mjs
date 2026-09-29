import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('Substrate documentation edges require a mention in the owning document', () => {
  const root = new URL('../../../', import.meta.url);
  const topology = JSON.parse(fs.readFileSync(new URL('../data/create-something-internal-topology.json', import.meta.url), 'utf8'));
  const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
  const substrate = topology.nodes.find((node) => node.packageName === '@create-something/substrate-mcp');
  for (const edge of topology.edges.filter((edge) => edge.target === substrate.id && ['documents', 'governs'].includes(edge.relation))) {
    const source = nodes.get(edge.source);
    assert.match(fs.readFileSync(new URL(source.path, root), 'utf8'), /\bsubstrate\b/i, source.path);
  }
  const guide = topology.nodes.find((node) => node.path === 'docs/guides/PAPERCLIP_INSTANCE_OPERATING_MODEL.md');
  assert.ok(guide);
  assert.ok(!topology.edges.some((edge) => edge.source === guide.id && edge.target === substrate.id));
});

test('newsletter guide resolves its explicit io strategy link before generic metadata matches', () => {
  const topology = JSON.parse(fs.readFileSync(new URL('../data/create-something-internal-topology.json', import.meta.url), 'utf8'));
  const guide = topology.nodes.find((node) => node.path === 'docs/guides/NEWSLETTER_DISTRIBUTION_PLAYBOOK.md');
  const io = topology.nodes.find((node) => node.path === 'packages/io');
  assert.ok(topology.edges.some((edge) => edge.source === guide.id && edge.target === io.id && edge.evidence.includes('explicit repository link')));
  assert.ok(!topology.edges.some((edge) => edge.source === guide.id && topology.nodes.find((node) => node.id === edge.target)?.path === 'packages/arc'));
});
