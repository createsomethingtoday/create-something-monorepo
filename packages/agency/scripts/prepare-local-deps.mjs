import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const packageRoot = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

function findWorkspaceRoot(start) {
	let current = start;
	while (true) {
		if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
		const parent = path.dirname(current);
		if (parent === current) return start;
		current = parent;
	}
}

function normalizePrefix(name, version) {
	return `${name.replace('/', '+')}@${version}`;
}

function findInstalledStorePath(pnpmStore, pkgName, version) {
	const storePrefix = normalizePrefix(pkgName, version);
	const candidates = fs
		.readdirSync(pnpmStore)
		.filter((entry) => entry === storePrefix || entry.startsWith(`${storePrefix}_`))
		.map((entry) => path.join(pnpmStore, entry, 'node_modules', pkgName))
		.filter((candidate) => fs.existsSync(path.join(candidate, 'package.json')));

	return candidates[0] ?? null;
}

function findWorkspacePackageDir(workspaceRoot, pkgName) {
	const packagesDir = path.join(workspaceRoot, 'packages');
	if (!fs.existsSync(packagesDir)) return null;

	for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;

		const candidate = path.join(packagesDir, entry.name);
		const manifestPath = path.join(candidate, 'package.json');
		if (!fs.existsSync(manifestPath)) continue;

		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
		if (manifest.name === pkgName) {
			return candidate;
		}
	}

	return null;
}

function readPackageManifest(packageDir) {
	return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
}

function getWorkspaceDependencyNames(manifest) {
	const dependencySets = [
		manifest.dependencies,
		manifest.optionalDependencies
	];

	return dependencySets
		.flatMap((deps) => Object.entries(deps ?? {}))
		.filter(([, version]) => typeof version === 'string' && version.startsWith('workspace:'))
		.map(([pkgName]) => pkgName);
}

function collectExportTargets(value, targets) {
	if (typeof value === 'string') {
		targets.add(value);
		return;
	}

	if (!value || typeof value !== 'object') return;

	for (const nested of Object.values(value)) {
		collectExportTargets(nested, targets);
	}
}

function getRequiredOutputPaths(manifest) {
	const outputs = new Set();

	for (const candidate of [manifest.main, manifest.module, manifest.svelte, manifest.types, manifest.bin]) {
		collectExportTargets(candidate, outputs);
	}

	collectExportTargets(manifest.exports, outputs);

	return [...outputs].filter((target) => typeof target === 'string' && target.startsWith('./dist/'));
}

function outputPathExists(packageDir, relativePath) {
	const normalized = relativePath.replace(/^\.\//, '');
	const wildcardIndex = normalized.indexOf('*');
	const candidate =
		wildcardIndex === -1
			? normalized
			: normalized.slice(0, wildcardIndex).replace(/[/.]+$/, '');

	if (!candidate) return true;

	return fs.existsSync(path.join(packageDir, candidate));
}

function resolveWorkspaceBuildScript(manifest) {
	if (manifest.scripts?.package) return 'package';
	if (manifest.scripts?.build) return 'build';
	if (manifest.scripts?.prepare) return 'prepare';
	return null;
}

const preparedWorkspacePackages = new Set();
const alwaysBuildWorkspacePackages = new Set(['@create-something/canon', '@create-something/tufte']);

function ensureWorkspacePackageReady(workspaceRoot, pkgName, packageDir, ancestry = []) {
	if (preparedWorkspacePackages.has(pkgName)) return;
	if (ancestry.includes(pkgName)) {
		throw new Error(`Circular workspace dependency detected: ${[...ancestry, pkgName].join(' -> ')}`);
	}

	const manifest = readPackageManifest(packageDir);
	const nextAncestry = [...ancestry, pkgName];

	for (const dependencyName of getWorkspaceDependencyNames(manifest)) {
		const dependencyDir = findWorkspacePackageDir(workspaceRoot, dependencyName);
		if (!dependencyDir) continue;
		ensureWorkspacePackageReady(workspaceRoot, dependencyName, dependencyDir, nextAncestry);
	}

	const requiredOutputs = getRequiredOutputPaths(manifest);
	const missingOutputs = requiredOutputs.filter((outputPath) => !outputPathExists(packageDir, outputPath));

	if (missingOutputs.length > 0 || alwaysBuildWorkspacePackages.has(pkgName)) {
		const buildScript = resolveWorkspaceBuildScript(manifest);
		if (!buildScript) {
			throw new Error(
				`Workspace package ${pkgName} is missing built outputs (${missingOutputs.join(', ')}) and has no package/build/prepare script`
			);
		}

		execFileSync('pnpm', ['--dir', packageDir, 'run', buildScript], {
			cwd: workspaceRoot,
			stdio: 'inherit',
			env: process.env
		});
	}

	preparedWorkspacePackages.add(pkgName);
}

function removeTarget(targetPath) {
	try {
		const stats = fs.lstatSync(targetPath);
		if (stats.isSymbolicLink()) {
			fs.unlinkSync(targetPath);
			return;
		}

		fs.rmSync(targetPath, { recursive: true, force: true });
	} catch (error) {
		if (error && error.code !== 'ENOENT') {
			throw error;
		}
	}
}

const workspaceRoot = findWorkspaceRoot(packageRoot);
const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');
const nodeModulesRoot = path.join(packageRoot, 'node_modules');
const declared = {
	...packageJson.dependencies,
	...packageJson.devDependencies
};

fs.mkdirSync(nodeModulesRoot, { recursive: true });

for (const [pkgName, version] of Object.entries(declared)) {
	const isWorkspaceDependency = version.startsWith('workspace:');
	const sourcePath = isWorkspaceDependency
		? findWorkspacePackageDir(workspaceRoot, pkgName)
		: findInstalledStorePath(pnpmStore, pkgName, version);
	if (!sourcePath) continue;

	if (isWorkspaceDependency) {
		ensureWorkspacePackageReady(workspaceRoot, pkgName, sourcePath);
	}

	const segments = pkgName.split('/');
	const leaf = segments.pop();
	const targetDir = path.join(nodeModulesRoot, ...segments);
	const targetPath = path.join(targetDir, leaf);

	fs.mkdirSync(targetDir, { recursive: true });

	try {
		const stats = fs.lstatSync(targetPath);
		if (stats.isSymbolicLink()) {
			const currentTarget = path.resolve(targetDir, fs.readlinkSync(targetPath));
			if (currentTarget === sourcePath) continue;
		}

		removeTarget(targetPath);
	} catch (error) {
		if (error && error.code !== 'ENOENT') {
			throw error;
		}
	}

	const relativeSource = path.relative(targetDir, sourcePath);
	try {
		fs.symlinkSync(relativeSource, targetPath, 'dir');
	} catch (error) {
		if (error && error.code === 'EEXIST') {
			removeTarget(targetPath);
			fs.symlinkSync(relativeSource, targetPath, 'dir');
			continue;
		}

		throw error;
	}
}
