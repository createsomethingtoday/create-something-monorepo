import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeTemplateSubmissionRecords, workerTestExports } from './worker.ts';

function record(status: unknown, submittedDate?: string) {
  return {
    id: `rec-${String(status)}`,
    fields: {
      '🚀Marketplace Status': status,
      ...(submittedDate ? { '📅Submitted Date': submittedDate } : {})
    }
  };
}

function extractAirtablePattern(formula: string) {
  const match = formula.match(/REGEX_MATCH\([^,]+,\s*'(.+)'\)/);
  assert.ok(match, `Expected formula to contain REGEX_MATCH: ${formula}`);
  return match[1];
}

test('email formula matches whole email tokens only', () => {
  const formula = workerTestExports.buildEmailMatchFormula('ann@example.com', ['Email']);
  const pattern = extractAirtablePattern(formula);
  const regex = new RegExp(pattern);

  assert.equal(regex.test('ann@example.com'), true);
  assert.equal(regex.test(' ann@example.com, team@example.com'), true);
  assert.equal(regex.test('joann@example.com'), false);
  assert.equal(regex.test('ann@example.com.au'), false);
});

test('library name availability formula scopes to library assets', () => {
  const formula = workerTestExports.buildNameAvailabilityFormula('Radiant UI', 'Library📚');

  assert.match(formula, /LOWER\('Radiant UI'\)/);
  assert.match(formula, /NOT\(FIND\(LOWER\('archived'\)/);
  assert.match(formula, /\{🆎Type\} = 'Library📚'/);
  assert.match(formula, /\{⚙️🆎Type \(Text\)\} = 'Library📚'/);
});

test('submission stats do not treat terminal or blank statuses as active review', () => {
  const now = Date.parse('2026-05-05T00:00:00.000Z');
  const stats = summarizeTemplateSubmissionRecords(
    [
      record('Rejected', '2026-05-01T00:00:00.000Z'),
      record('rejected by Marketplace'),
      record('Abandoned'),
      record('Not published'),
      record(''),
      record('Draft')
    ],
    now
  );

  assert.equal(stats.submittedTemplates, 6);
  assert.equal(stats.assetsSubmitted30, 1);
  assert.equal(stats.publishedTemplates, 0);
  assert.equal(stats.rejectedTemplates, 2);
  assert.equal(stats.delistedTemplates, 0);
  assert.equal(stats.activeReviews, 0);
});

test('submission stats count known in-review statuses as active reviews', () => {
  const stats = summarizeTemplateSubmissionRecords([
    record('Submitted for review'),
    record('Ready for Webflow Review'),
    record('Changes requested'),
    record('Published'),
    record('Delisted')
  ]);

  assert.equal(stats.publishedTemplates, 1);
  assert.equal(stats.delistedTemplates, 1);
  assert.equal(stats.activeReviews, 3);
});
