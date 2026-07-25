import { describe, expect, it } from 'vitest';
import {
	airtableFormulaValue,
	buildAssetListFormula,
	buildAssetVersionCreateFields,
	buildAssetVersionSnapshot,
	buildCreatorEmailMatchFormula,
	buildCreatorRecordEmailMatchFormula,
	cleanMarketplaceStatus,
	cleanMarketplaceType,
	mapAssetRecord,
	recordMatchesCreatorEmail,
	resolveAssetType,
	validateEmail,
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

	it('does not treat lifetime purchases as qualified 30-day sales', () => {
		const asset = mapAssetRecord({
			id: 'recTemplate',
			fields: {
				Name: 'GenieNova',
				'⚙️🆎Type (Text)': 'Template🏗️',
				'🚀Marketplace Status': '3️⃣Published🚀',
				'📋 Cumulative Purchases': 12
			}
		} as unknown as Parameters<typeof mapAssetRecord>[0]);

		expect(asset.cumulativePurchases).toBe(12);
		expect(asset.qualifiedSales30d).toBeUndefined();
	});

	it('reads qualified 30-day sales from the dedicated rolling-window fields', () => {
		const asset = mapAssetRecord({
			id: 'recTemplate',
			fields: {
				Name: 'GenieNova',
				'⚙️🆎Type (Text)': 'Template🏗️',
				'🚀Marketplace Status': '3️⃣Published🚀',
				'📋 Cumulative Purchases': 12,
				'✅Qualified Sales 30d (🏗️ only)': 2
			}
		} as unknown as Parameters<typeof mapAssetRecord>[0]);

		expect(asset.qualifiedSales30d).toBe(2);
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

describe('airtableFormulaValue', () => {
	it('quotes plain values with single quotes', () => {
		expect(airtableFormulaValue('creator@example.com')).toBe("'creator@example.com'");
	});

	it('switches to double quotes for values containing an apostrophe', () => {
		expect(airtableFormulaValue("o'connor@example.com")).toBe('"o\'connor@example.com"');
	});

	it('rejects values that could break out of either quote style', () => {
		expect(() => airtableFormulaValue('a"b@example.com')).not.toThrow();
		expect(() => airtableFormulaValue('a\'b"c@example.com')).toThrow(
			/both single and double quotes/
		);
		expect(() => airtableFormulaValue('a\nb@example.com')).toThrow(/control characters/);
	});

	it('quotes a double-quoted value with single quotes so it cannot escape', () => {
		expect(airtableFormulaValue('" , TRUE(), "')).toBe("'\" , TRUE(), \"'");
	});
});

describe('validateEmail', () => {
	it('rejects addresses containing quote or escape characters', () => {
		expect(() => validateEmail('a"b@example.com')).toThrow(/Invalid email format/);
		expect(() => validateEmail('a\\b@example.com')).toThrow(/Invalid email format/);
	});

	it('still accepts apostrophes, which are legal in real addresses', () => {
		expect(validateEmail("O'Connor@Example.com")).toBe("o'connor@example.com");
	});
});

describe('Airtable asset formulas', () => {
	it('matches creator emails across all dashboard ownership fields', () => {
		const formula = buildCreatorEmailMatchFormula('Creator@Example.com');

		expect(formula).toContain("'creator@example.com'");
		expect(formula).toContain('{🎨📧 Creator Email}');
		expect(formula).toContain('{🎨📧 Creator WF Account Email}');
		expect(formula).toContain('{📧Emails (from 🎨Creator)}');
		expect(formula).not.toContain('{CREATOR_EMAIL}');
		expect(formula).not.toContain('IFERROR');
		expect(formula).toContain('LOWER(ARRAYJOIN(');
	});

	it('anchors the match to a whole address so substrings cannot match', () => {
		const formula = buildCreatorEmailMatchFormula('creator@example.com');

		// Comma-wrapped needle and haystack: ',creator@example.com,' must appear
		// as a whole token, so 'team+creator@example.com' cannot satisfy it.
		expect(formula).toContain("FIND(',' & 'creator@example.com' & ','");
		expect(formula).toContain('SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(LOWER(ARRAYJOIN(');
		expect(formula).not.toContain("FIND('creator@example.com'");
	});

	it('quotes apostrophe addresses instead of doubling them', () => {
		const formula = buildAssetListFormula("o'connor@example.com");

		expect(formula).toContain('"o\'connor@example.com"');
		expect(formula).not.toContain("o''connor@example.com");
		expect(formula).not.toContain("{🆎Type} = 'Template🏗️'");
		expect(formula.startsWith('OR(')).toBe(true);
	});

	it('builds creator-table formulas from the Creators email fields', () => {
		const formula = buildCreatorRecordEmailMatchFormula('creator@example.com');

		expect(formula).toContain('{📧Email}');
		expect(formula).toContain('{📧WF Account Email}');
		expect(formula).toContain('{📧Emails}');
		expect(formula).not.toContain('(from 🎨Creator)');
	});
});

describe('recordMatchesCreatorEmail', () => {
	const record = (fields: Record<string, unknown>) =>
		({ fields }) as unknown as Parameters<typeof recordMatchesCreatorEmail>[0];

	it('matches the owning creator on a lookup array field', () => {
		expect(
			recordMatchesCreatorEmail(
				record({ '🎨📧 Creator Email': ['Creator@Example.com'] }),
				'creator@example.com'
			)
		).toBe(true);
	});

	it('matches one address inside a comma-joined string field', () => {
		expect(
			recordMatchesCreatorEmail(
				record({ '📧Emails (from 🎨Creator)': 'other@example.com, creator@example.com' }),
				'creator@example.com'
			)
		).toBe(true);
	});

	it('rejects an email that is only a substring of the owner address', () => {
		expect(
			recordMatchesCreatorEmail(
				record({ '🎨📧 Creator Email': ['team+webflow@agency.com'] }),
				'webflow@agency.com'
			)
		).toBe(false);

		expect(
			recordMatchesCreatorEmail(record({ '🎨📧 Creator Email': ['aa@example.com'] }), 'a@example.com')
		).toBe(false);
	});

	it('still matches a display-name formatted address', () => {
		expect(
			recordMatchesCreatorEmail(
				record({ '🎨📧 Creator Email': ['Example Creator <creator@example.com>'] }),
				'creator@example.com'
			)
		).toBe(true);
	});

	it('rejects an empty email and unrelated field shapes', () => {
		expect(recordMatchesCreatorEmail(record({ '🎨📧 Creator Email': ['a@b.com'] }), '  ')).toBe(
			false
		);
		expect(recordMatchesCreatorEmail(record({ '🎨📧 Creator Email': 42 }), 'a@b.com')).toBe(false);
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
