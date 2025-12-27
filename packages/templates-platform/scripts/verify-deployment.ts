#!/usr/bin/env npx tsx
/**
 * Deployment Verification Script
 *
 * Philosophy: Deployment is not complete when files are uploaded.
 * Deployment is complete when the tool recedes.
 *
 * This script confirms Zuhandenheit — that CSS/JS assets load correctly
 * and the infrastructure remains invisible to users.
 *
 * Usage:
 *   npx tsx scripts/verify-deployment.ts <subdomain>
 *   npx tsx scripts/verify-deployment.ts --all
 *
 * Examples:
 *   npx tsx scripts/verify-deployment.ts northlight-studio
 *   npx tsx scripts/verify-deployment.ts --all
 */

const DOMAIN = 'createsomething.space';

interface VerificationResult {
	subdomain: string;
	status: 'pass' | 'fail';
	checks: {
		html: { status: number; size: number } | { error: string };
		css: { found: number; loaded: number; failed: string[] };
		js: { found: number; loaded: number; failed: string[] };
		classes?: { total: number; missing: number; examples: string[] };
	};
	duration: number;
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeout);
	try {
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(id);
		return response;
	} catch (error) {
		clearTimeout(id);
		throw error;
	}
}

/**
 * Tailwind utility patterns that are prone to purging
 * Only check these patterns - ignore custom component classes
 */
const TAILWIND_PATTERNS = [
	// Spacing: p-4, m-2, gap-6, px-4, py-2, mt-4, etc.
	/^(p|m|px|py|mx|my|mt|mb|ml|mr|pt|pb|pl|pr|gap)-\d+$/,
	// Sizing: w-full, h-screen, min-h-screen, max-w-7xl
	/^(w|h|min-w|max-w|min-h|max-h)-(full|screen|auto|\d+|1\/2|1\/3|2\/3|1\/4|3\/4)$/,
	/^max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|prose)$/,
	// Flex/Grid: flex, grid, grid-cols-2, col-span-2
	/^(flex|grid|inline-flex|inline-grid)$/,
	/^(items|justify|content|self)-(start|end|center|between|around|evenly|stretch|baseline)$/,
	/^grid-cols-\d+$/,
	/^col-span-(\d+|full)$/,
	// Layout: relative, absolute, fixed, sticky
	/^(relative|absolute|fixed|sticky|static)$/,
	/^(top|right|bottom|left|inset)-(\d+|auto|0)$/,
	// Display: block, hidden, inline, etc.
	/^(block|inline|inline-block|hidden|visible|invisible)$/,
	// Text: text-sm, text-center, font-bold
	/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|left|center|right|justify)$/,
	/^font-(thin|light|normal|medium|semibold|bold|extrabold|black)$/,
	// Common utilities
	/^(overflow|z|order)-/,
	/^(rounded|border|shadow|opacity)-/,
	// Responsive prefixes
	/^(sm|md|lg|xl|2xl):/
];

/**
 * Extract Tailwind utility classes from HTML
 * Only tracks classes that match known Tailwind patterns
 */
function extractClasses(html: string): Set<string> {
	const classes = new Set<string>();

	// Match class attributes
	const classMatches = html.matchAll(/class="([^"]*)"/g);
	for (const match of classMatches) {
		const classNames = match[1].split(/\s+/).filter(Boolean);
		for (const cls of classNames) {
			// Only track classes matching Tailwind utility patterns
			if (TAILWIND_PATTERNS.some((pattern) => pattern.test(cls))) {
				classes.add(cls);
			}
		}
	}

	return classes;
}

/**
 * Check if classes exist in CSS content
 * Returns classes that appear in HTML but not in CSS
 */
function findMissingClasses(htmlClasses: Set<string>, cssContent: string): string[] {
	const missing: string[] = [];

	for (const cls of htmlClasses) {
		// Escape special regex characters in class name
		const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Check if class selector exists in CSS (with dot prefix)
		// Also check for responsive variants like md:flex -> .md\:flex
		const patterns = [
			new RegExp(`\\.${escaped}[^a-zA-Z0-9_-]`, 'i'), // .class followed by non-class char
			new RegExp(`\\.${escaped}$`, 'i') // .class at end of file
		];

		const found = patterns.some((pattern) => pattern.test(cssContent));
		if (!found) {
			missing.push(cls);
		}
	}

	return missing;
}

async function verifyDeployment(subdomain: string): Promise<VerificationResult> {
	const start = Date.now();
	const baseUrl = `https://${subdomain}.${DOMAIN}`;

	const result: VerificationResult = {
		subdomain,
		status: 'pass',
		checks: {
			html: { error: 'Not checked' },
			css: { found: 0, loaded: 0, failed: [] },
			js: { found: 0, loaded: 0, failed: [] }
		},
		duration: 0
	};

	try {
		// 1. Fetch HTML
		const htmlResponse = await fetchWithTimeout(baseUrl);
		const html = await htmlResponse.text();

		result.checks.html = {
			status: htmlResponse.status,
			size: html.length
		};

		if (htmlResponse.status !== 200) {
			result.status = 'fail';
			result.duration = Date.now() - start;
			return result;
		}

		// 2. Extract CSS and JS paths from HTML
		const cssMatches = html.match(/\/_app\/immutable\/[^"']+\.css/g) || [];
		const jsMatches = html.match(/\/_app\/immutable\/[^"']+\.js/g) || [];

		// Deduplicate
		const cssFiles = [...new Set(cssMatches)];
		const jsFiles = [...new Set(jsMatches)];

		result.checks.css.found = cssFiles.length;
		result.checks.js.found = jsFiles.length;

		// 3. Verify each CSS file and collect content for class verification
		let allCssContent = '';
		for (const cssPath of cssFiles) {
			try {
				const response = await fetchWithTimeout(`${baseUrl}${cssPath}`);
				if (response.status === 200) {
					result.checks.css.loaded++;
					allCssContent += await response.text();
				} else {
					result.checks.css.failed.push(`${cssPath} (${response.status})`);
					result.status = 'fail';
				}
			} catch (error) {
				result.checks.css.failed.push(`${cssPath} (network error)`);
				result.status = 'fail';
			}
		}

		// 3.5. Verify classes in HTML exist in CSS (detect purging issues)
		if (allCssContent) {
			const htmlClasses = extractClasses(html);
			const missingClasses = findMissingClasses(htmlClasses, allCssContent);

			result.checks.classes = {
				total: htmlClasses.size,
				missing: missingClasses.length,
				examples: missingClasses.slice(0, 5) // Show first 5 missing
			};

			// Warn but don't fail for missing classes (some may be custom component classes)
			// Only fail if > 10% of classes are missing (indicates purging problem)
			if (missingClasses.length > 0 && missingClasses.length / htmlClasses.size > 0.1) {
				result.status = 'fail';
			}
		}

		// 4. Verify each JS file
		for (const jsPath of jsFiles) {
			try {
				const response = await fetchWithTimeout(`${baseUrl}${jsPath}`);
				if (response.status === 200) {
					result.checks.js.loaded++;
				} else {
					result.checks.js.failed.push(`${jsPath} (${response.status})`);
					result.status = 'fail';
				}
			} catch (error) {
				result.checks.js.failed.push(`${jsPath} (network error)`);
				result.status = 'fail';
			}
		}
	} catch (error) {
		result.checks.html = { error: String(error) };
		result.status = 'fail';
	}

	result.duration = Date.now() - start;
	return result;
}

function formatResult(result: VerificationResult): string {
	const icon = result.status === 'pass' ? '✓' : '✗';
	const color = result.status === 'pass' ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';

	let output = `${color}${icon}${reset} ${result.subdomain}.${DOMAIN}`;

	if ('status' in result.checks.html) {
		const html = result.checks.html as { status: number; size: number };
		output += ` (${html.status}, ${(html.size / 1024).toFixed(1)}KB)`;
	}

	output += `\n  CSS: ${result.checks.css.loaded}/${result.checks.css.found}`;
	output += `  JS: ${result.checks.js.loaded}/${result.checks.js.found}`;

	if (result.checks.classes) {
		const classStatus =
			result.checks.classes.missing === 0
				? '\x1b[32m✓\x1b[0m'
				: result.checks.classes.missing / result.checks.classes.total > 0.1
					? '\x1b[31m✗\x1b[0m'
					: '\x1b[33m!\x1b[0m';
		output += `  Classes: ${classStatus} ${result.checks.classes.total - result.checks.classes.missing}/${result.checks.classes.total}`;
	}

	output += `  ${result.duration}ms`;

	if (result.checks.css.failed.length > 0) {
		output += `\n  ${color}Failed CSS:${reset} ${result.checks.css.failed.join(', ')}`;
	}
	if (result.checks.js.failed.length > 0) {
		output += `\n  ${color}Failed JS:${reset} ${result.checks.js.failed.join(', ')}`;
	}
	if (result.checks.classes && result.checks.classes.missing > 0) {
		const warnColor = result.checks.classes.missing / result.checks.classes.total > 0.1 ? '\x1b[31m' : '\x1b[33m';
		output += `\n  ${warnColor}Missing classes:${reset} ${result.checks.classes.examples.join(', ')}${result.checks.classes.missing > 5 ? ` (+${result.checks.classes.missing - 5} more)` : ''}`;
	}

	return output;
}

// Known demo subdomains
const ALL_SUBDOMAINS = [
	'demo',
	'workwayarchitects',
	'hillcrest-medical',
	'pike-place-kitchen',
	'ember-kitchen',
	'northlight-studio',
	'elena-vasquez',
	'pixel-collective',
	'morrison-law',
	'martinez-rivera'
];

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Deployment Verification - Confirm Zuhandenheit

Usage:
  npx tsx scripts/verify-deployment.ts <subdomain>
  npx tsx scripts/verify-deployment.ts --all

Examples:
  npx tsx scripts/verify-deployment.ts northlight-studio
  npx tsx scripts/verify-deployment.ts pike-place-kitchen hillcrest-medical
  npx tsx scripts/verify-deployment.ts --all

Philosophy:
  Deployment is not complete when files are uploaded.
  Deployment is complete when the tool recedes.
`);
		process.exit(0);
	}

	const subdomains = args.includes('--all') ? ALL_SUBDOMAINS : args.filter((a) => !a.startsWith('-'));

	console.log(`\nVerifying ${subdomains.length} deployment(s)...\n`);

	let passed = 0;
	let failed = 0;

	for (const subdomain of subdomains) {
		const result = await verifyDeployment(subdomain);
		console.log(formatResult(result));

		if (result.status === 'pass') {
			passed++;
		} else {
			failed++;
		}
	}

	console.log(`\n${'─'.repeat(50)}`);
	console.log(`Results: ${passed} passed, ${failed} failed`);

	if (failed > 0) {
		console.log('\n⚠ Vorhandenheit detected — infrastructure visible through breakdown');
		process.exit(1);
	} else {
		console.log('\n✓ Zuhandenheit confirmed — the tool recedes');
		process.exit(0);
	}
}

main().catch(console.error);
