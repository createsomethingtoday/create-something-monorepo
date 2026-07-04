import { describe, expect, it } from 'vitest';

import {
	CANON_REGISTRY_MANIFEST,
	getCanonRegistryItem,
	listCanonRegistryModalities,
	routeCanonExtensionIntake,
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

	it('exposes the Canon extension intake template across modalities', () => {
		const item = getCanonRegistryItem('template.canon-extension-intake');

		expect(item?.kind).toBe('template');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.contract.evidence).toContain('two distinct surfaces');
	});

	it('exposes the Atlas development handoff template for every modality', () => {
		const item = getCanonRegistryItem('template.atlas-development-handoff');

		expect(item?.kind).toBe('template');
		expect(item?.maturity).toBe('candidate');
		expect(item?.importPath).toBe('@create-something/canon/atlas/handoff');
		expect(item?.modalities).toEqual(['web', 'chat', 'app', 'voice', 'glasses']);
		expect(item?.dependencies).toEqual([
			'adapter.atlas-graph-artifact',
			'policy.signal-decision-proof'
		]);
		expect(item?.contract.evidence).toContain('Linear evidence path');
	});

	it('keeps one-off overlay extensions project-local', () => {
		const decision = routeCanonExtensionIntake({
			id: 'overlay.client-proof-panel',
			title: 'Client Proof Panel',
			summary: 'A local proof panel for one client launch.',
			requestedKind: 'component',
			requestedModalities: ['web'],
			owner: 'client-team',
			sourcePackage: '@create-something/agency',
			sourcePath: 'packages/agency/src/lib/ClientProofPanel.svelte',
			tags: ['proof', 'client'],
			surfaces: [
				{
					surfaceId: 'agency-client-launch',
					name: 'Agency client launch',
					modality: 'web'
				}
			]
		});

		expect(decision.stage).toBe('project-local');
		expect(decision.action).toBe('keep-local');
		expect(decision.requiredEvidence.join(' ')).toContain('second surface');
	});

	it('routes repeated overlay evidence into candidate promotion', () => {
		const decision = routeCanonExtensionIntake({
			id: 'template.operator-handoff-brief',
			title: 'Operator Handoff Brief',
			summary: 'A compact state, owner, receipt, and next-action brief.',
			requestedKind: 'template',
			requestedModalities: ['chat', 'voice'],
			owner: 'canon',
			sourcePackage: '@create-something/canon',
			tags: ['handoff', 'brief', 'receipt'],
			surfaces: [
				{
					surfaceId: 'chat-reviewer-handoff',
					name: 'Chat reviewer handoff',
					modality: 'chat'
				},
				{
					surfaceId: 'voice-standup-brief',
					name: 'Voice standup brief',
					modality: 'voice'
				}
			]
		});

		expect(decision.stage).toBe('candidate');
		expect(decision.action).toBe('promote-candidate');
		expect(decision.stopBeforeStable.join(' ')).toContain('export path');
	});

	it('routes stable matches back to the existing Canon item', () => {
		const decision = routeCanonExtensionIntake({
			id: 'overlay.local-decision-card',
			title: 'Local Decision Card',
			summary: 'A local decision card that duplicates ClearDecisionPanel behavior.',
			requestedKind: 'component',
			requestedModalities: ['web'],
			owner: 'agency',
			sourcePackage: '@create-something/agency',
			tags: ['decision'],
			matchesRegistryItemId: 'component.clear-decision-panel',
			surfaces: []
		});

		expect(decision.stage).toBe('canon-stable');
		expect(decision.action).toBe('use-existing');
		expect(decision.rationale).toContain('component.clear-decision-panel');
	});

	it('requires migration evidence before deprecating a Canon item', () => {
		const decision = routeCanonExtensionIntake({
			id: 'replacement.proof-strip-v2',
			title: 'Proof Strip V2',
			summary: 'Replacement proposal for compact proof summaries.',
			requestedKind: 'component',
			requestedModalities: ['web', 'app'],
			owner: 'canon',
			sourcePackage: '@create-something/canon',
			tags: ['proof', 'replacement'],
			deprecatesRegistryItemId: 'component.clear-proof-strip',
			surfaces: []
		});

		expect(decision.stage).toBe('deprecated');
		expect(decision.action).toBe('mark-deprecated');
		expect(decision.requiredEvidence.join(' ')).toContain('Migration guidance');
	});
});
