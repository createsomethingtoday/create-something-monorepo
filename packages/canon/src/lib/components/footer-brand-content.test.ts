// @vitest-environment node
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import { expect, test } from 'vitest';
import Footer from './Footer.svelte';

test('property brand content replaces only the description slot; default remains available', () => {
  const fallback = render(Footer, { props: { aboutText: 'Owned description', visualStyle: 'editorial' } }).body;
  expect(fallback).toContain('Owned description');
  const custom = render(Footer, { props: { aboutText: 'Owned description', visualStyle: 'editorial', brandContent: createRawSnippet(() => ({ render: () => '<p>Property companion content</p>' })) } }).body;
  expect(custom).toContain('Property companion content');
  expect(custom).toContain('footer-brand-content');
  expect(custom).not.toContain('Owned description');
  expect(custom).toContain('©');
});
