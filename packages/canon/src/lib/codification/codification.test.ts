import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
	assertCanonCodificationAudit,
	buildCanonCodificationAuditReport,
	renderCanonCodificationAuditReport,
	type CanonCodificationExemption
} from './codification.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('Canon codification audit', () => {
	it('classifies every current repo UI source file without undecided Canon ownership', async () => {
		const report = await buildCanonCodificationAuditReport(repoRoot);

		expect(() => assertCanonCodificationAudit(report)).not.toThrow();
		expect(report.summary.totalUiFiles).toBeGreaterThan(1000);
		expect(report.summary.needsCanonDecision).toBe(0);
		expect(
			report.summary.canonOwned +
				report.summary.canonImporting +
				report.summary.overlayGoverned +
				report.summary.productLocalExempt +
				report.summary.needsCanonDecision
		).toBe(report.summary.totalUiFiles);

		const rendered = renderCanonCodificationAuditReport(report);
		expect(rendered).toContain('# Canon Codification Audit');
		expect(rendered).toContain('Needs Canon decision: 0');
	});

	it('assigns the expected primary classification for each codification path', async () => {
		const root = await mkdtemp(join(tmpdir(), 'canon-codification-'));
		const exemptions: CanonCodificationExemption[] = [
			{
				path: 'packages/local-tool',
				reason: 'operator-tooling',
				justification: 'Fixture local tool exemption.'
			}
		];

		await writePackage(root, 'packages/canon', '@create-something/canon');
		await writeUi(root, 'packages/canon/src/lib/components/Button.svelte', '<button>Canon</button>');

		await writePackage(root, 'packages/importing-app', '@create-something/importing-app');
		await writeUi(
			root,
			'packages/importing-app/src/App.svelte',
			"<script>import { Button } from '@create-something/canon';</script><Button />"
		);

		await writePackage(root, 'packages/overlay-app', '@create-something/overlay-app');
		await mkdir(join(root, 'packages/overlay-app/canon-overlay'), { recursive: true });
		await writeFile(
			join(root, 'packages/overlay-app/canon-overlay/manifest.ts'),
			'export const CANON_PROJECT_OVERLAY_MANIFEST = {};\n',
			'utf-8'
		);
		await writeUi(root, 'packages/overlay-app/src/App.svelte', '<main>Overlay</main>');

		await writePackage(root, 'packages/local-tool', '@create-something/local-tool');
		await writeUi(root, 'packages/local-tool/src/App.svelte', '<main>Local</main>');

		await writePackage(root, 'packages/unknown-app', '@create-something/unknown-app');
		await writeUi(root, 'packages/unknown-app/src/App.svelte', '<main>Unknown</main>');

		try {
			const report = await buildCanonCodificationAuditReport(root, { exemptions });
			const classifications = new Map(
				report.entries.map((entry) => [entry.path, entry.classification])
			);

			expect(classifications.get('packages/canon/src/lib/components/Button.svelte')).toBe(
				'canon-owned'
			);
			expect(classifications.get('packages/importing-app/src/App.svelte')).toBe(
				'canon-importing'
			);
			expect(classifications.get('packages/overlay-app/src/App.svelte')).toBe(
				'overlay-governed'
			);
			expect(classifications.get('packages/local-tool/src/App.svelte')).toBe(
				'product-local-exempt'
			);
			expect(classifications.get('packages/unknown-app/src/App.svelte')).toBe(
				'needs-canon-decision'
			);
			expect(() => assertCanonCodificationAudit(report)).toThrow(/unknown-app/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});

async function writePackage(root: string, packageDir: string, name: string) {
	await mkdir(join(root, packageDir), { recursive: true });
	await writeFile(join(root, packageDir, 'package.json'), JSON.stringify({ name }), 'utf-8');
}

async function writeUi(root: string, path: string, source: string) {
	await mkdir(dirname(join(root, path)), { recursive: true });
	await writeFile(join(root, path), source, 'utf-8');
}
