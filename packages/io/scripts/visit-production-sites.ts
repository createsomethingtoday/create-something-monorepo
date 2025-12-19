/**
 * Production Site Visitor Script
 *
 * Visits each CREATE SOMETHING property and generates analytics events
 * by simulating user interactions (page views, navigation, scrolls).
 *
 * This creates real traffic to verify the analytics pipeline end-to-end.
 *
 * Run: npx tsx packages/io/scripts/visit-production-sites.ts
 */

interface SiteConfig {
	name: string;
	domain: string;
	property: 'io' | 'space' | 'ltd' | 'agency';
	pages: string[];
}

interface VisitResult {
	site: string;
	page: string;
	status: number;
	eventsPosted: boolean;
	error?: string;
}

// Site configurations with key pages to visit
const SITES: SiteConfig[] = [
	{
		name: 'CREATE SOMETHING IO',
		domain: 'https://createsomething.io',
		property: 'io',
		pages: [
			'/',
			'/papers',
			'/experiments',
			'/methodology',
			'/about',
			'/papers/subtractive-form-design',
			'/experiments/text-revelation',
		],
	},
	{
		name: 'CREATE SOMETHING SPACE',
		domain: 'https://createsomething.space',
		property: 'space',
		pages: [
			'/',
			'/experiments',
			'/methodology',
			'/about',
			'/praxis',
			'/experiments/code-mode',
		],
	},
	{
		name: 'CREATE SOMETHING LTD',
		domain: 'https://createsomething.ltd',
		property: 'ltd',
		pages: [
			'/',
			'/ethos',
			'/principles',
			'/patterns',
			'/masters',
			'/voice',
			'/patterns/hermeneutic-spiral',
		],
	},
	{
		name: 'CREATE SOMETHING AGENCY',
		domain: 'https://createsomething.agency',
		property: 'agency',
		pages: [
			'/',
			'/services',
			'/work',
			'/methodology',
			'/about',
			'/contact',
		],
	},
];

// Generate session ID (matching client pattern)
function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `s_${timestamp}_${random}`;
}

// Generate event ID (matching client pattern)
function generateEventId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `e_${timestamp}_${random}`;
}

// Create analytics event payload
function createPageViewEvent(
	sessionId: string,
	property: string,
	url: string
): object {
	return {
		eventId: generateEventId(),
		sessionId,
		property,
		timestamp: new Date().toISOString(),
		url,
		category: 'navigation',
		action: 'page_view',
		metadata: {
			source: 'verification-script',
		},
	};
}

// Create scroll depth event
function createScrollEvent(
	sessionId: string,
	property: string,
	url: string,
	depth: number
): object {
	return {
		eventId: generateEventId(),
		sessionId,
		property,
		timestamp: new Date().toISOString(),
		url,
		category: 'content',
		action: 'scroll_depth',
		value: depth,
	};
}

// Create interaction event
function createInteractionEvent(
	sessionId: string,
	property: string,
	url: string,
	target: string
): object {
	return {
		eventId: generateEventId(),
		sessionId,
		property,
		timestamp: new Date().toISOString(),
		url,
		category: 'interaction',
		action: 'button_click',
		target,
		metadata: {
			buttonType: 'nav',
		},
	};
}

// Visit a single page
async function visitPage(
	site: SiteConfig,
	page: string,
	sessionId: string
): Promise<VisitResult> {
	const url = `${site.domain}${page}`;
	const result: VisitResult = {
		site: site.name,
		page,
		status: 0,
		eventsPosted: false,
	};

	try {
		// Visit the page
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent':
					'CREATE-SOMETHING-Verification-Bot/1.0 (Analytics Verification)',
				Accept: 'text/html,application/xhtml+xml',
			},
		});

		result.status = response.status;

		// Only post analytics if the page loaded successfully
		if (response.ok) {
			// Create batch of events simulating user behavior
			const events = [
				createPageViewEvent(sessionId, site.property, url),
				createScrollEvent(sessionId, site.property, url, 25),
				createScrollEvent(sessionId, site.property, url, 50),
			];

			// Add navigation interaction for non-home pages
			if (page !== '/') {
				events.push(
					createInteractionEvent(sessionId, site.property, url, 'navigation')
				);
			}

			// Post events to the analytics endpoint
			const eventsEndpoint = `${site.domain}/api/analytics/events`;
			const eventsResponse = await fetch(eventsEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent':
						'CREATE-SOMETHING-Verification-Bot/1.0 (Analytics Verification)',
				},
				body: JSON.stringify({
					events,
					sentAt: new Date().toISOString(),
				}),
			});

			result.eventsPosted = eventsResponse.ok;

			if (!eventsResponse.ok) {
				result.error = `Events endpoint returned ${eventsResponse.status}`;
			}
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	}

	return result;
}

// Visit all pages on a site
async function visitSite(site: SiteConfig): Promise<VisitResult[]> {
	const sessionId = generateSessionId();
	const results: VisitResult[] = [];

	console.log(`\n${'─'.repeat(60)}`);
	console.log(`Visiting ${site.name} (${site.domain})`);
	console.log(`Session: ${sessionId}`);
	console.log(`${'─'.repeat(60)}`);

	for (const page of site.pages) {
		const result = await visitPage(site, page, sessionId);
		results.push(result);

		// Log result
		const statusIcon = result.status === 200 ? '✓' : '✗';
		const eventsIcon = result.eventsPosted ? '📊' : '❌';
		console.log(
			`  ${statusIcon} ${page.padEnd(40)} [${result.status}] ${eventsIcon}`
		);
		if (result.error) {
			console.log(`    └─ Error: ${result.error}`);
		}

		// Small delay between requests to be polite
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return results;
}

// Main execution
async function main() {
	console.log('═'.repeat(60));
	console.log('  CREATE SOMETHING Production Site Visitor');
	console.log('  Recording analytics events across all properties');
	console.log('═'.repeat(60));

	const allResults: VisitResult[] = [];
	const startTime = Date.now();

	for (const site of SITES) {
		const siteResults = await visitSite(site);
		allResults.push(...siteResults);
	}

	// Summary
	const duration = ((Date.now() - startTime) / 1000).toFixed(1);
	const successful = allResults.filter((r) => r.status === 200).length;
	const eventsRecorded = allResults.filter((r) => r.eventsPosted).length;
	const failed = allResults.filter((r) => r.status !== 200).length;

	console.log(`\n${'═'.repeat(60)}`);
	console.log('  SUMMARY');
	console.log('═'.repeat(60));
	console.log(`  Duration:          ${duration}s`);
	console.log(`  Pages visited:     ${allResults.length}`);
	console.log(`  Successful (200):  ${successful}`);
	console.log(`  Events recorded:   ${eventsRecorded}`);
	console.log(`  Failed:            ${failed}`);
	console.log('═'.repeat(60));

	// Per-site summary
	console.log('\n  Per-Site Breakdown:');
	for (const site of SITES) {
		const siteResults = allResults.filter((r) => r.site === site.name);
		const sitePassed = siteResults.filter((r) => r.status === 200).length;
		const siteEvents = siteResults.filter((r) => r.eventsPosted).length;
		console.log(
			`    ${site.property.toUpperCase().padEnd(8)} ${sitePassed}/${siteResults.length} pages, ${siteEvents} events`
		);
	}

	// Exit with error if any pages failed
	if (failed > 0) {
		console.log('\n⚠️  Some pages failed to load. Check the errors above.');
		process.exit(1);
	}

	if (eventsRecorded === 0) {
		console.log('\n⚠️  No events were recorded. Analytics endpoints may be down.');
		process.exit(1);
	}

	console.log('\n✓ Production sites visited and events recorded successfully.');
	process.exit(0);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
