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

test('identity recovery guide resolves to the owning Identity Worker', () => {
  const topology = JSON.parse(fs.readFileSync(new URL('../data/create-something-internal-topology.json', import.meta.url), 'utf8'));
  const guide = topology.nodes.find((node) => node.path === 'docs/guides/identity-recovery-repair.md');
  const owner = topology.nodes.find((node) => node.path === 'packages/identity-worker');
  assert.ok(guide);
  assert.ok(owner);
  const targets = topology.edges.filter((edge) => edge.source === guide.id && edge.relation === 'documents' && edge.target !== topology.rootNodeId);
  assert.deepEqual(targets.map((edge) => edge.target), [owner.id]);
});

test('workshop starter connects to its JSONC runtime', () => {
  const topology = JSON.parse(fs.readFileSync(new URL('../data/create-something-internal-topology.json', import.meta.url), 'utf8'));
  const owner = topology.nodes.find((node) => node.path === 'packages/lms/starter/pcn-workshop');
  const runtime = topology.nodes.find((node) => node.path === 'packages/lms/starter/pcn-workshop/wrangler.jsonc');
  assert.ok(owner);
  assert.ok(runtime);
  assert.ok(topology.edges.some((edge) => edge.source === owner.id && edge.target === runtime.id && edge.relation === 'runs'));
});

test('creator Slack triage does not imply ownership of the internal Slack intake', () => {
  const topology = JSON.parse(fs.readFileSync(new URL('../data/create-something-internal-topology.json', import.meta.url), 'utf8'));
  const guide = topology.nodes.find((node) => node.path === 'docs/guides/SLACK_HELP_REQUEST_TRIAGE_RUNBOOK.md');
  const intake = topology.nodes.find((node) => node.path === 'config/dify-mcp-intake/slack-create-something.json');
  assert.ok(guide);
  assert.ok(intake);
  assert.ok(!topology.edges.some((edge) => edge.source === guide.id && edge.target === intake.id));
  assert.ok(topology.edges.some((edge) => edge.source === guide.id && edge.target === topology.rootNodeId && edge.relation === 'documents'));
});
