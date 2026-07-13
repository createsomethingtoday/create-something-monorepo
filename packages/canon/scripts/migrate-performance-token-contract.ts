import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
	isPerformanceToken,
	toPerformanceTokenName
} from '../src/lib/tokens/performance-contract.js';

const repoRoot = resolve(import.meta.dirname, '../../..');
const tokensCssPath = resolve(repoRoot, 'packages/canon/src/lib/styles/tokens.css');
const write = process.argv.includes('--write');
const sourceRoots = [
	'packages/canon/src',
	'packages/agency/src',
	'packages/ltd/src',
	'packages/io/src',
	'packages/space/src'
].map((path) => resolve(repoRoot, path));
const documentationPaths = [
	'packages/canon/README.md',
	'packages/canon/UNDERSTANDING.md',
	'packages/canon-tokens/README.md',
	'packages/canon-tokens/UNDERSTANDING.md',
	'docs/CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md',
	'docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md'
]
	.map((path) => resolve(repoRoot, path))
	.filter((path) => statSync(path).isFile());

const originalTokensCss = readFileSync(tokensCssPath, 'utf8');
const rootBlock = originalTokensCss.match(/:root\s*{([\s\S]*?)\n}/)?.[1];
if (!rootBlock) throw new Error('Could not find the canonical :root token block');

const declaredNames = [
	...new Set(
		[...rootBlock.matchAll(/^\s*(--[A-Za-z0-9_-]+):/gm)].map((match) => match[1])
	)
];
const mapping = new Map<string, string>();
for (const name of declaredNames) {
	const performanceName = toPerformanceTokenName(name);
	if (performanceName && !isPerformanceToken(name)) mapping.set(name, performanceName);
}

const orderedMapping = [...mapping.entries()].sort(([left], [right]) => right.length - left.length);

if (write) {
	writeFileSync(tokensCssPath, migrateCanonicalCss(originalTokensCss));
	for (const root of sourceRoots) {
		for (const path of walk(root)) {
			if (path === tokensCssPath || path.includes('performance-contract.')) continue;
			const source = readFileSync(path, 'utf8');
			const migrated = replaceTokenNames(source);
			if (migrated !== source) writeFileSync(path, migrated);
		}
	}
	for (const path of documentationPaths) {
		const source = readFileSync(path, 'utf8');
		const migrated = replaceTokenNames(source);
		if (migrated !== source) writeFileSync(path, migrated);
	}
	syncArtifacts();
}

const violations = findViolations();
if (violations.length > 0) {
	process.stderr.write(`${violations.join('\n')}\n`);
	process.exitCode = 1;
} else {
	process.stdout.write(
		`Performance token contract satisfied for ${mapping.size} compatibility aliases across Canon and four properties.\n`
	);
}

function migrateCanonicalCss(source: string): string {
	let primarySource = source;
	const declaredSet = new Set(declaredNames);
	for (const [legacy, performance] of orderedMapping) {
		if (!declaredSet.has(performance)) continue;
		const escapedLegacy = legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		primarySource = primarySource.replace(
			new RegExp(`^\\s*${escapedLegacy}:\\s*[^;]+;\\n?`, 'm'),
			''
		);
	}

	const migrated = replaceTokenNames(primarySource);

	const aliases = orderedMapping
		.map(([legacy, performance]) => `  ${legacy}: var(${performance});`)
		.join('\n');
	const firstRootEnd = migrated.indexOf('\n}', migrated.indexOf(':root'));
	if (firstRootEnd === -1) throw new Error('Could not close canonical :root token block');

	return `${migrated.slice(0, firstRootEnd)}\n\n  /* Legacy compatibility aliases. First-party consumers use Performance tokens. */\n${aliases}${migrated.slice(firstRootEnd)}`;
}

function replaceTokenNames(source: string): string {
	let migrated = source;
	for (const [legacy, performance] of orderedMapping) {
		migrated = migrated.replaceAll(legacy, performance);
	}
	return migrated;
}

function findViolations(): string[] {
	const violations: string[] = [];
	const canonical = readFileSync(tokensCssPath, 'utf8');
	const canonicalRoot = canonical.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
	for (const match of canonicalRoot.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*([^;]+);/gm)) {
		const [, name, value] = match;
		const performanceName = toPerformanceTokenName(name);
		if (!performanceName || isPerformanceToken(name)) continue;
		if (value.trim() !== `var(${performanceName})`) {
			violations.push(`tokens.css: ${name} must alias ${performanceName}`);
		}
	}

	for (const root of sourceRoots) {
		for (const path of walk(root)) {
			if (path === tokensCssPath || path.includes('performance-contract.')) continue;
			const source = readFileSync(path, 'utf8');
			for (const match of source.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
				const name = match[1];
				if (mapping.has(name)) {
					violations.push(`${path.slice(repoRoot.length + 1)}: unauthorized ${name}`);
				}
			}
		}
	}

	const portableCssPath = resolve(repoRoot, 'packages/canon-tokens/tokens.css');
	if (readFileSync(portableCssPath, 'utf8') !== canonical) {
		violations.push('packages/canon-tokens/tokens.css must be generated from Canon tokens.css');
	}

	return violations;
}

function syncArtifacts(): void {
	const canonical = readFileSync(tokensCssPath, 'utf8');
	const canonicalRoot = canonical.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
	const declarations = Object.fromEntries(
		[...canonicalRoot.matchAll(/^\s*(--[A-Za-z0-9_-]+):\s*([^;]+);/gm)].map((match) => [
			match[1],
			match[2].trim()
		])
	);
	const performanceTokens = Object.fromEntries(
		Object.entries(declarations).filter(([name]) => isPerformanceToken(name))
	);
	const compatibilityAliases = Object.fromEntries(
		Object.entries(declarations)
			.filter(([name, value]) => !isPerformanceToken(name) && /var\(--[^)]*performance/.test(value))
			.map(([name, value]) => [name, value.match(/var\((--[^)]+)\)/)?.[1] ?? value])
	);

	writeFileSync(resolve(repoRoot, 'packages/canon-tokens/tokens.css'), canonical);

	for (const relativePath of [
		'packages/canon/src/lib/styles/tokens.scss',
		'packages/canon-tokens/tokens.scss'
	]) {
		const path = resolve(repoRoot, relativePath);
		const marker = '/* PERFORMANCE_COMPATIBILITY_ALIASES */';
		const source = replaceTokenNames(readFileSync(path, 'utf8')).split(marker)[0].trimEnd();
		const aliases = Object.entries(compatibilityAliases)
			.map(([legacy, performance]) => `  ${legacy}: var(${performance});`)
			.join('\n');
		writeFileSync(path, `${source}\n\n${marker}\n:root {\n${aliases}\n}\n`);
	}

	for (const relativePath of [
		'packages/canon/src/lib/styles/tokens.dtcg.json',
		'packages/canon/src/lib/styles/tokens.figma.json',
		'packages/canon/src/lib/styles/canon.json',
		'packages/canon-tokens/tokens.json'
	]) {
		const path = resolve(repoRoot, relativePath);
		const artifact = JSON.parse(replaceTokenNames(readFileSync(path, 'utf8')));
		const fontValues = {
			sans: performanceTokens['--font-performance-sans'],
			mono: performanceTokens['--font-performance-mono'],
			serif: performanceTokens['--font-performance-serif']
		};
		if (relativePath.endsWith('tokens.dtcg.json')) {
			for (const [name, value] of Object.entries(fontValues)) artifact.font[name].$value = value;
		} else if (relativePath.endsWith('tokens.figma.json')) {
			for (const [name, value] of Object.entries(fontValues)) artifact.core.font[name].value = value;
		} else if (relativePath.endsWith('canon.json')) {
			for (const [name, value] of Object.entries(fontValues)) artifact.typography.fonts[name].value = value;
		} else if (relativePath === 'packages/canon-tokens/tokens.json') {
			Object.assign(artifact.typography.fontFamily, fontValues);
		}
		artifact.performanceContract = {
			source: 'packages/canon/src/lib/styles/tokens.css',
			tokens: performanceTokens,
			compatibilityAliases
		};
		writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`);
	}
}

function walk(root: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = resolve(root, entry);
		if (statSync(path).isDirectory()) files.push(...walk(path));
		else if (/\.(?:css|svelte|ts|md)$/.test(entry)) files.push(path);
	}
	return files;
}
