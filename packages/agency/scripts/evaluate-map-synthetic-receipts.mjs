#!/usr/bin/env node

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateMapSyntheticReceipts } from './lib/map-monitor-policy.mjs';

const artifactDir = path.resolve(process.argv[2] ?? 'artifacts/map-synthetic');
const receipts = [];
for (const viewport of ['desktop', 'mobile']) {
	try {
		receipts.push(JSON.parse(await readFile(path.join(artifactDir, `receipt-${viewport}.json`), 'utf8')));
	} catch {
		// Missing receipts are evaluated as a failure below.
	}
}

const result = evaluateMapSyntheticReceipts(receipts);
await mkdir(artifactDir, { recursive: true });
await writeFile(path.join(artifactDir, 'summary.json'), JSON.stringify(result, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
	await appendFile(
		process.env.GITHUB_STEP_SUMMARY,
		`## Map production synthetic\n\n- Status: ${result.ok ? 'PASS' : 'FAIL'}\n- Owner: ${result.policy.owner.name}\n- Linear: ${result.policy.owner.linearIssue}\n- Receipts: ${receipts.length}/2\n`
	);
}
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
