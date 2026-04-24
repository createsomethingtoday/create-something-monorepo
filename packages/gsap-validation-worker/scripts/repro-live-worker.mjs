const WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';

const defaultCases = [
	{ name: 'good', url: 'https://boono.webflow.io/', maxDepth: 1, maxPages: 10 },
	{
		name: 'broken',
		url: 'https://webflow-way-validator-test-template.webflow.io/',
		maxDepth: 1,
		maxPages: 5
	},
	{ name: 'stress', url: 'https://brightedge-pro.webflow.io/', maxDepth: 2, maxPages: 50 },
	{ name: 'reported', url: 'https://climeta.webflow.io/', maxDepth: 1, maxPages: 10 }
];

function parseCliArgs(argv) {
	const args = { url: undefined, maxDepth: 2, maxPages: 50 };

	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === '--url') {
			args.url = argv[index + 1];
			index += 1;
			continue;
		}
		if (value === '--max-depth') {
			args.maxDepth = Number(argv[index + 1] || args.maxDepth);
			index += 1;
			continue;
		}
		if (value === '--max-pages') {
			args.maxPages = Number(argv[index + 1] || args.maxPages);
			index += 1;
		}
	}

	return args;
}

function summarize(data) {
	const pageResults = Array.isArray(data?.pageResults) ? data.pageResults : [];
	const firstRequestFailure = pageResults.find((page) => page.success === false);
	const firstValidationFailure = pageResults.find((page) => page.passed === false);
	const requestFailureCount = pageResults.filter((page) => page.success === false).length;

	return {
		success: data?.success,
		passed: data?.passed,
		pageCount: data?.siteResults?.pageCount,
		analyzedCount: data?.siteResults?.analyzedCount,
		passedCount: data?.siteResults?.passedCount,
		failedCount: data?.siteResults?.failedCount,
		requestFailureCount,
		firstFailedUrl: firstRequestFailure?.url || firstValidationFailure?.url || null,
		firstFailedReferrers: firstRequestFailure?.referrers || [],
		firstFailure:
			firstRequestFailure?.error ||
			firstValidationFailure?.details?.flaggedCode?.[0]?.message ||
			null
	};
}

const cliArgs = parseCliArgs(process.argv.slice(2));
const cases = cliArgs.url
	? [
			{
				name: 'custom',
				url: cliArgs.url,
				maxDepth: cliArgs.maxDepth,
				maxPages: cliArgs.maxPages
			}
		]
	: defaultCases;

for (const testCase of cases) {
	const response = await fetch(WORKER_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			url: testCase.url,
			maxDepth: testCase.maxDepth,
			maxPages: testCase.maxPages
		})
	});

	const data = await response.json();
	console.log(`\n[${testCase.name}] ${testCase.url}`);
	console.log(JSON.stringify({ status: response.status, summary: summarize(data) }, null, 2));
}
