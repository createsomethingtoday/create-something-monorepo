// @vitest-environment jsdom
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { expect, it } from 'vitest';
import { CanonTaskOpening } from './index';

it('keeps consumer copy and actions in HTML while preloading the matching responsive backgrounds', async () => {
  const root = document.createElement('div');
  const opening = mount(CanonTaskOpening, {
    target: root,
    props: {
      scene: 'observed-evidence',
      caption: 'Compare the source and the part still unknown.',
      art: { src: '/art/wide.webp', mediumSrc: '/art/medium.webp', mobileSrc: '/art/mobile.webp', width: 1536, height: 1024 },
      children: createRawSnippet(() => ({ render: () => '<div><h1>Inspect the evidence.</h1><a href="/papers">Read the papers</a></div>' }))
    }
  });
  flushSync();
  const section = root.querySelector('section')!;
  expect(section.dataset.canonTask).toBe('observed-evidence');
  expect(section.querySelector('h1')?.textContent).toBe('Inspect the evidence.');
  expect(section.querySelector('a')?.getAttribute('href')).toBe('/papers');
  expect(section.querySelector('img')).toBeNull();
  expect(root.textContent).toContain('Concept illustration · Compare the source and the part still unknown.');
  const preloads = [...document.head.querySelectorAll('link[rel="preload"][as="image"]')];
  for (const [href, media] of [
    ['/art/wide.webp', '(min-width: 64.01rem)'],
    ['/art/medium.webp', '(min-width: 48rem) and (max-width: 64rem)'],
    ['/art/mobile.webp', '(max-width: 47.99rem)']
  ]) expect(preloads.some(link => link.getAttribute('href') === href && link.getAttribute('media') === media)).toBe(true);
  await unmount(opening);
});
