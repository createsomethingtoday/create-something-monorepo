import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublishedUrlValidationMessage,
  getPublishedUrlValidationIssues,
  type PublishedUrlValidationSummary
} from './published-url';

const KEYDOWN_PATTERN = `addEventListener\\s*\\(\\s*['"]keydown['"]`;

type PageResult = PublishedUrlValidationSummary['pageResults'][number];
type PageDetails = NonNullable<PageResult['details']>;

function securityRiskPage(url: string, patterns: string[]) {
  const details: Required<PageDetails> = {
    flaggedCode: [],
    securityRisks: [
      {
        message: 'Script contains security risk patterns',
        flaggedCode: [`Contains security risk patterns: ${patterns.join(', ')}`]
      }
    ]
  };

  return {
    url,
    success: true,
    passed: false,
    summary: { flaggedCodeCount: 0, securityRiskCount: 1, passed: false },
    details
  };
}

function failedSummary(
  pageResults: PublishedUrlValidationSummary['pageResults']
): PublishedUrlValidationSummary {
  return {
    pageResults,
    siteResults: {
      pageCount: pageResults.length,
      analyzedCount: pageResults.length,
      passedCount: 0,
      failedCount: pageResults.length,
      requestFailureCount: 0,
      validationFailureCount: pageResults.length,
      incomplete: false
    },
    passed: false,
    gsapDetected: true,
    legacyIx2Detected: false,
    unicornStudioDetected: false,
    raw: {}
  };
}

test('names the security-risk pattern once even when every page carries it', () => {
  // Flaue Udo (Oct 2026): 11 pages, 0 passed, every page flagged on the same
  // Escape-to-close handler; the form only said "did not pass".
  const summary = failedSummary([
    securityRiskPage('https://flau-template.webflow.io/', [KEYDOWN_PATTERN]),
    securityRiskPage('https://flau-template.webflow.io/work', [KEYDOWN_PATTERN]),
    securityRiskPage('https://flau-template.webflow.io/about', [KEYDOWN_PATTERN])
  ]);

  const issues = getPublishedUrlValidationIssues(summary);

  assert.deepEqual(issues, [
    'Custom code on / was flagged as a security risk: it registers a keydown keyboard listener. Remove or rework that code, publish, and validate again.'
  ]);
  assert.equal(buildPublishedUrlValidationMessage(summary), issues[0]);
});

test('describes each distinct security-risk pattern', () => {
  const summary = failedSummary([
    securityRiskPage('https://example.webflow.io/contact', [
      `addEventListener\\s*\\(\\s*['"]submit['"]`,
      `fetch\\s*\\(\\s*['"](https?:\\/\\/|\\/\\/)[^'"]*['"]\\s*\\+\\s*document\\.cookie`
    ])
  ]);

  assert.deepEqual(getPublishedUrlValidationIssues(summary), [
    'Custom code on /contact was flagged as a security risk: it attaches a listener to form submission. Remove or rework that code, publish, and validate again.',
    'Custom code on /contact was flagged as a security risk: it sends document.cookie to another origin. Remove or rework that code, publish, and validate again.'
  ]);
});

test('falls back to the crawler message when no pattern source is reported', () => {
  const page = securityRiskPage('https://example.webflow.io/', []);
  page.details.securityRisks[0].flaggedCode = [];
  const summary = failedSummary([page]);

  assert.deepEqual(getPublishedUrlValidationIssues(summary), [
    'Custom code on / was flagged as a security risk: it Script contains security risk patterns. Remove or rework that code, publish, and validate again.'
  ]);
});

test('keeps flagged-code messages ahead of security-risk messages', () => {
  const page = securityRiskPage('https://example.webflow.io/', [KEYDOWN_PATTERN]);
  page.details.flaggedCode = [{ message: 'Mixed GSAP usage with unapproved code' }];
  const summary = failedSummary([page]);

  const issues = getPublishedUrlValidationIssues(summary);
  assert.equal(issues[0], 'Mixed GSAP usage with unapproved code');
  assert.equal(issues.length, 2);
});
