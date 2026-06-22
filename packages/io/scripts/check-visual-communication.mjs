import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const packageRoot = process.cwd();
const configFiles = [
	'src/lib/config/fileBasedPapers.ts',
	'src/lib/config/fileBasedExperiments.ts'
];
const visualGuidePath = path.join(packageRoot, 'docs/ai-native-visual-communication.md');

function readText(relativePath) {
	return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
}

function snippetsAfter(source, marker, windowSize = 2200) {
	const snippets = [];
	let index = source.indexOf(marker);
	while (index !== -1) {
		snippets.push(source.slice(index, index + windowSize));
		index = source.indexOf(marker, index + marker.length);
	}
	return snippets;
}

const failures = [];

if (!fs.existsSync(visualGuidePath)) {
	failures.push('Missing docs/ai-native-visual-communication.md.');
}

for (const relativePath of configFiles) {
	const source = readText(relativePath);

	for (const snippet of snippetsAfter(source, 'visual_summary:')) {
		for (const required of ['kind:', 'title:', 'nodes:']) {
			if (!snippet.includes(required)) {
				failures.push(`${relativePath} visual_summary is missing ${required}`);
			}
		}
	}

	for (const snippet of snippetsAfter(source, 'generated_brand_image:')) {
		const requiredPairs = [
			['prompt_contract', "prompt_contract: 'create-something-research-visual.v1'"],
			['model', "model: 'gpt-image-2'"],
			['status', 'status:'],
			['prompt', 'prompt:']
		];

		for (const [label, required] of requiredPairs) {
			if (!snippet.includes(required)) {
				failures.push(`${relativePath} generated_brand_image is missing ${label}.`);
			}
		}
	}
}

if (failures.length > 0) {
	console.error(failures.join('\n'));
	process.exit(1);
}

console.log('Visual communication metadata OK.');
