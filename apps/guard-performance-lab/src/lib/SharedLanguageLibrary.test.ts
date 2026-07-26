import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { glossary } from './data.js';
import SharedLanguageLibrary from './SharedLanguageLibrary.svelte';

describe('SharedLanguageLibrary', () => {
  it('renders a selectable animated example for every glossary term', () => {
    const body = render(SharedLanguageLibrary).body;

    expect(body).toContain('Search term or meaning');
    expect(body).toContain('Animated example / Advantage');
    expect(body).toContain('Show animated example for Downhill');
    expect(body.match(/data-animation-term=/g)).toHaveLength(glossary.length);
  });
});
