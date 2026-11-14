// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { expect, it } from 'vitest';
import CanonFace from './CanonFace.svelte';
import CanonCompanion from './CanonCompanion.svelte';
import CharacterPage from '../../routes/next/character/+page.svelte';
import { samplePreparationText } from './expressions';
it('hides decoration and gives explicit labels independent instance IDs', async () => {
  const root = document.createElement('div');
  const a = mount(CanonFace, { target: root });
  const b = mount(CanonFace, { target: root, props: { label: 'Canon listening' } });
  const c = mount(CanonFace, { target: root, props: { label: 'Canon ready for review' } });
  flushSync();
  const faces = root.querySelectorAll('svg');
  expect(faces[0].getAttribute('aria-hidden')).toBe('true');
  const ids = [faces[1], faces[2]].map(face => face.getAttribute('aria-labelledby'));
  expect(ids[0]).not.toBe(ids[1]);
  for (const id of ids) expect(root.querySelector(`[id="${id}"]`)?.textContent).toContain('Canon');
  await unmount(a); await unmount(b); await unmount(c);
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
  const small = mount(CanonCompanion, { target:root, props:{size:64} }); flushSync();
  expect(root.textContent).toBe('Canon'); expect(root.querySelector('img')).toBeNull();
  await unmount(small);
  const supported = mount(CanonCompanion, { target:root, props:{size:96} }); flushSync();
  expect(root.querySelector('img')?.getAttribute('alt')).toBe('');
  expect(root.querySelector('.art-frame')?.getAttribute('aria-hidden')).toBe('true');
  expect(root.querySelector('img')?.getAttribute('width')).toBe('1254');
  expect(root.querySelector('img')?.getAttribute('src')).toContain('approved-v1/head-r42.webp');
  await unmount(supported);
});
