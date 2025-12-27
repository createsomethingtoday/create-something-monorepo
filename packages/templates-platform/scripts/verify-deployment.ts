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

		// 3. Verify each CSS file
		for (const cssPath of cssFiles) {
			try {
				const response = await fetchWithTimeout(`${baseUrl}${cssPath}`);
				if (response.status === 200) {
					result.checks.css.loaded++;
				} else {
					result.checks.css.failed.push(`${cssPath} (${response.status})`);
					result.status = 'fail';
				}
			} catch (error) {
				result.checks.css.failed.push(`${cssPath} (network error)`);
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
	output += `  ${result.duration}ms`;

	if (result.checks.css.failed.length > 0) {
		output += `\n  ${color}Failed CSS:${reset} ${result.checks.css.failed.join(', ')}`;
	}
	if (result.checks.js.failed.length > 0) {
		output += `\n  ${color}Failed JS:${reset} ${result.checks.js.failed.join(', ')}`;
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
