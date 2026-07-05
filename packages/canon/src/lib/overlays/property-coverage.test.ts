import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	assertCanonPropertyOverlayCoverage,
	buildCanonPropertyOverlayCoverageReport
} from '../../../scripts/check-property-overlay-coverage.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('Canon property overlay coverage', () => {
	it('requires overlays for every rendered direct Canon consumer', async () => {
		const report = await buildCanonPropertyOverlayCoverageReport(repoRoot);

		assertCanonPropertyOverlayCoverage(report);
		expect(report.summary).toMatchObject({
			required: 13,
			covered: 13,
			missingOverlay: 0,
			mismatchedSourcePackage: 0,
			missingModalities: 0
		});
		expect(report.requiredPackages.map((entry) => entry.packageName)).toEqual([
			'@create-something/agency',
			'@create-something/clearway',
			'@create-something/concierge-chat',
			'@create-something/io',
			'@create-something/lms',
			'@create-something/ltd',
			'@create-something/maverick',
			'@create-something/notion-agent',
			'@create-something/space',
			'@create-something/spritz',
			'@create-something/tend',
			'@create-something/webflow-apps-audit-dashboard',
			'@create-something/webflow-dashboard'
		]);
	});
});
