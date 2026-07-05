#!/usr/bin/env tsx
import { resolve } from 'node:path';

import {
	buildCanonOverlayIntakeInventory,
	renderCanonOverlayIntakeInventory
} from '../src/lib/overlays/intake.js';

const args = process.argv.slice(2);
const rootArg = readFlag('--root') ?? process.cwd();
const json = args.includes('--json');
const includeTemplate = args.includes('--include-template');
const searchRoots = readFlag('--search-roots')
	?.split(',')
	.map((value) => value.trim())
	.filter(Boolean);

const inventory = await buildCanonOverlayIntakeInventory({
	rootDir: resolveRoot(rootArg),
	searchRoots,
	includeTemplate
});

if (json) {
	console.log(JSON.stringify(inventory, null, 2));
} else {
	console.log(renderCanonOverlayIntakeInventory(inventory));
}

function readFlag(name: string): string | undefined {
	const index = args.indexOf(name);
	if (index === -1) return undefined;
	return args[index + 1];
}

function resolveRoot(root: string) {
	if (root.startsWith('/')) return root;
	return resolve(process.env.INIT_CWD ?? process.cwd(), root);
}
