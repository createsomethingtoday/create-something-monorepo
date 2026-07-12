import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getTemplateReviewEvidenceYield,
  templateReviewFieldReport
} from '../src/lib/data/fieldReports.ts';

test('template review Field Report reproduces measured evidence and preserves the failed boundary', () => {
  assert.equal(templateReviewFieldReport.evidence.selectedCases, 50);
  assert.equal(templateReviewFieldReport.evidence.usableCases, 49);
  assert.equal(getTemplateReviewEvidenceYield(templateReviewFieldReport), 98);
  assert.equal(templateReviewFieldReport.evidence.screenshots, 98);
  assert.equal(templateReviewFieldReport.evidence.reviewerBuckets, 8);
  assert.equal(templateReviewFieldReport.evidence.externalWrites, 0);

  assert.equal(templateReviewFieldReport.limits.expectedExceptionalCases, 2);
  assert.equal(templateReviewFieldReport.limits.missedExceptionalCases, 2);
  assert.equal(templateReviewFieldReport.limits.promotionStatus, 'blocked');

  assert.equal(templateReviewFieldReport.savings.status, 'unmeasured');
  assert.match(templateReviewFieldReport.savings.formula, /manual objective-check minutes/i);
  assert.match(templateReviewFieldReport.savings.formula, /reviewer verification minutes/i);
});

test('public Field Report exposes measured evidence, the failed boundary, and human authority', () => {
  const routeUrl = new URL('../src/routes/field-reports/template-review/+page.svelte', import.meta.url);

  assert.equal(existsSync(routeUrl), true);

  const route = readFileSync(routeUrl, 'utf8');
  assert.match(route, /49 of 50/i);
  assert.match(route, /98%/);
  assert.match(route, /98 screenshots/i);
  assert.match(route, /promotion blocked/i);
  assert.match(route, /missed both historical exceptional examples/i);
  assert.match(route, /Reviewer time savings are not measured/i);
  assert.match(route, /Human reviewer/i);
  assert.doesNotMatch(route, /layoff|head[ -]?count|replace(?:d|ment)? people/i);
});

test('Field Reports are a browsable proof chapter in the agency journey', () => {
  const indexUrl = new URL('../src/routes/field-reports/+page.svelte', import.meta.url);
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/lib/components/AgencyFooter.svelte', import.meta.url), 'utf8');

  assert.equal(existsSync(indexUrl), true);
  const index = readFileSync(indexUrl, 'utf8');
  assert.match(index, /Field Reports/);
  assert.match(index, /Prepare the evidence\. Keep the judgment human\./);
  assert.match(index, /href: '\/field-reports\/template-review'/);
  assert.match(layout, /label: 'Field Reports', href: '\/field-reports'/);
  assert.match(footer, /href="\/field-reports">Field Reports/);
});

test('Products explains one map and three operating surfaces without a four-surface ambiguity', () => {
  const products = readFileSync(new URL('../src/routes/products/+page.svelte', import.meta.url), 'utf8');

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
  assert.match(book, /30 \/ 60 min/);
  assert.match(book, /first-party scheduler/);
  assert.match(book, /schedulerHandoffContext/);
});

test('the homepage hands the operating thesis into measured Field Report proof', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

  assert.match(home, /PerformanceEvidenceIndex/);
  assert.match(home, /href: '\/field-reports\/template-review'/);
  assert.match(home, /49 of 50 usable evidence packets/);
  assert.doesNotMatch(home, /<PerformanceCampaignOpening[\s\S]*?>\s*>\s*\{#snippet actions\(\)\}/);
});
