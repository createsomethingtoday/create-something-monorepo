import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');

const targets = [
	path.join(
		appDir,
		'.open-next/server-functions/default/apps/webflow-dashboard-cloud/handler.mjs'
	),
	path.join(
		appDir,
		'.open-next/server-functions/default/apps/webflow-dashboard-cloud/index.mjs'
	)
];

const replacements = [
	{
		label: 'bundled handler bootstrap',
		pattern:
			/function setNextjsServerWorkingDirectory\(\)\{process\.chdir\(""\)\}/g,
		replacement: 'function setNextjsServerWorkingDirectory(){}'
	},
	{
		label: 'unbundled handler bootstrap',
		pattern:
			/function setNextjsServerWorkingDirectory\(\)\s*\{\s*process\.chdir\(__dirname\);?\s*\}/g,
		replacement: 'function setNextjsServerWorkingDirectory() {}'
	}
];

let changedFiles = 0;
let patchedBootstrap = false;

for (const filePath of targets) {
	let source;
	try {
		source = await readFile(filePath, 'utf8');
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			continue;
		}

		throw error;
	}

	let nextSource = source;
	let fileChanged = false;

	for (const { label, pattern, replacement } of replacements) {
		if (!pattern.test(nextSource)) {
			pattern.lastIndex = 0;
			continue;
		}

		pattern.lastIndex = 0;
		nextSource = nextSource.replace(pattern, replacement);
		fileChanged = true;
		patchedBootstrap = true;
		console.log(`Patched ${label} in ${path.relative(appDir, filePath)}`);
	}

	if (!fileChanged) {
		continue;
	}

	await writeFile(filePath, nextSource);
	changedFiles += 1;
}

if (!patchedBootstrap) {
	throw new Error(
		'OpenNext bootstrap patch did not match any generated files. The build output layout may have changed.'
	);
}

console.log(`Patched ${changedFiles} OpenNext build artifact(s).`);
