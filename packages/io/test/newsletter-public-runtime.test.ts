import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
const { published } = vi.hoisted(() => ({
  published: vi.fn(() => [
    {
      slug: 'public',
      title: 'Public',
      description: 'Preview',
      deliveryTarget: '2026-09-01',
      readingMinutes: 2,
      hero: null,
      markdown: 'private content',
      webStatus: 'published'
    }
  ])
}));
vi.mock('$lib/server/newsletterArchive', () => ({ getPublishedNewsletters: published }));
import { GET } from '../src/routes/api/newsletter/archive/+server';
import { isWebflowDocument } from '../src/lib/config/webflowDocuments';
describe('retained newsletter public boundary', () => {
  it('returns only rendered public metadata from the publication-filtered loader', async () => {
    const response = await GET();
    expect(await response.json()).toEqual({
      editions: [
        {
          slug: 'public',
          title: 'Public',
          description: 'Preview',
          deliveryTarget: '2026-09-01',
          readingMinutes: 2,
          hero: null
        }
      ]
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('reloads only the archive document and leaves editions and embedded form retained', () => {
    expect(isWebflowDocument('/newsletters')).toBe(true);
    expect(isWebflowDocument('/newsletters/')).toBe(true);
    expect(isWebflowDocument('/newsletters/public')).toBe(false);
    expect(isWebflowDocument('/newsletters/signup-form')).toBe(false);
  });
  it('isolates the form and prevents indexing', () => {
    const source = readFileSync(
      new URL('../src/routes/newsletters/signup-form/+page.svelte', import.meta.url),
      'utf8'
    );
    expect(source).toContain('noindex, nofollow');
    expect(source).toContain('window.location.origin');
    expect(source).toContain('ResizeObserver');
    expect(
      readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8')
    ).toContain("$page.url.pathname === '/newsletters/signup-form'");
  });
});
