// @vitest-environment node
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import LayoutSEO from './LayoutSEO.svelte';

describe('LayoutSEO SSR', () => {
  it('leaves page identity to the route-level SEO component', () => {
    const { head } = render(LayoutSEO, {
      props: { property: 'io' }
    });

    expect(head).toContain('name="theme-color"');
    expect(head).toContain('rel="icon"');
    expect(head).not.toContain('<title>');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('name="description"');
    expect(head).not.toContain('name="robots"');
    expect(head).not.toContain('application/ld+json');
  });
});
