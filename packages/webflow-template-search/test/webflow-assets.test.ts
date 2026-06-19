import { describe, expect, it } from 'vitest';
import { resolveWebflowTemplateImages, type WebflowTemplateImageIndex } from '../src/webflow-assets.js';

describe('webflow template image resolution', () => {
  it('prefers exact slug image candidates before loose name collisions', () => {
    const index = {
      byTemplateKey: new Map([
        [
          'slug:fluxen template website template',
          [{ hostedUrl: 'https://cdn.example.com/meta-flow-fluxen.webp', scoreName: 'primary thumbnail' }],
        ],
        [
          'slug:fluxen website template',
          [{ hostedUrl: 'https://cdn.example.com/flow-nija-fluxen.webp', scoreName: 'primary thumbnail' }],
        ],
        [
          'fuzzy:fluxen',
          [
            { hostedUrl: 'https://cdn.example.com/meta-flow-fluxen.webp', scoreName: 'primary thumbnail' },
            { hostedUrl: 'https://cdn.example.com/flow-nija-fluxen.webp', scoreName: 'primary thumbnail' },
          ],
        ],
      ]),
      offerByTemplateKey: new Map(),
    } satisfies WebflowTemplateImageIndex;

    expect(
      resolveWebflowTemplateImages(index, {
        templateSlug: 'fluxen-template-website-template',
        name: 'Fluxen.',
      })?.thumbnailImageUrl,
    ).toBe('https://cdn.example.com/meta-flow-fluxen.webp');

    expect(
      resolveWebflowTemplateImages(index, {
        templateSlug: 'fluxen-website-template',
        name: 'Fluxen',
      })?.thumbnailImageUrl,
    ).toBe('https://cdn.example.com/flow-nija-fluxen.webp');
  });
});
