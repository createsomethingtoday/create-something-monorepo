import { describe, expect, it } from 'vitest';

import { chunkPage, headingAnchor } from '../src/chunk.js';
import { pageBody, parseIndex, toPageRef } from '../src/pages.js';

describe('pageBody', () => {
  it('drops the note block above the title, which differs between copies of a page', () => {
    const a = pageBody('> This page is for Data API, version v2 Beta.\n\n> For clean Markdown ...\n\n# Scopes\n\nText.');
    const b = pageBody('> This page is for Designer API.\n\n# Scopes\n\nText.\n');
    expect(a).toBe('# Scopes\n\nText.');
    expect(b).toBe(a);
  });
});

describe('toPageRef', () => {
  it('maps the default Data API version to the unversioned URL', () => {
    const ref = toPageRef('https://developers.webflow.com/data/v2.0.0/reference/scopes.md', 'Scopes');
    expect(ref).toMatchObject({ url: 'https://developers.webflow.com/data/reference/scopes', version: 'current', product: 'data' });
  });

  it('marks beta pages and ranks them below every current page', () => {
    const beta = toPageRef('https://developers.webflow.com/data/v2.0.0-beta/apps/docs/marketplace-guidelines.md', 'Guidelines');
    const current = toPageRef('https://developers.webflow.com/apps/docs/marketplace-guidelines.md', 'Guidelines');
    expect(beta?.version).toBe('beta');
    expect(current?.version).toBe('current');
    expect(current!.rank).toBeLessThan(beta!.rank);
  });

  it('does not index the deprecated v1 docs or other origins', () => {
    expect(toPageRef('https://developers.webflow.com/data/v1.0.0/docs/hybrid-apps.md', 'Hybrid')).toBeNull();
    expect(toPageRef('https://example.com/apps/docs/x.md', 'X')).toBeNull();
    expect(toPageRef('https://developers.webflow.com/apps/llms.txt', 'Index')).toBeNull();
  });
});

describe('parseIndex', () => {
  it('separates nested indexes from pages and ignores other origins', () => {
    const listing = parseIndex(
      [
        '- [Apps](https://developers.webflow.com/apps/llms.txt): Build apps',
        '  - [Guidelines](https://developers.webflow.com/apps/docs/marketplace-guidelines.md)',
        '  - [Elsewhere](https://example.com/page.md)',
      ].join('\n'),
    );
    expect(listing.indexes).toEqual(['https://developers.webflow.com/apps/llms.txt']);
    expect(listing.pages).toEqual([{ sourceUrl: 'https://developers.webflow.com/apps/docs/marketplace-guidelines.md', title: 'Guidelines' }]);
  });
});

describe('headingAnchor', () => {
  it('matches the fragments the docs site links to', () => {
    expect(headingAnchor('Scopes and least privilege')).toBe('scopes-and-least-privilege');
    expect(headingAnchor('App-delivered code and injected scripts')).toBe('app-delivered-code-and-injected-scripts');
    expect(headingAnchor('**Submission Prep**')).toBe('submission-prep');
    expect(headingAnchor('`webflow.setExtensionSize(size)`')).toBe('webflowsetextensionsizesize');
  });
});

describe('chunkPage', () => {
  it('makes one passage per heading with the path of headings above it', () => {
    const { title, chunks } = chunkPage(
      ['# Marketplace Guidelines', '', 'Intro.', '', '## Guidelines', '', '### Token security', '', '1. Store tokens server-side.', '', '### Session behavior', '', '1. Complete OAuth once.'].join('\n'),
    );
    expect(title).toBe('Marketplace Guidelines');
    expect(chunks.map((chunk) => [chunk.headingPath, chunk.anchor, chunk.text])).toEqual([
      ['Marketplace Guidelines', null, 'Intro.'],
      ['Marketplace Guidelines > Guidelines > Token security', 'token-security', '1. Store tokens server-side.'],
      ['Marketplace Guidelines > Guidelines > Session behavior', 'session-behavior', '1. Complete OAuth once.'],
    ]);
  });

  it('does not read a # line inside a code fence as a heading', () => {
    const { chunks } = chunkPage(['# Page', '', '## Setup', '', '```bash', '# install', 'npm i', '```'].join('\n'));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('# install');
  });

  it('cuts a long section at line ends and keeps every line', () => {
    const rules = Array.from({ length: 30 }, (_, index) => `${index + 1}. Rule number ${index + 1} ${'x'.repeat(60)}`);
    const { chunks } = chunkPage(['# Page', '', '## Rules', '', ...rules].join('\n'), 400);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((chunk) => chunk.text.length <= 400)).toBe(true);
    expect(chunks.map((chunk) => chunk.text).join('\n').split('\n')).toEqual(rules);
    expect(chunks.map((chunk) => chunk.ordinal)).toEqual(chunks.map((_, index) => index));
  });

  it('leaves out Errors, Examples and Types on an endpoint page only', () => {
    const endpoint = ['# Create Item', '', 'POST https://api.webflow.com/v2/collections/{id}/items', '', 'Required scope: `cms:write`', '', '## Request', '', 'Body.', '', '## Errors', '', '### 400', '', 'Bad.', '', '## Examples', '', '```python', 'x', '```', '', '## Types', '', '### Item', '', 'Fields.'].join('\n');
    expect(chunkPage(endpoint).chunks.map((chunk) => chunk.headingPath)).toEqual(['Create Item', 'Create Item > Request']);

    const guide = ['# Guide', '', 'Text.', '', '## Examples', '', 'An example.'].join('\n');
    expect(chunkPage(guide).chunks.map((chunk) => chunk.headingPath)).toEqual(['Guide', 'Guide > Examples']);
  });
});
