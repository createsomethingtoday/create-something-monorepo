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
	it('keeps the complete Performance contract aligned across generated artifacts', () => {
		const performanceTokens = Object.fromEntries(
			[...rootBlock.matchAll(/^\s*(--[A-Za-z0-9_-]*-performance(?:-[A-Za-z0-9_-]+)*):\s*([^;]+);/gm)].map(
				(match) => [match[1], match[2].trim()]
			)
		);
		const compatibilityAliases = Object.fromEntries(
			[...rootBlock.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*var\((--[^)]*performance[^)]*)\);/gm)]
				.filter((match) => !match[1].includes('-performance'))
				.map((match) => [match[1], match[2]])
		);

		for (const artifact of [dtcgTokens, figmaTokens, canonJson, canonTokensJson]) {
			expect(artifact.performanceContract.tokens).toEqual(performanceTokens);
			expect(artifact.performanceContract.compatibilityAliases).toEqual(compatibilityAliases);
		}
	});

  it('keeps foreground TS exports aligned with tokens.css', () => {
    const foregroundTokens = [
      '--color-performance-fg-primary',
      '--color-performance-fg-secondary',
      '--color-performance-fg-tertiary',
      '--color-performance-fg-muted',
      '--color-performance-fg-subtle'
    ] as const;

    for (const token of foregroundTokens) {
      expect(colorVars[token]).toBe(readRootToken(token));
    }
  });

  it('keeps core typography TS exports aligned with tokens.css', () => {
    const typographyTokens = [
      '--text-performance-display-xl',
      '--text-performance-display',
      '--text-performance-h1',
      '--text-performance-h2',
      '--text-performance-h3',
      '--text-performance-h4',
      '--text-performance-h5',
      '--text-performance-h6',
      '--text-performance-body-lg',
      '--text-performance-body',
      '--text-performance-body-sm',
      '--text-performance-caption',
      '--text-performance-overline',
      '--text-performance-record',
      '--text-performance-record-meta',
      '--text-performance-operator-label',
      '--text-performance-topology-label',
      '--font-performance-interface',
      '--font-performance-record',
      '--font-performance-topology-label',
      '--tracking-performance-topology-label',
      '--leading-performance-topology-label'
    ] as const;

    for (const token of typographyTokens) {
      expect(typographyVars[token]).toBe(readRootToken(token));
    }
  });

  it('keeps exported typography font artifacts aligned with tokens.css', () => {
    const fontTokens = [
      ['--font-performance-sans', 'sans'],
      ['--font-performance-mono', 'mono'],
      ['--font-performance-serif', 'serif']
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
