#!/usr/bin/env tsx
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	assertCanonCodificationAudit,
	buildCanonCodificationAuditReport,
	renderCanonCodificationAuditReport
} from '../src/lib/codification/index.js';
import { resolveRepoRoot } from './check-overlay-quality-gate.js';

function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

async function main() {
	const root = resolveRepoRoot(readFlag('--root') ?? '.');
	const json = process.argv.includes('--json');
	const verbose = process.argv.includes('--verbose');
	const report = await buildCanonCodificationAuditReport(root);

	if (json) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(renderCanonCodificationAuditReport(report, { verbose }));
	}

	assertCanonCodificationAudit(report);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
