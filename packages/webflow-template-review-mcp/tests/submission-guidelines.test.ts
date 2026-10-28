import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AirtableClient } from '../src/airtable.js';
import {
  DEFAULT_GUIDELINES_URL,
  filterGuidelines,
  formatGuidelinesMarkdown,
  getSubmissionGuidelines,
  resetGuidelinesCache,
  type GuidelineBlock,
  type GuidelinesDocument,
} from '../src/submission-guidelines.js';
import { registerTools, WRITE_TOOL_NAMES } from '../src/tools.js';

const block = (id: string, kind: GuidelineBlock['kind'], text: string, extra: Partial<GuidelineBlock> = {}): GuidelineBlock => ({
  id,
  kind,
  html: '',
  text,
  requirementLevel: null,
  validatorChecks: [],
  ...extra,
});

const DOC: GuidelinesDocument = {
  version: 'v1',
  sections: [
    {
      id: 'required-pages',
      name: 'Required Pages',
      order: 2,
      blocks: [
        block('required-pages-01', 'heading-2', 'Required Pages'),
        block('required-pages-02', 'bullet', 'Page Naming\n- Use Title Case for page names.'),
        block('required-pages-08', 'bullet', 'Add noindex to the Licenses and Changelog pages.', {
          requirementLevel: 'Required',
          validatorChecks: ['utility-page-indexable'],
        }),
      ],
    },
    {
      id: 'seo',
      name: 'SEO',
      order: 5,
      blocks: [
        block('seo-01', 'heading-2', 'SEO'),
        block('seo-02', 'bullet', 'Home title: {Template Name} - Webflow HTML website template', { validatorChecks: ['seo.home-title-format'] }),
        block('seo-03', 'quote', 'Check main pages on PageSpeed.'),
      ],
    },
  ],
};

function respond(body: unknown, status = 200) {
  const calls: string[] = [];
  const fetchImpl = (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

test('formats guidelines as Markdown with stable rule ids, levels, and validator checks', () => {
  const md = formatGuidelinesMarkdown(DOC);
  assert.match(md, /^# Template submission guidelines \(version v1\)/);
  assert.match(md, /## Required Pages\n\n- Page Naming \[required-pages-02\]\n  - Use Title Case for page names\.\n/);
  assert.match(md, /- Add noindex to the Licenses and Changelog pages\. \[required-pages-08; Required; Validator: utility-page-indexable\]/);
  assert.match(md, /> Check main pages on PageSpeed\./);
  // A section's own Heading 2 is folded into the section header.
  assert.doesNotMatch(md, /### Required Pages/);
});

test('filters by section id or name and by validator check', () => {
  assert.deepEqual(filterGuidelines(DOC, { section: 'seo' }).sections.map((s) => s.id), ['seo']);
  assert.deepEqual(filterGuidelines(DOC, { section: 'Required Pages' }).sections.map((s) => s.id), ['required-pages']);
  const byCheck = filterGuidelines(DOC, { validatorCheck: 'utility-page-indexable' });
  assert.deepEqual(byCheck.sections.map((s) => s.blocks.map((b) => b.id)), [['required-pages-08']]);
  assert.equal(filterGuidelines(DOC, { validatorCheck: 'nope' }).sections.length, 0);
});

test('caches for five minutes, refetches on refresh, and serves stale on failure', async () => {
  resetGuidelinesCache();
  let now = 1_000_000;
  const ok = respond(DOC);
  const first = await getSubmissionGuidelines({ fetchImpl: ok.fetchImpl, now: () => now });
  assert.equal(first.cache, 'miss');
  assert.equal(ok.calls[0], DEFAULT_GUIDELINES_URL);

  now += 60_000;
  assert.equal((await getSubmissionGuidelines({ fetchImpl: ok.fetchImpl, now: () => now })).cache, 'hit');
  assert.equal((await getSubmissionGuidelines({ fetchImpl: ok.fetchImpl, now: () => now, refresh: true })).cache, 'miss');
  assert.equal(ok.calls.length, 2);

  now += 10 * 60_000;
  const down = respond({ error: 'guidelines_unavailable' }, 503);
  const stale = await getSubmissionGuidelines({ fetchImpl: down.fetchImpl, now: () => now });
  assert.equal(stale.cache, 'stale');
  assert.equal(stale.doc.version, 'v1');

  resetGuidelinesCache();
  await assert.rejects(getSubmissionGuidelines({ fetchImpl: down.fetchImpl, now: () => now }), /503/);
});

test('template_review_get_submission_guidelines is a read-only tool returning Markdown or JSON', async () => {
  resetGuidelinesCache();
  assert.equal(WRITE_TOOL_NAMES.has('template_review_get_submission_guidelines'), false);

  const handlers = new Map<string, (args: Record<string, unknown>) => Promise<{ content: Array<{ text?: string }> }>>();
  const server = {
    tool: (name: string, ...rest: unknown[]) => {
      handlers.set(name, rest[rest.length - 1] as never);
    },
    registerTool: (name: string, _config: unknown, handler: unknown) => {
      handlers.set(name, handler as never);
    },
  } as unknown as McpServer;

  const original = globalThis.fetch;
  globalThis.fetch = respond(DOC).fetchImpl;
  try {
    registerTools(server, () => ({}) as AirtableClient, () => null, { guidelinesUrl: 'https://guidelines.test/api' });
    const handler = handlers.get('template_review_get_submission_guidelines');
    assert.ok(handler);

    const md = JSON.parse((await handler({ validator_check: 'seo.home-title-format' })).content[0].text ?? '{}');
    assert.equal(md.ok, true);
    assert.equal(md.data.blockCount, 1);
    assert.match(md.data.markdown, /\[seo-02; Validator: seo\.home-title-format\]/);

    const json = JSON.parse((await handler({ section: 'required-pages', format: 'json' })).content[0].text ?? '{}');
    assert.deepEqual(json.data.sections.map((s: { id: string }) => s.id), ['required-pages']);
    assert.equal(json.data.cache, 'hit');
  } finally {
    globalThis.fetch = original;
    resetGuidelinesCache();
  }
});
