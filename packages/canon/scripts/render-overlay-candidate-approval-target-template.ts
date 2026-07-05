#!/usr/bin/env tsx
import { resolve } from 'node:path';

import {
	buildCanonOverlayCandidatePromotionApprovalRecords,
	buildCanonOverlayCandidatePromotionApprovalTargetTemplate,
	buildCanonOverlayCandidatePromotionPlans,
	buildCanonOverlayCandidatePromotionReadinessReports,
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidatePromotionApprovalRecord,
	renderCanonOverlayCandidatePromotionApprovalTargetTemplate
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
	const templates = approvalRecords.entries.map((record) =>
		buildCanonOverlayCandidatePromotionApprovalTargetTemplate(record)
	);
	if (json) {
		console.log(JSON.stringify(templates, null, 2));
	} else {
		console.log('# Canon Overlay Candidate Promotion Approval Target Templates');
		console.log('');
		for (const template of templates) {
			console.log(`## ${template.title}`);
			console.log(`- Approval target template: ${template.targetTemplateUri}`);
			console.log(`- Approval record: ${template.approvalUri}`);
			console.log(`- Validation report: ${template.validationUri}`);
			console.log('');
		}
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
} else {
	const template = buildCanonOverlayCandidatePromotionApprovalTargetTemplate(record);
	if (json) {
		console.log(JSON.stringify(template, null, 2));
	} else {
		console.log(renderCanonOverlayCandidatePromotionApprovalTargetTemplate(template));
	}
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
	console.log(`Render Canon overlay candidate promotion approval target templates.

Usage:
  pnpm --filter @create-something/canon overlay:candidate-approval-target -- --root . --intake overlay.client.surface

Options:
  --root <dir>             Repo root to scan. Defaults to current working directory.
  --intake <id>            Candidate intake id, approval record id, readiness id, plan id, or candidate id. Omit to print template list.
  --search-roots <list>    Comma-separated roots to scan, default: apps,packages.
  --include-template       Include Canon's project-overlay template manifest in discovery.
  --json                   Print JSON instead of Markdown.
  --help, -h               Show this help text.
`);
}
