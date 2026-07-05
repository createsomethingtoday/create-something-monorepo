import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { colorVars } from './colors.js';
import { typographyVars } from './typography.js';

const tokensCssPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
const tokensCss = readFileSync(tokensCssPath, 'utf8');
const rootBlock = tokensCss.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';

function readRootToken(name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = rootBlock.match(new RegExp(`${escapedName}:\\s*([^;]+);`));
  if (!match) {
    throw new Error(`Missing ${name} in tokens.css :root block`);
  }
  return match[1].trim();
}

describe('Canon token artifact parity', () => {
  it('keeps foreground TS exports aligned with tokens.css', () => {
    const foregroundTokens = [
      '--color-fg-primary',
      '--color-fg-secondary',
      '--color-fg-tertiary',
      '--color-fg-muted',
      '--color-fg-subtle'
    ] as const;

    for (const token of foregroundTokens) {
      expect(colorVars[token]).toBe(readRootToken(token));
    }
  });

  it('keeps core typography TS exports aligned with tokens.css', () => {
    const typographyTokens = [
      '--text-display-xl',
      '--text-display',
      '--text-h1',
      '--text-h2',
      '--text-h3',
      '--text-h4',
      '--text-h5',
      '--text-h6',
      '--text-body-lg',
      '--text-body',
      '--text-body-sm',
      '--text-caption',
      '--text-overline'
    ] as const;

    for (const token of typographyTokens) {
      expect(typographyVars[token]).toBe(readRootToken(token));
    }
  });
});
