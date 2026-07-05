import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	assertCanonOverlayQualityGate,
	buildCanonOverlayQualityGateReport,
	renderCanonOverlayQualityGateReport
} from '../../../scripts/check-overlay-quality-gate.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('Canon overlay quality gate', () => {
	it('keeps property coverage and overlay inventory in the same validation path', async () => {
		const report = await buildCanonOverlayQualityGateReport(repoRoot);

		expect(() => assertCanonOverlayQualityGate(report)).not.toThrow();
		expect(report.summary).toMatchObject({
			requiredPropertySurfaces: 24,
			coveredPropertySurfaces: 24,
			totalOverlays: 24,
			readyOverlays: 24,
			notReadyOverlays: 0,
			candidateIntakes: 24,
			projectLocalIntakes: 0
		});

		const rendered = renderCanonOverlayQualityGateReport(report);
		expect(rendered).toContain('# Canon Overlay Quality Gate');
		expect(rendered).toContain('Required property surfaces: 24');
		expect(rendered).toContain('Ready overlays: 24');
		expect(rendered).not.toContain('# Canon Property Overlay Coverage');

		const verbose = renderCanonOverlayQualityGateReport(report, { verbose: true });
		expect(verbose).toContain('# Canon Property Overlay Coverage');
		expect(verbose).toContain('# Canon Overlay Intake Inventory');
	});
});
