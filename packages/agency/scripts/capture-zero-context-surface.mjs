import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DEFAULT_ROUTES = ['/', '/services', '/products', '/proof/marketplace-workflow', '/book'];

function decodeHtmlEntities(value) {
	const named = {
		amp: '&',
		apos: "'",
		gt: '>',
		lt: '<',
		nbsp: ' ',
		quot: '"'
	};
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
		.replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
		.replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

export function normalizeVisibleText(html) {
	return decodeHtmlEntities(
		String(html)
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/\s+/g, ' ')
		.trim();
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

export async function captureZeroContextSurface({
	baseUrl = 'https://createsomething.agency',
	routes = DEFAULT_ROUTES,
	fetchImpl = fetch,
	capturedAt = new Date().toISOString()
} = {}) {
	const base = new URL(baseUrl);
	const captures = [];
	for (const route of routes) {
		if (typeof route !== 'string' || !route.startsWith('/')) {
			throw new Error(`route must start with /: ${route}`);
		}
		const url = new URL(route, base);
		const response = await fetchImpl(url);
		if (!response.ok) {
			throw new Error(`${route} returned ${response.status}`);
		}
		const visibleText = normalizeVisibleText(await response.text());
		if (!visibleText) throw new Error(`${route} returned no visible text`);
		const words = visibleText.split(/\s+/);
		captures.push({
			path: route,
			url: url.toString(),
			status: response.status,
			wordCount: words.length,
			textHash: sha256(visibleText),
			first300Words: words.slice(0, 300).join(' '),
			first300Hash: sha256(words.slice(0, 300).join(' '))
		});
	}

	const conditionId = `agency-zero-context-${sha256(
		captures.map((capture) => `${capture.path}:${capture.textHash}`).join('\n')
	).slice(0, 16)}`;
	return {
		protocolVersion: 'agency-zero-context-v1',
		conditionId,
		baseUrl: base.origin,
		capturedAt,
		routes: captures
	};
}

function parseArgs(argv) {
	const options = { baseUrl: 'https://createsomething.agency', routes: [] };
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === '--base') options.baseUrl = argv[index + 1];
		if (value === '--route') options.routes.push(argv[index + 1]);
	}
	if (options.routes.length === 0) options.routes = DEFAULT_ROUTES;
	return options;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const capture = await captureZeroContextSurface(options);
	process.stdout.write(`${JSON.stringify(capture, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
