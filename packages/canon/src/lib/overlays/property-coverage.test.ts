import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	assertCanonPropertyOverlayCoverage,
	buildCanonPropertyOverlayCoverageReport
} from '../../../scripts/check-property-overlay-coverage.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('Canon property overlay coverage', () => {
	it('requires overlays for every downstream UI property surface', async () => {
		const report = await buildCanonPropertyOverlayCoverageReport(repoRoot);

		assertCanonPropertyOverlayCoverage(report);
		expect(report.summary).toMatchObject({
			required: 26,
			covered: 26,
			missingOverlay: 0,
			mismatchedSourcePackage: 0,
			missingModalities: 0,
			excludedPropertySurfaces: 2,
			excludedCanonConsumers: 7
		});
		expect(report.requiredPackages.map((entry) => entry.packageName)).toEqual([
			'@create-something/atlas-studio-desktop',
			'@create-something/marketplace-template-submission-cloud',
			'@create-something/webflow-dashboard-cloud',
			'@create-something/webflow-marketplace-category-cloud',
			'@create-something/agency',
			'@create-something/jandjhomehealth',
			'@create-something/outerfields',
			'@create-something/the-stack',
			'app-governance-dashboard',
			'app-governance-desktop',
			'@create-something/clearway',
			'@create-something/concierge-chat',
			'@create-something/io',
			'@create-something/lms',
			'@create-something/ltd',
			'@create-something/maverick',
			'@create-something/maverick-admin',
			'@create-something/notion-agent',
			'@create-something/ona-agents',
			'@create-something/relay',
			'@create-something/space',
			'@create-something/spritz',
			'@create-something/tend',
			'@create-something/webflow-apps-audit-dashboard',
			'@create-something/webflow-dashboard',
			'@create-something/webflow-template-validation'
		]);
		expect(report.excludedPropertySurfaces.map((entry) => entry.packageName)).toEqual([
			'@create-something/canon',
			'@create-something/tufte'
		]);
	});
});
