import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractInlineStyles,
  extractStylesheetLinks,
  fetchPublishedSiteStylesheet,
  normalizePublishedWebflowUrl,
  PublishedSiteStylesheetError,
  searchCss,
  summarizeCss,
} from '../src/published-site-stylesheet.js';

const COMPILED_CSS_URL = 'https://cdn.prod.website-files.com/68a1/css/example-template.webflow.5f3a1c9e2.css';
const SHARED_CSS_URL = 'https://cdn.prod.website-files.com/68a1/css/example-template.webflow.shared.0a1b2c3d4.css';
const THIRD_PARTY_CSS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/swiper/11/swiper-bundle.min.css';

const PAGE_HTML = `<!DOCTYPE html><html><head>
<title>Example &amp; Template</title>
<link href="${COMPILED_CSS_URL}" rel="stylesheet" type="text/css"/>
<link rel="stylesheet" href="${SHARED_CSS_URL}">
<link rel="stylesheet" href="${THIRD_PARTY_CSS_URL}" media="screen">
<link rel="preload" href="https://cdn.prod.website-files.com/68a1/fonts/x.woff2" as="font">
<link href="${COMPILED_CSS_URL}#dup" rel="stylesheet">
<style>.custom-head { color: red !important; }</style>
</head><body>
<style>.custom-body { display: none; }</style>
<p>hello</p></body></html>`;

const COMPILED_CSS = `:root{--brand:#111;--space:1rem}
.hero{font-family:"Inter",sans-serif;padding:2rem}
.hero .title{font-size:3rem}
@media screen and (max-width:991px){.hero{padding:1rem}.nav{display:none}}
@media screen and (max-width:479px){.hero .title{font-size:2rem !important}}
@font-face{font-family:'Cabinet Grotesk';src:url(x.woff2)}
.footer{font-family:'Cabinet Grotesk',serif}`;

function createFetcher(routes: Record<string, { status?: number; body: string; contentType?: string }>, calls: string[] = []) {
  const fetcher: typeof fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    return new Response(route.body, {
      status: route.status ?? 200,
      headers: { 'Content-Type': route.contentType ?? 'text/plain' },
    });
  };
  return { fetcher, calls };
}

test('normalizePublishedWebflowUrl accepts only https *.webflow.io hosts', () => {
  assert.equal(normalizePublishedWebflowUrl('https://example-template.webflow.io/about#x').toString(), 'https://example-template.webflow.io/about');
  for (const bad of ['http://example-template.webflow.io/', 'https://webflow.io/', 'https://example.com/', 'https://cdn.prod.website-files.com/x.css', 'nope']) {
    assert.throws(() => normalizePublishedWebflowUrl(bad), (error: unknown) => error instanceof PublishedSiteStylesheetError && error.code === 'INVALID_PUBLISHED_URL');
  }
});

test('extractStylesheetLinks resolves, dedupes, classifies, and ignores non-stylesheet links', () => {
  const links = extractStylesheetLinks(PAGE_HTML, 'https://example-template.webflow.io/');
  assert.deepEqual(
    links.map((link) => [link.index, link.href, link.webflow_hosted, link.webflow_compiled, link.media]),
    [
      [0, COMPILED_CSS_URL, true, true, null],
      [1, SHARED_CSS_URL, true, true, null],
      [2, THIRD_PARTY_CSS_URL, false, false, 'screen'],
    ],
  );
  const relative = extractStylesheetLinks('<link rel="stylesheet" href="/css/site.css">', 'https://example-template.webflow.io/about');
  assert.equal(relative[0]?.href, 'https://example-template.webflow.io/css/site.css');
  assert.equal(relative[0]?.webflow_hosted, false);
});

test('extractInlineStyles captures head and body blocks with locations', () => {
  const blocks = extractInlineStyles(PAGE_HTML);
  assert.deepEqual(
    blocks.map((block) => [block.index, block.location, block.css, block.css_truncated]),
    [
      [0, 'head', '.custom-head { color: red !important; }', false],
      [1, 'body', '.custom-body { display: none; }', false],
    ],
  );
});

test('summarizeCss reports approximate structure', () => {
  const summary = summarizeCss(COMPILED_CSS);
  assert.equal(summary.total_chars, COMPILED_CSS.length);
  assert.equal(summary.rule_count_approx, 10);
  assert.deepEqual(summary.media_queries, ['screen and (max-width:991px)', 'screen and (max-width:479px)']);
  assert.deepEqual(summary.font_families, ['Inter', 'Cabinet Grotesk']);
  assert.deepEqual(summarizeCss('.a{font-family:inherit}.b{font-family:sans-serif}.c{font-family: "Outfit", sans-serif}').font_families, ['Outfit']);
  assert.equal(summary.font_face_count, 1);
  assert.equal(summary.important_count, 1);
  assert.equal(summary.custom_property_count, 2);
  assert.equal(summary.class_selector_count_approx, 4);
});

test('searchCss returns the enclosing rule block per case-insensitive hit', () => {
  const matches = searchCss(COMPILED_CSS, ['FONT-SIZE', 'cabinet grotesk'], 0);
  assert.deepEqual(
    matches.map((match) => [match.term, match.stylesheet_index, match.snippet, match.enclosing_at_rule]),
    [
      ['FONT-SIZE', 0, '.hero .title{font-size:3rem}', null],
      ['FONT-SIZE', 0, '.hero .title{font-size:2rem !important}', '@media screen and (max-width:479px)'],
      ['cabinet grotesk', 0, "@font-face{font-family:'Cabinet Grotesk';src:url(x.woff2)}", null],
      ['cabinet grotesk', 0, ".footer{font-family:'Cabinet Grotesk',serif}", null],
    ],
  );
  const selectorHit = searchCss(COMPILED_CSS, ['.nav'], 0);
  assert.deepEqual(
    selectorHit.map((match) => [match.snippet, match.enclosing_at_rule]),
    [['.nav{display:none}', '@media screen and (max-width:991px)']],
  );
  assert.ok(matches.every((match) => match.char_index >= 0 && COMPILED_CSS.slice(match.char_index).toLowerCase().startsWith(match.term.toLowerCase())));
});

test('fetchPublishedSiteStylesheet fetches Webflow-hosted CSS only by default and returns summaries, inline styles, and search', async () => {
  const { fetcher, calls } = createFetcher({
    'https://example-template.webflow.io/': { body: PAGE_HTML, contentType: 'text/html' },
    [COMPILED_CSS_URL]: { body: COMPILED_CSS, contentType: 'text/css' },
    [SHARED_CSS_URL]: { body: '.shared{margin:0}', contentType: 'text/css' },
    [THIRD_PARTY_CSS_URL]: { body: '.swiper{}', contentType: 'text/css' },
  });

  const result = await fetchPublishedSiteStylesheet(
    { published_url: 'https://example-template.webflow.io', search: ['font-size', 'nonexistent-term'] },
    { fetcher },
  );

  assert.deepEqual(calls, ['https://example-template.webflow.io/', COMPILED_CSS_URL, SHARED_CSS_URL]);
  assert.equal(result.page_title, 'Example & Template');
  assert.equal(result.stylesheets.length, 3);
  assert.equal(result.stylesheets[0]?.fetched, true);
  assert.equal(result.stylesheets[0]?.css, COMPILED_CSS);
  assert.equal(result.stylesheets[0]?.css_truncated, false);
  assert.equal(result.stylesheets[0]?.next_offset, null);
  assert.equal(result.stylesheets[0]?.summary?.font_face_count, 1);
  assert.equal(result.stylesheets[1]?.css, '.shared{margin:0}');
  assert.equal(result.stylesheets[2]?.fetched, false);
  assert.equal(result.stylesheets[2]?.skipped_reason, 'third_party');
  assert.equal(result.inline_styles.length, 2);
  assert.equal(result.search_matches?.length, 2);
  assert.deepEqual(result.search_terms_with_no_matches, ['nonexistent-term']);
  assert.ok(result.notes.some((note) => note.includes('include_third_party=true')));
});

test('fetchPublishedSiteStylesheet pages CSS with offset/max_chars and honors include_third_party', async () => {
  const { fetcher, calls } = createFetcher({
    'https://example-template.webflow.io/': { body: PAGE_HTML, contentType: 'text/html' },
    [COMPILED_CSS_URL]: { body: COMPILED_CSS, contentType: 'text/css' },
    [SHARED_CSS_URL]: { body: '.shared{margin:0}', contentType: 'text/css' },
    [THIRD_PARTY_CSS_URL]: { body: '.swiper{}', contentType: 'text/css' },
  });

  const first = await fetchPublishedSiteStylesheet(
    { published_url: 'https://example-template.webflow.io/', max_chars: 1_000, include_third_party: true },
    { fetcher },
  );
  assert.ok(calls.includes(THIRD_PARTY_CSS_URL));
  assert.equal(first.stylesheets[2]?.fetched, true);
  assert.equal(first.stylesheets[2]?.css, '.swiper{}');

  // Simulate a stylesheet larger than the budget by shrinking the budget below the CSS length.
  const compiledLength = COMPILED_CSS.length;
  const budgetSheet = `${COMPILED_CSS}\n${'/* pad */'.repeat(200)}`;
  const { fetcher: pagedFetcher } = createFetcher({
    'https://example-template.webflow.io/': { body: `<link rel="stylesheet" href="${COMPILED_CSS_URL}">`, contentType: 'text/html' },
    [COMPILED_CSS_URL]: { body: budgetSheet, contentType: 'text/css' },
  });
  const page1 = await fetchPublishedSiteStylesheet({ published_url: 'https://example-template.webflow.io/', max_chars: 1_000 }, { fetcher: pagedFetcher });
  const sheet1 = page1.stylesheets[0];
  assert.equal(sheet1?.css_chars_returned, 1_000);
  assert.equal(sheet1?.css_truncated, true);
  assert.equal(sheet1?.next_offset, 1_000);
  assert.ok(page1.notes.some((note) => note.includes('offset=next_offset')));

  const page2 = await fetchPublishedSiteStylesheet(
    { published_url: 'https://example-template.webflow.io/', max_chars: 1_000, offset: sheet1?.next_offset ?? 0 },
    { fetcher: pagedFetcher },
  );
  assert.equal(page2.stylesheets[0]?.css_offset, 1_000);
  assert.equal(`${sheet1?.css}${page2.stylesheets[0]?.css}`, budgetSheet.slice(0, 2_000));
  assert.ok(compiledLength < 2_000);
});

test('fetchPublishedSiteStylesheet surfaces page and stylesheet HTTP failures', async () => {
  const { fetcher: missingPage } = createFetcher({});
  await assert.rejects(
    () => fetchPublishedSiteStylesheet({ published_url: 'https://gone-template.webflow.io/' }, { fetcher: missingPage }),
    (error: unknown) => error instanceof PublishedSiteStylesheetError && error.code === 'PUBLISHED_SITE_HTTP_ERROR' && error.status === 404,
  );

  const { fetcher: brokenCss } = createFetcher({
    'https://example-template.webflow.io/': { body: `<link rel="stylesheet" href="${COMPILED_CSS_URL}">`, contentType: 'text/html' },
    [COMPILED_CSS_URL]: { status: 403, body: 'host_not_allowed', contentType: 'text/plain' },
  });
  const result = await fetchPublishedSiteStylesheet({ published_url: 'https://example-template.webflow.io/' }, { fetcher: brokenCss });
  assert.equal(result.stylesheets[0]?.fetched, false);
  assert.equal(result.stylesheets[0]?.status, 403);
  assert.match(result.stylesheets[0]?.error ?? '', /HTTP 403/);
});

test('fetchPublishedSiteStylesheet rejects invalid bounds before any network call', async () => {
  const { fetcher, calls } = createFetcher({});
  await assert.rejects(
    () => fetchPublishedSiteStylesheet({ published_url: 'https://example-template.webflow.io/', max_chars: 10 }, { fetcher }),
    (error: unknown) => error instanceof PublishedSiteStylesheetError && error.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    () => fetchPublishedSiteStylesheet({ published_url: 'https://example-template.webflow.io/', search: ['a'] }, { fetcher }),
    (error: unknown) => error instanceof PublishedSiteStylesheetError && error.code === 'INVALID_INPUT',
  );
  assert.deepEqual(calls, []);
});
