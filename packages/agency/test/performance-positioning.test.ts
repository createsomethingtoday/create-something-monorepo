import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { marketingPagePortfolio } from '../src/lib/data/marketingPages.ts';
import { templateReviewFieldReport } from '../src/lib/data/fieldReports.ts';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy.ts';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const layout = read('../src/routes/+layout.svelte');
const home = read('../src/routes/+page.svelte');
const services = read('../src/routes/services/+page.svelte');
const products = read('../src/routes/products/+page.svelte');
const handoff = read('../src/lib/components/AgencyPerformanceHandoff.svelte');
const readback = read('../src/lib/components/AgencyPerformanceReadback.svelte');
const adoption = read('../src/lib/components/AdoptionPathChooser.svelte');
const compatibility = read('../src/lib/components/IntegrationCompatibilityRail.svelte');
const campaign = read(
  '../../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
);
const narrative = read(
  '../../canon/src/lib/components/performance/PerformanceNarrativeStage.svelte'
);
const performanceTokens = read('../../canon/src/lib/styles/tokens.css');
const handoffBoundaryMetadata = read(
  '../content/assets/brand/agency-handoff-boundary.v20260801/metadata.md'
);

test('every indexed public marketing route receives a route-owned or shared Performance ending', () => {
  const indexedRoutes = marketingPagePortfolio.filter((entry) => entry.decision === 'index');

  assert.equal(indexedRoutes.length, 39);
  assert.ok(indexedRoutes.some((entry) => entry.path === '/'));
  assert.match(layout, /marketingPagePortfolio/);
  assert.match(layout, /entry\.decision !== 'archive'/);
  assert.match(layout, /<AgencyPerformanceHandoff \/>/);
  assert.match(layout, /isPublicMarketingRoute && !routeOwnsPerformanceEnding/);

  for (const pathname of ['/', '/services', '/map', '/products', '/stack', '/field-reports']) {
    assert.equal(usesRouteOwnedAgencyPerformanceEnding(pathname), true, pathname);
  }

  assert.match(home, /AgencyPerformanceReadback/);
  assert.ok(
    home.indexOf('<AgencyPerformanceReadback') < home.indexOf('<PerformanceNarrativeStage'),
    'the concrete readback should appear before the deeper operating story'
  );

  assert.match(services, /AgencyPerformanceReadback/);
  assert.match(services, /AgencyPerformanceReadback embedded=\{true\}/);
  assert.match(products, /AgencyPerformanceReadback embedded=\{true\}/);

  assert.match(handoff, /AgencyPerformanceReadback/);
  assert.match(handoff, /<AgencyPerformanceReadback compact=\{true\} \/>/);
});

test('the homepage moves from claim to proof to method before asking visitors to choose a path', () => {
  const sequence = [
    '<PerformanceCampaignOpening',
    '<AgencyPerformanceReadback',
    '<PerformanceNarrativeStage',
    '<AdoptionPathChooser',
    '<IntegrationCompatibilityRail',
    '<PerformanceConversionHandoff'
  ];

  for (const component of sequence) {
    assert.notEqual(home.indexOf(component), -1, `${component} is missing from the homepage`);
  }

  for (let index = 1; index < sequence.length; index += 1) {
    assert.ok(
      home.indexOf(sequence[index - 1]) < home.indexOf(sequence[index]),
      `${sequence[index - 1]} should appear before ${sequence[index]}`
    );
  }
});

test('the homepage opening uses the property-owned Playbook artifact', () => {
  assert.match(home, /import PlaybookField/);
  assert.match(home, /artifactOwnsMedia/);
  assert.match(home, /\{#snippet artifact\(\)\}[\s\S]*?<PlaybookField variant="home" \/>/);
  assert.doesNotMatch(home, /mode="paper"|paperOperatingRouteMedia/);
  assert.doesNotMatch(home, /agency-fluid-intelligence-loop-v4/);
  assert.doesNotMatch(home, /controlledFlowMedia/);
  assert.equal(
    existsSync(
      new URL(
        '../static/images/performance-lab/paper-under-pressure-field.svg',
        import.meta.url
      )
    ),
    true
  );
  assert.equal(
    existsSync(
      new URL(
        '../static/images/performance-lab/paper-boundary-authority.webp',
        import.meta.url
      )
    ),
    true
  );
  assert.equal(
    existsSync(
      new URL(
        '../static/images/performance-lab/paper-boundary-authority-mobile.webp',
        import.meta.url
      )
    ),
    true
  );
});

test('the historical fluid study remains attributable while Canon retains optional motion support', () => {
  assert.match(
    campaign,
    /<video[\s\S]*?autoplay[\s\S]*?muted[\s\S]*?loop[\s\S]*?playsinline/
  );
  assert.match(campaign, /\{#if media\.video && motionAllowed\}/);
  assert.match(campaign, /poster=\{media\.video\.poster \?\? media\.src\}/);
  assert.match(handoffBoundaryMetadata, /CRE-1562/);
  assert.match(handoffBoundaryMetadata, /native text-to-video/);
  assert.match(handoffBoundaryMetadata, /No input image/);
  assert.match(handoffBoundaryMetadata, /no spatial mask/);
  assert.match(handoffBoundaryMetadata, /direct phase boundary/);
  assert.match(handoffBoundaryMetadata, /360 frames at 30 fps/);
  assert.match(handoffBoundaryMetadata, /12\.0-second/);
  assert.match(handoffBoundaryMetadata, /fluid intelligence under pressure/i);
  assert.match(handoffBoundaryMetadata, /circulating water pulse/i);
  assert.match(handoffBoundaryMetadata, /No dissolve/);
  assert.match(handoffBoundaryMetadata, /rejected after user screenshot review/);
  assert.equal(
    existsSync(
      new URL(
        '../content/assets/brand/agency-handoff-boundary.v20260801/source/sora-fluid-intelligence-loop-prompt.txt',
        import.meta.url
      )
    ),
    true
  );
});

test('the campaign can preserve property-owned color without changing its default', () => {
  assert.match(campaign, /colorMode\?: 'monochrome' \| 'natural'/);
  assert.match(campaign, /data-color-mode=\{media\.colorMode \?\? 'monochrome'\}/);
  assert.match(campaign, /\[data-color-mode='monochrome'\][\s\S]*?grayscale\(1\)/);
  assert.match(campaign, /\[data-color-mode='natural'\][\s\S]*?filter: contrast\(1\.08\)/);
});

test('the homepage boundary artifact shows evidence without restating the scene introduction', () => {
  assert.match(home, /<figure class="boundary-study__media">/);
  assert.match(home, /<figcaption>Paper pressure study · Run \/ Wait \/ Stop<\/figcaption>/);
  assert.match(home, /paper-boundary-authority\.webp/);
  assert.doesNotMatch(home, /class="boundary-study__copy"/);
  assert.match(home, /class="boundary-study__outcomes"/);
  assert.match(home, /class="boundary-study__metrics"/);
  assert.match(home, /class="boundary-study__receipt"/);
});

test('the shared readback derives a measured example and its limits from field-report truth', () => {
  assert.equal(templateReviewFieldReport.evidence.usableCases, 49);
  assert.equal(templateReviewFieldReport.evidence.selectedCases, 50);
  assert.equal(templateReviewFieldReport.limits.promotionStatus, 'blocked');
  assert.equal(templateReviewFieldReport.savings.status, 'unmeasured');

  assert.match(readback, /templateReviewFieldReport/);
  assert.match(readback, /data-performance-readback/);
  assert.match(readback, /templateReviewFieldReport\.workflow/);
  assert.match(readback, /Routine evidence moved/);
  assert.match(readback, /Automated judgment remains blocked/);
  assert.match(readback, /Reviewer time savings remain unmeasured/);
  assert.match(readback, /href=\{`\/field-reports\/\$\{templateReviewFieldReport\.slug\}`\}/);
});

test('the shared readback concentrates one auditable result and its limits', () => {
  assert.match(readback, /data-readback-kind="primary-proof"/);
  assert.match(readback, /class="performance-readback__result"/);
  assert.match(readback, /<strong>\{evidence\.usableCases\}<\/strong>/);
  assert.match(readback, /<span>\/ \{evidence\.selectedCases\}<\/span>/);
  assert.match(readback, /templateReviewFieldReport\.workflow/);
  assert.match(readback, /templateReviewFieldReport\.id/);
  assert.match(readback, /templateReviewFieldReport\.verifiedPeriod/);
  assert.match(readback, /data-control-state="stop"/);
  assert.match(readback, /Inspect the full field report/);
  assert.doesNotMatch(readback, /grid-template-columns:\s*repeat\(3/);
  assert.doesNotMatch(
    readback,
    /@media \(max-width: 30rem\)[\s\S]*?\.performance-readback__receipt\s*\{\s*grid-template-columns:\s*1fr/
  );
  assert.match(
    readback,
    /\.performance-readback--compact \.performance-readback__inner\s*\{[\s\S]*?background:\s*transparent/
  );
});

test('the shared fallback keeps its action beside the claim and its proof in the same composition', () => {
  assert.match(handoff, /data-performance-handoff/);
  assert.match(handoff, /AI workflow system/);
  assert.match(handoff, /Inspect the 49\/50 field report/);
  assert.doesNotMatch(handoff, /See the complete workflow/);
  assert.match(
    handoff,
    /performance-handoff__intro[\s\S]*?performance-handoff__actions[\s\S]*?<AgencyPerformanceReadback compact=\{true\}/
  );
  assert.match(
    readback,
    /selected cases produced usable evidence packets for human decision/i
  );
});

test('homepage Performance surfaces share one responsive page gutter token', () => {
  assert.match(
    performanceTokens,
    /--space-performance-page-gutter:\s*clamp\(0\.75rem,\s*2\.5vw,\s*1\.25rem\)/
  );

  for (const surface of [campaign, narrative, readback, adoption, compatibility]) {
    assert.match(surface, /var\(--space-performance-page-gutter/);
  }
});
