import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  getWorkflowPage,
  workflowPages,
  type WorkflowPage
} from '../src/lib/data/workflowPages.ts';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages.ts';

const packageRoot = new URL('..', import.meta.url).pathname;

const waterEraTerms = /\b(water|waterway|current|flowing|river|turbulence|reservoir)\b/i;

function normalized(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase());
}

function renderedText(page: WorkflowPage): string {
  return [
    page.eyebrow,
    page.title,
    page.description,
    page.directAnswer,
    page.fit,
    page.notFit,
    ...page.signals,
    ...page.steps.flatMap((step) => [step.title, step.detail]),
    ...page.artifacts.flatMap((artifact) => [artifact.title, artifact.detail]),
    ...page.faqs.flatMap((faq) => [faq.question, faq.answer])
  ].join(' ');
}

test('workflow library contains twelve distinct, substantive guides', () => {
  assert.equal(workflowPages.length, 12);

  const uniqueFields: Array<keyof WorkflowPage> = [
    'slug',
    'title',
    'seoTitle',
    'description',
    'directAnswer'
  ];

  for (const field of uniqueFields) {
    const values = workflowPages.map((page) => String(page[field]));
    assert.equal(new Set(normalized(values)).size, 12, `${field} values must be unique`);
  }

  for (const page of workflowPages) {
    assert.match(page.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(getWorkflowPage(page.slug), page);
    assert.ok(page.directAnswer.length >= 140, `${page.slug} needs an answer-first summary`);
    assert.ok(page.signals.length >= 3, `${page.slug} needs decision signals`);
    assert.ok(page.steps.length >= 4, `${page.slug} needs a usable operating path`);
    assert.ok(page.artifacts.length >= 3, `${page.slug} needs concrete artifacts`);
    assert.ok(page.proofLinks.length >= 2, `${page.slug} needs real proof links`);
    assert.ok(page.faqs.length >= 3, `${page.slug} needs visible FAQs`);
    assert.ok(page.relatedSlugs.length >= 2, `${page.slug} needs related guides`);
    assert.ok(renderedText(page).length >= 1_800, `${page.slug} is too thin`);
    assert.doesNotMatch(renderedText(page), waterEraTerms, `${page.slug} uses Water-era language`);
  }
});

test('workflow relationships and proof links resolve to owned routes', () => {
  const slugs = new Set(workflowPages.map((page) => page.slug));
  const sitemap = JSON.parse(
    readFileSync(path.join(packageRoot, 'src/lib/data/searchRoutes.json'), 'utf8')
  ) as Array<{ path: string }>;
  const sitemapPaths = new Set(sitemap.map((route) => route.path));
  const marketingPaths = new Set(
    marketingPagePortfolio
      .filter((entry) => entry.cluster === 'workflow-library')
      .map((entry) => entry.path)
  );

  assert.ok(sitemapPaths.has('/workflows'));
  assert.ok(marketingPaths.has('/workflows'));

  for (const page of workflowPages) {
    assert.ok(sitemapPaths.has(`/workflows/${page.slug}`), `${page.slug} missing from sitemap`);
    assert.ok(
      marketingPaths.has(`/workflows/${page.slug}`),
      `${page.slug} missing from marketing portfolio`
    );

    for (const relatedSlug of page.relatedSlugs) {
      assert.ok(slugs.has(relatedSlug), `${page.slug} links unknown guide ${relatedSlug}`);
      assert.notEqual(relatedSlug, page.slug, `${page.slug} cannot relate to itself`);
    }

    for (const proof of page.proofLinks) {
      assert.match(proof.href, /^\//, `${page.slug} proof must be Agency-owned`);
      assert.notEqual(proof.href, '/workflows', `${page.slug} proof must be evidence, not the hub`);
    }
  }
});

test('workflow FAQ questions are not mass-duplicated', () => {
  const questions = workflowPages.flatMap((page) => page.faqs.map((faq) => faq.question));
  assert.equal(new Set(normalized(questions)).size, questions.length);
});

test('workflow route implementation is prerendered, indexable, and playbook-native', () => {
  const routeServer = readFileSync(
    path.join(packageRoot, 'src/routes/workflows/[slug]/+page.server.ts'),
    'utf8'
  );
  const routePage = readFileSync(
    path.join(packageRoot, 'src/routes/workflows/[slug]/+page.svelte'),
    'utf8'
  );
  const hubPage = readFileSync(path.join(packageRoot, 'src/routes/workflows/+page.svelte'), 'utf8');
  const layoutServer = readFileSync(path.join(packageRoot, 'src/routes/+layout.server.ts'), 'utf8');

  assert.match(routeServer, /export const prerender = true/);
  assert.match(routeServer, /export function entries/);
  assert.match(routeServer, /error\(404/);
  assert.match(routePage, /<SEO/);
  assert.match(routePage, /faqItems=/);
  assert.match(routePage, /breadcrumbs/);
  assert.match(routePage, /href="\/workflows"/);
  assert.match(hubPage, /<SEO/);
  assert.match(hubPage, /Operator playbook/);
  assert.match(hubPage, /Map the play\. Build the system\. Keep control\./);
  assert.match(hubPage, /Signal → Decision → Proof/);
  assert.match(routePage, /Playbook route/);
  assert.match(routePage, /Run the play/);
  assert.match(layoutServer, /if \(building\)/);
  assert.match(layoutServer, /user: undefined/);
  assert.doesNotMatch(`${routeServer}\n${routePage}\n${hubPage}`, waterEraTerms);
  assert.doesNotMatch(`${routePage}\n${hubPage}`, /\b(game day|winning|coach)\b/i);
});

test('workflow surfaces use the Performance token contract instead of local styling literals', () => {
  const routeFiles = [
    readFileSync(path.join(packageRoot, 'src/routes/workflows/+page.svelte'), 'utf8'),
    readFileSync(path.join(packageRoot, 'src/routes/workflows/[slug]/+page.svelte'), 'utf8')
  ];
  const tokenFamilies = [
    '--color-performance-',
    '--font-performance-',
    '--text-performance-',
    '--leading-performance-',
    '--tracking-performance-',
    '--space-performance-',
    '--duration-performance-',
    '--ease-performance-'
  ];

  for (const route of routeFiles) {
    for (const family of tokenFamilies) {
      assert.match(route, new RegExp(family.replaceAll('-', '\\-')), `${family} is missing`);
    }

    assert.match(route, /--content-width-performance/);
    assert.doesNotMatch(route, /color-mix\(/);
    assert.doesNotMatch(route, /#[0-9a-f]{3,8}\b/i);
  }
});

test('workflow typography follows the Performance property spine', () => {
  const hubPage = readFileSync(path.join(packageRoot, 'src/routes/workflows/+page.svelte'), 'utf8');
  const guidePage = readFileSync(
    path.join(packageRoot, 'src/routes/workflows/[slug]/+page.svelte'),
    'utf8'
  );

  for (const route of [hubPage, guidePage]) {
    assert.match(route, /h1\s*\{[\s\S]*?font-family:\s*var\(--font-performance-display\)/);
    assert.match(route, /h2\s*\{[\s\S]*?font-family:\s*var\(--font-performance-display\)/);
    assert.doesNotMatch(route, /font-family:\s*var\(--font-performance-serif\)/);
  }

  assert.match(
    hubPage,
    /\.guide-index h3\s*\{[\s\S]*?font-family:\s*var\(--font-performance-display\)/
  );
  assert.match(guidePage, /h3\s*\{[\s\S]*?font-family:\s*var\(--font-performance-display\)/);
  assert.match(
    guidePage,
    /\.guide-related strong\s*\{[\s\S]*?font-family:\s*var\(--font-performance-display\)/
  );
  assert.match(
    guidePage,
    /\.guide-answer\s*\{[\s\S]*?font-family:\s*var\(--font-performance-prose\)/
  );
  assert.match(
    hubPage,
    /\.library-intro > p\s*\{[\s\S]*?font-family:\s*var\(--font-performance-prose\)/
  );
});
