import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';

import {
  auditPerformancePageRegistry,
  discoverPerformancePageSources,
  runPerformancePageAudit,
  type PerformancePageRegistryGroup
} from '../performance-page-audit.ts';

let fixtureRoot = '';

before(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'performance-page-audit-'));
  writePage('packages/agency/src/routes/+page.svelte');
  writePage('packages/agency/src/routes/auth/callback/+page.svelte');
  writePage('packages/agency/src/routes/new-route/+page.svelte');
});

after(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

test('discovers page implementations and materializes one valid contract per source', () => {
  const sources = discoverPerformancePageSources(fixtureRoot, ['agency']);
  const groups: PerformancePageRegistryGroup[] = [
    {
      id: 'agency-landing',
      property: 'agency',
      sources: ['packages/agency/src/routes/+page.svelte'],
      status: 'migrated',
      contract: {
        archetype: 'landing',
        decision: 'Decide whether one workflow is ready to map.',
        chapters: [
          { id: 'opening', role: 'opening', purpose: 'Create the question.' },
          { id: 'proof', role: 'proof', purpose: 'Resolve it with evidence.' },
          { id: 'handoff', role: 'handoff', purpose: 'Offer one next action.' }
        ],
        primaryProof: { chapterId: 'proof', description: 'Mapped workflow evidence.' },
        handoff: { chapterId: 'handoff', action: 'Map one workflow' }
      }
    },
    {
      id: 'agency-callback',
      property: 'agency',
      sources: ['packages/agency/src/routes/auth/callback/+page.svelte'],
      status: 'technical-exclusion',
      exclusion: {
        kind: 'callback',
        reason: 'Completes identity state and immediately routes to the requesting surface.'
      }
    },
    {
      id: 'agency-new-route',
      property: 'agency',
      sources: ['packages/agency/src/routes/new-route/+page.svelte'],
      status: 'pending',
      contract: {
        archetype: 'commercial',
        decision: 'Decide whether the workflow boundary fits.',
        chapters: [
          { id: 'opening', role: 'opening', purpose: 'Name the boundary.' },
          { id: 'proof', role: 'proof', purpose: 'Show fit evidence.' },
          { id: 'handoff', role: 'handoff', purpose: 'Offer one commitment.' }
        ],
        primaryProof: { chapterId: 'proof', description: 'A bounded workflow artifact.' },
        handoff: { chapterId: 'handoff', action: 'Review the boundary' }
      }
    }
  ];

  const result = auditPerformancePageRegistry(sources, groups);

  assert.equal(result.ok, true);
  assert.deepEqual(result.totals, {
    discovered: 3,
    registered: 3,
    migrated: 1,
    pending: 1,
    excluded: 1
  });
  assert.deepEqual(
    result.entries.map((entry) => entry.source),
    [
      'packages/agency/src/routes/+page.svelte',
      'packages/agency/src/routes/auth/callback/+page.svelte',
      'packages/agency/src/routes/new-route/+page.svelte'
    ]
  );
  assert.deepEqual(
    result.cohorts.map(({ groupId, status, count }) => ({ groupId, status, count })),
    [
      { groupId: 'agency-callback', status: 'technical-exclusion', count: 1 },
      { groupId: 'agency-landing', status: 'migrated', count: 1 },
      { groupId: 'agency-new-route', status: 'pending', count: 1 }
    ]
  );
});

test('fails closed on missing, overlapping, and invalid registrations', () => {
  const sources = discoverPerformancePageSources(fixtureRoot, ['agency']);
  const invalidContract = {
    archetype: 'landing' as const,
    decision: 'Repeat the introduction.',
    chapters: [
      { id: 'opening', role: 'opening' as const, purpose: 'Introduce the page.' },
      { id: 'orientation', role: 'orientation' as const, purpose: 'Introduce it again.' },
      { id: 'handoff', role: 'handoff' as const, purpose: 'Offer an action.' }
    ],
    primaryProof: { chapterId: 'missing', description: 'Detached proof.' },
    handoff: { chapterId: 'handoff', action: 'Continue' }
  };
  const groups: PerformancePageRegistryGroup[] = [
    {
      id: 'agency-invalid',
      property: 'agency',
      sources: ['packages/agency/src/routes/+page.svelte'],
      status: 'pending',
      contract: invalidContract
    },
		{
			id: 'agency-overlap',
			property: 'io',
      sources: ['packages/agency/src/routes/+page.svelte'],
      status: 'pending',
      contract: invalidContract
    },
    {
      id: 'agency-invalid-exclusion',
      property: 'agency',
      sources: ['packages/agency/src/routes/auth/callback/+page.svelte'],
      status: 'technical-exclusion',
      exclusion: { kind: 'callback', reason: '' }
    }
  ];

  const result = auditPerformancePageRegistry(sources, groups);

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.includes(
      'packages/agency/src/routes/new-route/+page.svelte is not registered in the Performance page system.'
    )
  );
  assert.ok(
    result.errors.includes(
      'packages/agency/src/routes/+page.svelte is registered by multiple groups: agency-invalid, agency-overlap.'
    )
  );
	assert.ok(
		result.errors.includes(
			'agency-invalid-exclusion requires a specific technical exclusion reason.'
		)
	);
	assert.ok(
		result.errors.includes(
			'agency-overlap assigns packages/agency/src/routes/+page.svelte to property io.'
		)
	);
  assert.ok(result.errors.some((error) => error.includes('has 2 introduction chapters')));
  assert.ok(
    result.errors.some((error) => error.includes('primary proof references unknown chapter'))
  );
});

test('covers every current CREATE SOMETHING page implementation and emits bounded cohorts', () => {
  const result = runPerformancePageAudit(resolve(import.meta.dirname, '../..'));

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.totals, {
    discovered: 229,
    registered: 229,
    migrated: 23,
    pending: 194,
    excluded: 12
  });
  assert.deepEqual(
    Object.fromEntries(
      ['agency', 'ltd', 'io', 'lms', 'space', 'ona-agents'].map((property) => [
        property,
        result.entries.filter((entry) => entry.property === property).length
      ])
    ),
    { agency: 66, ltd: 34, io: 99, lms: 12, space: 15, 'ona-agents': 3 }
  );
  assert.ok(result.cohorts.every((cohort) => cohort.count > 0));
  assert.ok(result.cohorts.every((cohort) => cohort.sources.length === cohort.count));
});

function writePage(relativePath: string) {
  const target = join(fixtureRoot, relativePath);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, '<main></main>\n');
}
