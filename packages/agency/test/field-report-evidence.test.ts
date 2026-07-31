import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getTemplateReviewPacketCompletion,
  templateReviewFieldReport
} from '../src/lib/data/fieldReports.ts';

test('template review Field Report separates packet completion, synthetic boundary checks, and business impact', () => {
  assert.equal(templateReviewFieldReport.id, '#FR-2026-01');
  assert.equal(templateReviewFieldReport.workflow, 'Marketplace template review');
  assert.equal(templateReviewFieldReport.verifiedPeriod, 'May–June 2026');
  assert.equal(templateReviewFieldReport.evidence.selectedCases, 50);
  assert.equal(templateReviewFieldReport.evidence.usableCases, 49);
  assert.equal(getTemplateReviewPacketCompletion(templateReviewFieldReport), 98);
  assert.equal(templateReviewFieldReport.evidence.screenshots, 98);
  assert.equal(templateReviewFieldReport.evidence.reviewerBuckets, 7);
  assert.equal(templateReviewFieldReport.evidence.largestReviewerShare, 36);
  assert.equal(templateReviewFieldReport.evidence.externalWrites, 0);

  assert.equal(templateReviewFieldReport.limits.expectedExceptionalCases, 2);
  assert.equal(templateReviewFieldReport.limits.initialMissedExceptionalCases, 2);
  assert.equal(templateReviewFieldReport.limits.currentMissedExceptionalCases, 1);
  assert.equal(templateReviewFieldReport.limits.promotionStatus, 'blocked');

  assert.equal(templateReviewFieldReport.runtime.classification, 'synthetic_eval');
  assert.equal(templateReviewFieldReport.runtime.reviewerAgents, 4);
  assert.equal(templateReviewFieldReport.runtime.reviewerLiveCases, 32);
  assert.equal(templateReviewFieldReport.runtime.reviewerFailedCases, 0);
  assert.equal(templateReviewFieldReport.runtime.centralLiveCases, 7);
  assert.equal(templateReviewFieldReport.runtime.langfuseReadback, 'unverified');

  assert.equal(templateReviewFieldReport.providerPilot.classification, 'live_single_case_cost');
  assert.equal(templateReviewFieldReport.providerPilot.sampleSize, 1);
  assert.equal(templateReviewFieldReport.providerPilot.collectorDurationMs, 32_661);
  assert.equal(templateReviewFieldReport.providerPilot.reviewerDurationMs, 44_956);
  assert.equal(templateReviewFieldReport.providerPilot.sequentialActiveRuntimeMs, 77_617);
  assert.equal(templateReviewFieldReport.providerPilot.endToEndElapsedMs, 99_537);
  assert.equal(templateReviewFieldReport.providerPilot.collectorProviderCostUsd, 0.001208457);
  assert.equal(templateReviewFieldReport.providerPilot.reviewerProviderCostUsd, 0.110515);
  assert.equal(templateReviewFieldReport.providerPilot.totalMeasuredProviderCostUsd, 0.111723457);
  assert.equal(templateReviewFieldReport.providerPilot.storageAndToolCost, 'unmeasured');
  assert.equal(templateReviewFieldReport.providerPilot.annualSavings, 'unmeasured');

  assert.equal(templateReviewFieldReport.savings.status, 'unmeasured');
  assert.match(templateReviewFieldReport.savings.formula, /manual objective-check minutes/i);
  assert.match(templateReviewFieldReport.savings.formula, /reviewer verification minutes/i);
});

test('public Field Report leads with the decision and keeps eval scope explicit', () => {
  const routeUrl = new URL(
    '../src/routes/field-reports/template-review/+page.svelte',
    import.meta.url
  );

  assert.equal(existsSync(routeUrl), true);

  const route = readFileSync(routeUrl, 'utf8');
  assert.equal(
    templateReviewFieldReport.title,
    'Automation prepared the evidence. Human judgment still decided.'
  );
  assert.match(route, /title=\{templateReviewFieldReport\.title\}/);
  assert.match(route, /49 of 50 selected cases/i);
  assert.match(route, /promotion blocked/i);
  assert.match(route, /class="failed-boundary__metric-value">1 \/ 2<\/span>/i);
  assert.match(route, /class="failed-boundary__metric-qualifier">missed<\/span>/i);
  assert.match(route, /container-type:\s*inline-size/i);
  assert.match(route, /missed one of two historical exceptional examples/i);
  assert.match(route, /synthetic/i);
  assert.match(route, /32 live boundary scenarios/i);
  assert.match(route, /not production usage/i);
  assert.match(route, /Langfuse readback was not available/i);
  assert.match(
    route,
    /One measured packet sets the cost\. The supplied baseline models the capacity\./i
  );
  assert.match(route, /32\.7 seconds/i);
  assert.match(route, /45\.0 seconds/i);
  assert.match(route, /99\.5 seconds elapsed/i);
  assert.match(route, /USD 0\.1117/i);
  assert.match(route, /one-case cost observation/i);
  assert.match(route, /Reviewer time savings are not measured/i);
  assert.match(route, /Human reviewer/i);
  assert.doesNotMatch(route, /Evidence yield/i);
  assert.doesNotMatch(route, /2 \/ 2 missed/i);
  assert.doesNotMatch(route, /eight reviewer buckets/i);
  assert.doesNotMatch(route, /One method\. One map\. Three operating surfaces\./i);
  assert.doesNotMatch(route, /layoff|head[ -]?count|replace(?:d|ment)? people/i);
});

test('Result metrics preserve the evidence and scale from their Performance cells', () => {
  const route = readFileSync(
    new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url),
    'utf8'
  );
  const metricCellRule = route.match(/\.field-result__metrics > div \{([\s\S]*?)\n\s*\}/)?.[1];
  const metricValueRule = route.match(/\.field-result__metrics dd \{([\s\S]*?)\n\s*\}/)?.[1];

  assert.match(route, /<dd>49 \/ 50<\/dd>/);
  assert.match(route, /<dd>Blocked<\/dd>/);
  assert.match(route, /<dd>Unmeasured<\/dd>/);
  assert.ok(metricCellRule, 'Result metric cell rule is present');
  assert.ok(metricValueRule, 'Result metric value rule is present');
  assert.match(metricCellRule, /container-type:\s*inline-size;/);
  assert.match(metricValueRule, /16cqi/);
  assert.match(route, /var\(--space-performance-md/);
  assert.match(route, /var\(--text-performance-display-sm/);
  assert.match(route, /data-tone="growth"/);
  assert.match(route, /data-tone="risk"/);
  assert.doesNotMatch(metricValueRule, /4vw/);
});

test('public Field Report orders the evidence argument before one combined economics scene', () => {
  const route = readFileSync(
    new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url),
    'utf8'
  );
  const resultScene = route.indexOf("id: 'result'");
  const boundaryScene = route.indexOf("id: 'boundary'");
  const economicsScene = route.indexOf("id: 'economics'");
  const evidenceScene = route.indexOf("id: 'evidence'");

  assert.match(route, /PerformanceNarrativeStage/);
  assert.match(route, /Current runtime check \/ Synthetic/);
  assert.ok(resultScene >= 0, 'result scene is present');
  assert.ok(boundaryScene > resultScene, 'failed judgment follows the result scene');
  assert.ok(economicsScene > boundaryScene, 'economics follows the failed judgment');
  assert.ok(evidenceScene > economicsScene, 'evidence follows the combined economics');
  assert.equal(
    route.match(/One measured packet sets the cost\. The supplied baseline models the capacity\./g)
      ?.length,
    1,
    'economics stays one combined scene'
  );
  assert.doesNotMatch(route, /One live packet cost about eleven cents\./i);
  assert.doesNotMatch(route, /One observed packet models to about 36 an hour\./i);
});

test('public evidence records are inspectable and include the sanitized runtime audit', () => {
  const sources = templateReviewFieldReport.sources;
  assert.equal(sources.length, 5);
  assert.ok(sources.every((source) => source.href.startsWith('https://github.com/')));
  assert.match(sources[3].artifact, /template-review-dify-eval-evidence/i);
  assert.match(sources[4].artifact, /template-review-unit-economics-pilot/i);
});

test('modeled capacity separates the supplied human baseline from measured agent runtime and savings', () => {
  assert.equal(templateReviewFieldReport.capacityScenario.classification, 'modeled_capacity');
  assert.equal(templateReviewFieldReport.capacityScenario.humanBaselineSource, 'user_provided');
  assert.deepEqual(templateReviewFieldReport.capacityScenario.humanTemplatesPerHour, {
    low: 2,
    high: 4
  });
  assert.equal(templateReviewFieldReport.capacityScenario.agentBasis, 'single_case_end_to_end');
  assert.equal(templateReviewFieldReport.capacityScenario.agentEndToEndElapsedMs, 99_537);
  assert.equal(
    Math.round(templateReviewFieldReport.capacityScenario.modeledAgentTemplatesPerHour),
    36
  );
  assert.deepEqual(
    {
      low: Math.round(templateReviewFieldReport.capacityScenario.modeledCapacityMultiple.low),
      high: Math.round(templateReviewFieldReport.capacityScenario.modeledCapacityMultiple.high)
    },
    { low: 9, high: 18 }
  );
  assert.equal(templateReviewFieldReport.capacityScenario.qualityEquivalence, 'unmeasured');
  assert.equal(templateReviewFieldReport.capacityScenario.cashSavings, 'unmeasured');

  const route = readFileSync(
    new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url),
    'utf8'
  );
  assert.match(route, /2–4 \/ hour/i);
  assert.match(route, /about 36 packets per hour/i);
  assert.match(route, /9–18×/i);
  assert.match(route, /user-provided human baseline/i);
  assert.match(route, /not proof of equivalent review quality/i);
  assert.match(route, /cash savings remain unmeasured/i);
});

test('Field Reports are a browsable proof chapter in the agency journey', () => {
  const indexUrl = new URL('../src/routes/field-reports/+page.svelte', import.meta.url);
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const footer = readFileSync(
    new URL('../src/lib/components/AgencyFooter.svelte', import.meta.url),
    'utf8'
  );

  assert.equal(existsSync(indexUrl), true);
  const index = readFileSync(indexUrl, 'utf8');
  assert.match(index, /Field Reports/);
  assert.match(index, /Automation prepared the evidence\. Human judgment still decided\./);
  assert.match(index, /49 of 50 selected cases/);
  assert.match(index, /href: '\/field-reports\/template-review'/);
  assert.match(layout, /label: 'Field Reports', href: '\/field-reports'/);
  assert.match(footer, /href="\/field-reports">Field Reports/);
});

test('Products explains the product family and keeps operating surfaces inside Control', () => {
  const products = readFileSync(
    new URL('../src/routes/products/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(products, /Choose where the workflow is now\./);
  assert.match(products, /id: 'map'/);
  assert.match(products, /id: 'build'/);
  assert.match(products, /id: 'control'/);
  assert.doesNotMatch(products, /id: 'proof'/);
  assert.match(products, /Two products and one implementation service\./);
  assert.match(products, /Signal, Decision, and Proof are operator surfaces\./);
  assert.match(products, /Control includes Map/);
  assert.doesNotMatch(products, /Four inspectable surfaces/);
  assert.doesNotMatch(products, /Four visible jobs/);
});

test('booking carries the Field Report handoff into the owned mapping scheduler', () => {
  const book = readFileSync(new URL('../src/routes/book/+page.svelte', import.meta.url), 'utf8');

  assert.match(book, /Map the workflow before the build decision/);
  assert.match(book, /30- or 60-minute/);
  assert.match(book, /Choose 30 or 60 minutes/);
  assert.match(book, /first-party scheduler/);
  assert.match(book, /schedulerHandoffContext/);
});

test('the homepage concentrates measured Field Report proof in one primary readback', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const readback = readFileSync(
    new URL('../src/lib/components/AgencyPerformanceReadback.svelte', import.meta.url),
    'utf8'
  );

  assert.doesNotMatch(home, /PerformanceEvidenceIndex/);
  assert.match(home, /<AgencyPerformanceReadback \/>/);
  assert.doesNotMatch(home, /class="service-proof-row"/);
  assert.doesNotMatch(home, /class="field-report"/);
  assert.match(home, /class="ownership-callout"/);
  assert.match(home, /import \{ templateReviewFieldReport \} from '\$lib\/data\/fieldReports'/);
  assert.match(home, /templateReviewFieldReport\.id/);
  assert.match(readback, /evidence\.usableCases/);
  assert.match(readback, /evidence\.selectedCases/);
  assert.match(readback, /automated judgment[^.]*(?:cannot|blocked|remains)/i);
  assert.match(
    readback,
    /reviewer time savings[^.]*(?:not|never|remain)[^.]*(?:measured|verified)/i
  );
  assert.doesNotMatch(home, /<PerformanceCampaignOpening[\s\S]*?>\s*>\s*\{#snippet actions\(\)\}/);
});
