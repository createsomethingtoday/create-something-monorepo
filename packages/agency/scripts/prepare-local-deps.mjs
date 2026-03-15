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

function indexPnpmStore(pnpmStore) {
	if (!fs.existsSync(pnpmStore)) return new Map();

	const index = new Map();

	for (const entry of fs.readdirSync(pnpmStore)) {
		const prefix = entry.split('_')[0];
		const entries = index.get(prefix);
		if (entries) {
			entries.push(entry);
		} else {
			index.set(prefix, [entry]);
		}
	}

	return index;
}

function findInstalledStorePath(pnpmStore, pkgName, version) {
	const storePrefix = normalizePrefix(pkgName, version);
	const storeEntries = pnpmStoreIndex.get(storePrefix) ?? [];
	const candidates = storeEntries
		.map((entry) => path.join(pnpmStore, entry, 'node_modules', pkgName))
		.filter((candidate) => fs.existsSync(path.join(candidate, 'package.json')));

	return candidates[0] ?? null;
}

function indexWorkspacePackages(workspaceRoot) {
	const packagesDir = path.join(workspaceRoot, 'packages');
	const index = new Map();
	if (!fs.existsSync(packagesDir)) return index;

	for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;

		const candidate = path.join(packagesDir, entry.name);
		const manifestPath = path.join(candidate, 'package.json');
		if (!fs.existsSync(manifestPath)) continue;

		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
		if (manifest.name) {
			index.set(manifest.name, candidate);
		}
	}

	return index;
}

function findWorkspacePackageDir(workspaceRoot, pkgName) {
	return workspacePackageIndex.get(pkgName) ?? null;
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
const pnpmStoreIndex = indexPnpmStore(pnpmStore);
const nodeModulesRoot = path.join(packageRoot, 'node_modules');
const workspacePackageIndex = indexWorkspacePackages(workspaceRoot);
const declared = {
	...packageJson.dependencies,
	...packageJson.devDependencies
};

fs.mkdirSync(nodeModulesRoot, { recursive: true });

for (const [pkgName, version] of Object.entries(declared)) {
	const sourcePath = version.startsWith('workspace:')
		? findWorkspacePackageDir(workspaceRoot, pkgName)
		: findInstalledStorePath(pnpmStore, pkgName, version);
	if (!sourcePath) continue;

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
