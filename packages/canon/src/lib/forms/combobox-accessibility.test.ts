// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Combobox from './Combobox.svelte';

const options = [
 { value: 'uk', label: 'United Kingdom' },
 { value: 'us', label: 'United States' },
 { value: 'ca', label: 'Canada' }
];
const instances: ReturnType<typeof mount>[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
beforeEach(() => Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }));
afterEach(async () => {
 for (const instance of instances) await unmount(instance);
 instances.length = 0;
 document.body.replaceChildren();
 if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
 else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});
function render(props: Record<string, unknown> = {}) {
 const target = document.createElement('div'); document.body.append(target);
 instances.push(mount(Combobox, { target, props: { options, value: 'uk', ...props } })); flushSync();
 return { target, input: target.querySelector<HTMLInputElement>('[role="combobox"]')! };
}
function key(input: HTMLInputElement, name: string) {
 input.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true })); flushSync();
}
function active(input: HTMLInputElement) {
 const id = input.getAttribute('aria-activedescendant');
 expect(id).toBeTruthy();
 return document.getElementById(id!)!;
}
it('exposes keyboard exploration while preserving the committed value until Enter', () => {
 const onchange = vi.fn(), { target, input } = render({ onchange });
 input.focus(); flushSync(); key(input, 'ArrowDown'); key(input, 'ArrowDown');
 expect(document.activeElement).toBe(input);
 expect(target.querySelector('[aria-selected="true"]')?.textContent).toContain('United Kingdom');
 const option = active(input);
 expect(option?.textContent).toContain('Canada');
 expect(document.getElementById(input.getAttribute('aria-controls')!)?.contains(option)).toBe(true);
 expect(onchange).not.toHaveBeenCalled();
 key(input, 'Enter');
 expect(onchange).toHaveBeenCalledExactlyOnceWith('ca');
 expect(input.value).toBe('Canada');
 expect(input.getAttribute('aria-expanded')).toBe('false');
 expect(input.hasAttribute('aria-activedescendant')).toBe(false);
});
it('keeps the active relationship valid while filtering and removes it for empty or closed results', () => {
 const { target, input } = render(); input.focus(); flushSync();
 input.value = 'can'; input.dispatchEvent(new Event('input', { bubbles: true })); flushSync();
 expect(active(input)?.textContent).toContain('Canada');
 expect(target.querySelectorAll('[role="option"]')).toHaveLength(1);
 input.value = 'nowhere'; input.dispatchEvent(new Event('input', { bubbles: true })); flushSync();
 expect(target.querySelectorAll('[role="option"]')).toHaveLength(0);
 expect(input.hasAttribute('aria-activedescendant')).toBe(false);
 key(input, 'Escape');
 expect(input.value).toBe('United Kingdom');
 expect(input.hasAttribute('aria-activedescendant')).toBe(false);
});
it('supports descriptive names and keeps repeated instances linked to their own options', () => {
 const first = render({ ariaLabel: 'Destination' }), second = render({ ariaLabel: 'Origin' });
 expect(first.input.getAttribute('aria-label')).toBe('Destination');
 expect(second.input.getAttribute('aria-label')).toBe('Origin');
 first.input.focus(); flushSync(); const firstOption = active(first.input);
 second.input.focus(); flushSync(); const secondOption = active(second.input);
 expect(firstOption.id).not.toBe(secondOption.id);
 expect(first.target.contains(firstOption)).toBe(true);
 expect(second.target.contains(secondOption)).toBe(true);
 const legacy = render({ placeholder: 'Choose a country' });
 expect(legacy.input.getAttribute('aria-label')).toBe('Choose a country');
});
