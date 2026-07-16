import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	isComponentLocalToken,
	isPerformanceToken,
	toPerformanceTokenName
} from './performance-contract.js';

describe('Performance token contract', () => {
	it('maps every shared design-token family into the Performance namespace', () => {
		expect(toPerformanceTokenName('--color-bg-surface')).toBe('--color-performance-bg-surface');
		expect(toPerformanceTokenName('--font-sans')).toBe('--font-performance-sans');
		expect(toPerformanceTokenName('--text-body-sm')).toBe('--text-performance-body-sm');
		expect(toPerformanceTokenName('--space-md')).toBe('--space-performance-md');
		expect(toPerformanceTokenName('--radius-lg')).toBe('--radius-performance-scale-lg');
		expect(toPerformanceTokenName('--shadow-md')).toBe('--shadow-performance-scale-md');
		expect(toPerformanceTokenName('--duration-standard')).toBe('--duration-performance-standard');
		expect(toPerformanceTokenName('--ease-standard')).toBe('--ease-performance-standard');
		expect(toPerformanceTokenName('--glass-bg-medium')).toBe('--glass-performance-bg-medium');
		expect(toPerformanceTokenName('--color-performance-signal')).toBe('--color-performance-signal');
	});

	it('does not misclassify component-local runtime variables as design tokens', () => {
		expect(toPerformanceTokenName('--delay')).toBeNull();
		expect(toPerformanceTokenName('--index')).toBeNull();
		expect(toPerformanceTokenName('--arch-wall-exterior')).toBeNull();
		expect(isComponentLocalToken('--delay')).toBe(true);
		expect(isComponentLocalToken('--arch-wall-exterior')).toBe(true);
		expect(isPerformanceToken('--color-performance-signal')).toBe(true);
	});

	it('keeps legacy root names as aliases rather than independent design values', () => {
		const tokensCssPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
		const rootBlock = readFileSync(tokensCssPath, 'utf8').match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
		const declarationPattern = /^\s*(--[A-Za-z0-9_-]+):\s*([^;]+);/gm;
		const invalid: string[] = [];

		for (const match of rootBlock.matchAll(declarationPattern)) {
			const [, name, value] = match;
			const performanceName = toPerformanceTokenName(name);
			if (!performanceName || isPerformanceToken(name)) continue;
			if (value.trim() !== `var(${performanceName})`) invalid.push(`${name}: ${value.trim()}`);
		}

		expect(invalid).toEqual([]);
	});

	it('exposes complete semantic state roles for live agent work', () => {
		const tokensCssPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
		const rootBlock = readFileSync(tokensCssPath, 'utf8').match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
		const declarations = Object.fromEntries(
			[...rootBlock.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*([^;]+);/gm)].map((match) => [
				match[1],
				match[2].trim()
			])
		);
		const expectedRoles = {
			idle: ['muted', 'paper', 'line'],
			planning: ['signal', 'signal-soft', 'signal'],
			running: ['pressure', 'pressure-soft', 'pressure'],
			approval: ['review', 'review-soft', 'review'],
			success: ['ready', 'ready-soft', 'ready'],
			warning: ['gold', 'gold-soft', 'gold'],
			failure: ['stop', 'stop-soft', 'stop']
		} as const;

		for (const [state, [text, background, border]] of Object.entries(expectedRoles)) {
			expect(declarations[`--color-performance-work-${state}-text`]).toBe(
				`var(--color-performance-${text})`
			);
			expect(declarations[`--color-performance-work-${state}-background`]).toBe(
				`var(--color-performance-${background})`
			);
			expect(declarations[`--color-performance-work-${state}-border`]).toBe(
				`var(--color-performance-${border})`
			);
		}
	});

	it('prevents first-party Canon and property source from consuming legacy design tokens', () => {
		const canonRoot = fileURLToPath(new URL('../..', import.meta.url));
		const repoRoot = fileURLToPath(new URL('../../../../..', import.meta.url));
		const tokensCssPath = fileURLToPath(new URL('../styles/tokens.css', import.meta.url));
		const tokensCss = readFileSync(tokensCssPath, 'utf8');
		const legacyNames = new Set(
			[...tokensCss.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*var\(--[^)]*performance[^)]*\);/gm)]
				.map((match) => match[1])
				.filter((name) => !isPerformanceToken(name))
		);
		const roots = [
			canonRoot,
			...['agency', 'ltd', 'io', 'space'].map((property) => `${repoRoot}/packages/${property}/src`)
		];
		const invalid: string[] = [];

		for (const root of roots) {
			for (const path of walkSourceFiles(root)) {
				if (path.endsWith('/styles/tokens.css') || path.includes('performance-contract.test.')) continue;
				const source = readFileSync(path, 'utf8');
				for (const match of source.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
					const name = match[1];
					if (legacyNames.has(name)) {
						invalid.push(`${path.slice(repoRoot.length + 1)}: ${name}`);
					}
				}
			}
		}

		expect(invalid).toEqual([]);
	});
});

function walkSourceFiles(root: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = `${root}/${entry}`;
		if (statSync(path).isDirectory()) {
			files.push(...walkSourceFiles(path));
		} else if (/\.(?:css|svelte|ts)$/.test(entry)) {
			files.push(path);
		}
	}
	return files;
}
