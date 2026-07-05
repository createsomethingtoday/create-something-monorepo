#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type {
	CanonOverlayCandidatePromotionApprovalRecord,
	CanonOverlayCandidatePromotionApprovalTarget
} from '../src/lib/registry/schema.js';
import {
	buildCanonOverlayCandidatePromotionApprovalRecords,
	buildCanonOverlayCandidatePromotionPlans,
	buildCanonOverlayCandidatePromotionReadinessReports,
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidatePromotionApprovalRecord,
	renderCanonOverlayCandidatePromotionApprovalValidationReport,
	validateCanonOverlayCandidatePromotionApprovalRecord
} from '../src/lib/overlays/intake.js';

const args = process.argv.slice(2);
const rootArg = readFlag('--root') ?? process.cwd();
const intakeId = readFlag('--intake');
const recordPath = readFlag('--record');
const json = args.includes('--json');
const strict = args.includes('--strict');
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

const recordsToValidate = await resolveRecordsToValidate();
const validationReports = recordsToValidate.map((record) =>
	validateCanonOverlayCandidatePromotionApprovalRecord(record)
);

if (json) {
	console.log(JSON.stringify(validationReports.length === 1 ? validationReports[0] : validationReports, null, 2));
} else if (validationReports.length === 1) {
	console.log(renderCanonOverlayCandidatePromotionApprovalValidationReport(validationReports[0]!));
} else {
	console.log('# Canon Overlay Candidate Promotion Approval Validation');
	console.log('');
	for (const report of validationReports) {
		console.log(`## ${report.title}`);
		console.log(`- Status: ${report.status}`);
		console.log(`- Ready for implementation: ${report.summary.readyForImplementation ? 'yes' : 'no'}`);
		console.log(`- Errors: ${report.summary.errorCount}`);
		console.log(`- Warnings: ${report.summary.warningCount}`);
		console.log(`- Validation report: ${report.validationUri}`);
		console.log('');
	}
}

if (strict && validationReports.some((report) => !report.summary.readyForImplementation)) {
	process.exitCode = 1;
}

async function resolveRecordsToValidate(): Promise<CanonOverlayCandidatePromotionApprovalRecord[]> {
	if (recordPath) {
		const payload = JSON.parse(await readFile(resolveRoot(recordPath), 'utf-8')) as unknown;
		if (isApprovalRecord(payload)) return [payload];
		if (!intakeId) {
			throw new Error('--record with a target-only JSON payload also requires --intake');
		}
		const baseRecord = findCanonOverlayCandidatePromotionApprovalRecord(approvalRecords, intakeId);
		if (!baseRecord) throw new Error(`Canon overlay candidate promotion approval record not found: ${intakeId}`);
		return [applyApprovalTarget(baseRecord, extractApprovalTarget(payload))];
	}

	if (!intakeId) return approvalRecords.entries;

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
		process.exit(1);
	}

	return [record];
}

function applyApprovalTarget(
	record: CanonOverlayCandidatePromotionApprovalRecord,
	target: Partial<Record<keyof CanonOverlayCandidatePromotionApprovalTarget, string | null>>
): CanonOverlayCandidatePromotionApprovalRecord {
	const nextTarget = {
		...record.target,
		...target
	} as CanonOverlayCandidatePromotionApprovalTarget;

	return {
		...record,
		target: nextTarget,
		requiredFields: record.requiredFields.map((field) => ({
			...field,
			value: nextTarget[field.id]
		}))
	};
}

function extractApprovalTarget(
	payload: unknown
): Partial<Record<keyof CanonOverlayCandidatePromotionApprovalTarget, string | null>> {
	if (!payload || typeof payload !== 'object') {
		throw new Error('Approval target JSON must be an object');
	}
	const maybeTarget = 'target' in payload ? (payload as { target: unknown }).target : payload;
	if (!maybeTarget || typeof maybeTarget !== 'object') {
		throw new Error('Approval target JSON must be an object or contain a target object');
	}
	return maybeTarget as Partial<Record<keyof CanonOverlayCandidatePromotionApprovalTarget, string | null>>;
}

function isApprovalRecord(value: unknown): value is CanonOverlayCandidatePromotionApprovalRecord {
	return Boolean(
		value &&
			typeof value === 'object' &&
			'id' in value &&
			'target' in value &&
			'targetHints' in value &&
			'approvalUri' in value
	);
}

function readFlag(name: string): string | undefined {
	const index = args.indexOf(name);
	if (index === -1) return undefined;
	return args[index + 1];
}

function resolveRoot(path: string) {
	if (path.startsWith('/')) return path;
	return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

function printHelp() {
	console.log(`Validate Canon overlay candidate promotion approval records.

Usage:
  pnpm --filter @create-something/canon overlay:candidate-approval-validate -- --root . --intake overlay.client.surface
  pnpm --filter @create-something/canon overlay:candidate-approval-validate -- --root . --intake overlay.client.surface --record approval-target.json --strict

Options:
  --root <dir>             Repo root to scan. Defaults to current working directory.
  --intake <id>            Candidate intake id, approval record id, readiness id, plan id, or candidate id. Omit to validate every generated template.
  --record <path>          JSON approval record, target object, or { "target": ... } payload to validate.
  --search-roots <list>    Comma-separated roots to scan, default: apps,packages.
  --include-template       Include Canon's project-overlay template manifest in discovery.
  --json                   Print JSON instead of Markdown.
  --strict                 Exit nonzero when any validation report is not ready for implementation.
  --help, -h               Show this help text.
`);
}
