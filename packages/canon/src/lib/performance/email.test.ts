import { describe, expect, it } from 'vitest';
import { renderPerformanceEmail } from './email.js';

describe('Performance email document', () => {
  it('escapes plain-text fields and keeps trusted consumer HTML and media alternatives', () => {
    const html = renderPerformanceEmail({
      preheader: '<script>preheader</script>',
      status: '<b>status</b>',
      title: '<img src=x onerror=alert(1)>',
      contentHtml: '<p>Consumer-owned content</p>',
      footerHtml: '<a href="https://example.invalid/leave">Leave</a>',
      media: {
        src: 'https://example.invalid/image?a=1&b=2',
        alt: 'Readable "alternative"',
        width: 640
      }
    });
    expect(html).not.toMatch(/<script|<b>status|onerror=alert\(1\)>/);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('alt="Readable &quot;alternative&quot;"');
    expect(html).toContain('<p>Consumer-owned content</p>');
    expect(html).toContain('href="https://example.invalid/leave"');
    expect(html).toContain('<!--[if mso]>');
    expect(html).not.toMatch(/<style|<link|var\(--|display:(?:flex|grid)/);
  });
});
