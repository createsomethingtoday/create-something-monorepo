#!/usr/bin/env tsx
import { resolve } from 'node:path';

import {
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidateReviewPacket,
	renderCanonOverlayCandidateReviewPacket,
	renderCanonOverlayCandidateReviewPackets
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

if (!intakeId) {
	if (json) {
		console.log(JSON.stringify(packets, null, 2));
	} else {
		console.log(renderCanonOverlayCandidateReviewPackets(packets));
	}
	process.exit(0);
}

const packet = findCanonOverlayCandidateReviewPacket(packets, intakeId);

if (!packet) {
	console.error(`Canon overlay candidate review packet not found: ${intakeId}`);
	if (packets.entries.length) {
		console.error('');
		console.error('Available intake ids:');
		for (const entry of packets.entries) {
			console.error(`- ${entry.intakeId}`);
		}
	}
	process.exitCode = 1;
} else if (json) {
	console.log(JSON.stringify(packet, null, 2));
} else {
	console.log(renderCanonOverlayCandidateReviewPacket(packet));
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
	console.log(`Render Canon overlay candidate review handoffs.

Usage:
  pnpm --filter @create-something/canon overlay:candidate-handoff -- --root . --intake overlay.client.surface

Options:
  --root <dir>             Repo root to scan. Defaults to current working directory.
  --intake <id>            Candidate intake id, packet id, or candidate id. Omit to print packet list.
  --search-roots <list>    Comma-separated roots to scan, default: apps,packages.
  --include-template       Include Canon's project-overlay template manifest in discovery.
  --json                   Print JSON instead of Markdown.
  --help, -h               Show this help text.
`);
}
