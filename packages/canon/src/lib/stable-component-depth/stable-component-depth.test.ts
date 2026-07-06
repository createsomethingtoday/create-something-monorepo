import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	assertCanonStableComponentDepthReport,
	buildCanonStableComponentDepthReport,
	renderCanonStableComponentDepthReport,
	type CanonStableComponentDepthDimension
} from './index.js';

const REPO_ROOT = join(process.cwd(), '..', '..');
const DIMENSIONS: CanonStableComponentDepthDimension[] = [
	'docs',
	'examples',
	'prop-contract',
	'accessibility-evidence',
	'visual-regression',
	'modality-behavior',
	'property-usage'
];

describe('Canon stable component depth', () => {
	it('builds a per-stable-component evidence report for every required depth dimension', () => {
		const report = buildCanonStableComponentDepthReport(REPO_ROOT);

		expect(report.sourceOfTruth).toBe('@create-something/canon/stable-component-depth');
		expect(report.summary.stableComponents).toBe(120);
		expect(report.components).toHaveLength(report.summary.stableComponents);
		expect(report.summary.totalDimensionChecks).toBe(
			report.summary.stableComponents * DIMENSIONS.length
		);
		expect(report.dimensions.map((entry) => entry.dimension)).toEqual(DIMENSIONS);

		for (const component of report.components) {
			expect(Object.keys(component.dimensions).sort()).toEqual([...DIMENSIONS].sort());
			for (const dimension of DIMENSIONS) {
				expect(component.dimensions[dimension].requiredEvidence).toBeTruthy();
			}
		}
	});

	it('keeps depth gaps visible without redefining library health as complete', () => {
		const report = buildCanonStableComponentDepthReport(REPO_ROOT);

		if (report.gaps.length > 0) {
			expect(report.status).toBe('needs-evidence');
			expect(report.dimensions.some((entry) => entry.gaps > 0)).toBe(true);
			expect(() => assertCanonStableComponentDepthReport(report)).toThrow(
				/stable components need equal-depth evidence/
			);
		} else {
			expect(report.status).toBe('ready');
			expect(() => assertCanonStableComponentDepthReport(report)).not.toThrow();
		}
	});

	it('records strong component evidence where it exists', () => {
		const report = buildCanonStableComponentDepthReport(REPO_ROOT);
		const button = report.components.find((component) => component.id === 'component.button');
		const clearStateRows = report.components.find(
			(component) => component.id === 'component.clear-state-rows'
		);

		expect(button).toBeDefined();
		expect(button?.dimensions.docs.status).toBe('covered');
		expect(button?.dimensions['prop-contract'].status).toBe('covered');
		expect(button?.dimensions['accessibility-evidence'].status).toBe('covered');

		expect(clearStateRows).toBeDefined();
		expect(clearStateRows?.dimensions['modality-behavior'].status).toBe('covered');
		expect(clearStateRows?.modalities).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
	});

	it('renders a concise depth inventory for agent handoff', () => {
		const report = buildCanonStableComponentDepthReport(REPO_ROOT);
		const rendered = renderCanonStableComponentDepthReport(report, { gapLimit: 5 });

		expect(rendered).toContain('# Canon Stable Component Depth');
		expect(rendered).toContain(`Status: ${report.status}`);
		expect(rendered).toContain('## Dimensions');
		expect(rendered).toContain('visual-regression');
		if (report.gaps.length > 0) {
			expect(rendered).toContain('## Priority Gaps');
			expect(rendered).toContain('Use `--fail-on-gaps` only after the inventory has been burned down.');
		} else {
			expect(rendered).toContain('Keep stable component promotion tied to this depth report.');
		}
	});
});
