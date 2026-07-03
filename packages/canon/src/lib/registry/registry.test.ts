import { describe, expect, it } from 'vitest';

import {
	CANON_REGISTRY_MANIFEST,
	getCanonRegistryItem,
	listCanonRegistryModalities,
	searchCanonRegistry
} from './index.js';

describe('Canon registry manifest', () => {
	it('covers every required product modality', () => {
		expect(listCanonRegistryModalities()).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
	});

	it('keeps registry item ids unique and dependencies resolvable', () => {
		const ids = CANON_REGISTRY_MANIFEST.items.map((item) => item.id);
		expect(new Set(ids).size).toBe(ids.length);

		for (const item of CANON_REGISTRY_MANIFEST.items) {
			for (const dependencyId of item.dependencies ?? []) {
				expect(getCanonRegistryItem(dependencyId), `${item.id} -> ${dependencyId}`).toBeDefined();
			}
		}
	});

	it('exposes ClearDecisionPanel as the shared decision surface', () => {
		const item = getCanonRegistryItem('component.clear-decision-panel');

		expect(item?.maturity).toBe('stable');
		expect(item?.modalities).toEqual(['web', 'app', 'chat', 'voice', 'glasses']);
		expect(item?.contract.evidence).toContain('evidence');
	});

	it('searches templates by modality and operational language', () => {
		const results = searchCanonRegistry('routing evidence', {
			kind: 'template',
			modality: 'glasses'
		});

		expect(results.map((item) => item.id)).toContain('template.glasses-routing-hud');
	});
});
