import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { reviewCanonProjectOverlay } from '../../registry/index.js';
import {
	createCanonProjectOverlayManifest,
	instantiateCanonProjectOverlayTemplate,
	renderCanonProjectOverlayTemplateFiles
} from './index.js';

const tempRoots: string[] = [];

async function createTempRoot() {
	const root = await mkdtemp(join(tmpdir(), 'canon-overlay-'));
	tempRoots.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Canon project overlay instantiation', () => {
	it('renders a complete reviewable manifest without writing files in dry-run mode', async () => {
		const outputRoot = await createTempRoot();
		const result = await instantiateCanonProjectOverlayTemplate({
			id: 'overlay.client-workflow',
			name: 'Client Workflow Overlay',
			owner: 'client-team',
			sourcePackage: '@create-something/client',
			outputRoot,
			targetModalities: ['web', 'chat'],
			dryRun: true
		});

		expect(result.dryRun).toBe(true);
		expect(result.files).toHaveLength(8);
		expect(result.files.every((file) => file.action === 'would-create')).toBe(true);
		expect(existsSync(join(outputRoot, 'manifest.ts'))).toBe(false);

		const review = reviewCanonProjectOverlay(result.manifest);
		expect(review.status).toBe('ready');
		expect(review.missingArtifacts).toEqual([]);
		expect(review.extensionDecisions[0]?.decision.action).toBe('promote-candidate');
	});

	it('writes the overlay artifact set with rendered project metadata', async () => {
		const outputRoot = await createTempRoot();
		const result = await instantiateCanonProjectOverlayTemplate({
			id: 'overlay.sales-console',
			name: 'Sales Console Overlay',
			owner: 'sales-team',
			sourcePackage: '@create-something/sales',
			outputRoot,
			targetModalities: ['web', 'app']
		});

		expect(result.files.map((file) => file.action)).toEqual([
			'created',
			'created',
			'created',
			'created',
			'created',
			'created',
			'created',
			'created'
		]);
		expect(existsSync(join(outputRoot, 'theme.css'))).toBe(true);
		expect(existsSync(join(outputRoot, 'templates/surface-brief.md'))).toBe(true);

		const registry = JSON.parse(await readFile(join(outputRoot, 'registry.json'), 'utf-8')) as {
			id: string;
			owner: string;
			sourcePackage: string;
		};
		expect(registry).toMatchObject({
			id: 'overlay.sales-console',
			owner: 'sales-team',
			sourcePackage: '@create-something/sales'
		});

		const manifestTs = await readFile(join(outputRoot, 'manifest.ts'), 'utf-8');
		expect(manifestTs).toContain('Sales Console Overlay');
		expect(manifestTs).toContain('@create-something/canon/registry');
		expect(reviewCanonProjectOverlay(result.manifest).status).toBe('ready');
	});

	it('skips existing files unless force is enabled', async () => {
		const outputRoot = await createTempRoot();
		await instantiateCanonProjectOverlayTemplate({
			id: 'overlay.no-overwrite',
			name: 'No Overwrite Overlay',
			owner: 'ops-team',
			sourcePackage: '@create-something/ops',
			outputRoot
		});
		await writeFile(join(outputRoot, 'copy-rules.md'), '# Local edits\n', 'utf-8');

		const skipped = await instantiateCanonProjectOverlayTemplate({
			id: 'overlay.no-overwrite',
			name: 'No Overwrite Overlay',
			owner: 'ops-team',
			sourcePackage: '@create-something/ops',
			outputRoot
		});
		expect(skipped.files.find((file) => file.relativePath === 'copy-rules.md')?.action).toBe(
			'skipped-existing'
		);
		expect(await readFile(join(outputRoot, 'copy-rules.md'), 'utf-8')).toBe('# Local edits\n');

		const forced = await instantiateCanonProjectOverlayTemplate({
			id: 'overlay.no-overwrite',
			name: 'No Overwrite Overlay',
			owner: 'ops-team',
			sourcePackage: '@create-something/ops',
			outputRoot,
			force: true
		});
		expect(forced.files.find((file) => file.relativePath === 'copy-rules.md')?.action).toBe(
			'overwritten'
		);
		expect(await readFile(join(outputRoot, 'copy-rules.md'), 'utf-8')).toContain(
			'No Overwrite Overlay Copy Rules'
		);
	});

	it('exposes a pure render path for agents and MCP-style previews', () => {
		const manifest = createCanonProjectOverlayManifest({
			id: 'overlay.agent-preview',
			name: 'Agent Preview Overlay',
			owner: 'agent-team',
			sourcePackage: '@create-something/agent-preview',
			targetModalities: ['voice', 'glasses']
		});
		const files = renderCanonProjectOverlayTemplateFiles({
			...manifest,
			outputRoot: '/tmp/agent-preview'
		});

		expect(files.map((file) => file.relativePath)).toContain('manifest.ts');
		expect(files.find((file) => file.relativePath === 'surface-policy.md')?.content).toContain(
			'voice, glasses'
		);
		expect(reviewCanonProjectOverlay(manifest).status).toBe('ready');
	});
});
