import fs from 'node:fs';
import path from 'node:path';

const packageRoot = process.cwd();
const buildDir = path.join(packageRoot, '.svelte-kit');

try {
	const stats = fs.lstatSync(buildDir);
	if (stats.isSymbolicLink()) {
		fs.rmSync(buildDir, { recursive: true, force: true });
	}
} catch (error) {
	if (error && error.code !== 'ENOENT') {
		throw error;
	}
}

fs.mkdirSync(buildDir, { recursive: true });
