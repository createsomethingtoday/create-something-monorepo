import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	assertCanonOverlayQualityGate,
	buildCanonOverlayQualityGateReport,
	inspectOverlayManifestDependencyIssues,
	renderCanonOverlayQualityGateReport
} from '../../../scripts/check-overlay-quality-gate.js';
import { createCanonOverlayIntakeInventory } from './intake.js';

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
			manifestDependencyIssues: 0,
			candidateIntakes: 24,
			projectLocalIntakes: 0
		});
		expect(report.manifestDependencyIssues).toEqual([]);

		const rendered = renderCanonOverlayQualityGateReport(report);
		expect(rendered).toContain('# Canon Overlay Quality Gate');
		expect(rendered).toContain('Required property surfaces: 24');
		expect(rendered).toContain('Ready overlays: 24');
		expect(rendered).toContain('Manifest dependency issues: 0');
		expect(rendered).not.toContain('# Canon Property Overlay Coverage');

		const verbose = renderCanonOverlayQualityGateReport(report, { verbose: true });
		expect(verbose).toContain('# Canon Property Overlay Coverage');
		expect(verbose).toContain('# Canon Overlay Intake Inventory');
	});

	it('rejects overlay manifests that depend on Canon package module resolution', async () => {
		const root = await mkdtemp(join(tmpdir(), 'canon-overlay-quality-gate-'));
		const manifestPath = 'packages/client/canon-overlay/manifest.ts';
		await mkdir(join(root, 'packages/client/canon-overlay'), { recursive: true });
		await writeFile(
			join(root, manifestPath),
			[
				"import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';",
				'',
				'export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = {};',
				''
			].join('\n'),
			'utf-8'
		);

		const inventory = createCanonOverlayIntakeInventory({
			rootDir: root,
			searchRoots: ['packages'],
			entries: [
				{
					manifestPath,
					manifest: {
						id: 'overlay.fixture',
						name: 'Fixture Overlay',
						owner: 'canon-team',
						sourcePackage: '@create-something/fixture',
						sourcePath: 'manifest.ts',
						targetModalities: ['web'],
						tags: ['fixture'],
						artifacts: [],
						extensionIntakes: []
					},
					review: {
						status: 'ready',
						requiredArtifacts: [],
						presentArtifacts: [],
						missingArtifacts: [],
						integrityIssues: [],
						extensionDecisions: [],
						stopConditions: [],
						summary: 'fixture'
					}
				}
			]
		});

		try {
			const issues = inspectOverlayManifestDependencyIssues(root, inventory);

			expect(issues.map((issue) => issue.syntax)).toEqual(['import', 'typed-manifest-export']);
			expect(issues.map((issue) => issue.message).join('\n')).toContain(
				'export a plain CANON_PROJECT_OVERLAY_MANIFEST object'
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
