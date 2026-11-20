// @vitest-environment jsdom
import { flushSync, mount, unmount, tick } from 'svelte';
import { expect, it } from 'vitest';
import Workbench from './Workbench.svelte';
it('hands focus to each step and keeps multiple instance editors independent', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const a = mount(Workbench, { target: root });
  const b = mount(Workbench, { target: root });
  flushSync();
  const sections = root.querySelectorAll('section');
  async function click(section: Element, text: string) {
    const button = [...section.querySelectorAll('button')].find((x) =>
      x.textContent?.includes(text)
    )!;
    button.click();
    flushSync();
    await tick();
  }
  for (const section of sections) {
    await click(section, 'Try a meeting task');
    expect(document.activeElement).toBe(section.querySelector('[id$="-heading"][tabindex="-1"]'));
    await click(section, 'Continue');
    const check = section.querySelector('input')!;
    check.click();
    flushSync();
    await click(section, 'See the plan');
    await click(section, 'Start simulation');
    await click(section, 'Continue simulation');
  }
  await click(sections[0], 'Edit draft');
  expect(document.activeElement).toBe(sections[0].querySelector('textarea'));
  await click(sections[1], 'Edit draft');
  expect(document.activeElement).toBe(sections[1].querySelector('textarea'));
  expect(sections[0].querySelector('textarea')!.id).not.toBe(
    sections[1].querySelector('textarea')!.id
  );
  await click(sections[0], 'Discard sample');
  expect(sections[0].textContent).toContain('A useful first step');
  await unmount(a);
  await unmount(b);
  root.remove();
});
it('isolates task radio groups between mounted workbenches', async () => {
  const root = document.createElement('div');
  document.body.append(root);
  const a = mount(Workbench, { target: root });
  const b = mount(Workbench, { target: root });
  flushSync();
  for (const section of root.querySelectorAll('section')) {
    section.querySelector('button')!.click();
    flushSync();
    await tick();
  }
  const sections = root.querySelectorAll('section');
  const first = sections[0].querySelector<HTMLInputElement>('input[type=radio]')!;
  const second = sections[1].querySelector<HTMLInputElement>('input[type=radio]')!;
  expect(first.name).not.toBe(second.name);
  await unmount(a);
  await unmount(b);
  root.remove();
});
