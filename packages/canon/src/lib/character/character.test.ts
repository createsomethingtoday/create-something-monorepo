// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { expect, it } from 'vitest';
import { CanonCompanion } from './index';
import CharacterPage from '../../routes/next/character/+page.svelte';
import { samplePreparationText } from './expressions';
it('uses the caller-owned image and keeps identity when it cannot load', async () => {
  const root = document.createElement('div');
  const companion = mount(CanonCompanion, {
    target: root,
    props: { size: 96, headSrc: '/owned-art/head-r42.webp' }
  });
  flushSync();
  const head = root.querySelector('img');
  expect(head?.getAttribute('src')).toBe('/owned-art/head-r42.webp');
  head?.dispatchEvent(new Event('error'));
  flushSync();
  expect(root.querySelector('img')).toBeNull();
  expect(root.textContent).toBe('Canon');
  await unmount(companion);
});
it('prepares and resets only a local sample with truthful adjacent text', async () => {
  const root = document.createElement('div');
  const page = mount(CharacterPage, { target: root }); flushSync();
  const buttons = root.querySelectorAll('button');
  buttons[0].click(); flushSync();
  expect(root.textContent).toContain(samplePreparationText);
  expect(root.querySelector('select')?.value).toBe('attentive');
  const select = root.querySelector('select')!;
  select.value='recovery'; select.dispatchEvent(new Event('change')); flushSync();
  expect(root.querySelector('[aria-live]')?.textContent).toContain('Choose a different sample');
  buttons[1].click(); flushSync();
  expect(root.querySelector('select')?.value).toBe('welcome');
  expect(root.querySelector('[aria-live]')?.textContent).toContain('No live tool is running');
  await unmount(page);
});

it('uses plain identity text below the material-preserving minimum', async () => {
  const root = document.createElement('div');
  for (const size of [24, 32, 48, 64] as const) {
    const small = mount(CanonCompanion, { target:root, props:{size,headSrc:'/owned-art/head-r42.webp'} }); flushSync();
    expect(root.textContent).toBe('Canon'); expect(root.querySelector('img')).toBeNull();
    await unmount(small);
  }
  const supported = mount(CanonCompanion, { target:root, props:{size:96,headSrc:'/owned-art/head-r42.webp'} }); flushSync();
  expect(root.querySelector('img')?.getAttribute('alt')).toBe('');
  expect(root.querySelector('.art-frame')?.getAttribute('aria-hidden')).toBe('true');
  expect(root.querySelector('img')?.getAttribute('width')).toBe('264');
  await unmount(supported);
});

it('keeps identity without an installed image and isolates a failed image to its instance', async () => {
  const root = document.createElement('div');
  const missing = mount(CanonCompanion, { target: root }); flushSync();
  expect(root.textContent).toBe('Canon');
  expect(root.querySelector('img')).toBeNull();
  await unmount(missing);
  const a = mount(CanonCompanion, { target: root, props: { headSrc: '/art/head-r42.webp' } });
  const b = mount(CanonCompanion, { target: root, props: { headSrc: '/art/head-r42.webp' } });
  flushSync();
  root.querySelector('img')?.dispatchEvent(new Event('error')); flushSync();
  expect(root.querySelectorAll('img')).toHaveLength(1);
  expect(root.textContent).toBe('Canon');
  await unmount(a); await unmount(b);
});
