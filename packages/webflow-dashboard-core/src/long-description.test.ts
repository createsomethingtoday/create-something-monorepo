import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractLongDescriptionImages,
  getLongDescriptionText,
  plainTextToLongDescriptionHtml,
  sanitizeLongDescriptionHtml
} from './long-description.js';

test('plainTextToLongDescriptionHtml wraps paragraphs and escapes text', () => {
  assert.equal(
    plainTextToLongDescriptionHtml('First line\nsecond line\n\n<script>alert(1)</script>'),
    '<p>First line<br>second line</p><p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
  );
});

test('sanitizeLongDescriptionHtml demotes legacy h1/h2 headings and preserves lists', () => {
  assert.equal(
    sanitizeLongDescriptionHtml('<h1>Overview</h1><h2>Features</h2><ul><li>Fast</li></ul>'),
    '<h3>Overview</h3><h3>Features</h3><ul><li>Fast</li></ul>'
  );
});

test('sanitizeLongDescriptionHtml normalizes Quill 2 bullet list markup', () => {
  assert.equal(
    sanitizeLongDescriptionHtml(
      '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Fast validation cache</li><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Bundled editor assets</li></ol>'
    ),
    '<ul><li>Fast validation cache</li><li>Bundled editor assets</li></ul>'
  );
});

test('sanitizeLongDescriptionHtml strips style/class wrappers without losing text', () => {
  assert.equal(
    sanitizeLongDescriptionHtml(
      '<div class="cms"><p id="intro"><span style="font-size: 30px">Clean</span> copy</p></div>'
    ),
    '<p>Clean copy</p>'
  );
});

test('sanitizeLongDescriptionHtml keeps safe image URL embeds only', () => {
  const html = sanitizeLongDescriptionHtml(
    '<figure><img src="https://cdn.example.com/image.webp" alt="Dashboard" width="1440" height="900"><figcaption>Preview</figcaption></figure><img src="data:image/png;base64,abc"><iframe src="https://example.com"></iframe>'
  );

  assert.equal(
    html,
    '<figure><img src="https://cdn.example.com/image.webp" alt="Dashboard" loading="lazy" width="1440" height="900"><figcaption>Preview</figcaption></figure>'
  );
});

test('sanitizeLongDescriptionHtml normalizes links and strips unsafe protocols', () => {
  assert.equal(
    sanitizeLongDescriptionHtml(
      '<p><a href="javascript:alert(1)">bad</a><a href="https://webflow.com/templates">good</a></p>'
    ),
    '<p>bad<a href="https://webflow.com/templates" target="_blank" rel="noopener noreferrer">good</a></p>'
  );
});

test('extractLongDescriptionImages returns sanitized image references', () => {
  assert.deepEqual(
    extractLongDescriptionImages(
      '<img src="https://assets.example.com/hero.png" alt="Hero"><img src="http://example.com/nope.png">'
    ),
    [{ src: 'https://assets.example.com/hero.png', alt: 'Hero' }]
  );
});

test('getLongDescriptionText produces text for validation', () => {
  assert.equal(
    getLongDescriptionText('<h3>Overview</h3><p>Clean&nbsp;copy</p>'),
    'Overview Clean copy'
  );
});
