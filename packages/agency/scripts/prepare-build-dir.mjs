import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const packageRoot = process.cwd();
const linkPath = path.join(packageRoot, '.svelte-kit');
const targetPath = path.join(os.tmpdir(), 'create-something-agency-svelte-kit');

fs.mkdirSync(targetPath, { recursive: true });

try {
	const stats = fs.lstatSync(linkPath);
	if (stats.isSymbolicLink()) {
		const currentTarget = fs.readlinkSync(linkPath);
		const resolvedTarget = path.resolve(packageRoot, currentTarget);
		if (resolvedTarget === targetPath) {
			process.exit(0);
		}
	}

	fs.rmSync(linkPath, { recursive: true, force: true });
} catch (error) {
	if (error && error.code !== 'ENOENT') {
		throw error;
	}
}

const relativeTarget = path.relative(packageRoot, targetPath);
fs.symlinkSync(relativeTarget, linkPath, 'dir');
