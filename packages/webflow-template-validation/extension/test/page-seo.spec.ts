import { describe, it, expect, vi } from 'vitest';
import { collectPageSeoData } from '../src/page-seo';

describe('collectPageSeoData', () => {
  it('reads the SEO Title Tag and Meta Description, not the site-search overrides', async () => {
    // Site-search overrides are empty under the default "use SEO
    // title/description" toggles — reading them falsely reports every
    // well-configured page as missing SEO metadata.
    const getSearchTitle = vi.fn().mockResolvedValue('');
    const getSearchDescription = vi.fn().mockResolvedValue('');
    const page = {
      getTitle: async () => 'Acme - Webflow HTML website template',
      getDescription: async () => 'D'.repeat(140),
      getSearchTitle,
      getSearchDescription
    };

    const seo = await collectPageSeoData(page);

    expect(seo?.title).toBe('Acme - Webflow HTML website template');
    expect(seo?.titleLength).toBe(36);
    expect(seo?.description).toBe('D'.repeat(140));
    expect(seo?.descriptionLength).toBe(140);
    expect(getSearchTitle).not.toHaveBeenCalled();
    expect(getSearchDescription).not.toHaveBeenCalled();
  });

  it('returns null when the SEO getters are unavailable, so the worker treats the data as uncollected', async () => {
    expect(await collectPageSeoData({})).toBeNull();
  });

  it('computes custom Open Graph flags from the uses-title/description toggles', async () => {
    const seo = await collectPageSeoData({
      getTitle: async () => 'Title',
      getDescription: async () => 'Description',
      getOpenGraphTitle: async () => 'OG Title',
      getOpenGraphDescription: async () => 'OG Description',
      usesTitleAsOpenGraphTitle: async () => false,
      usesDescriptionAsOpenGraphDescription: async () => true
    });

    expect(seo?.hasCustomOpenGraphTitle).toBe(true);
    expect(seo?.hasCustomOpenGraphDescription).toBe(false);
  });
});
