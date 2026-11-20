import test from 'node:test';
import assert from 'node:assert/strict';
import { messageParts, messagePreview } from '../web/message-content';

function links(text: string) {
  const parts = messageParts(text);
  assert.equal(parts.map((part) => part.text).join(''), text);
  return parts.filter((part) => part.href).map((part) => ({ text: part.text, href: part.href }));
}

test('bounded hostile URL punctuation preserves text without blocking the reader', () => {
  const text = 'https://example.com/' + ')'.repeat(16_000);
  const started = performance.now();
  assert.deepEqual(links(text), [{ text: 'https://example.com/', href: 'https://example.com/' }]);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 250, `one bounded message blocked parsing for ${elapsed.toFixed(1)}ms`);
  for (const suffix of [']', '}', ';']) {
    assert.deepEqual(links('https://example.com/' + suffix.repeat(16_000)), [
      { text: 'https://example.com/', href: 'https://example.com/' }
    ]);
  }
  assert.deepEqual(links('https://example.com/a;?'), [
    { text: 'https://example.com/a', href: 'https://example.com/a' }
  ]);
});

test('preserves exact text and links only explicit absolute HTTP(S)', () => {
  const text = 'First HTTPS://example.com/a?q=one&two=2#part\r\nSecond http://[::1]:4195/a%20b';
  assert.deepEqual(links(text), [
    {
      text: 'HTTPS://example.com/a?q=one&two=2#part',
      href: 'https://example.com/a?q=one&two=2#part'
    },
    { text: 'http://[::1]:4195/a%20b', href: 'http://[::1]:4195/a%20b' }
  ]);
  assert.deepEqual(links('https://例え.テスト/道'), [
    {
      text: 'https://例え.テスト/道',
      href: 'https://xn--r8jz45g.xn--zckzah/\u9053'.replace('/\u9053', '/%E9%81%93')
    }
  ]);
});

test('keeps prose delimiters outside balanced URL paths without losing a character', () => {
  assert.deepEqual(
    links('(https://example.com/a_(b)). "https://example.com/x", <https://example.com/y>'),
    [
      { text: 'https://example.com/a_(b)', href: 'https://example.com/a_(b)' },
      { text: 'https://example.com/x', href: 'https://example.com/x' },
      { text: 'https://example.com/y', href: 'https://example.com/y' }
    ]
  );
  assert.deepEqual(links('https://example.com/?v=&amp;'), [
    { text: 'https://example.com/?v=&amp;', href: 'https://example.com/?v=&amp;' }
  ]);
});

test('rejects credentials, parser repairs, hidden controls and embedded schemes', () => {
  for (const text of [
    'https://user:pass@example.com/a',
    'https://example.com@evil.invalid',
    'https://@example.com',
    'https://example.com\\evil',
    'https://example.com/\u202Eevil',
    'https://example.com:99999',
    'https:///evil.invalid/path',
    'https:////evil.invalid/path',
    'https://exam\u200bple.com',
    'https://exam\u00adple.com',
    'https://exam%E2%80%8Bple.com',
    'https://exam%C2%ADple.com',
    'https://',
    'javascript:https://example.com',
    'data:text/plain,https://example.com',
    'prefixhttps://example.com',
    '//example.com/a /relative mailto:test@example.com file:///a javascript:alert(1)',
    'https://exam\tple.com'
  ])
    assert.deepEqual(links(text), [], text);
});

test('paired single quotes stay outside navigation; path apostrophes remain literal', () => {
  assert.deepEqual(links("'https://example.com/file' https://example.com/O'Reilly"), [
    { text: 'https://example.com/file', href: 'https://example.com/file' },
    { text: "https://example.com/O'Reilly", href: "https://example.com/O'Reilly" }
  ]);
  assert.deepEqual(links("'https://example.com/file'."), [
    { text: 'https://example.com/file', href: 'https://example.com/file' }
  ]);
});

test('HTML-looking input remains literal parts, never generated markup', () => {
  const text = '<script>alert(1)</script> <img src=x onerror=alert(2)> &quot; https://example.com/';
  const parts = messageParts(text);
  assert.equal(parts.map((part) => part.text).join(''), text);
  assert.equal(parts.filter((part) => part.href).length, 1);
  assert.equal(parts[0].href, undefined);
});

test('short bodies are unchanged; bounded previews do not split Unicode or normalize whitespace', () => {
  for (const text of ['', 'a'.repeat(900), Array(12).fill('line').join('\n')])
    assert.equal(messagePreview(text), null);
  assert.equal(messagePreview('a'.repeat(901)), 'a'.repeat(120));
  const unicode = '🙂'.repeat(500);
  assert.equal(messagePreview(unicode), '🙂'.repeat(120));
  const lines = Array(13).fill('line').join('\r\n');
  assert.equal(messagePreview(lines), Array(3).fill('line').join('\r\n'));
});

test('literal Result excerpts distinguish receipts while retaining full text and request previews', async () => {
  const { messageResultExcerpt } = await import('../web/message-content');
  for (const result of [
    'Local artifact review completed.',
    'Owner exception: Publication authority and real booking/provider evidence are absent.'
  ]) {
    const text = `Receipt\nRequest ID: same-prefix\n${'Evidence: literal\n'.repeat(60)}Result: ${result}\nScope: Human acceptance remains unrecorded.`;
    const original = text;
    assert.equal(messageResultExcerpt(text, 'message'), `Result: ${result}`);
    assert.equal(text, original);
    assert.equal(messageResultExcerpt(text, 'request'), null);
  }
});

test('Result extraction requires one exact standalone nonempty line and a long body', async () => {
  const { messageResultExcerpt } = await import('../web/message-content');
  const padding = 'x'.repeat(901);
  for (const suffix of [
    '',
    '\nResult:',
    '\nResult:   ',
    '\nresult: lower',
    '\n Result: indented',
    '\nprefix Result: inline',
    '\nResult: one\nResult: two'
  ])
    assert.equal(messageResultExcerpt(padding + suffix, 'message'), null, suffix);
  assert.equal(messageResultExcerpt('Result: short', 'message'), null);
  assert.equal(
    messageResultExcerpt(`${padding}\r\nResult: literal\r\nTail`, 'message'),
    'Result: literal'
  );
});

test('Result excerpts preserve literal Unicode and markup without interpreting links', async () => {
  const { messageResultExcerpt } = await import('../web/message-content');
  const padding = 'x'.repeat(901);
  const line = 'Result: <img onerror=alert(1)> [link](https://example.com) &amp;';
  assert.equal(messageResultExcerpt(`${padding}\n${line}`, 'message'), line);
  const unicode = 'Result: ' + '🙂'.repeat(140);
  assert.equal(
    messageResultExcerpt(`${padding}\n${unicode}`, 'message'),
    'Result: ' + '🙂'.repeat(112) + '…'
  );
});

test('long prose Result quotations end at a complete word within the excerpt bound', async () => {
  const { messageResultExcerpt } = await import('../web/message-content');
  const line = 'Result: ' + 'evidence '.repeat(20);
  const excerpt = messageResultExcerpt('x'.repeat(901) + '\n' + line, 'conversation')!;
  assert.ok(excerpt.endsWith('evidence…'), excerpt);
  assert.ok(Array.from(excerpt).length <= 121);
  assert.ok(line.startsWith(excerpt.slice(0, -1)));
});
