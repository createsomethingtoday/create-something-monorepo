// @vitest-environment node
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { Paper } from '$lib/types/paper';
import ArticleHeader from './ArticleHeader.svelte';

const paper: Paper = {
  id: 'paper-proof',
  title: 'Proof-Carrying Work',
  category: 'Research',
  reading_time: 8,
  slug: 'proof-carrying-work',
  featured: 0,
  published: 1,
  is_hidden: 0,
  archived: 0,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
  author_name: 'CREATE SOMETHING Research',
  author_url: 'https://createsomething.io/about'
};

describe('ArticleHeader SSR', () => {
  it('makes article ownership and freshness visible', () => {
    const { body } = render(ArticleHeader, { props: { paper } });

    expect(body).toContain('CREATE SOMETHING Research');
    expect(body).toContain('href="https://createsomething.io/about"');
    expect(body).toContain('Updated July 12, 2026');
  });
});
