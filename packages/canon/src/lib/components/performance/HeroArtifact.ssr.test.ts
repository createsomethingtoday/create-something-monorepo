import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import HeroArtifact from './HeroArtifact.svelte';

describe('HeroArtifact SSR', () => {
  it('renders the semantic fallback without registering browser cleanup on the server', () => {
    const page = render(HeroArtifact, {
      props: { scene: 'agency-folded-playbook' }
    });

    expect(page.body).toContain('data-hero-artifact');
    expect(page.body).toContain('data-hero-artifact-scene="agency-folded-playbook"');
    expect(page.body).toContain('data-hero-artifact-fallback="authored-svg"');
    expect(page.body).toContain('data-hero-artifact-mode="poster"');
  });
});
