import { describe, expect, it } from 'vitest';
import {
	buildAssetListFormula,
	buildAssetVersionCreateFields,
	buildAssetVersionSnapshot,
	buildCreatorEmailMatchFormula,
	cleanMarketplaceStatus,
	cleanMarketplaceType,
	mapAssetRecord,
	resolveAssetType,
	type Asset
} from './airtable';

describe('cleanMarketplaceType', () => {
	it('normalizes template-like Airtable values to Template', () => {
		expect(cleanMarketplaceType('Template🏗️')).toBe('Template');
		expect(cleanMarketplaceType('template')).toBe('Template');
	});

	it('normalizes app and library Airtable values', () => {
		expect(cleanMarketplaceType('App🧩')).toBe('App');
		expect(cleanMarketplaceType('Library📚')).toBe('Library');
	});

	it('handles Airtable-style arrays and unknown values', () => {
		expect(cleanMarketplaceType(['Library📚'])).toBe('Library');
		expect(cleanMarketplaceType(undefined)).toBe('Template');
	});
});

describe('resolveAssetType', () => {
	it('prefers the text rollup over linked record ids from Airtable', () => {
		expect(
			resolveAssetType({
				'🆎Type': ['rec8UQzOkwrwQr7bf'],
				'⚙️🆎Type (Text)': 'App🖥️'
			})
		).toBe('App');

		expect(
			resolveAssetType({
				'🆎Type': ['recU07tAbkf8OjzXO'],
				'⚙️🆎Type (Text)': 'Library📚'
			})
		).toBe('Library');
	});
});

describe('mapAssetRecord', () => {
	it('maps the rocket-prefixed published date field used by Marketplace Assets', () => {
		const asset = mapAssetRecord({
			id: 'recTemplate',
			fields: {
				Name: 'GenieNova',
				'⚙️🆎Type (Text)': 'Template🏗️',
				'🚀Marketplace Status': '3️⃣Published🚀',
				'🚀📅Published Date': '2025-06-18',
				'🚀📅Decision Date': '2025-06-18T05:52:53.967Z'
			}
		} as unknown as Parameters<typeof mapAssetRecord>[0]);

		expect(asset.status).toBe('Published');
		expect(asset.publishedDate).toBe('2025-06-18');
		expect(asset.decisionDate).toBe('2025-06-18T05:52:53.967Z');
	});
});

describe('cleanMarketplaceStatus', () => {
	it('removes emoji prefixes from statuses', () => {
		expect(cleanMarketplaceStatus('1️⃣🆕Upcoming')).toBe('Upcoming');
		expect(cleanMarketplaceStatus('3️⃣🚀Published')).toBe('Published');
	});

	it('handles Airtable-style array and object values without throwing', () => {
		expect(cleanMarketplaceStatus(['4️⃣☠️Delisted'])).toBe('Delisted');
		expect(cleanMarketplaceStatus({ name: '2️⃣📅Scheduled' })).toBe('Scheduled');
		expect(cleanMarketplaceStatus(undefined)).toBe('');
	});
});

describe('Airtable asset formulas', () => {
	it('matches creator emails across all dashboard ownership fields', () => {
		const formula = buildCreatorEmailMatchFormula('Creator@Example.com');

		expect(formula).toContain("FIND('creator@example.com'");
		expect(formula).toContain('{🎨📧 Creator Email}');
		expect(formula).toContain('{🎨📧 Creator WF Account Email}');
		expect(formula).toContain('{📧Emails (from 🎨Creator)}');
		expect(formula).not.toContain('{CREATOR_EMAIL}');
		expect(formula).not.toContain('IFERROR');
		expect(formula).toContain('LOWER(ARRAYJOIN(');
	});

	it('escapes single quotes and leaves asset type filtering to the caller', () => {
		const formula = buildAssetListFormula("o'connor@example.com");

		expect(formula).toContain("o''connor@example.com");
		expect(formula).not.toContain("{🆎Type} = 'Template🏗️'");
		expect(formula.startsWith('OR(')).toBe(true);
	});
});

describe('buildAssetVersionSnapshot', () => {
	it('preserves app review fields from the pre-change asset', () => {
		const asset: Asset = {
			id: 'recAsset',
			name: 'Workflow App',
			type: 'App',
			status: 'Published',
			descriptionShort: 'Old short',
			descriptionLongHtml: '<p>Old long</p>',
			websiteUrl: 'https://example.com',
			thumbnailUrl: 'https://example.com/icon.png',
			carouselImages: ['https://example.com/screenshot.png'],
			appCapabilities: 'Hybrid',
			appInstallUrl: 'https://example.com/install',
			appScopes: ['sites', 'cms'],
			appAvatarAltText: 'Workflow icon',
			paymentType: ['Paid'],
			visibility: 'Private',
			appCategory: ['Automation'],
			creatorName: 'Example Creator',
			creatorWebsite: 'creator@example.com',
			creatorContactEmail: 'support@example.com',
			appFeaturesOverview: ['Sync content'],
			appDeveloperNotes: 'Use test workspace',
			appAccessCredentials: 'N/A',
			appVideoUrl: 'https://example.com/promo',
			appDemoVideoUrl: 'https://example.com/demo',
			appPrivacyPolicyUrl: 'https://example.com/privacy',
			appSupportEmail: 'support@example.com',
			appSupportUrl: 'https://example.com/support',
			appTermsUrl: 'https://example.com/terms',
			appScreenshotAltTexts: ['Workflow screenshot']
		};

		expect(buildAssetVersionSnapshot(asset)).toMatchObject({
			name: 'Workflow App',
			descriptionShort: 'Old short',
			descriptionLongHtml: '<p>Old long</p>',
			appCapabilities: 'Hybrid',
			appScopes: ['sites', 'cms'],
			creatorWebsite: 'creator@example.com',
			appScreenshotAltTexts: ['Workflow screenshot']
		});
	});
});

describe('buildAssetVersionCreateFields', () => {
	const snapshot = {
		name: 'Workflow App',
		descriptionShort: 'Old short',
		descriptionLongHtml: '<p>Old long</p>',
		appCapabilities: 'Hybrid',
		appScopes: ['sites', 'cms']
	};

	it('stores structured changes in v1-compatible format and persists the snapshot field', () => {
		const fields = buildAssetVersionCreateFields(
			'recAsset',
			3,
			{ fldShortDescription: { from: 'Old short', to: 'New short' } },
			snapshot,
			'creator@example.com'
		);

		expect(fields).toMatchObject({
			fldemWilqCQcOCh5s: ['recAsset'],
			fldn2ImbgwKfCdWWA: 3,
			fldjYFJMGTerFYlol: 'Meta Update',
			fldLEIZMEjZvH5n23: ['zendesk'],
			Snapshot: JSON.stringify(snapshot)
		});
		expect(JSON.parse(fields.fldc999gbJ8LWWoTC as string)).toEqual({
			fldShortDescription: { from: 'Old short', to: 'New short' }
		});
	});

	it('keeps the legacy wrapper for string changes', () => {
		const fields = buildAssetVersionCreateFields(
			'recAsset',
			1,
			'Manual version capture',
			snapshot,
			'creator@example.com'
		);

		expect(JSON.parse(fields.fldc999gbJ8LWWoTC as string)).toEqual({
			changes: 'Manual version capture',
			snapshot,
			createdBy: 'creator@example.com'
		});
		expect(fields.Snapshot).toBe(JSON.stringify(snapshot));
	});
});
