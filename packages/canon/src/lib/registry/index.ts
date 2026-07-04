import { CANON_REGISTRY_MANIFEST } from './data.js';
import type {
	CanonExtensionIntakePacket,
	CanonExtensionRoutingDecision,
	CanonProjectOverlayArtifactKind,
	CanonProjectOverlayManifest,
	CanonProjectOverlayReview,
	CanonRegistryItem,
	CanonRegistryKind,
	CanonRegistryManifest,
	CanonRegistryModality,
	CanonRegistryMaturity,
	CanonRegistrySearchOptions
} from './schema.js';

export { CANON_REGISTRY_MANIFEST };
export type {
	CanonExtensionIntakePacket,
	CanonExtensionLifecycleStage,
	CanonExtensionRoutingDecision,
	CanonExtensionSurfaceEvidence,
	CanonProjectOverlayArtifact,
	CanonProjectOverlayArtifactKind,
	CanonProjectOverlayManifest,
	CanonProjectOverlayReview,
	CanonRegistryContract,
	CanonRegistryItem,
	CanonRegistryKind,
	CanonRegistryManifest,
	CanonRegistryMaturity,
	CanonRegistryModality,
	CanonRegistrySearchOptions
} from './schema.js';

export const CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS: CanonProjectOverlayArtifactKind[] = [
	'theme',
	'tokens',
	'templates',
	'copy-rules',
	'surface-policy',
	'registry'
];

export function getCanonRegistryManifest(): CanonRegistryManifest {
	return CANON_REGISTRY_MANIFEST;
}

export function listCanonRegistryItems(): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items;
}

export function getCanonRegistryItem(id: string): CanonRegistryItem | undefined {
	return CANON_REGISTRY_MANIFEST.items.find((item) => item.id === id);
}

export function listCanonRegistryModalities(): CanonRegistryModality[] {
	return CANON_REGISTRY_MANIFEST.requiredModalities;
}

export function listCanonRegistryByKind(kind: CanonRegistryKind): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items.filter((item) => item.kind === kind);
}

export function listCanonRegistryByModality(
	modality: CanonRegistryModality
): CanonRegistryItem[] {
	return CANON_REGISTRY_MANIFEST.items.filter((item) => item.modalities.includes(modality));
}

export function searchCanonRegistry(
	query: string,
	options: CanonRegistrySearchOptions = {}
): CanonRegistryItem[] {
	const normalizedQuery = query.trim().toLowerCase();
	const limit = options.limit ?? 20;
	const matches = CANON_REGISTRY_MANIFEST.items
		.filter((item) => !options.kind || item.kind === options.kind)
		.filter((item) => !options.modality || item.modalities.includes(options.modality))
		.filter((item) => !options.maturity || item.maturity === options.maturity)
		.map((item) => ({ item, score: scoreCanonRegistryItem(item, normalizedQuery) }))
		.filter((result) => normalizedQuery.length === 0 || result.score > 0)
		.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
		.slice(0, limit)
		.map((result) => result.item);

	return matches;
}

export function routeCanonExtensionIntake(
	packet: CanonExtensionIntakePacket
): CanonExtensionRoutingDecision {
	if (packet.matchesRegistryItemId) {
		const existing = getCanonRegistryItem(packet.matchesRegistryItemId);
		if (existing?.maturity === 'stable') {
			return {
				stage: 'canon-stable',
				action: 'use-existing',
				rationale: `${existing.id} is already stable in Canon; extend through configuration or overlay copy instead of forking the primitive.`,
				requiredEvidence: [
					'Name the consuming surface and import path.',
					'Document any local copy, integration, or content differences outside Canon.'
				],
				stopBeforeStable: []
			};
		}
	}

	if (packet.deprecatesRegistryItemId) {
		const existing = getCanonRegistryItem(packet.deprecatesRegistryItemId);
		return {
			stage: existing ? 'deprecated' : 'project-local',
			action: existing ? 'mark-deprecated' : 'needs-review',
			rationale: existing
				? `${existing.id} exists in Canon; replacement proposals must keep migration guidance and replacement routing discoverable.`
				: `${packet.deprecatesRegistryItemId} is not a Canon registry item; confirm the source of truth before deprecation work.`,
			requiredEvidence: [
				'Replacement registry item or overlay path.',
				'Migration guidance for existing consumers.',
				'Compatibility or rollback note.'
			],
			stopBeforeStable: [
				'Do not remove the old item until consumers and replacement routing are documented.'
			]
		};
	}

	const uniqueSurfaceIds = new Set(packet.surfaces.map((surface) => surface.surfaceId));
	if (uniqueSurfaceIds.size >= 2) {
		return {
			stage: 'candidate',
			action: 'promote-candidate',
			rationale:
				'The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.',
			requiredEvidence: [
				'Source-adjacent implementation path.',
				'At least two surface proofs or client receipts.',
				'Accessibility, evidence, motion, and extension contract notes.',
				'Registry dependencies and modality list.'
			],
			stopBeforeStable: [
				'Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.'
			]
		};
	}

	return {
		stage: 'project-local',
		action: 'keep-local',
		rationale:
			'The proposal has fewer than two distinct surfaces, so the project overlay should keep ownership while collecting evidence.',
		requiredEvidence: [
			'Local owner and source path.',
			'Problem statement tied to a real workflow.',
			'Proof from a second surface or client before candidate promotion.'
		],
		stopBeforeStable: [
			'Do not add a stable Canon export from a one-off overlay.',
			'Do not create a parallel primitive when a stable registry item already matches the need.'
		]
	};
}

export function reviewCanonProjectOverlay(
	manifest: CanonProjectOverlayManifest
): CanonProjectOverlayReview {
	const presentArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter((kind) =>
		manifest.artifacts.some((artifact) => artifact.kind === kind)
	);
	const missingArtifacts = CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS.filter(
		(kind) => !presentArtifacts.includes(kind)
	);
	const extensionDecisions = (manifest.extensionIntakes ?? []).map((packet) => ({
		packet,
		decision: routeCanonExtensionIntake(packet)
	}));
	const needsReview = extensionDecisions.some(({ decision }) => decision.action === 'needs-review');
	const needsEvidence = extensionDecisions.some(({ decision }) => decision.stage === 'project-local');
	const status = needsReview
		? 'needs-review'
		: missingArtifacts.length
			? 'needs-artifacts'
			: needsEvidence
				? 'needs-evidence'
				: 'ready';
	const stopConditions = [
		...(missingArtifacts.length
			? [
					`Add missing overlay artifacts before treating ${manifest.id} as a complete Canon overlay: ${missingArtifacts.join(', ')}.`
				]
			: []),
		...extensionDecisions.flatMap(({ decision }) => decision.stopBeforeStable),
		'Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.',
		'Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts.'
	];

	return {
		status,
		requiredArtifacts: CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS,
		presentArtifacts,
		missingArtifacts,
		extensionDecisions,
		stopConditions: [...new Set(stopConditions)],
		summary:
			status === 'ready'
				? `${manifest.name} declares the complete Canon overlay artifact set and has no project-local evidence gaps.`
				: `${manifest.name} is ${status}; keep it project-owned until missing artifacts and evidence gaps are resolved.`
	};
}

function scoreCanonRegistryItem(item: CanonRegistryItem, query: string): number {
	if (!query) return 1;

	const haystacks = [
		item.id,
		item.name,
		item.kind,
		item.maturity,
		item.description,
		item.importPath ?? '',
		item.docsPath ?? '',
		...item.tags,
		...item.modalities,
		...(item.dependencies ?? []),
		item.contract.accessibility ?? '',
		item.contract.evidence ?? '',
		item.contract.motion ?? '',
		item.contract.extension ?? ''
	].map((value) => value.toLowerCase());

	return query
		.split(/\s+/)
		.filter(Boolean)
		.reduce((score, token) => {
			if (item.id.toLowerCase() === token || item.name.toLowerCase() === token) return score + 8;
			if (haystacks.some((value) => value.includes(token))) return score + 1;
			return score;
		}, 0);
}
