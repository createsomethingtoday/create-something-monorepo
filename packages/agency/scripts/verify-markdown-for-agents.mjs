import { pathToFileURL } from 'node:url';

export const AGENCY_MARKDOWN_FOR_AGENTS_PRIORITY_ROUTES = [
	'/',
	'/agent-readiness',
	'/workflows',
	'/map',
	'/book'
];

function positiveInteger(value) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function hasAcceptVary(value) {
	return value
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.includes('accept');
}

export function inspectMarkdownForAgentsResponse(route, response) {
	const contentType = response.headers.get('content-type') ?? '';
	const vary = response.headers.get('vary') ?? '';
	const markdownTokens = positiveInteger(response.headers.get('x-markdown-tokens'));
	const originalTokens = positiveInteger(response.headers.get('x-original-tokens'));
	const contentSignal = response.headers.get('content-signal') ?? '';
	const failures = [];

	if (!response.ok) failures.push('status must be successful');
	if (!contentType.toLowerCase().startsWith('text/markdown')) {
		failures.push('content-type must be text/markdown');
	}
	if (!hasAcceptVary(vary)) failures.push('vary must include accept');
	if (!markdownTokens) failures.push('x-markdown-tokens must be a positive integer');
	if (!originalTokens) failures.push('x-original-tokens must be a positive integer');
	if (!contentSignal.toLowerCase().includes('ai-input=yes')) {
		failures.push('content-signal must include ai-input=yes');
	}

	return {
		route,
		status: response.status,
		contentType,
		vary,
		markdownTokens,
		originalTokens,
		contentSignal,
		passed: failures.length === 0,
		failures
	};
}

export async function checkMarkdownForAgents({
	origin = 'https://createsomething.agency',
	fetchImpl = fetch,
	routes = AGENCY_MARKDOWN_FOR_AGENTS_PRIORITY_ROUTES
} = {}) {
	const normalizedOrigin = new URL(origin).toString();
	const checks = await Promise.all(
		routes.map(async (route) => {
			const response = await fetchImpl(new URL(route, normalizedOrigin), {
				headers: {
					Accept: 'text/markdown',
					'User-Agent': 'CREATE-SOMETHING-Markdown-Readiness-Check/1.0'
				}
			});
			return inspectMarkdownForAgentsResponse(route, response);
		})
	);

	return {
		checkedAt: new Date().toISOString(),
		origin: normalizedOrigin,
		capability: 'cloudflare-markdown-for-agents',
		passed: checks.every((check) => check.passed),
		routes: checks
	};
}

function parseArgs(argv) {
	const args = { origin: 'https://createsomething.agency' };
	for (let index = 0; index < argv.length; index += 1) {
		if (argv[index] === '--origin') args.origin = argv[index + 1] ?? args.origin;
	}
	return args;
}

async function main() {
	const receipt = await checkMarkdownForAgents(parseArgs(process.argv.slice(2)));
	process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
	if (!receipt.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
