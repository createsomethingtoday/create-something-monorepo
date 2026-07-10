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
import {
	buildCanonOverlayConsumerCompatibilityReport,
	createCanonOverlayConsumerFixtures,
	renderCanonOverlayConsumerCompatibilityReport
} from '../../../scripts/check-overlay-consumer-compatibility.js';
import { createCanonOverlayIntakeInventory } from './intake.js';
import type { CanonProjectOverlayManifest } from '../registry/schema.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('Canon overlay quality gate', () => {
	it('keeps property coverage and overlay inventory in the same validation path', async () => {
		const report = await buildCanonOverlayQualityGateReport(repoRoot);

		expect(() => assertCanonOverlayQualityGate(report)).not.toThrow();
		expect(report.summary).toMatchObject({
			requiredPropertySurfaces: 26,
			coveredPropertySurfaces: 26,
			totalOverlays: 26,
			readyOverlays: 26,
			notReadyOverlays: 0,
			manifestDependencyIssues: 0,
			candidateIntakes: 26,
			projectLocalIntakes: 0
		});
		expect(report.manifestDependencyIssues).toEqual([]);

		const rendered = renderCanonOverlayQualityGateReport(report);
		expect(rendered).toContain('# Canon Overlay Quality Gate');
		expect(rendered).toContain('Required property surfaces: 26');
		expect(rendered).toContain('Ready overlays: 26');
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

	it('generates cross-property consumer fixtures against the public Canon registry export', async () => {
		const report = await buildCanonOverlayQualityGateReport(repoRoot);
		const fixtures = createCanonOverlayConsumerFixtures(report.inventory.entries);

		expect(fixtures).toHaveLength(26);
		expect(fixtures[0]?.source).toContain(
			"import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';"
		);
		expect(fixtures[0]?.source).toContain('satisfies CanonProjectOverlayManifest');
	});

	it('maps consumer type failures back to the owning overlay manifest', async () => {
		const root = await mkdtemp(join(tmpdir(), 'canon-overlay-consumer-'));
		const packageRoot = join(root, 'packages/canon');
		await mkdir(join(packageRoot, 'dist/registry'), { recursive: true });
		await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n', 'utf-8');
		await writeFile(
			join(packageRoot, 'package.json'),
			JSON.stringify(
				{
					name: '@create-something/canon',
					type: 'module',
					exports: {
						'./registry': {
							types: './dist/registry/index.d.ts',
							default: './dist/registry/index.js'
						}
					}
				},
				null,
				2
			),
			'utf-8'
		);
		await writeFile(
			join(packageRoot, 'dist/registry/index.d.ts'),
			[
				"export type CanonProjectOverlayManifest = {",
				'  id: string;',
				'  name: string;',
				'  owner: string;',
				'  sourcePackage: string;',
				"  targetModalities: Array<'web'>;",
				'  artifacts: Array<{ kind: string; path: string }>; ',
				'};',
				''
			].join('\n'),
			'utf-8'
		);

		const invalidManifest = {
			id: 'overlay.fixture',
			name: 'Fixture Overlay',
			owner: 'canon-team',
			sourcePackage: '@create-something/fixture',
			targetModalities: ['browser'],
			artifacts: [{ kind: 'theme', path: 'canon-overlay/theme.css' }]
		} as unknown as CanonProjectOverlayManifest;

		const inventory = createCanonOverlayIntakeInventory({
			rootDir: root,
			searchRoots: ['packages'],
			entries: [
				{
					manifestPath: 'packages/fixture/canon-overlay/manifest.ts',
					manifest: invalidManifest,
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
			const report = await buildCanonOverlayConsumerCompatibilityReport(root, { inventory });

			expect(report.summary.compatibilityIssues).toBeGreaterThan(0);
			expect(report.issues[0]).toMatchObject({
				manifestPath: 'packages/fixture/canon-overlay/manifest.ts',
				sourcePackage: '@create-something/fixture'
			});
			expect(renderCanonOverlayConsumerCompatibilityReport(report)).toContain(
				'Compatibility issues: 1'
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
