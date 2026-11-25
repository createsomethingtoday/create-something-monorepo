import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const workspaceRoot = resolve(import.meta.dirname, '../../..');

test('registers the Agency legal pair as a migrated editorial cohort', () => {
  const group = performancePageRegistry.find((candidate) => candidate.id === 'agency-legal');
  assert.equal(group?.status, 'migrated');
  assert.equal(group?.contract?.archetype, 'editorial');
  assert.deepEqual(group?.sources, [routeSource('privacy'), routeSource('terms')]);
});

test('keeps each legal route as one direct authoritative reading surface', () => {
  for (const route of ['privacy', 'terms']) {
    const source = readRoute(route);
    if (route === 'privacy') {
      assert.equal((source.match(/<h1>/g) ?? []).length, 1);
      assert.match(source, /<h1>Privacy Policy<\/h1>/);
    } else {
      assert.equal((source.match(/<PerformancePageSection\b/g) ?? []).length, 1);
      assert.match(source, /titleLevel="h1"/);
    }
    assert.doesNotMatch(source, /PerformanceNarrativeStage|PerformanceConversionHandoff/);
    assert.match(source, /noindex={true}/);
  }
});

test('preserves the Canon policy sources and Agency-specific legal boundary', () => {
  const privacy = readRoute('privacy');
  assert.match(privacy, /PrivacyPolicyContent/);
  assert.match(privacy, /property="agency"/);
  assert.match(privacy, /domain="createsomething\.agency"/);
  assert.match(privacy, /lastUpdated="November 5, 2026"/);
  assert.match(privacy, /First-party analytics and Meta marketing are separate choices\./);

  const terms = readRoute('terms');
  assert.match(terms, /TermsOfServiceContent/);
  assert.match(terms, /property="agency"/);
  assert.match(terms, /domain="createsomething\.agency"/);
  assert.match(terms, /contactEmail="support@createsomething\.io"/);
  assert.match(terms, /Terms for using CREATE SOMETHING \.agency\./);
});

test('keeps privacy contents labels aligned with the canonical policy headings', () => {
  const source = readFileSync(
    resolve(workspaceRoot, 'packages/canon/src/lib/components/PrivacyPolicyContent.svelte'), 'utf8'
  );
  const headings = [...source.matchAll(/<h2[^>]*class="section-title">\d+\. ([^<]+)<\/h2>/g)]
    .map((match) => match[1]);
  assert.equal(headings.length, 8);
  const route = readRoute('privacy');
  const labels = [...route.matchAll(/^    '([^']+)'/gm)].map((match) => match[1]);
  assert.deepEqual(labels, headings);
});

test('keeps required legal contact links available without Cloudflare JavaScript', () => {
  for (const component of ['PrivacyPolicyContent', 'TermsOfServiceContent']) {
    const source = readFileSync(
      resolve(workspaceRoot, `packages/canon/src/lib/components/${component}.svelte`),
      'utf8'
    );
    assert.match(
      source,
      /\{@html '<!--email_off-->'\}[\s\S]*href="mailto:\{contactEmail\}"[\s\S]*\{@html '<!--\/email_off-->'\}/
    );
  }
});

function readRoute(route: string) {
  return readFileSync(
    resolve(workspaceRoot, `packages/agency/src/routes/${route}/+page.svelte`),
    'utf8'
  );
}

function routeSource(route: string) {
  return `packages/agency/src/routes/${route}/+page.svelte`;
}
