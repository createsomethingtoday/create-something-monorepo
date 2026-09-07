import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const component = readFileSync(new URL('./RichNote.svelte', import.meta.url), 'utf8');

describe('RichNote interactions', () => {
  it('keeps link presses out of the surrounding canvas drag gesture', () => {
    expect(component).toContain('onpointerdown={(event) => event.stopPropagation()}');
  });
});
