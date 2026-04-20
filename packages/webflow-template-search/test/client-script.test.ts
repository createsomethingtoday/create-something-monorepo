import { describe, expect, it } from 'vitest';

import { getClientScript } from '../src/client-script.js';

describe('client script markup targeting', () => {
  it('targets the current marketplace results container and card fields', () => {
    const script = getClientScript('active');

    expect(script).toContain('[fs-cmsfilter-element="list"][fs-cmsload-element="list"]');
    expect(script).toContain('.mp-collection-list [role="list"].w-dyn-items');
    expect(script).toContain('.tm-card_image');
    expect(script).toContain('.template-name');
    expect(script).toContain('.template-creator');
    expect(script).toContain('.template-price-wrap .category-text');
    expect(script).toContain('.tm-templates-creator-icon');
  });
});
