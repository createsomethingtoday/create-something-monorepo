import { describe, expect, it } from 'vitest';

import {
  findCanonCssValueReplacement,
  findCanonTailwindReplacement,
  getCanonLintSuggestion,
  isCanonAllowedTailwindUtil
} from './index.js';

describe('Canon lint contract', () => {
  it('maps Tailwind design utilities to Canon tokens', () => {
    const mapping = findCanonTailwindReplacement('text-white/80');

    expect(mapping?.canon).toBe('var(--color-fg-secondary)');
    expect(mapping?.category).toBe('color');
    expect(getCanonLintSuggestion('text-white/80', mapping!)).toContain(
      "Replace Tailwind 'text-white/80' with Canon token 'var(--color-fg-secondary)'"
    );
  });

  it('allows structural Tailwind utilities without allowing aesthetic utilities', () => {
    expect(isCanonAllowedTailwindUtil('grid-cols-3')).toBe(true);
    expect(isCanonAllowedTailwindUtil('rounded-lg')).toBe(false);
  });

  it('maps hardcoded CSS values to Canon token replacements by property', () => {
    expect(findCanonCssValueReplacement('color', '#fff')).toBe('var(--color-fg-primary)');
    expect(findCanonCssValueReplacement('border-radius', '12px')).toBe('var(--radius-lg)');
    expect(findCanonCssValueReplacement('transform', '12px')).toBeNull();
  });
});
