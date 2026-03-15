/**
 * Heidegger Collector
 *
 * Level: System
 * Question: "Does this serve the whole?"
 * Action: Reconnect
 *
 * Detects:
 * - Incomplete packages (missing src, tests, readme)
 * - Orphaned files (not imported anywhere)
 * - Circular dependencies
 * - Missing documentation
 * - Architectural fragmentation
 */

import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import type {
	HeideggerMetrics,
	PackageCompleteness,
	OrphanedFile,
	CircularDependency,
	Violation,
	Severity
} from '../types/index.js';

export async function collectHeideggerMetrics(
	rootPath: string,
	ignore: string[]
): Promise<HeideggerMetrics> {
	const violations: Violation[] = [];

	// Check package completeness
	const packageCompleteness = await checkPackageCompleteness(rootPath);
	for (const pkg of packageCompleteness) {
		if (pkg.completeness < 0.5) {
			violations.push({
				type: 'incomplete_package',
				severity: 'high',
				message: `Package "${pkg.package}" is ${Math.round(pkg.completeness * 100)}% complete`,
				file: pkg.package,
				suggestion: buildCompletenessHint(pkg)
			});
		} else if (pkg.completeness < 0.75) {
			violations.push({
				type: 'incomplete_package',
				severity: 'medium',
				message: `Package "${pkg.package}" is ${Math.round(pkg.completeness * 100)}% complete`,
				file: pkg.package,
				suggestion: buildCompletenessHint(pkg)
			});
		}
	}

	// Find orphaned files
	const orphanedFiles = await findOrphanedFiles(rootPath, ignore);
	for (const orphan of orphanedFiles) {
		violations.push({
			type: 'orphaned_file',
			severity: 'medium',
			message: orphan.reason,
			file: orphan.file,
			suggestion: 'Import this file somewhere or remove it'
		});
	}

	// Detect circular dependencies
	const circularDependencies = await detectCircularDependencies(rootPath, ignore);
	for (const cycle of circularDependencies) {
		violations.push({
			type: 'circular_dependency',
			severity: 'high',
			message: `Circular dependency: ${cycle.cycle.join(' → ')}`,
			files: cycle.cycle,
			suggestion: 'Break the cycle by extracting shared code or restructuring'
		});
	}

	// Find missing documentation
	const missingDocumentation = await findMissingDocumentation(rootPath, ignore);
	for (const file of missingDocumentation.slice(0, 5)) {
		violations.push({
			type: 'missing_documentation',
			severity: 'low',
			message: 'Public exports lack JSDoc documentation',
			file,
			suggestion: 'Add JSDoc comments to exported functions and types'
		});
	}

	// Calculate score
	const avgCompleteness =
		packageCompleteness.length > 0
			? packageCompleteness.reduce((sum, p) => sum + p.completeness, 0) / packageCompleteness.length
			: 1;

	const penaltyFromOrphans = Math.min(2, orphanedFiles.length * 0.2);
	const penaltyFromCircular = Math.min(3, circularDependencies.length * 1);

	const score = Math.max(1, Math.min(10, avgCompleteness * 10 - penaltyFromOrphans - penaltyFromCircular));

	return {
		packageCompleteness,
		orphanedFiles,
		circularDependencies,
		missingDocumentation,
		score: Math.round(score * 10) / 10,
		violations
	};
}

async function checkPackageCompleteness(rootPath: string): Promise<PackageCompleteness[]> {
	const results: PackageCompleteness[] = [];

	// Check if this is a monorepo
	const packagesDir = path.join(rootPath, 'packages');
	const isMonorepo = fs.existsSync(packagesDir);

	if (isMonorepo) {
		// Check each package in packages/
		const packages = fs.readdirSync(packagesDir).filter((name) => {
			const pkgPath = path.join(packagesDir, name);
			return fs.statSync(pkgPath).isDirectory() && !name.startsWith('.');
		});

		for (const pkg of packages) {
			const pkgPath = path.join(packagesDir, pkg);
			results.push(evaluatePackage(pkg, pkgPath));
		}
	} else {
		// Single package - evaluate root
		const rootPkg = evaluatePackage(path.basename(rootPath), rootPath);
		results.push(rootPkg);
	}

	return results;
}

function evaluatePackage(name: string, pkgPath: string): PackageCompleteness {
	const hasSrc =
		fs.existsSync(path.join(pkgPath, 'src')) ||
		fs.existsSync(path.join(pkgPath, 'lib')) ||
		fs.existsSync(path.join(pkgPath, 'index.ts')) ||
		fs.existsSync(path.join(pkgPath, 'index.js'));

	const hasTests =
		fs.existsSync(path.join(pkgPath, 'tests')) ||
		fs.existsSync(path.join(pkgPath, 'test')) ||
		fs.existsSync(path.join(pkgPath, '__tests__')) ||
		fg.sync(['**/*.test.{ts,js}', '**/*.spec.{ts,js}'], { cwd: pkgPath }).length > 0;

	const hasReadme =
		fs.existsSync(path.join(pkgPath, 'README.md')) ||
		fs.existsSync(path.join(pkgPath, 'readme.md'));

	const hasPackageJson = fs.existsSync(path.join(pkgPath, 'package.json'));

	// Calculate completeness (weighted)
	let completeness = 0;
	if (hasSrc) completeness += 0.4; // Source is most important
	if (hasPackageJson) completeness += 0.3; // Package definition
	if (hasReadme) completeness += 0.2; // Documentation
	if (hasTests) completeness += 0.1; // Tests

	return {
		package: name,
		hasSrc,
		hasTests,
		hasReadme,
		hasPackageJson,
		completeness
	};
}

function buildCompletenessHint(pkg: PackageCompleteness): string {
	const missing: string[] = [];
	if (!pkg.hasSrc) missing.push('src/ directory');
	if (!pkg.hasPackageJson) missing.push('package.json');
	if (!pkg.hasReadme) missing.push('README.md');
	if (!pkg.hasTests) missing.push('tests');
	return `Add missing: ${missing.join(', ')}`;
}

async function findOrphanedFiles(rootPath: string, ignore: string[]): Promise<OrphanedFile[]> {
	const orphaned: OrphanedFile[] = [];

	// Get all source files (including index files and Svelte for import graph building)
	const allFiles = await fg(['**/*.{ts,tsx,js,jsx,svelte}'], {
		cwd: rootPath,
		ignore: [...ignore, '**/*.test.*', '**/*.spec.*'],
		absolute: true
	});

	// Files to check for orphan status (exclude index files and Svelte files - they're entry points)
	const files = allFiles.filter(
		(f) => !path.basename(f).startsWith('index.') && !f.endsWith('.svelte')
	);

	// Build import graph
	const importedFiles = new Set<string>();

	// Find all packages with $lib aliases (SvelteKit convention)
	const libAliasMap = new Map<string, string>();
	const packagesDir = path.join(rootPath, 'packages');
	if (fs.existsSync(packagesDir)) {
		const packages = fs.readdirSync(packagesDir).filter((name) => {
			const pkgPath = path.join(packagesDir, name);
			return fs.statSync(pkgPath).isDirectory();
		});
		for (const pkg of packages) {
			const libPath = path.join(packagesDir, pkg, 'src', 'lib');
			if (fs.existsSync(libPath)) {
				libAliasMap.set(pkg, libPath);
			}
		}
	}

	// Use ALL files (including index) for building import graph
	for (const file of allFiles) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			// Match: import X from, import { X } from, import type { X } from, export * from, export { X } from
			const importRegex = /(?:import\s+(?:type\s+)?(?:\*\s+as\s+\w+|(?:\{[^}]*\}|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*)\s+from|export\s+(?:\*|\{[^}]*\})\s+from)\s*['"]([^'"]+)['"]/g;
			let match;

			// Determine which package this file belongs to (for $lib resolution)
			const relativePath = path.relative(rootPath, file);
			const packageMatch = relativePath.match(/^packages\/([^/]+)/);
			const currentPackage = packageMatch ? packageMatch[1] : null;

			while ((match = importRegex.exec(content)) !== null) {
				let importPath = match[1];

				// Handle SvelteKit $lib alias
				if (importPath.startsWith('$lib') && currentPackage && libAliasMap.has(currentPackage)) {
					const libPath = libAliasMap.get(currentPackage)!;
					importPath = importPath.replace('$lib', libPath);
					// Now it's an absolute path, resolve extensions
					const basePath = importPath.replace(/\.(js|ts)$/, '');
					for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
						importedFiles.add(basePath + ext);
					}
					continue;
				}

				if (importPath.startsWith('.')) {
					// Handle ESM .js imports pointing to .ts source files
					let resolved = path.resolve(path.dirname(file), importPath);

					// If import ends with .js, also check for .ts version
					if (resolved.endsWith('.js')) {
						const tsVersion = resolved.replace(/\.js$/, '.ts');
						importedFiles.add(tsVersion);
						importedFiles.add(resolved);
					}

					// Try common extensions
					const basePath = resolved.replace(/\.(js|ts|tsx|jsx)$/, '');
					for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js']) {
						importedFiles.add(basePath + ext);
					}
				}
			}
		} catch {
			// Skip
		}
	}

	// Find files that are never imported
	for (const file of files) {
		const relativePath = path.relative(rootPath, file);

		// Skip entry points and special files
		if (
			relativePath.includes('+page') ||
			relativePath.includes('+server') ||
			relativePath.includes('+layout') ||
			relativePath.includes('cli.') ||
			relativePath.includes('main.') ||
			relativePath.includes('index.')
		) {
			continue;
		}

		// Skip config files - they're entry points for tools
		if (
			relativePath.includes('.config.') ||
			relativePath.includes('config.') ||
			relativePath.endsWith('rc.ts') ||
			relativePath.endsWith('rc.js')
		) {
			continue;
		}

		// Skip example/demo files - they're standalone entry points
		if (
			relativePath.includes('/examples/') ||
			relativePath.includes('/demo/') ||
			relativePath.includes('/sample/')
		) {
			continue;
		}

		// Skip test files
		if (
			relativePath.includes('.test.') ||
			relativePath.includes('.spec.') ||
			relativePath.includes('/__tests__/')
		) {
			continue;
		}

		// Skip CLI bin files
		if (relativePath.includes('/bin/')) {
			continue;
		}

		// Skip TypeScript declaration files (ambient types)
		if (relativePath.endsWith('.d.ts')) {
			continue;
		}

		// Skip scripts directory (standalone utilities)
		if (relativePath.includes('/scripts/')) {
			continue;
		}

		// Skip SvelteKit hooks (framework entry points)
		if (relativePath.includes('hooks.server') || relativePath.includes('hooks.client')) {
			continue;
		}

		const isImported = importedFiles.has(file) || importedFiles.has(file.replace(/\.[^.]+$/, ''));

		if (!isImported) {
			orphaned.push({
				file: relativePath,
				reason: 'File is not imported by any other file'
			});
		}
	}

	return orphaned.slice(0, 10);
}

async function detectCircularDependencies(
	rootPath: string,
	ignore: string[]
): Promise<CircularDependency[]> {
	const cycles: CircularDependency[] = [];

	// Build dependency graph
	const graph = new Map<string, Set<string>>();

	const files = await fg(['**/*.{ts,tsx,js,jsx}'], {
		cwd: rootPath,
		ignore,
		absolute: true
	});

	for (const file of files) {
		const relativePath = path.relative(rootPath, file);
		const deps = new Set<string>();

		try {
			const content = fs.readFileSync(file, 'utf-8');
			const importRegex = /(?:import|from)\s*['"](\.[^'"]+)['"]/g;
			let match;

			while ((match = importRegex.exec(content)) !== null) {
				const importPath = match[1];
				const resolved = path.relative(
					rootPath,
					path.resolve(path.dirname(file), importPath)
				);
				deps.add(resolved.replace(/\.[^.]+$/, ''));
			}
		} catch {
			// Skip
		}

		graph.set(relativePath.replace(/\.[^.]+$/, ''), deps);
	}

	// DFS to find cycles
	const visited = new Set<string>();
	const stack = new Set<string>();

	function dfs(node: string, pathStack: string[]): void {
		if (stack.has(node)) {
			// Found cycle
			const cycleStart = pathStack.indexOf(node);
			if (cycleStart !== -1) {
				const cycle = pathStack.slice(cycleStart);
				cycle.push(node);
				cycles.push({ cycle });
			}
			return;
		}

		if (visited.has(node)) return;

		visited.add(node);
		stack.add(node);
		pathStack.push(node);

		const deps = graph.get(node);
		if (deps) {
			for (const dep of deps) {
				dfs(dep, [...pathStack]);
			}
		}

		stack.delete(node);
	}

	for (const node of graph.keys()) {
		dfs(node, []);
	}

	// Deduplicate cycles (same cycle can be detected from different starting points)
	const uniqueCycles: CircularDependency[] = [];
	const seen = new Set<string>();

	for (const cycle of cycles) {
		// Skip self-referencing "cycles" (single node pointing to itself via index re-export)
		const uniqueNodes = new Set(cycle.cycle);
		if (uniqueNodes.size < 2) {
			continue;
		}

		const key = [...cycle.cycle].sort().join('|');
		if (!seen.has(key)) {
			seen.add(key);
			uniqueCycles.push(cycle);
		}
	}

	return uniqueCycles.slice(0, 5);
}

async function findMissingDocumentation(rootPath: string, ignore: string[]): Promise<string[]> {
	const undocumented: string[] = [];

	const files = await fg(['**/*.{ts,tsx}'], {
		cwd: rootPath,
		ignore: [...ignore, '**/*.test.*', '**/*.spec.*'],
		absolute: true
	});

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');

			// Check for exported functions without JSDoc
			const exportedFunctions = content.match(/export\s+(?:async\s+)?function\s+\w+/g) || [];
			const jsdocComments = content.match(/\/\*\*[\s\S]*?\*\/\s*export/g) || [];

			if (exportedFunctions.length > 0 && jsdocComments.length < exportedFunctions.length / 2) {
				undocumented.push(path.relative(rootPath, file));
			}
		} catch {
			// Skip
		}
	}

	return undocumented;
}
