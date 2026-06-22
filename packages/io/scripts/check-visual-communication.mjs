import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const configContracts = [
	{
		relativePath: 'src/lib/config/fileBasedPapers.ts',
		metadataMarker: 'const fileBasedPaperMetadata',
		visualsMarker: 'const fileBasedPaperVisuals',
		exportMarker: 'export const fileBasedPapers',
		label: 'fileBasedPapers'
	},
	{
		relativePath: 'src/lib/config/fileBasedExperiments.ts',
		metadataMarker: 'const fileBasedExperimentMetadata',
		visualsMarker: 'const fileBasedExperimentVisuals',
		exportMarker: 'export const fileBasedExperiments',
		label: 'fileBasedExperiments'
	}
];
const visualGuidePath = path.join(packageRoot, 'docs/ai-native-visual-communication.md');
const visualHelperPath = 'src/lib/config/visualCommunication.ts';

function readText(relativePath) {
	return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
}

function sectionBetween(source, startMarker, endMarker, relativePath) {
	const start = source.indexOf(startMarker);
	const end = source.indexOf(endMarker);

	if (start === -1 || end === -1 || end <= start) {
		failures.push(`${relativePath} is missing expected section markers ${startMarker} → ${endMarker}.`);
		return '';
	}

	return source.slice(start, end);
}

function extractMetadataIds(source, contract) {
	const metadataSection = sectionBetween(
		source,
		contract.metadataMarker,
		contract.visualsMarker,
		contract.relativePath
	);
	return [...metadataSection.matchAll(/\n\s*id:\s*'([^']+)'/g)].map((match) => match[1]);
}

function extractMetadataRecords(source, contract) {
	const metadataSection = sectionBetween(
		source,
		contract.metadataMarker,
		contract.visualsMarker,
		contract.relativePath
	);
	return [...metadataSection.matchAll(/\n\s*id:\s*'([^']+)'[\s\S]*?\n\s*slug:\s*'([^']+)'/g)].map(
		(match) => ({ id: match[1], slug: match[2] })
	);
}

function extractVisualDefinitions(source, contract) {
	const visualsSection = sectionBetween(
		source,
		contract.visualsMarker,
		contract.exportMarker,
		contract.relativePath
	);
	const definitionRegex = /\n\t'([^']+)':\s*defineArtifactVisuals\(\{/g;
	const matches = [...visualsSection.matchAll(definitionRegex)];
	const definitions = new Map();

	for (let index = 0; index < matches.length; index += 1) {
		const match = matches[index];
		const next = matches[index + 1];
		definitions.set(match[1], visualsSection.slice(match.index, next?.index ?? visualsSection.length));
	}

	return definitions;
}

function listDedicatedFileBasedExperimentRoutes(fileBasedSlugs) {
	const experimentsRouteRoot = path.join(packageRoot, 'src/routes/experiments');
	return fs
		.readdirSync(experimentsRouteRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.filter((slug) => fileBasedSlugs.has(slug))
		.filter((slug) => fs.existsSync(path.join(experimentsRouteRoot, slug, '+page.svelte')));
}

const failures = [];

if (!fs.existsSync(visualGuidePath)) {
	failures.push('Missing docs/ai-native-visual-communication.md.');
}

const helperSource = readText(visualHelperPath);
for (const required of [
	"CREATE_SOMETHING_RESEARCH_VISUAL_PROMPT_CONTRACT =",
	"'create-something-research-visual.v1'",
	"model: 'gpt-image-2'",
	'buildBrandVisualPrompt',
	'applyArtifactVisuals'
]) {
	if (!helperSource.includes(required)) {
		failures.push(`${visualHelperPath} is missing shared visual contract marker: ${required}`);
	}
}

for (const contract of configContracts) {
	const source = readText(contract.relativePath);

	if (!source.includes('applyArtifactVisuals(')) {
		failures.push(`${contract.relativePath} must export ${contract.label} through applyArtifactVisuals.`);
	}

	const metadataIds = extractMetadataIds(source, contract);
	const metadataRecords = extractMetadataRecords(source, contract);
	const visualDefinitions = extractVisualDefinitions(source, contract);
	const visualIds = [...visualDefinitions.keys()];
	const missing = metadataIds.filter((id) => !visualDefinitions.has(id));
	const extra = visualIds.filter((id) => !metadataIds.includes(id));

	if (missing.length > 0) {
		failures.push(`${contract.label} missing visual definitions: ${missing.join(', ')}`);
	}

	if (extra.length > 0) {
		failures.push(`${contract.label} has visual definitions for unknown artifacts: ${extra.join(', ')}`);
	}

	for (const [id, snippet] of visualDefinitions) {
		for (const required of ['kind:', 'title:', 'nodes:', 'subject:', 'motifs:', 'alt:']) {
			if (!snippet.includes(required)) {
				failures.push(`${contract.label}.${id} visual definition is missing ${required}`);
			}
		}

		if ((snippet.match(/label:/g) ?? []).length < 3) {
			failures.push(`${contract.label}.${id} visual definition must include at least three nodes.`);
		}
	}

	if (contract.label === 'fileBasedExperiments') {
		const fileBasedSlugs = new Set(metadataRecords.map((record) => record.slug));
		const dedicatedRoutes = listDedicatedFileBasedExperimentRoutes(fileBasedSlugs);
		const dynamicRouteSource = readText('src/routes/experiments/[slug]/+page.server.ts');

		for (const slug of dedicatedRoutes) {
			const pagePath = `src/routes/experiments/${slug}/+page.svelte`;
			const pageSource = readText(pagePath);
			const serverPath = `src/routes/experiments/${slug}/+page.server.ts`;

			if (
				!pageSource.includes('ExperimentVisualSummary') &&
				!pageSource.includes('ArtifactVisualSummary')
			) {
				failures.push(`${pagePath} must render the shared experiment visual summary.`);
			}

			if (!fs.existsSync(path.join(packageRoot, serverPath))) {
				failures.push(`${serverPath} must load file-based experiment metadata for the visual summary.`);
			} else {
				const serverSource = readText(serverPath);
				if (!serverSource.includes(`getFileBasedExperiment('${slug}')`)) {
					failures.push(`${serverPath} must load getFileBasedExperiment('${slug}').`);
				}
			}

			if (!dynamicRouteSource.includes(`'${slug}'`)) {
				failures.push(
					`src/routes/experiments/[slug]/+page.server.ts FILE_BASED_WITH_ROUTES is missing '${slug}'.`
				);
			}
		}
	}
}

if (failures.length > 0) {
	console.error(failures.join('\n'));
	process.exit(1);
}

console.log('Visual communication metadata OK.');
