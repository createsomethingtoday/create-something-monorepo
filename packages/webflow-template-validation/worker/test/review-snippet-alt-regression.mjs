import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerSnippetPath = resolve(__dirname, '../public/app-validator/snippet/review.js');
const canonicalSnippetPath = resolve(__dirname, '../../../webflow-review/snippet/webflow-review-snippet.js');

class FakeElement {
  constructor(attributes = {}, closestElement = null) {
    this.attributes = attributes;
    this.closestElement = closestElement;
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  closest(selector) {
    if (selector.includes('.w-background-video') && this.closestElement) {
      return this.closestElement;
    }

    return null;
  }
}

function createSnippetWindow(images) {
  const document = {
    documentElement: new FakeElement(),
    title: 'Snippet Alt Regression',
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (selector === 'img') return images;
      if (selector === 'a:not([href]), a[href=""]') return [];
      return [];
    },
  };

  const window = {
    CSS: { escape: (value) => String(value) },
    Webflow: undefined,
    addEventListener: () => {},
    getComputedStyle: () => ({}),
    innerHeight: 768,
    innerWidth: 1024,
    location: {
      href: 'https://example.com/',
      origin: 'https://example.com',
      pathname: '/',
    },
    navigator: {},
    postMessage: () => {},
  };

  return { document, window };
}

async function runAuditDom(source, images) {
  const { document, window } = createSnippetWindow(images);
  const executeSnippet = new Function(
    'window',
    'document',
    'setInterval',
    'clearInterval',
    'URL',
    'Date',
    `${source}\nreturn window.__wfReview;`
  );

  const wfReview = executeSnippet(window, document, () => 1, () => {}, URL, Date);
  return await wfReview.callTool('audit_dom', { maxExamples: 10 });
}

test('audit_dom ignores Webflow background video poster images with empty alt text', async () => {
  const workerSnippet = await readFile(workerSnippetPath, 'utf8');
  const canonicalSnippet = await readFile(canonicalSnippetPath, 'utf8');
  assert.equal(workerSnippet, canonicalSnippet);

  const backgroundVideoWrapper = new FakeElement({
    class: 'hero-video w-background-video w-background-video-atom',
    'data-poster-url': '/video-poster.jpg',
    'data-video-urls': '/video.mp4,/video.webm',
  });

  const result = await runAuditDom(workerSnippet, [
    new FakeElement({ src: '/missing-alt.jpg' }),
    new FakeElement({ src: '/video-poster.jpg', alt: '' }, backgroundVideoWrapper),
    new FakeElement({ src: '/content-empty-alt.jpg', alt: '' }),
    new FakeElement({ src: '/described.jpg', alt: 'Described image' }),
  ]);

  assert.equal(result.imagesMissingAlt.count, 2);
  assert.deepEqual(
    result.imagesMissingAlt.examples.map((example) => example.src),
    ['/missing-alt.jpg', '/content-empty-alt.jpg']
  );
});
