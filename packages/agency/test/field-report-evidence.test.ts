import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getTemplateReviewPacketCompletion,
  templateReviewFieldReport
} from '../src/lib/data/fieldReports.ts';

test('template review Field Report separates packet completion, synthetic boundary checks, and business impact', () => {
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

test('public Field Report places the failed judgment before one combined economics section', () => {
  const route = readFileSync(
    new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url),
    'utf8'
  );
  const syntheticRuntime = route.indexOf('Current runtime check / Synthetic');
  const failedJudgment = route.indexOf('Automated judgment was not ready.');
  const combinedEconomics = route.indexOf(
    'One measured packet sets the cost. The supplied baseline models the capacity.'
  );
  const evidenceBasis = route.indexOf('Evidence basis');

  assert.ok(syntheticRuntime >= 0, 'synthetic runtime section is present');
  assert.ok(failedJudgment > syntheticRuntime, 'failed judgment follows the synthetic runtime');
  assert.ok(combinedEconomics > failedJudgment, 'economics follows the failed judgment');
  assert.ok(evidenceBasis > combinedEconomics, 'evidence index follows the combined economics');
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

  assert.match(products, /Map -> Build -> Control/);
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

test('the homepage keeps measured Field Report proof inside the consolidated service chapter', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

  assert.doesNotMatch(home, /PerformanceEvidenceIndex/);
  assert.match(home, /class="service-proof-row"/);
  assert.match(home, /See what passed—and what did not/);
  assert.match(home, /href: '\/field-reports\/template-review'/);
  assert.match(home, /49 of 50 selected cases/);
  assert.match(home, /automated judgment remains blocked/i);
  assert.doesNotMatch(home, /<PerformanceCampaignOpening[\s\S]*?>\s*>\s*\{#snippet actions\(\)\}/);
});
