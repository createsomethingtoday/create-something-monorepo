import { describe, expect, it } from 'vitest';

import { GET } from './+server';

describe('io sitemap', () => {
  it('publishes current catalog hubs without noindex or nonexistent routes', async () => {
    const response = await GET({ platform: undefined } as never);
    const xml = await response.text();

    expect(xml).toContain('https://createsomething.io/category/research');
    expect(xml).toContain('https://createsomething.io/mcp/');
    expect(xml).toContain('https://createsomething.io/newsletters');
    expect(xml).toContain(
      'https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable'
    );
    expect(xml).not.toContain('https://createsomething.io/privacy');
    expect(xml).not.toContain('https://createsomething.io/terms');
    expect(xml).not.toContain('https://createsomething.io/tag/');
  });
});
