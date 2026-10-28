import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubmissionGuidelines } from '../src/components/marketplace/SubmissionGuidelines';
import {
  fetchGuidelines,
  groupGuidelineBlocks,
  resolveGuidelinesApiBase,
  sanitizeGuidelineHtml,
  sectionForHash,
  type GuidelineBlock,
  type GuidelinesDocument,
} from '../src/components/marketplace/submissionGuidelinesData';

const block = (id: string, kind: GuidelineBlock['kind'], html: string): GuidelineBlock => ({
  id,
  kind,
  html,
  text: html.replace(/<[^>]+>/g, ''),
  requirementLevel: null,
  validatorChecks: [],
});

const DOC: GuidelinesDocument = {
  version: 'abc123',
  sections: [
    {
      id: 'start-here',
      name: 'Start Here',
      order: 1,
      blocks: [block('start-here-01', 'heading-2', '<h2>Start Here 👋</h2>'), block('start-here-02', 'paragraph', '<p>Welcome to <strong>review</strong>.</p>')],
    },
    {
      id: 'required-pages',
      name: 'Required Pages',
      order: 2,
      blocks: [
        block('required-pages-01', 'heading-2', '<h2>Required Pages</h2>'),
        block('required-pages-02', 'bullet', '<ul><li><strong>Page Naming</strong><ul role="list"><li>Title Case</li></ul></li></ul>'),
        block('required-pages-03', 'bullet', '<ul><li>Add noindex to <a href="https://webflow.com/x" target="_blank">Licenses</a></li></ul>'),
        block('required-pages-04', 'numbered', '<ol><li>Step one</li></ol>'),
      ],
    },
  ],
};

test('merges adjacent bullets into one list and keeps numbered items separate', () => {
  const groups = groupGuidelineBlocks(DOC.sections[1].blocks);
  assert.deepEqual(
    groups.map((g) => (g.type === 'list' ? `${g.ordered ? 'ol' : 'ul'}:${g.blocks.length}` : g.type)),
    ['heading', 'ul:2', 'ol:1'],
  );
});

test('renders the default section with nested lists, rule anchors, and safe links', () => {
  const html = renderToStaticMarkup(<SubmissionGuidelines initialDocument={DOC} defaultSection="required-pages" syncUrlHash={false} />);
  assert.match(html, /role="tab"[^>]*aria-selected="true"[^>]*>Required Pages</);
  assert.match(html, /<h2 id="required-pages-01">Required Pages<\/h2>/);
  assert.match(html, /<ul><li id="required-pages-02"><strong>Page Naming<\/strong><ul><li>Title Case<\/li><\/ul><\/li><li id="required-pages-03">/);
  assert.match(html, /<a href="https:\/\/webflow.com\/x" target="_blank" rel="noopener noreferrer">Licenses<\/a>/);
  assert.match(html, /<ol><li id="required-pages-04">Step one<\/li><\/ol>/);
  assert.doesNotMatch(html, /Welcome to/);
  assert.match(html, /data-guidelines-version="abc123"/);
});

test('opens the first section when the default is unknown', () => {
  const html = renderToStaticMarkup(<SubmissionGuidelines initialDocument={DOC} defaultSection="nope" syncUrlHash={false} />);
  assert.match(html, /<p id="start-here-02">Welcome to <strong>review<\/strong>.<\/p>/);
});

test('shows a loading state before the guidelines arrive', () => {
  const html = renderToStaticMarkup(<SubmissionGuidelines apiBase="https://templates.webflow.com/templates-api" />);
  assert.match(html, /aria-busy="true"/);
});

test('strips scripts, event handlers, and unsafe links', () => {
  const dirty = '<p onclick="x()">Hi<script>alert(1)</script> <a href="javascript:alert(1)">bad</a> <img src=x onerror=y></p>';
  assert.equal(sanitizeGuidelineHtml(dirty), '<p>Hi <a>bad</a> </p>');
});

test('rewrites the Worker origin to the proxy and fetches the guidelines route', async () => {
  assert.equal(resolveGuidelinesApiBase('https://webflow-template-search.webflow-inc.workers.dev'), 'https://templates.webflow.com/templates-api');
  assert.equal(resolveGuidelinesApiBase('https://example.webflow.io/templates-api/'), 'https://example.webflow.io/templates-api');
  const calls: string[] = [];
  const doc = await fetchGuidelines('', (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    return new Response(JSON.stringify(DOC), { status: 200 });
  }) as typeof fetch);
  assert.equal(calls[0], 'https://templates.webflow.com/templates-api/api/templates/guidelines');
  assert.equal(doc.sections.length, 2);
  await assert.rejects(fetchGuidelines('', (async () => new Response('{}', { status: 503 })) as typeof fetch));
});

test('maps a URL hash to a section or to the section holding a rule', () => {
  assert.equal(sectionForHash(DOC, '#required-pages'), 'required-pages');
  assert.equal(sectionForHash(DOC, '#required-pages-03'), 'required-pages');
  assert.equal(sectionForHash(DOC, '#missing'), null);
  assert.equal(sectionForHash(DOC, ''), null);
});
