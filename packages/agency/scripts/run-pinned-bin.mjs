import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [, , pkgName, binName, ...args] = process.argv;

if (!pkgName || !binName) {
	console.error('Usage: node scripts/run-pinned-bin.mjs <package> <bin> [...args]');
	process.exit(1);
}

const packageRoot = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const version =
	packageJson.devDependencies?.[pkgName] ??
	packageJson.dependencies?.[pkgName] ??
	packageJson.optionalDependencies?.[pkgName];

if (!version) {
	console.error(`Package ${pkgName} is not declared in package.json`);
	process.exit(1);
}

function findWorkspaceRoot(start) {
	let current = start;
	while (true) {
		if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
		const parent = path.dirname(current);
		if (parent === current) return start;
		current = parent;
	}
}

function normalizePrefix(name, pkgVersion) {
	return `${name.replace('/', '+')}@${pkgVersion}`;
}

const workspaceRoot = findWorkspaceRoot(packageRoot);
const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');
const prefix = normalizePrefix(pkgName, version);

const storeDir = fs
	.readdirSync(pnpmStore)
	.find((entry) => entry === prefix || entry.startsWith(`${prefix}_`));

if (!storeDir) {
	console.error(`Could not find ${pkgName}@${version} in ${pnpmStore}`);
	process.exit(1);
}

const packageDir = path.join(pnpmStore, storeDir, 'node_modules', pkgName);
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
const binField = manifest.bin;

let relativeBinPath;
if (typeof binField === 'string') {
	relativeBinPath = binField;
} else {
	relativeBinPath = binField?.[binName];
}

if (!relativeBinPath) {
	console.error(`Could not resolve bin ${binName} for ${pkgName}`);
	process.exit(1);
}

const binPath = path.join(packageDir, relativeBinPath);
const child = spawn(process.execPath, [binPath, ...args], {
	cwd: packageRoot,
	stdio: 'inherit',
	env: process.env
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});
