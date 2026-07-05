#!/usr/bin/env tsx
import {
	buildCanonProjectOverlayTemplateFilePack,
	getCanonProjectOverlayTemplateFile,
	listCanonProjectOverlayTemplateFilePaths,
	renderCanonProjectOverlayTemplateFileMarkdown,
	renderCanonProjectOverlayTemplateFilePackMarkdown
} from '../src/lib/overlays/project-template/index.js';

type CliOptions = {
	path?: string;
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
			case '--path':
				options.path = readValue();
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

function printHelp() {
	console.log(`Render Canon project overlay template files without writing.

Usage:
  pnpm --filter @create-something/canon overlay:template-files
  pnpm --filter @create-something/canon overlay:template-files -- --path surface-policy.md
  pnpm --filter @create-something/canon overlay:template-files -- --path templates%2Fsurface-brief.md --json

Options:
  --path <path>  Optional template file path, for example surface-policy.md or templates/surface-brief.md.
  --json         Print structured JSON instead of Markdown.
  --help, -h     Show this help text.

This command is read-only. It does not instantiate overlays, write files, create Linear work,
mutate Canon, mutate project overlays, or approve candidate promotion.
`);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		return;
	}

	if (options.path) {
		const file = getCanonProjectOverlayTemplateFile(options.path);

		if (!file) {
			console.error(`Canon project overlay template file not found: ${options.path}`);
			console.error('');
			console.error('Available file paths:');
			for (const filePath of listCanonProjectOverlayTemplateFilePaths()) {
				console.error(`- ${filePath}`);
			}
			process.exitCode = 1;
			return;
		}

		if (options.json) {
			console.log(JSON.stringify(file, null, 2));
			return;
		}

		console.log(renderCanonProjectOverlayTemplateFileMarkdown(file));
		return;
	}

	const pack = buildCanonProjectOverlayTemplateFilePack();

	if (options.json) {
		console.log(JSON.stringify(pack, null, 2));
		return;
	}

	console.log(renderCanonProjectOverlayTemplateFilePackMarkdown(pack));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
