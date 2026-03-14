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

function findInstalledStorePath(pnpmStore, pkgName, version) {
	const prefix = normalizePrefix(pkgName, version);
	const candidates = fs
		.readdirSync(pnpmStore)
		.filter((entry) => entry === prefix || entry.startsWith(`${prefix}_`))
		.map((entry) => path.join(pnpmStore, entry, 'node_modules', pkgName))
		.filter((candidate) => fs.existsSync(path.join(candidate, 'package.json')));

	return candidates[0] ?? null;
}

const workspaceRoot = findWorkspaceRoot(packageRoot);
const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');

function resolveInstalledPackageDir() {
	const localPackageDir = path.join(packageRoot, 'node_modules', pkgName);
	if (fs.existsSync(path.join(localPackageDir, 'package.json'))) {
		return localPackageDir;
	}

	const workspacePackageDir = path.join(workspaceRoot, 'node_modules', pkgName);
	if (fs.existsSync(path.join(workspacePackageDir, 'package.json'))) {
		return workspacePackageDir;
	}

	const storePath = findInstalledStorePath(pnpmStore, pkgName, version);
	if (!storePath) {
		console.error(`Could not find ${pkgName}@${version} in ${pnpmStore}`);
		process.exit(1);
	}

	return storePath;
}

const packageDir = resolveInstalledPackageDir();
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
