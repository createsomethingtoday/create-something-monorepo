import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { colorVars } from './colors.js';
import { typographyVars } from './typography.js';

const tokensCssPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
const dtcgTokensPath = fileURLToPath(new URL('../styles/tokens.dtcg.json', import.meta.url));
const figmaTokensPath = fileURLToPath(new URL('../styles/tokens.figma.json', import.meta.url));
const canonJsonPath = fileURLToPath(new URL('../styles/canon.json', import.meta.url));
const canonTokensJsonPath = fileURLToPath(
  new URL('../../../../canon-tokens/tokens.json', import.meta.url)
);
const canonTokensCssPath = fileURLToPath(
  new URL('../../../../canon-tokens/tokens.css', import.meta.url)
);
const tokensCss = readFileSync(tokensCssPath, 'utf8');
const rootBlock = tokensCss.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
const dtcgTokens = JSON.parse(readFileSync(dtcgTokensPath, 'utf8'));
const figmaTokens = JSON.parse(readFileSync(figmaTokensPath, 'utf8'));
const canonJson = JSON.parse(readFileSync(canonJsonPath, 'utf8'));
const canonTokensJson = JSON.parse(readFileSync(canonTokensJsonPath, 'utf8'));
const canonTokensCss = readFileSync(canonTokensCssPath, 'utf8');

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
      '--text-overline',
      '--text-record',
      '--text-record-meta',
      '--text-operator-label',
      '--text-topology-label',
      '--font-interface',
      '--font-record',
      '--font-topology-label',
      '--tracking-topology-label',
      '--leading-topology-label'
    ] as const;

    for (const token of typographyTokens) {
      expect(typographyVars[token]).toBe(readRootToken(token));
    }
  });

  it('keeps exported typography font artifacts aligned with tokens.css', () => {
    const fontTokens = [
      ['--font-sans', 'sans'],
      ['--font-mono', 'mono'],
      ['--font-serif', 'serif']
    ] as const;

    for (const [cssToken, artifactToken] of fontTokens) {
      const rootValue = readRootToken(cssToken);

      expect(dtcgTokens.font[artifactToken].$value).toBe(rootValue);
      expect(figmaTokens.core.font[artifactToken].value).toBe(rootValue);
      expect(canonJson.typography.fonts[artifactToken].value).toBe(rootValue);
      expect(canonTokensJson.typography.fontFamily[artifactToken]).toBe(rootValue);

      const escapedName = cssToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(canonTokensCss).toMatch(new RegExp(`${escapedName}:\\s*${escapeRegExp(rootValue)};`));
    }
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
