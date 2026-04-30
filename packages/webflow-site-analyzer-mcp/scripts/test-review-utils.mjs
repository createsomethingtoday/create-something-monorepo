/**
 * Unit tests for review-utils.ts
 * Run: node scripts/test-review-utils.mjs
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Import from compiled output
const require = createRequire(import.meta.url);
const {
  detectSCorruption,
  repairSCorruption,
  sanitizeAuditPayload,
  is404PageTitle,
  isCriticalUtilityUrl,
  isWebflowComponentAnchor,
  classifyAltTextEvidenceExample,
  computeScore
} = require('../dist/review-utils.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

// =============================================================================
console.log('\n== detectSCorruption ==');

test('detects corruption when ≥2 known patterns present', () => {
  assert.equal(detectSCorruption('de cription and http :// links'), true);
});

test('no false positive on clean text', () => {
  assert.equal(detectSCorruption('Add description for this page'), false);
});

test('single pattern is not enough', () => {
  assert.equal(detectSCorruption('de cription only'), false);
});

// =============================================================================
console.log('\n== repairSCorruption ==');

test('repairs "de cription" → "description"', () => {
  assert.equal(repairSCorruption('de cription'), 'description');
});

test('repairs "http :" → "https:"', () => {
  assert.equal(repairSCorruption('http :'), 'https:');
});

test('repairs trailing s: "item " → "items"', () => {
  assert.equal(repairSCorruption('item '), 'items');
});

test('repairs "Mu ic" → "Music"', () => {
  // Note: capital M before "u ic" — the regex only replaces lowercase-space-lowercase
  // "Mu ic" has M(uppercase) then "u ic" → repair "u ic" to "usic"
  assert.equal(repairSCorruption('Mu ic'), 'Music');
});

test('repairs "#w-tab -0" → "#w-tabs-0"', () => {
  assert.equal(repairSCorruption('#w-tab -0'), '#w-tabs-0');
});

test('does not corrupt clean text', () => {
  assert.equal(repairSCorruption('hello world'), 'hello world');
});

// =============================================================================
console.log('\n== sanitizeAuditPayload ==');

test('returns input unchanged when no corruption detected', () => {
  const clean = { title: 'Hello World', count: 42 };
  assert.deepEqual(sanitizeAuditPayload(clean), clean);
});

test('repairs corrupted object tree', () => {
  // Realistic: strings with zero "s" and known corruption fragments get repaired.
  // Strings with "s" already present pass through unchanged.
  const corrupted = {
    target: 'http ://example.com',
    nested: { href: '#w-tab -0-data-w-pane-0', items: [{ text: 'de cription' }] },
    clean: 'This string has s characters'
  };
  const result = sanitizeAuditPayload(corrupted);
  assert.equal(result.target, 'https://example.com');
  assert.equal(result.nested.href, '#w-tabs-0-data-w-pane-0');
  assert.equal(result.nested.items[0].text, 'description');
  assert.equal(result.clean, 'This string has s characters'); // unchanged
});

test('does not corrupt clean object tree', () => {
  // Strings that already contain "s" should pass through unchanged
  const clean = {
    target: 'Add description',
    nested: { href: 'https://example.com', text: 'Posts and articles' }
  };
  const result = sanitizeAuditPayload(clean);
  assert.equal(result.target, 'Add description');
  assert.equal(result.nested.href, 'https://example.com');
  assert.equal(result.nested.text, 'Posts and articles');
});

test('returns null/undefined unchanged', () => {
  assert.equal(sanitizeAuditPayload(null), null);
  assert.equal(sanitizeAuditPayload(undefined), undefined);
});

// =============================================================================
console.log('\n== is404PageTitle ==');

test('"Not Found" is a 404', () => {
  assert.equal(is404PageTitle('Not Found'), true);
});

test('"404" is a 404', () => {
  assert.equal(is404PageTitle('404'), true);
});

test('"404 - Page Not Found" is a 404', () => {
  assert.equal(is404PageTitle('404 - Page Not Found'), true);
});

test('"Home" is not a 404', () => {
  assert.equal(is404PageTitle('Home'), false);
});

test('null is not a 404', () => {
  assert.equal(is404PageTitle(null), false);
});

// =============================================================================
console.log('\n== isCriticalUtilityUrl ==');

test('/templates/licensing matches', () => {
  assert.equal(isCriticalUtilityUrl('https://example.com/templates/licensing'), true);
});

test('/utility/license matches', () => {
  assert.equal(isCriticalUtilityUrl('https://example.com/utility/license'), true);
});

test('/templates/changelog matches', () => {
  assert.equal(isCriticalUtilityUrl('https://example.com/templates/changelog'), true);
});

test('/template/change-log matches', () => {
  assert.equal(isCriticalUtilityUrl('https://example.com/template/change-log'), true);
});

test('/about-us does not match', () => {
  assert.equal(isCriticalUtilityUrl('https://example.com/about-us'), false);
});

// =============================================================================
console.log('\n== isWebflowComponentAnchor ==');

test('#w-tabs-0-data-w-pane-0 is a component anchor', () => {
  assert.equal(isWebflowComponentAnchor('#w-tabs-0-data-w-pane-0'), true);
});

test('#w-dropdown-list is a component anchor', () => {
  assert.equal(isWebflowComponentAnchor('#w-dropdown-list'), true);
});

test('#contact is NOT a component anchor', () => {
  assert.equal(isWebflowComponentAnchor('#contact'), false);
});

test('/about is NOT an anchor at all', () => {
  assert.equal(isWebflowComponentAnchor('/about'), false);
});

// =============================================================================
console.log('\n== classifyAltTextEvidenceExample ==');

test('blog thumbnails are classified as informative', () => {
  const result = classifyAltTextEvidenceExample(
    { selector: 'img.blog-thumbnail.horizontal', src: '/images/post-card.avif' },
    'https://example.webflow.io/blog'
  );
  assert.equal(result.bucket, 'informative');
});

test('post hero images are classified as informative', () => {
  const result = classifyAltTextEvidenceExample(
    { selector: 'img.blog-details-main-image', src: '/images/post-hero.avif' },
    'https://example.webflow.io/post/how-to-make-an-ai-product-website-feel-premium'
  );
  assert.equal(result.bucket, 'informative');
});

test('brand logos are classified as decorative review evidence', () => {
  const result = classifyAltTextEvidenceExample(
    { selector: 'img.brand-image.dark', src: '/images/wings-logo.svg' },
    'https://example.webflow.io/'
  );
  assert.equal(result.bucket, 'decorative-review');
});

test('decorative button icons are classified as review-only chrome', () => {
  const result = classifyAltTextEvidenceExample(
    { selector: 'img.button-icon.arrow', src: '/images/arrow.svg' },
    'https://example.webflow.io/contact'
  );
  assert.equal(result.bucket, 'decorative-review');
});

test('image-only links without text or labels are classified as functional', () => {
  const result = classifyAltTextEvidenceExample(
    { selector: 'a.image-link > img', href: '/contact', text: '' },
    'https://example.webflow.io/'
  );
  assert.equal(result.bucket, 'functional');
});

// =============================================================================
console.log('\n== resolveDesignerSlug ==');

const { resolveDesignerSlug } = require('../dist/review-utils.js');
const origin = 'https://example.webflow.io';
const discovered = [
  'https://example.webflow.io/',
  'https://example.webflow.io/about-us',
  'https://example.webflow.io/templates/licensing',
  'https://example.webflow.io/templates/changelog',
  'https://example.webflow.io/utility/instruction',
  'https://example.webflow.io/templates/style-guide',
];

test('"home" resolves to origin', () => {
  assert.equal(resolveDesignerSlug('home', origin, discovered), origin);
});

test('direct match: "about-us" resolves', () => {
  assert.equal(
    resolveDesignerSlug('about-us', origin, discovered),
    'https://example.webflow.io/about-us'
  );
});

test('suffix match: "licensing" resolves to /templates/licensing', () => {
  assert.equal(
    resolveDesignerSlug('licensing', origin, discovered),
    'https://example.webflow.io/templates/licensing'
  );
});

test('suffix match: "instruction" resolves to /utility/instruction', () => {
  assert.equal(
    resolveDesignerSlug('instruction', origin, discovered),
    'https://example.webflow.io/utility/instruction'
  );
});

test('no match: "landing-page" returns null (avoids phantom 404)', () => {
  assert.equal(resolveDesignerSlug('landing-page', origin, discovered), null);
});

test('suffix match: "style-guide" resolves to /templates/style-guide', () => {
  assert.equal(
    resolveDesignerSlug('style-guide', origin, discovered),
    'https://example.webflow.io/templates/style-guide'
  );
});

// =============================================================================
console.log('\n== classifyUrlDeterministic ==');

const { classifyUrlDeterministic, classifyUrlsDeterministic } = require('../dist/url-classifier.js');

test('homepage is classified as homepage with critical priority', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/', true);
  assert.equal(result.classification, 'homepage');
  assert.equal(result.priority, 'critical');
  assert.equal(result.confidence, 1.0);
});

test('/templates/licensing is utility:license', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/templates/licensing', false);
  assert.equal(result.classification, 'utility:license');
  assert.equal(result.priority, 'critical');
});

test('/legal/terms is utility:license', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/legal/terms', false);
  assert.equal(result.classification, 'utility:license');
  assert.equal(result.priority, 'critical');
});

test('/utility/instruction is utility:instructions', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/utility/instruction', false);
  assert.equal(result.classification, 'utility:instructions');
  assert.equal(result.priority, 'critical');
});

test('/changelog is utility:changelog', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/changelog', false);
  assert.equal(result.classification, 'utility:changelog');
  assert.equal(result.priority, 'critical');
});

test('/template/change-log is utility:changelog', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/template/change-log', false);
  assert.equal(result.classification, 'utility:changelog');
  assert.equal(result.priority, 'critical');
});

test('/404 is error-page with low priority', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/404', false);
  assert.equal(result.classification, 'error-page');
  assert.equal(result.priority, 'low');
});

test('/about-us is content with normal priority', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/about-us', false);
  assert.equal(result.classification, 'content');
  assert.equal(result.priority, 'normal');
});

test('/style-guide is utility:style-guide', () => {
  const result = classifyUrlDeterministic('https://ex.webflow.io/style-guide', false);
  assert.equal(result.classification, 'utility:style-guide');
  assert.equal(result.priority, 'critical');
});

test('batch classification preserves order and excludes nothing', () => {
  const urls = [
    'https://ex.webflow.io/',
    'https://ex.webflow.io/about',
    'https://ex.webflow.io/404',
    'https://ex.webflow.io/templates/licensing',
  ];
  const results = classifyUrlsDeterministic(urls, urls[0]);
  assert.equal(results.length, 4);
  assert.equal(results[0].classification, 'homepage');
  assert.equal(results[2].classification, 'error-page');
  assert.equal(results[3].classification, 'utility:license');
});

// =============================================================================
console.log('\n== validateTemplateName ==');

const { validateTemplateName } = require('../dist/name-validator.js');

test('"Meetora" is compliant', () => {
  const r = validateTemplateName('Meetora');
  assert.equal(r.compliant, true);
  assert.equal(r.issues.length, 0);
});

test('"Agency" is forbidden (primary tag)', () => {
  const r = validateTemplateName('Agency');
  assert.equal(r.compliant, false);
  assert.ok(r.issues[0].includes('Agency'));
});

test('"My Portfolio" is forbidden (contains Portfolio)', () => {
  const r = validateTemplateName('My Portfolio');
  assert.equal(r.compliant, false);
});

test('"meetora" fails capitalization', () => {
  const r = validateTemplateName('meetora');
  assert.equal(r.compliant, false);
  assert.ok(r.issues[0].includes('capitalized'));
});

test('"Smart AI Hub" fails AI rule', () => {
  const r = validateTemplateName('Smart AI Hub');
  assert.equal(r.compliant, false);
  assert.ok(r.issues.some(i => i.includes('AI')));
});

test('"Livep0wer" is compliant', () => {
  const r = validateTemplateName('Livep0wer');
  assert.equal(r.compliant, true);
});

test('"Meetup W" fails (Meetup derives from forbidden "Events, Conferences & Meetups")', () => {
  const r = validateTemplateName('Meetup W');
  assert.equal(r.compliant, false);
});

test('empty name fails', () => {
  const r = validateTemplateName('');
  assert.equal(r.compliant, false);
});

// =============================================================================
console.log('\n== wcagContrastRatio ==');

const { wcagContrastRatio, wcagThreshold, wcagLuminance } = require('../dist/review-utils.js');

test('black on white = 21:1', () => {
  const ratio = wcagContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(ratio - 21) < 0.1, `Expected ~21, got ${ratio}`);
});

test('white on white = 1:1', () => {
  const ratio = wcagContrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
  assert.equal(ratio, 1);
});

test('#666 on #1a1a1a has low contrast', () => {
  const ratio = wcagContrastRatio({ r: 102, g: 102, b: 102 }, { r: 26, g: 26, b: 26 });
  assert.ok(ratio < 4.5, `Expected <4.5, got ${ratio}`);
});

test('#f5f5f5 on #1e1e1e has high contrast (dark theme)', () => {
  const ratio = wcagContrastRatio({ r: 245, g: 245, b: 245 }, { r: 30, g: 30, b: 30 });
  assert.ok(ratio > 4.5, `Expected >4.5, got ${ratio}`);
});

test('wcagThreshold: normal text = 4.5', () => {
  assert.equal(wcagThreshold(16, false), 4.5);
});

test('wcagThreshold: large text (24px) = 3', () => {
  assert.equal(wcagThreshold(24, false), 3);
});

test('wcagThreshold: bold text at 19px = 3 (large text)', () => {
  assert.equal(wcagThreshold(19, true), 3);
});

test('wcagThreshold: bold text at 18px = 4.5 (not large enough)', () => {
  assert.equal(wcagThreshold(18, true), 4.5);
});

test('wcagThreshold: non-bold at 20px = 4.5 (not large enough)', () => {
  assert.equal(wcagThreshold(20, false), 4.5);
});

test('luminance of pure black = 0', () => {
  assert.equal(wcagLuminance(0, 0, 0), 0);
});

test('luminance of pure white = 1', () => {
  assert.ok(Math.abs(wcagLuminance(255, 255, 255) - 1) < 0.001);
});

// =============================================================================
console.log('\n== computeScore ==');

test('all pass = score 100, grade A', () => {
  const checks = [
    { status: 'pass', severity: 'critical' },
    { status: 'pass', severity: 'major' },
    { status: 'pass', severity: 'minor' },
  ];
  const { score, grade } = computeScore(checks);
  assert.equal(score, 100);
  assert.equal(grade, 'A');
});

test('all fail = score 0, grade F', () => {
  const checks = [
    { status: 'fail', severity: 'critical' },
    { status: 'fail', severity: 'major' },
  ];
  const { score, grade } = computeScore(checks);
  assert.equal(score, 0);
  assert.equal(grade, 'F');
});

test('partial earns 50% credit', () => {
  const checks = [
    { status: 'partial', severity: 'critical' }, // earns 10 of 20
    { status: 'pass', severity: 'critical' },     // earns 20 of 20
  ];
  const { score } = computeScore(checks);
  assert.equal(score, 75); // 30/40
});

test('manual checks excluded from scoring', () => {
  const checks = [
    { status: 'pass', severity: 'critical' },
    { status: 'manual', severity: 'major' },
  ];
  const { score } = computeScore(checks);
  assert.equal(score, 100); // manual excluded, only pass counted
});

test('severity weighting works', () => {
  // critical fail (-20) + minor pass (+5) = 5/25 = 20%
  const checks = [
    { status: 'fail', severity: 'critical' },
    { status: 'pass', severity: 'minor' },
  ];
  const { score, grade } = computeScore(checks);
  assert.equal(score, 20);
  assert.equal(grade, 'F');
});

test('mixed results produce expected grade', () => {
  const checks = [
    { status: 'pass', severity: 'critical' },   // 20/20
    { status: 'pass', severity: 'major' },       // 10/10
    { status: 'fail', severity: 'minor' },       // 0/5
    { status: 'partial', severity: 'info' },     // 1/2
  ];
  const { score, grade } = computeScore(checks);
  // earned=31, total=37, score=84
  assert.equal(score, 84);
  assert.equal(grade, 'B');
});

// =============================================================================
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
