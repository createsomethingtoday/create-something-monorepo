// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import Navigation from './Navigation.svelte';

let instance: ReturnType<typeof mount> | undefined;
const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function resize(width: number, height = window.innerHeight) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
  flushSync();
}

function render({ onMobileMenuChange = vi.fn() } = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  const target = document.createElement('div');
  const outside = document.createElement('button');
  outside.textContent = 'Outside navigation';
  document.body.append(target, outside);
  instance = mount(Navigation, {
    target,
    props: {
      logo: 'CREATE SOMETHING', visualStyle: 'editorial', fixed: true,
      links: [
        { label: 'Services', href: '/services' },
        { label: 'Explore', href: '/explore', children: [
          { label: 'Proof', href: '/proof', description: 'Inspect results.' },
          { label: 'What you keep', href: '/ownership' }
        ] }
      ],
      onMobileMenuChange
    }
  });
  flushSync();
  const trigger = target.querySelector<HTMLButtonElement>('.nav-dropdown__trigger')!;
  const mobile = target.querySelector<HTMLButtonElement>('.nav-menu-button')!;
  const menu = () => target.querySelector<HTMLElement>('.nav-dropdown__menu');
  const open = () => { trigger.click(); flushSync(); };
  return { target, outside, trigger, mobile, menu, open, onMobileMenuChange };
}

afterEach(async () => {
  if (instance) await unmount(instance);
  instance = undefined;
  document.body.replaceChildren();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
});

it('opens a native navigation disclosure with linked items and matching aria-controls', () => {
  const { trigger, menu, open } = render();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  open();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(menu()?.id).toBe(trigger.getAttribute('aria-controls'));
  expect(menu()?.querySelector('a')?.getAttribute('href')).toBe('/proof');
  expect(menu()?.querySelector('a')?.getAttribute('role')).toBeNull();
});

it('Escape from a dropdown item closes the disclosure and restores focus to its trigger', async () => {
  const { trigger, menu, open } = render();
  open();
  const item = menu()!.querySelector<HTMLAnchorElement>('a')!;
  item.focus();
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  item.dispatchEvent(escape);
  flushSync();
  await Promise.resolve();
  flushSync();
  expect(menu()).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
  expect(escape.defaultPrevented).toBe(true);
});

it('keeps pointer interaction inside the dropdown available and dismisses an outside pointer', () => {
  const { trigger, menu, open, outside } = render();
  open();
  menu()!.querySelector('a')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  flushSync();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  flushSync();
  expect(menu()).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('keeps focus movement between dropdown links intact, then dismisses when focus leaves', () => {
  const { trigger, menu, open, outside } = render();
  open();
  const items = menu()!.querySelectorAll<HTMLAnchorElement>('a');
  items[0].focus();
  items[1].focus();
  flushSync();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  outside.focus();
  flushSync();
  expect(menu()).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(outside);
});

it('preserves an open desktop dropdown through height-only resize and clears it on width change', () => {
  const { trigger, menu, open } = render();
  open();
  resize(1440, 700);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(menu()).not.toBeNull();
  resize(390, 700);
  expect(menu()).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  resize(1440, 900);
  expect(menu()).toBeNull();
});

it('preserves mobile-menu reporting, retains height-only resizing, and releases state on width change', () => {
  const onMobileMenuChange = vi.fn();
  const { mobile, target } = render({ onMobileMenuChange });
  resize(390, 844);
  mobile.click();
  flushSync();
  expect(mobile.getAttribute('aria-expanded')).toBe('true');
  expect(target.querySelector('.nav-mobile-menu')).not.toBeNull();
  expect(onMobileMenuChange).toHaveBeenLastCalledWith(true);
  resize(390, 780);
  expect(mobile.getAttribute('aria-expanded')).toBe('true');
  expect(onMobileMenuChange).toHaveBeenLastCalledWith(true);
  resize(1440, 900);
  expect(mobile.getAttribute('aria-expanded')).toBe('false');
  expect(target.querySelector('.nav-mobile-menu')).toBeNull();
  expect(onMobileMenuChange).toHaveBeenLastCalledWith(false);
});
