import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	buildCanonOverlayIntakeInventory,
	findCanonProjectOverlayManifestFiles,
	renderCanonOverlayIntakeInventory
} from './intake.js';

const tempRoots: string[] = [];

async function createTempRoot() {
	const root = await mkdtemp(join(tmpdir(), 'canon-overlay-intake-'));
	tempRoots.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Canon overlay intake inventory', () => {
	it('discovers project overlay manifests without treating the Canon template as project intake', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayManifest(
			root,
			'packages/canon/src/lib/overlays/project-template/manifest.ts',
			readyManifest('overlay.project-template', 'Canon Project Overlay Template', '@create-something/canon')
		);

		const files = await findCanonProjectOverlayManifestFiles({ rootDir: root });

		expect(files.map((file) => file.replace(root, ''))).toEqual([
			'/packages/client-a/canon-overlay/manifest.ts'
		]);
	});

	it('builds a reviewable multi-project intake inventory', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayManifest(
			root,
			'apps/client-b/canon-overlay/manifest.ts',
			needsArtifactsManifest('overlay.client-b', 'Client B Overlay', '@create-something/client-b')
		);

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });

		expect(inventory.id).toBe('canon-overlay-intake-inventory');
		expect(inventory.entries.map((entry) => entry.manifest.id)).toEqual([
			'overlay.client-b',
			'overlay.client-a'
		]);
		expect(inventory.summary).toMatchObject({
			total: 2,
			ready: 1,
			needsArtifacts: 1,
			candidateIntakes: 1,
			projectLocalIntakes: 1
		});
		expect(inventory.entries[0]?.review.missingArtifacts).toEqual([
			'tokens',
			'templates',
			'copy-rules',
			'surface-policy',
			'registry'
		]);

		const rendered = renderCanonOverlayIntakeInventory(inventory);
		expect(rendered).toContain('Client A Overlay');
		expect(rendered).toContain('Intake overlay.client-a.surface-brief: promote-candidate');
		expect(rendered).toContain('Client B Overlay');
	});
});

async function writeOverlayManifest(root: string, relativePath: string, manifest: unknown) {
	const filePath = join(root, relativePath);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(
		filePath,
		`export const CANON_PROJECT_OVERLAY_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`,
		'utf-8'
	);
}

function readyManifest(id: string, name: string, sourcePackage: string) {
	return {
		id,
		name,
		owner: 'client-team',
		sourcePackage,
		targetModalities: ['web', 'chat'],
		tags: ['canon', 'overlay'],
		artifacts: [
			{ kind: 'theme', path: 'theme.css' },
			{ kind: 'tokens', path: 'tokens.json' },
			{ kind: 'templates', path: 'templates' },
			{ kind: 'copy-rules', path: 'copy-rules.md' },
			{ kind: 'surface-policy', path: 'surface-policy.md' },
			{ kind: 'registry', path: 'registry.json' }
		],
		extensionIntakes: [
			{
				id: `${id}.surface-brief`,
				title: `${name} surface brief`,
				summary: 'Repeated proof panel pattern across client surfaces.',
				requestedKind: 'template',
				requestedModalities: ['web', 'chat'],
				owner: 'client-team',
				sourcePackage,
				tags: ['proof'],
				surfaces: [
					{ surfaceId: `${id}.web`, name: `${name} Web`, modality: 'web' },
					{ surfaceId: `${id}.chat`, name: `${name} Chat`, modality: 'chat' }
				]
			}
		]
	};
}

function needsArtifactsManifest(id: string, name: string, sourcePackage: string) {
	return {
		id,
		name,
		owner: 'client-team',
		sourcePackage,
		targetModalities: ['app'],
		artifacts: [{ kind: 'theme', path: 'theme.css' }],
		extensionIntakes: [
			{
				id: `${id}.local-card`,
				title: `${name} local card`,
				summary: 'One app-only pattern that needs more evidence.',
				requestedKind: 'component',
				requestedModalities: ['app'],
				owner: 'client-team',
				sourcePackage,
				tags: ['local'],
				surfaces: [{ surfaceId: `${id}.app`, name: `${name} App`, modality: 'app' }]
			}
		]
	};
}
