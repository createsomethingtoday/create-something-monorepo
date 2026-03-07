const WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/crawlWebsite';

const cases = [
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

function summarize(data) {
	const pageResults = Array.isArray(data?.pageResults) ? data.pageResults : [];
	const requestFailureCount = pageResults.filter((page) => page.success === false).length;

	return {
		success: data?.success,
		passed: data?.passed,
		pageCount: data?.siteResults?.pageCount,
		analyzedCount: data?.siteResults?.analyzedCount,
		passedCount: data?.siteResults?.passedCount,
		failedCount: data?.siteResults?.failedCount,
		requestFailureCount,
		firstFailure:
			pageResults.find((page) => page.success === false)?.error ||
			pageResults.find((page) => page.passed === false)?.details?.flaggedCode?.[0]?.message ||
			null
	};
}

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
