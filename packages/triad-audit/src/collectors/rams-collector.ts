/**
 * Rams Collector
 *
 * Level: Artifact
 * Question: "Does this earn its existence?"
 * Action: Remove
 *
 * Detects:
 * - Dead exports (exports with no imports)
 * - Unused dependencies
 * - Large files that could be split
 * - Empty files
 */

import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import type { RamsMetrics, DeadExport, UnusedDependency, LargeFile, Violation, Severity } from '../types/index.js';

const LARGE_FILE_THRESHOLD = 500; // lines
const VERY_LARGE_FILE_THRESHOLD = 1000; // lines

export async function collectRamsMetrics(
	rootPath: string,
	ignore: string[]
): Promise<RamsMetrics> {
	const violations: Violation[] = [];

	// Find all source files
	const files = await fg(['**/*.{ts,tsx,js,jsx,svelte}'], {
		cwd: rootPath,
		ignore,
		absolute: true
	});

	// Collect exports and imports
	const exports = new Map<string, Set<string>>(); // file -> Set of export names
	const imports = new Map<string, Set<string>>(); // module -> Set of imported names

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			const relativePath = path.relative(rootPath, file);

			// Find exports
			const fileExports = extractExports(content);
			if (fileExports.size > 0) {
				exports.set(relativePath, fileExports);
			}

			// Find imports
			extractImports(content, rootPath, file, imports);
		} catch {
			// Skip files that can't be read
		}
	}

	// Find dead exports
	const deadExports = findDeadExports(exports, imports, rootPath);
	for (const dead of deadExports) {
		violations.push({
			type: 'dead_export',
			severity: 'medium',
			message: `Export "${dead.export}" is never imported`,
			file: dead.file,
			suggestion: 'Remove unused export or verify it\'s needed externally'
		});
	}

	// Find unused dependencies
	const unusedDependencies = await findUnusedDependencies(rootPath, files);
	for (const dep of unusedDependencies) {
		const severity: Severity = dep.type === 'dependency' ? 'high' : 'low';
		violations.push({
			type: 'unused_dependency',
			severity,
			message: `${dep.type} "${dep.name}" is not imported in any source file`,
			suggestion: `Remove from package.json ${dep.type === 'devDependency' ? 'devDependencies' : 'dependencies'}`
		});
	}

	// Find large files
	const largeFiles = await findLargeFiles(files, rootPath);
	for (const large of largeFiles) {
		const severity: Severity = large.lines >= VERY_LARGE_FILE_THRESHOLD ? 'high' : 'medium';
		violations.push({
			type: 'large_file',
			severity,
			message: `File has ${large.lines} lines`,
			file: large.file,
			suggestion: large.suggestion
		});
	}

	// Find empty files
	const emptyFiles = await findEmptyFiles(files, rootPath);
	for (const empty of emptyFiles) {
		violations.push({
			type: 'empty_file',
			severity: 'low',
			message: 'File is empty or contains only whitespace/comments',
			file: empty,
			suggestion: 'Remove empty file or add implementation'
		});
	}

	// Calculate score with weighted penalties
	// Dead exports are less severe (they might be for external use)
	// Large files are informational
	// Unused dependencies are more serious
	const deadExportPenalty = Math.min(2, deadExports.length * 0.1);
	const unusedDepPenalty = Math.min(3, unusedDependencies.length * 0.5);
	const largeFilePenalty = Math.min(2, largeFiles.length * 0.2);
	const emptyFilePenalty = Math.min(1, emptyFiles.length * 0.1);

	const totalPenalty = deadExportPenalty + unusedDepPenalty + largeFilePenalty + emptyFilePenalty;
	const score = Math.max(1, Math.min(10, 10 - totalPenalty));

	return {
		deadExports,
		unusedDependencies,
		largeFiles,
		emptyFiles,
		score: Math.round(score * 10) / 10,
		violations
	};
}

function extractExports(content: string): Set<string> {
	const exports = new Set<string>();

	// Named exports: export const/function/class Name
	const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
	let match;
	while ((match = namedExportRegex.exec(content)) !== null) {
		exports.add(match[1]);
	}

	// Export { ... }
	const exportListRegex = /export\s*\{([^}]+)\}/g;
	while ((match = exportListRegex.exec(content)) !== null) {
		const names = match[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0].trim());
		names.forEach((n) => {
			if (n && !n.startsWith('type ')) {
				exports.add(n.replace('type ', ''));
			}
		});
	}

	// Default export: export default
	if (/export\s+default\s+/.test(content)) {
		exports.add('default');
	}

	return exports;
}

function extractImports(
	content: string,
	rootPath: string,
	currentFile: string,
	imports: Map<string, Set<string>>
): void {
	// import { Name } from 'module'
	const importRegex = /import\s*(?:\{([^}]+)\}|(\*\s+as\s+\w+)|(\w+))\s*from\s*['"]([^'"]+)['"]/g;
	let match;

	while ((match = importRegex.exec(content)) !== null) {
		const modulePath = match[4];
		const names = new Set<string>();

		if (match[1]) {
			// Named imports
			match[1].split(',').forEach((n) => {
				const name = n.trim().split(/\s+as\s+/)[0].trim();
				if (name && !name.startsWith('type ')) {
					names.add(name.replace('type ', ''));
				}
			});
		}
		if (match[2]) {
			// Namespace import
			names.add('*');
		}
		if (match[3]) {
			// Default import
			names.add('default');
		}

		// Resolve relative imports
		let resolvedModule = modulePath;
		if (modulePath.startsWith('.')) {
			resolvedModule = path.relative(
				rootPath,
				path.resolve(path.dirname(currentFile), modulePath)
			);
		}

		if (!imports.has(resolvedModule)) {
			imports.set(resolvedModule, new Set());
		}
		names.forEach((n) => imports.get(resolvedModule)!.add(n));
	}
}

function findDeadExports(
	exports: Map<string, Set<string>>,
	imports: Map<string, Set<string>>,
	rootPath: string
): DeadExport[] {
	const dead: DeadExport[] = [];

	for (const [file, fileExports] of exports) {
		// Skip index files and entry points
		if (file.includes('index.') || file.includes('+page') || file.includes('+server') || file.includes('+layout')) {
			continue;
		}

		// Skip SvelteKit hooks files (handle, handleError, handleFetch are framework exports)
		if (file.includes('hooks.server') || file.includes('hooks.client')) {
			continue;
		}

		// Skip SDK/library source files - their exports are for external consumers
		if (file.includes('packages/sdk/src/') || file.includes('packages/lib/src/')) {
			continue;
		}

		// Skip Svelte component files - their exports are component props
		if (file.endsWith('.svelte')) {
			continue;
		}

		// Skip type definition files
		if (file.endsWith('.d.ts')) {
			continue;
		}

		// Skip config files (exports are consumed by CLI via index.ts re-exports)
		if (file.includes('/config.ts') || file.includes('/config.js')) {
			continue;
		}

		// Skip reporter files (exports are consumed by CLI via index.ts re-exports)
		if (file.includes('/reporters/')) {
			continue;
		}

		// Check if any module imports from this file
		const baseFile = file.replace(/\.(ts|tsx|js|jsx|svelte)$/, '');
		const possibleImportPaths = [baseFile, './' + baseFile, file, './' + file];

		let importedNames = new Set<string>();
		for (const importPath of possibleImportPaths) {
			if (imports.has(importPath)) {
				imports.get(importPath)!.forEach((n) => importedNames.add(n));
			}
		}

		// Also check for namespace imports (*)
		if (importedNames.has('*')) {
			continue; // All exports are potentially used
		}

		// Find exports that are never imported
		for (const exp of fileExports) {
			if (!importedNames.has(exp) && exp !== 'default') {
				dead.push({ file, export: exp });
			}
		}
	}

	return dead.slice(0, 20); // Limit to avoid noise
}

async function findUnusedDependencies(
	rootPath: string,
	files: string[]
): Promise<UnusedDependency[]> {
	const unused: UnusedDependency[] = [];

	// Read package.json
	const packageJsonPath = path.join(rootPath, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		return unused;
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	const dependencies = Object.keys(packageJson.dependencies || {});
	const devDependencies = Object.keys(packageJson.devDependencies || {});

	// Collect all imported modules
	const importedModules = new Set<string>();
	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			const importRegex = /(?:import|require)\s*\(?['"]([^'"./][^'"]*)['"]/g;
			let match;
			while ((match = importRegex.exec(content)) !== null) {
				// Get the package name (handle scoped packages)
				const module = match[1];
				const packageName = module.startsWith('@')
					? module.split('/').slice(0, 2).join('/')
					: module.split('/')[0];
				importedModules.add(packageName);
			}
		} catch {
			// Skip
		}
	}

	// Check dependencies
	for (const dep of dependencies) {
		if (!importedModules.has(dep)) {
			// Skip common non-imported dependencies
			if (!['typescript', 'tslib', '@types/'].some((skip) => dep.startsWith(skip))) {
				unused.push({ name: dep, type: 'dependency' });
			}
		}
	}

	// Check devDependencies (less strict - many are CLI tools)
	for (const dep of devDependencies) {
		if (!importedModules.has(dep)) {
			// Skip common dev tools
			const skipPatterns = [
				'typescript', '@types/', 'eslint', 'prettier', 'vite', 'vitest',
				'tsup', 'tsx', 'turbo', 'wrangler', '@sveltejs/', 'svelte'
			];
			if (!skipPatterns.some((skip) => dep.startsWith(skip) || dep.includes(skip))) {
				unused.push({ name: dep, type: 'devDependency' });
			}
		}
	}

	return unused.slice(0, 10); // Limit
}

async function findLargeFiles(files: string[], rootPath: string): Promise<LargeFile[]> {
	const large: LargeFile[] = [];

	for (const file of files) {
		try {
			const relativePath = path.relative(rootPath, file);

			// Skip auto-generated type definition files
			if (relativePath.endsWith('.d.ts')) {
				continue;
			}

			// Skip common generated files
			if (
				relativePath.includes('worker-configuration') ||
				relativePath.includes('.generated.') ||
				relativePath.includes('/generated/')
			) {
				continue;
			}

			const content = fs.readFileSync(file, 'utf-8');
			const lines = content.split('\n').length;

			if (lines >= LARGE_FILE_THRESHOLD) {
				large.push({
					file: relativePath,
					lines,
					suggestion: lines >= VERY_LARGE_FILE_THRESHOLD
						? 'Consider splitting into multiple modules'
						: 'Monitor for growth, consider refactoring'
				});
			}
		} catch {
			// Skip
		}
	}

	return large.sort((a, b) => b.lines - a.lines).slice(0, 10);
}

async function findEmptyFiles(files: string[], rootPath: string): Promise<string[]> {
	const empty: string[] = [];

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf-8');
			// Remove comments and whitespace
			const stripped = content
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/\/\/.*/g, '')
				.replace(/\s+/g, '');

			if (stripped.length === 0) {
				empty.push(path.relative(rootPath, file));
			}
		} catch {
			// Skip
		}
	}

	return empty;
}
