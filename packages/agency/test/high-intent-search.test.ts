import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';
import { highIntentSearchLandings } from '../src/lib/data/highIntentSearch.ts';
import { getAgencyContentAssetAnalyticsMetadata } from '../src/lib/analytics/content-assets.ts';
import {
  usesCompactAgencyPrivacyPrompt,
  usesRouteOwnedAgencyPerformanceEnding
} from '../src/lib/atlas/surface-policy.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

const expectedLandings = [
  {
    path: '/marketplace-review-automation',
    intent: 'marketplace-review',
    headline: 'Automate marketplace evidence preparation. Keep final judgment human.',
    proof: ['49/50 packets', 'final approval blocked', '0 external writes'],
    playbookVariant: 'marketplace-review'
  },
  {
    path: '/ai-workflow-recovery',
    intent: 'workflow-recovery',
    headline: 'Bring us the workflow that no longer holds up.',
    proof: ['Failure and decision map', 'Missing evidence diagnosis', 'Repair, replace, or stop'],
    playbookVariant: 'workflow-recovery'
  },
  {
    path: '/ai-workflow-control',
    intent: 'workflow-control',
    headline: 'Put operators and AI agents on the same Playbook.',
    proof: ['Decision boundary', 'Run, wait, and stop conditions', 'Client-owned Playbook'],
    playbookVariant: 'workflow-control'
  }
] as const;

test('publishes three bounded paid-search destinations with route-owned proof and handoff', () => {
  assert.equal(highIntentSearchLandings.length, expectedLandings.length);

  for (const expected of expectedLandings) {
    const landing = highIntentSearchLandings.find((entry) => entry.path === expected.path);
    assert.ok(landing, `${expected.path} needs a landing contract`);
    assert.equal(landing.intent, expected.intent);
    assert.equal(landing.headline, expected.headline);
    assert.equal(landing.playbookVariant, expected.playbookVariant);
    assert.equal(landing.noindex, true, `${expected.path} must stay out of organic search initially`);
    assert.match(landing.primaryCtaHref, /^\/map\?/);
    assert.equal(landing.primaryConversionEvent, 'workflow_draft_started');
    assert.equal(getAgencyContentAssetAnalyticsMetadata(expected.path)?.contentIntent, 'paid-search');
    assert.equal(
      getAgencyContentAssetAnalyticsMetadata(expected.path)?.contentLinearIssue,
      'CRE-1674'
    );

    for (const proof of expected.proof) {
      assert.ok(
        JSON.stringify(landing).includes(proof),
        `${expected.path} lost bounded proof: ${proof}`
      );
    }

    const source = readRoute(expected.path);
    assert.match(source, /<HighIntentSearchLanding/);
    assert.match(source, /search-policy:\s*noindex/);
    assert.equal(usesRouteOwnedAgencyPerformanceEnding(expected.path), true);
    assert.equal(usesCompactAgencyPrivacyPrompt(expected.path), true);
  }
});

test('registers the paid-search pages as commercial Performance routes', () => {
  const cohort = performancePageRegistry.find((group) => group.id === 'agency-commercial');
  assert.ok(cohort);

  for (const { path } of expectedLandings) {
    assert.ok(
      cohort.sources.includes(sourceForPath(path)),
      `${path} is missing from the Performance registry`
    );
  }
});

test('keeps the shared landing surface focused on one proof stage and one handoff', () => {
  const component = readFileSync(
    resolve(workspaceRoot, 'packages/agency/src/lib/components/HighIntentSearchLanding.svelte'),
    'utf8'
  );

  assert.match(component, /<PerformanceCampaignOpening/);
  assert.match(component, /<PerformanceNarrativeStage/);
  assert.match(component, /<PerformanceConversionHandoff/);
  assert.match(component, /<PlaybookField/);
  assert.match(component, /noindex=\{landing\.noindex\}/);
  assert.match(component, /trackHighIntentSearchDraftStart/);
});

function sourceForPath(path: string) {
  return `packages/agency/src/routes${path}/+page.svelte`;
}

function readRoute(path: string) {
  return readFileSync(resolve(workspaceRoot, sourceForPath(path)), 'utf8');
}
