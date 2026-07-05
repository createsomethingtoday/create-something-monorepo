import { describe, expect, it } from 'vitest';

import { getCanonRegistryItem } from '../registry/index.js';
import {
	CANON_OVERLAY_CATALOG,
	getCanonOverlayCatalog,
	getCanonOverlayTemplate
} from './index.js';

describe('Canon overlay catalog', () => {
	it('publishes the project overlay contract as source data', () => {
		const catalog = getCanonOverlayCatalog();

		expect(catalog).toBe(CANON_OVERLAY_CATALOG);
		expect(catalog.sourceOfTruth).toBe('@create-something/canon/overlays');
		expect(catalog.requiredArtifacts).toEqual([
			'theme',
			'tokens',
			'templates',
			'copy-rules',
			'surface-policy',
			'registry'
		]);
		expect(catalog.overlayRules.join(' ')).toContain('not primitive forks');
		expect(catalog.agentContract.primaryConsumers).toContain('mcp');
		expect(catalog.agentContract.stopBefore.join(' ')).toContain('second overlay documentation system');
	});

	it('covers every required modality with owner boundaries', () => {
		expect(CANON_OVERLAY_CATALOG.modalityContracts.map((contract) => contract.modality)).toEqual([
			'web',
			'chat',
			'app',
			'voice',
			'glasses'
		]);

		for (const contract of CANON_OVERLAY_CATALOG.modalityContracts) {
			expect(contract.overlayOwns.length, contract.modality).toBeGreaterThan(0);
			expect(contract.canonOwns.length, contract.modality).toBeGreaterThan(0);
			expect(contract.useFor, contract.modality).not.toHaveLength(0);
		}
	});

	it('keeps the project-template catalog entry ready and registry-backed', () => {
		const template = getCanonOverlayTemplate('overlay.project-template');

		expect(template?.docsPath).toBe('/canon/resources/overlays');
		expect(template?.outputFiles).toEqual([
			'theme.css',
			'tokens.json',
			'templates/README.md',
			'templates/surface-brief.md',
			'copy-rules.md',
			'surface-policy.md',
			'registry.json',
			'manifest.ts'
		]);
		expect(template?.manifest.targetModalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(template?.review.status).toBe('ready');
		expect(template?.review.missingArtifacts).toEqual([]);

		for (const registryItemId of template?.registryItemIds ?? []) {
			expect(getCanonRegistryItem(registryItemId), registryItemId).toBeDefined();
		}

		for (const artifact of template?.manifest.artifacts ?? []) {
			expect(CANON_OVERLAY_CATALOG.requiredArtifacts).toContain(artifact.kind);
			for (const registryItemId of artifact.registryItemIds ?? []) {
				expect(getCanonRegistryItem(registryItemId), `${artifact.kind}:${registryItemId}`).toBeDefined();
			}
		}
	});
});
