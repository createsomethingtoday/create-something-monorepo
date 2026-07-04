#!/usr/bin/env tsx
import { instantiateCanonProjectOverlayTemplate } from '../src/lib/overlays/project-template/index.js';
import type { CanonRegistryModality } from '../src/lib/registry/schema.js';

const MODALITIES: CanonRegistryModality[] = ['web', 'chat', 'app', 'voice', 'glasses'];

type CliOptions = {
	id?: string;
	name?: string;
	owner?: string;
	sourcePackage?: string;
	out?: string;
	modalities?: CanonRegistryModality[];
	tags?: string[];
	dryRun?: boolean;
	force?: boolean;
	json?: boolean;
	help?: boolean;
};

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--') continue;
		const readValue = () => {
			const value = argv[index + 1];
			if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
			index += 1;
			return value;
		};

		switch (arg) {
			case '--id':
				options.id = readValue();
				break;
			case '--name':
				options.name = readValue();
				break;
			case '--owner':
				options.owner = readValue();
				break;
			case '--source-package':
				options.sourcePackage = readValue();
				break;
			case '--out':
				options.out = readValue();
				break;
			case '--modalities':
				options.modalities = parseModalities(readValue());
				break;
			case '--tags':
				options.tags = readValue()
					.split(',')
					.map((tag) => tag.trim())
					.filter(Boolean);
				break;
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--force':
				options.force = true;
				break;
			case '--json':
				options.json = true;
				break;
			case '--help':
			case '-h':
				options.help = true;
				break;
			default:
				throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return options;
}

function parseModalities(value: string): CanonRegistryModality[] {
	const modalities = value
		.split(',')
		.map((modality) => modality.trim())
		.filter(Boolean);

	for (const modality of modalities) {
		if (!MODALITIES.includes(modality as CanonRegistryModality)) {
			throw new Error(`Unknown modality: ${modality}`);
		}
	}

	return modalities as CanonRegistryModality[];
}

function requireOption<T>(value: T | undefined, name: string): T {
	if (!value) throw new Error(`${name} is required`);
	return value;
}

function printHelp() {
	console.log(`Instantiate a Canon project overlay template.

Usage:
  pnpm --filter @create-something/canon overlay:instantiate -- \\
    --id overlay.client-workflow \\
    --name "Client Workflow Overlay" \\
    --owner client-team \\
    --source-package @create-something/client \\
    --out ./packages/client/canon-overlay \\
    --modalities web,chat \\
    --dry-run

Options:
  --id <id>                 Stable overlay id, for example overlay.client-workflow
  --name <name>             Human-readable overlay name
  --owner <owner>           Owner responsible for local evidence
  --source-package <pkg>    Package or project that owns this overlay
  --out <dir>               Output directory for overlay files
  --modalities <list>       Comma-separated modalities: web,chat,app,voice,glasses
  --tags <list>             Optional comma-separated tags
  --dry-run                 Print planned files without writing
  --force                   Overwrite existing files
  --json                    Print JSON result
`);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		return;
	}

	const result = await instantiateCanonProjectOverlayTemplate({
		id: requireOption(options.id, '--id'),
		name: requireOption(options.name, '--name'),
		owner: requireOption(options.owner, '--owner'),
		sourcePackage: requireOption(options.sourcePackage, '--source-package'),
		outputRoot: requireOption(options.out, '--out'),
		targetModalities: options.modalities,
		tags: options.tags,
		dryRun: options.dryRun,
		force: options.force,
		includeContent: options.json
	});

	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log(result.summary);
	for (const file of result.files) {
		console.log(`- ${file.action}: ${file.relativePath}`);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
