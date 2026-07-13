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

  assert.equal(templateReviewFieldReport.timing.evidenceCollection.status, 'measured');
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.selectedCases, 50);
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.usablePackets, 49);
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.elapsedSeconds, 1_950.845);
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.roundedElapsedMinutes, 32);
  assert.equal(
    templateReviewFieldReport.timing.evidenceCollection.roundedSecondsPerSelectedCase,
    39
  );
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.execution, 'sequential');
  assert.equal(templateReviewFieldReport.timing.evidenceCollection.pagesPerCase, 1);
  assert.deepEqual(templateReviewFieldReport.timing.evidenceCollection.viewports, [
    'desktop',
    'mobile'
  ]);

  assert.equal(templateReviewFieldReport.timing.humanBaseline.status, 'derived');
  assert.equal(templateReviewFieldReport.timing.humanBaseline.minActiveMinutes, 30);
  assert.equal(templateReviewFieldReport.timing.humanBaseline.maxActiveMinutes, 60);
  assert.equal(templateReviewFieldReport.timing.savingsHypothesis.status, 'derived');
  assert.deepEqual(
    templateReviewFieldReport.timing.savingsHypothesis.eligibleObjectiveMinutes,
    [12, 25]
  );
  assert.deepEqual(templateReviewFieldReport.timing.savingsHypothesis.verificationMinutes, [3, 8]);
  assert.equal(templateReviewFieldReport.timing.savingsHypothesis.minActiveMinutes, 4);
  assert.equal(templateReviewFieldReport.timing.savingsHypothesis.maxActiveMinutes, 22);
  assert.equal(templateReviewFieldReport.timing.actualSavings.status, 'unmeasured');

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
  assert.match(route, /Reviewer time savings are not measured/i);
  assert.match(route, /We can time the preparation—not the human savings/i);
  assert.match(route, /seconds\s+of machine elapsed time per selected case/i);
  assert.match(route, /Estimated \/ Full human baseline/i);
  assert.match(route, /Hypothesis \/ Eligible objective work/i);
  assert.match(route, /Outcome \/ Actual time saved/i);
  assert.match(route, /matched before-and-after pilot/i);
  assert.match(route, /Human reviewer/i);
  assert.doesNotMatch(route, /Evidence yield/i);
  assert.doesNotMatch(route, /2 \/ 2 missed/i);
  assert.doesNotMatch(route, /eight reviewer buckets/i);
  assert.doesNotMatch(route, /One method\. One map\. Three operating surfaces\./i);
  assert.doesNotMatch(route, /layoff|head[ -]?count|replace(?:d|ment)? people/i);
  assert.doesNotMatch(route, /cost per template|blended hourly|\$349,?960/i);
});

test('public evidence records are inspectable and include the sanitized runtime audit', () => {
  const sources = templateReviewFieldReport.sources;
  assert.equal(sources.length, 6);
  assert.ok(sources.every((source) => source.href.startsWith('https://github.com/')));
  assert.match(sources[3].artifact, /template-review-dify-eval-evidence/i);
  assert.match(sources[4].artifact, /template-review-timing-evidence/i);
  assert.equal(sources[4].state, 'review');
  assert.match(sources[5].artifact, /reviewer-playbook/i);
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

test('Products explains one map and three operating surfaces without a four-surface ambiguity', () => {
  const products = readFileSync(
    new URL('../src/routes/products/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(products, /One map coordinates three operating surfaces\./);
  assert.match(products, /Atlas holds the map\./);
  assert.match(products, /Signal watches, Decision routes, and Proof records\./);
  assert.match(products, /One workflow map\. Three places to operate\./);
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

test('the homepage hands the operating thesis into measured Field Report proof', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

  assert.match(home, /PerformanceEvidenceIndex/);
  assert.match(home, /href: '\/field-reports\/template-review'/);
  assert.match(home, /49 of 50 selected cases/);
  assert.match(home, /automated judgment remains blocked/i);
  assert.doesNotMatch(home, /<PerformanceCampaignOpening[\s\S]*?>\s*>\s*\{#snippet actions\(\)\}/);
});
