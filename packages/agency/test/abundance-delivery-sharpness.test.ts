import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { POST as askDeliveryAgent } from '../src/routes/api/canon/agent/+server.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const routeSource = readFileSync(
  resolve(workspaceRoot, 'packages/agency/src/routes/delivery/abundance/+page.svelte'),
  'utf8'
);

test('migrates the complete Agency delivery tool cohort', () => {
  const cohort = performancePageRegistry.find((group) => group.id === 'agency-delivery-tool');

  assert.equal(cohort?.status, 'migrated');
  assert.deepEqual(cohort?.contract?.chapters.map((chapter) => chapter.id), [
    'task-state',
    'workspace',
    'decision-receipt'
  ]);
});

test('gives the delivery route exactly three visible operator chapters', () => {
  assert.equal((routeSource.match(/<section\b/g) ?? []).length, 3);
  assert.equal((routeSource.match(/data-performance-chapter=/g) ?? []).length, 3);
  assert.match(routeSource, /data-performance-chapter="task-state"/);
  assert.match(routeSource, /data-performance-chapter="workspace"/);
  assert.match(routeSource, /data-performance-chapter="decision-receipt"/);
});

test('keeps evidence and ownership visible while shortening prompt labels', () => {
  for (const requiredSource of [
    'publicArtifacts as artifact',
    'privateEvidence as item',
    'context.layers as layer',
    'context.decisions as decision',
    '{decision.owner}',
    '{decision.state}',
    '{decision.tier}',
    '{item.label}',
    '{item.detail}',
    '{item.source}',
    '{suggestion.label}',
    'askDeliveryAgent(suggestion.prompt)',
    'deliveryQuestion = message;'
  ]) {
    assert.ok(routeSource.includes(requiredSource), `route lost ${requiredSource}`);
  }
});

test('keeps the decision handoff and supporting system detail meaningful without JavaScript', () => {
  assert.match(routeSource, /href="#decision-receipt"/);
  assert.match(routeSource, /id="decision-receipt"/);
  assert.match(routeSource, /<details[^>]*class="delivery-disclosure/s);
  assert.match(routeSource, /Why this page is safe to share/);
  assert.match(routeSource, /How Database, Automation, and Judgment fit/);
  assert.match(routeSource, /start with the cards owned by/);
});

test('answers the suggested overview question from the selected delivery context', async () => {
  const response = await askDeliveryAgent({
    request: new Request('https://createsomething.agency/api/canon/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contextId: 'abundance-npg-delivery',
        message: 'Explain what changed in plain English.',
        history: [{ role: 'agent', body: 'What would you like to review?' }]
      })
    }),
    platform: undefined
  } as never);
  const payload = (await response.json()) as { answer: string };

  assert.equal(response.status, 200);
  assert.match(payload.answer, /nurse-facing Concierge/i);
  assert.doesNotMatch(payload.answer, /Webflow owns the polished interface/i);
});
