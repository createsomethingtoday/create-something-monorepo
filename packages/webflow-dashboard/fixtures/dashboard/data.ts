/**
 * LOCAL FIXTURE ONLY. A fictional creator portfolio for the dashboard fixture.
 * Every name, number and date here is invented; nothing is read from Airtable.
 */
import type { Asset, AssetVersion, Creator } from '../../src/lib/server/airtable';

export const FIXTURE_EMAIL = 'creator@example.com';

export const FIXTURE_CREATOR: Creator = {
	id: 'recFixtureCreator1',
	name: 'Northbeam Studio',
	email: FIXTURE_EMAIL,
	emails: [FIXTURE_EMAIL],
	biography: 'Northbeam Studio builds editorial Webflow templates for studios and small teams.',
	legalName: 'Northbeam Studio LLC',
	websiteUrl: 'https://example.com'
};

const thumb = (n: number) => `/fixture-thumbs/${n}.svg`;

const template = (
	n: number,
	name: string,
	status: Asset['status'],
	category: string,
	subcategory: string,
	extra: Partial<Asset> = {}
): Asset => ({
	id: `recFixtureAsset${String(n).padStart(3, '0')}`,
	name,
	type: 'Template',
	status,
	category,
	subcategory,
	thumbnailUrl: thumb(n),
	secondaryThumbnailUrl: thumb(n + 40),
	secondaryThumbnails: [thumb(n + 40)],
	carouselImages: [thumb(n + 20), thumb(n + 21), thumb(n + 22)],
	descriptionShort: `${name} is a responsive Webflow template for ${subcategory.toLowerCase()} sites.`,
	descriptionLongHtml: `<p>${name} gives ${subcategory.toLowerCase()} teams a complete site: a home page, case studies, pricing and a CMS-backed journal.</p><p>Every section uses variables, so you can change the color and type scale in one place.</p>`,
	websiteUrl: `https://${name.toLowerCase().replace(/\s+/g, '-')}.webflow.io`,
	previewUrl: `https://preview.webflow.com/preview/${name.toLowerCase().replace(/\s+/g, '-')}`,
	marketplaceUrl: `https://webflow.com/templates/html/${name.toLowerCase().replace(/\s+/g, '-')}-website-template`,
	priceString: '$79 USD',
	priceAmount: 79,
	creatorName: FIXTURE_CREATOR.name,
	...extra
});

export const FIXTURE_ASSETS: Asset[] = [
	template(1, 'Halden', 'Published', 'Portfolio & Agency', 'Agency', {
		submittedDate: '2026-02-11',
		publishedDate: '2026-02-24',
		uniqueViewers: 18420,
		cumulativePurchases: 412,
		cumulativeRevenue: 32548,
		fulfillmentLinkSales: 18,
		latestReviewStatus: 'Approved',
		latestReviewDate: '2026-02-20',
		qualityScore: 'Exceptional'
	}),
	template(2, 'Meridian', 'Published', 'Technology', 'SaaS', {
		submittedDate: '2026-03-03',
		publishedDate: '2026-03-17',
		uniqueViewers: 12903,
		cumulativePurchases: 287,
		cumulativeRevenue: 28413,
		priceString: '$99 USD',
		priceAmount: 99,
		latestReviewStatus: 'Approved',
		qualityScore: 'Good'
	}),
	template(3, 'Fernhill', 'Published', 'Food & Drink', 'Restaurant', {
		submittedDate: '2026-04-09',
		publishedDate: '2026-04-21',
		uniqueViewers: 7421,
		cumulativePurchases: 164,
		cumulativeRevenue: 9676,
		priceString: '$59 USD',
		priceAmount: 59,
		latestReviewStatus: 'Approved',
		qualityScore: 'Good'
	}),
	template(4, 'Atelier Row', 'Published', 'Design', 'Portfolio', {
		submittedDate: '2026-05-14',
		publishedDate: '2026-05-27',
		uniqueViewers: 9318,
		cumulativePurchases: 203,
		cumulativeRevenue: 16037,
		fulfillmentLinkSales: 6,
		latestReviewStatus: 'Approved',
		qualityScore: 'Exceptional'
	}),
	template(5, 'Lumen Clinic', 'Published', 'Medical', 'Health & Wellness', {
		submittedDate: '2026-06-02',
		publishedDate: '2026-06-16',
		uniqueViewers: 5266,
		cumulativePurchases: 96,
		cumulativeRevenue: 7584,
		latestReviewStatus: 'Approved',
		qualityScore: 'Satisfactory'
	}),
	template(6, 'Coastline', 'Published', 'Real Estate', 'Property', {
		submittedDate: '2026-07-08',
		publishedDate: '2026-07-20',
		uniqueViewers: 4102,
		cumulativePurchases: 71,
		cumulativeRevenue: 5609,
		latestReviewStatus: 'Approved',
		qualityScore: 'Good'
	}),
	template(7, 'Paperweight', 'Published', 'Blog', 'Editorial', {
		submittedDate: '2026-08-19',
		publishedDate: '2026-09-01',
		uniqueViewers: 3380,
		cumulativePurchases: 0,
		cumulativeRevenue: 0,
		priceString: 'Free',
		priceAmount: 0,
		latestReviewStatus: 'Approved',
		qualityScore: 'Good'
	}),
	template(8, 'Orbit Launch', 'Published', 'Technology', 'Startup', {
		submittedDate: '2026-09-23',
		publishedDate: '2026-10-06',
		uniqueViewers: 2954,
		cumulativePurchases: 38,
		cumulativeRevenue: 3762,
		priceString: '$99 USD',
		priceAmount: 99,
		searchVisibility: 'Detail only',
		latestReviewStatus: 'Approved',
		qualityScore: 'Good'
	}),
	// Enough published templates (more than 10) to exercise the "Show more" row.
	...[
		['Brightwork', 'Design', 'Studio', '2026-01-20', 2210, 44, 3476],
		['Cinder', 'Technology', 'Developer tools', '2026-01-06', 1984, 31, 3069],
		['Driftwood', 'Travel', 'Outdoors', '2025-12-09', 1502, 27, 2133],
		['Evergreen', 'Non-profit', 'Environment', '2025-11-18', 1120, 19, 1501],
		['Foundry', 'Portfolio & Agency', 'Agency with a deliberately long subcategory name', '2025-10-28', 964, 12, 948]
	].map(([name, category, subcategory, submitted, viewers, purchases, revenue], index) =>
		template(30 + index, name as string, 'Published', category as string, subcategory as string, {
			submittedDate: submitted as string,
			publishedDate: submitted as string,
			uniqueViewers: viewers as number,
			cumulativePurchases: purchases as number,
			cumulativeRevenue: revenue as number,
			latestReviewStatus: 'Approved'
		})
	),
	template(9, 'Quarry', 'Scheduled', 'Architecture', 'Studio', {
		submittedDate: '2026-10-21',
		decisionDate: '2026-11-06',
		latestReviewStatus: 'Approved',
		latestReviewDate: '2026-11-06',
		qualityScore: 'Exceptional'
	}),
	template(10, 'Tidewater', 'Upcoming', 'Travel', 'Hospitality', {
		submittedDate: '2026-11-02',
		latestReviewStatus: 'In Review'
	}),
	template(11, 'Kindling', 'Rejected', 'Non-profit', 'Charity', {
		submittedDate: '2026-10-28',
		decisionDate: '2026-11-09',
		latestReviewStatus: 'Changes Requested',
		latestReviewDate: '2026-11-09',
		latestReviewFeedback:
			'The donation form on the Give page has no success state. Add one and resubmit. The CMS collection for Stories also needs at least three sample items.',
		rejectionFeedback:
			'The donation form on the Give page has no success state. Add one and resubmit. The CMS collection for Stories also needs at least three sample items.',
		rejectionFeedbackHtml:
			'<p>The donation form on the Give page has no success state. Add one and resubmit.</p><p>The CMS collection for Stories also needs at least three sample items.</p>'
	}),
	template(12, 'Sable', 'Draft', 'Fashion', 'Boutique', {
		submittedDate: undefined,
		thumbnailUrl: undefined
	}),
	template(13, 'Greywater', 'Delisted', 'Photography', 'Portfolio', {
		submittedDate: '2025-06-18',
		publishedDate: '2025-07-01',
		uniqueViewers: 611,
		cumulativePurchases: 54,
		cumulativeRevenue: 2646,
		priceString: '$49 USD',
		priceAmount: 49,
		latestReviewStatus: 'Approved'
	}),
	{
		id: 'recFixtureAsset014',
		name: 'Northbeam Sections',
		type: 'Library',
		status: 'Published',
		category: 'Layouts',
		subcategory: 'Marketing sections',
		thumbnailUrl: thumb(14),
		descriptionShort: 'Forty marketing sections built on one variable system.',
		submittedDate: '2026-05-05',
		publishedDate: '2026-05-19',
		cumulativePurchases: 129,
		cumulativeRevenue: 0,
		priceString: 'Free',
		priceAmount: 0,
		latestReviewStatus: 'Approved',
		creatorName: FIXTURE_CREATOR.name
	},
	{
		id: 'recFixtureAsset015',
		name: 'Gridline',
		type: 'App',
		status: 'Published',
		category: 'Design',
		subcategory: 'Layout tools',
		thumbnailUrl: thumb(15),
		descriptionShort: 'Overlay a baseline grid and spacing guides in the Designer.',
		submittedDate: '2026-08-04',
		publishedDate: '2026-08-18',
		cumulativePurchases: 842,
		cumulativeRevenue: 0,
		latestReviewStatus: 'Approved',
		appInstallUrl: 'https://example.com/install',
		appScopes: ['sites:read', 'pages:read'],
		appCategory: ['Design'],
		paymentType: ['Free'],
		creatorName: FIXTURE_CREATOR.name
	}
];

export const FIXTURE_VERSIONS: AssetVersion[] = [
	{
		id: 'recFixtureVersion3',
		assetId: 'recFixtureAsset001',
		versionNumber: 3,
		createdAt: '2026-10-30T15:12:00.000Z',
		createdBy: FIXTURE_EMAIL,
		changes: 'Updated the short description and carousel images.',
		snapshot: null
	},
	{
		id: 'recFixtureVersion2',
		assetId: 'recFixtureAsset001',
		versionNumber: 2,
		createdAt: '2026-06-12T09:40:00.000Z',
		createdBy: FIXTURE_EMAIL,
		changes: 'Added a pricing page and two CMS templates.',
		snapshot: null
	},
	{
		id: 'recFixtureVersion1',
		assetId: 'recFixtureAsset001',
		versionNumber: 1,
		createdAt: '2026-02-24T18:05:00.000Z',
		createdBy: FIXTURE_EMAIL,
		changes: 'First published version.',
		snapshot: null
	}
];

export const FIXTURE_SUBMISSION_STATUS = {
	assetsSubmitted30: 3,
	hasError: false,
	userExists: true,
	publishedTemplates: 8,
	submittedTemplates: 11,
	isWhitelisted: false
};

const PALETTES: Array<[string, string, string, string]> = [
	['#0f172a', '#f8fafc', '#38bdf8', '#1e293b'],
	['#fbf7f0', '#1c1917', '#ea580c', '#e7e0d2'],
	['#052e2b', '#ecfdf5', '#34d399', '#0b423d'],
	['#ffffff', '#111827', '#146ef5', '#eef2f7'],
	['#1b1033', '#f5f3ff', '#fb7185', '#2a1a4d'],
	['#f1f5f1', '#14261a', '#16a34a', '#dfe8df'],
	['#fff7ed', '#3b1d0a', '#f59e0b', '#fde6c8'],
	['#0b1220', '#e2e8f0', '#f472b6', '#16203a']
];

/** A small drawn "site screenshot" so list rows and galleries have real imagery. */
export function fixtureThumbnailSvg(n: number): string {
	const [bg, fg, accent, panel] = PALETTES[n % PALETTES.length];
	const variant = n % 4;
	const hero =
		variant === 0
			? `<rect x="40" y="150" width="330" height="34" rx="6" fill="${fg}"/><rect x="40" y="198" width="250" height="34" rx="6" fill="${fg}"/><rect x="40" y="258" width="210" height="12" rx="6" fill="${fg}" opacity=".45"/><rect x="40" y="304" width="120" height="40" rx="20" fill="${accent}"/><rect x="430" y="120" width="330" height="260" rx="18" fill="${panel}"/><circle cx="595" cy="250" r="72" fill="${accent}" opacity=".85"/>`
			: variant === 1
				? `<rect x="200" y="130" width="400" height="38" rx="6" fill="${fg}"/><rect x="260" y="184" width="280" height="38" rx="6" fill="${fg}"/><rect x="290" y="246" width="220" height="12" rx="6" fill="${fg}" opacity=".45"/><rect x="340" y="286" width="120" height="40" rx="20" fill="${accent}"/><rect x="40" y="370" width="720" height="200" rx="18" fill="${panel}"/>`
				: variant === 2
					? `<rect x="40" y="110" width="720" height="250" rx="18" fill="${panel}"/><rect x="70" y="280" width="300" height="30" rx="6" fill="${fg}"/><rect x="70" y="322" width="190" height="12" rx="6" fill="${fg}" opacity=".5"/><circle cx="660" cy="200" r="60" fill="${accent}"/>`
					: `<rect x="40" y="120" width="230" height="300" rx="16" fill="${panel}"/><rect x="285" y="120" width="230" height="300" rx="16" fill="${accent}" opacity=".9"/><rect x="530" y="120" width="230" height="300" rx="16" fill="${panel}"/><rect x="40" y="450" width="280" height="28" rx="6" fill="${fg}"/>`;
	const cards = [0, 1, 2]
		.map(
			(i) =>
				`<rect x="${40 + i * 245}" y="620" width="230" height="150" rx="14" fill="${panel}"/><rect x="${60 + i * 245}" y="790" width="150" height="12" rx="6" fill="${fg}" opacity=".7"/><rect x="${60 + i * 245}" y="814" width="100" height="10" rx="5" fill="${fg}" opacity=".35"/>`
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect width="800" height="1000" fill="${bg}"/><rect x="40" y="44" width="92" height="16" rx="8" fill="${fg}"/><rect x="520" y="46" width="56" height="12" rx="6" fill="${fg}" opacity=".5"/><rect x="592" y="46" width="56" height="12" rx="6" fill="${fg}" opacity=".5"/><rect x="672" y="36" width="88" height="32" rx="16" fill="${accent}"/>${hero}${cards}<rect x="40" y="880" width="720" height="1" fill="${fg}" opacity=".15"/><rect x="40" y="920" width="180" height="12" rx="6" fill="${fg}" opacity=".35"/></svg>`;
}
