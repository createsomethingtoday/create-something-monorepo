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

const workspaceRoot = findWorkspaceRoot(packageRoot);
const pnpmStore = path.join(workspaceRoot, 'node_modules', '.pnpm');
const nodeModulesRoot = path.join(packageRoot, 'node_modules');
const declared = {
	...packageJson.dependencies,
	...packageJson.devDependencies
};

fs.mkdirSync(nodeModulesRoot, { recursive: true });

for (const [pkgName, version] of Object.entries(declared)) {
	if (version.startsWith('workspace:')) continue;

	const sourcePath = findInstalledStorePath(pnpmStore, pkgName, version);
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

		fs.rmSync(targetPath, { recursive: true, force: true });
	} catch (error) {
		if (error && error.code !== 'ENOENT') {
			throw error;
		}
	}

	const relativeSource = path.relative(targetDir, sourcePath);
	fs.symlinkSync(relativeSource, targetPath, 'dir');
}
