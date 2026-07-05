#!/usr/bin/env tsx
import { resolve } from 'node:path';

import {
	buildCanonOverlayCandidatePromotionPlans,
	buildCanonOverlayCandidatePromotionReadinessReports,
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidatePromotionReadinessReport,
	renderCanonOverlayCandidatePromotionReadinessReport,
	renderCanonOverlayCandidatePromotionReadinessReports
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

if (!intakeId) {
	if (json) {
		console.log(JSON.stringify(reports, null, 2));
	} else {
		console.log(renderCanonOverlayCandidatePromotionReadinessReports(reports));
	}
	process.exit(0);
}

const report = findCanonOverlayCandidatePromotionReadinessReport(reports, intakeId);

if (!report) {
	console.error(`Canon overlay candidate promotion readiness report not found: ${intakeId}`);
	if (reports.entries.length) {
		console.error('');
		console.error('Available intake ids:');
		for (const entry of reports.entries) {
			console.error(`- ${entry.intakeId}`);
		}
	}
	process.exitCode = 1;
} else if (json) {
	console.log(JSON.stringify(report, null, 2));
} else {
	console.log(renderCanonOverlayCandidatePromotionReadinessReport(report));
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
	console.log(`Render Canon overlay candidate promotion readiness reports.

Usage:
  pnpm --filter @create-something/canon overlay:candidate-readiness -- --root . --intake overlay.client.surface

Options:
  --root <dir>             Repo root to scan. Defaults to current working directory.
  --intake <id>            Candidate intake id, readiness id, plan id, or candidate id. Omit to print report list.
  --search-roots <list>    Comma-separated roots to scan, default: apps,packages.
  --include-template       Include Canon's project-overlay template manifest in discovery.
  --json                   Print JSON instead of Markdown.
  --help, -h               Show this help text.
`);
}
