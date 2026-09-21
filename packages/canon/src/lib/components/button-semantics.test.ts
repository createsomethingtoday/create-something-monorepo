// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import Button from './Button.svelte';

let instance: ReturnType<typeof mount> | undefined;
function render(props: Record<string, unknown>) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  instance = mount(Button, { target, props });
  flushSync();
  return target;
}
afterEach(async () => {
  if (instance) await unmount(instance);
  instance = undefined;
  document.body.replaceChildren();
});
it('exposes navigation as a native link while preserving click handlers', () => {
  const onclick = vi.fn((event: MouseEvent) => event.preventDefault());
  const target = render({ href: '/destination', onclick });
  const link = target.querySelector('a')!;
  expect(link.getAttribute('href')).toBe('/destination');
  expect(link.getAttribute('role')).toBeNull();
  expect(target.querySelector('button')).toBeNull();
  link.click();
  expect(onclick).toHaveBeenCalledOnce();
});
it('preserves action and submit button behavior without a destination', () => {
  const onclick = vi.fn();
  const button = render({ type: 'submit', onclick }).querySelector('button')!;
  expect(button.type).toBe('submit');
  button.click();
  expect(onclick).toHaveBeenCalledOnce();
});
it('keeps disabled destinations non-navigable and non-activating', () => {
  const onclick = vi.fn();
  const target = render({ href: '/destination', disabled: true, onclick });
  expect(target.querySelector('a')).toBeNull();
  const button = target.querySelector('button')!;
  expect(button.disabled).toBe(true);
  button.click();
  expect(onclick).not.toHaveBeenCalled();
});
