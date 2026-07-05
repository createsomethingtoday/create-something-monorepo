#!/usr/bin/env tsx
import { resolve } from 'node:path';

import {
	buildCanonOverlayCandidatePromotionApprovalRecords,
	buildCanonOverlayCandidatePromotionPlans,
	buildCanonOverlayCandidatePromotionReadinessReports,
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidatePromotionApprovalRecord,
	renderCanonOverlayCandidatePromotionApprovalRecord,
	renderCanonOverlayCandidatePromotionApprovalRecords
} from '../src/lib/overlays/intake.js';

const args = process.argv.slice(2);
const rootArg = readFlag('--root') ?? process.cwd();
const intakeId = readFlag('--intake');
const json = args.includes('--json');
const includeTemplate = args.includes('--include-template');
const help = args.includes('--help') || args.includes('-h');
const searchRoots = readFlag('--search-roots')
	?.split(',')
	.map((value) => value.trim())
	.filter(Boolean);

if (help) {
	printHelp();
	process.exit(0);
}

const inventory = await buildCanonOverlayIntakeInventory({
	rootDir: resolveRoot(rootArg),
	searchRoots,
	includeTemplate
});
const queue = buildCanonOverlayCandidateQueue(inventory);
const packets = buildCanonOverlayCandidateReviewPackets(queue);
const plans = buildCanonOverlayCandidatePromotionPlans(packets);
const reports = buildCanonOverlayCandidatePromotionReadinessReports(plans);
const approvalRecords = buildCanonOverlayCandidatePromotionApprovalRecords(reports);

if (!intakeId) {
	if (json) {
		console.log(JSON.stringify(approvalRecords, null, 2));
	} else {
		console.log(renderCanonOverlayCandidatePromotionApprovalRecords(approvalRecords));
	}
	process.exit(0);
}

const record = findCanonOverlayCandidatePromotionApprovalRecord(approvalRecords, intakeId);

if (!record) {
	console.error(`Canon overlay candidate promotion approval record not found: ${intakeId}`);
	if (approvalRecords.entries.length) {
		console.error('');
		console.error('Available intake ids:');
		for (const entry of approvalRecords.entries) {
			console.error(`- ${entry.intakeId}`);
		}
	}
	process.exitCode = 1;
} else if (json) {
	console.log(JSON.stringify(record, null, 2));
} else {
	console.log(renderCanonOverlayCandidatePromotionApprovalRecord(record));
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

function printHelp() {
	console.log(`Render Canon overlay candidate promotion approval records.

Usage:
  pnpm --filter @create-something/canon overlay:candidate-approval-record -- --root . --intake overlay.client.surface

Options:
  --root <dir>             Repo root to scan. Defaults to current working directory.
  --intake <id>            Candidate intake id, approval record id, readiness id, plan id, or candidate id. Omit to print record list.
  --search-roots <list>    Comma-separated roots to scan, default: apps,packages.
  --include-template       Include Canon's project-overlay template manifest in discovery.
  --json                   Print JSON instead of Markdown.
  --help, -h               Show this help text.
`);
}
